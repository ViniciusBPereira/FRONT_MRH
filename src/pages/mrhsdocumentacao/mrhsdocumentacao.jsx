import React, { useEffect, useState, useRef, useCallback } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { FaClipboardCheck, FaPaperclip, FaCheckCircle } from "react-icons/fa";
import "./mrhsdocumentacao.css";
import { useSidebar } from "../../components/sidebarcontext";
import { api } from "../../services/api";

/* MODAIS */
import CheckDocsModalByCpf from "./checkDocsModalByCpf";
import DocumentosCandidatoModal from "./documentosCandidatoModal";

export default function MRHsDocumentacao() {
  const minimized = useSidebar?.()?.minimized ?? false;

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const listaRef = useRef([]);

  /* ===== EXAME (EDIÇÃO INLINE) ===== */
  const [examesEditando, setExamesEditando] = useState({});

  /* ===== CONTROLE DE MODAIS ===== */
  const [checklistSelecionado, setChecklistSelecionado] = useState(null);
  const [arquivosSelecionado, setArquivosSelecionado] = useState(null);

  /* ===== CONTROLE CONCLUIR ===== */
  const [concluindo, setConcluindo] = useState({});

  /* ===== AUTH HEADER ===== */
  const authHeader = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  /* ===== COMPARAÇÃO ===== */
  function dadosMudaram(novos, antigos) {
    if (novos.length !== antigos.length) return true;

    for (let i = 0; i < novos.length; i++) {
      const n = novos[i];
      const a = antigos[i];

      if (
        n.mrh !== a.mrh ||
        n.status_rh !== a.status_rh ||
        n.status_dp !== a.status_dp ||
        n.dias_desde_finalizacao !== a.dias_desde_finalizacao ||
        n.exame !== a.exame
      ) {
        return true;
      }
    }
    return false;
  }

  /* ===== FETCH ===== */
  const carregar = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const res = await api.get("/mrhsdocumentacao", {
        headers: authHeader(),
      });

      const dados = res.data;
      if (!Array.isArray(dados)) return;

      const hoje = new Date();
      const tratados = dados.map((item) => {
        let dias = null;
        if (item.data_finalizacao_rh) {
          const d = new Date(item.data_finalizacao_rh);
          if (!isNaN(d.getTime())) {
            dias = Math.floor((hoje - d) / (1000 * 60 * 60 * 24));
          }
        }
        return { ...item, dias_desde_finalizacao: dias };
      });

      if (dadosMudaram(tratados, listaRef.current)) {
        listaRef.current = tratados;
        setLista(tratados);
      }
    } catch (err) {
      console.error("❌ Erro ao carregar documentação:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const loop = setInterval(() => carregar(true), 5000);
    return () => clearInterval(loop);
  }, [carregar]);

  /* ===== SALVAR EXAME ===== */
  async function salvarExame(mrh, valor) {
    try {
      await api.patch(
        `/mrhsdocumentacao/exame/${mrh}`,
        { exame: valor },
        { headers: authHeader() }
      );
    } catch (err) {
      console.error("[EXAME] Erro ao salvar:", err);
    }
  }

  /* ===== CONCLUIR ETAPA (CORRIGIDO) ===== */
  async function concluirEtapa(mrh) {
    try {
      setConcluindo((p) => ({ ...p, [mrh]: true }));

      // 🔧 AJUSTE: backend espera PATCH, não PUT
      await api.patch(
        `/mrhsdocumentacao/concluir/${mrh}`,
        null, // body vazio (como o backend espera)
        { headers: authHeader() }
      );

      setLista((prev) => prev.filter((item) => item.mrh !== mrh));
      listaRef.current = listaRef.current.filter((i) => i.mrh !== mrh);
    } catch (err) {
      console.error("[CONCLUIR] Erro:", err?.response || err);
      alert("Erro ao concluir a documentação.");
    } finally {
      setConcluindo((p) => ({ ...p, [mrh]: false }));
    }
  }

  /* ===== CORES ===== */
  const getDiasBg = (d) => {
    if (d == null) return "#e0e0e0";
    if (d <= 0) return "#c8f7c5";
    if (d <= 3) return "#f7f3c5";
    if (d <= 6) return "#f7d1a9";
    return "#f7b5b5";
  };

  /* ===== COLUNAS ===== */
  const colunas = [
    { field: "data_abertura", headerName: "Abertura", flex: 0.8 },
    {
      field: "dias_desde_finalizacao",
      headerName: "Dias",
      flex: 0.35,
      renderCell: (p) => (
        <div
          style={{
            backgroundColor: getDiasBg(p.value),
            width: "100%",
            textAlign: "center",
            fontWeight: 600,
            borderRadius: 4,
            padding: "3px 0",
            fontSize: 12,
          }}
        >
          {p.value ?? "-"}
        </div>
      ),
    },
    { field: "mrh", headerName: "MRH", flex: 0.5 },
    { field: "nome_colaborador", headerName: "Colaborador", flex: 1.2 },
    { field: "cpf_colaborador", headerName: "CPF", flex: 0.8 },
    { field: "funcao", headerName: "Função", flex: 1 },
    { field: "empresa", headerName: "Empresa", flex: 1.2 },
    { field: "cr", headerName: "CR", flex: 1.2 },
    { field: "responsavel", headerName: "Responsável", flex: 1 },
    { field: "status_rh", headerName: "Status RH", flex: 0.7 },
    { field: "status_dp", headerName: "Status DP", flex: 0.7 },
    {
      field: "exame",
      headerName: "Exame",
      flex: 1.2,
      sortable: false,
      renderCell: (params) => {
        const mrh = params.row.mrh;
        return (
          <input
            value={
              examesEditando[mrh] !== undefined
                ? examesEditando[mrh]
                : params.value || ""
            }
            onChange={(e) =>
              setExamesEditando((p) => ({ ...p, [mrh]: e.target.value }))
            }
            onBlur={() => {
              const v = examesEditando[mrh] ?? params.value ?? "";
              salvarExame(mrh, v);
              setLista((p) =>
                p.map((i) => (i.mrh === mrh ? { ...i, exame: v } : i))
              );
            }}
            style={{
              width: "100%",
              height: 22,
              fontSize: 12,
              padding: "2px 6px",
              borderRadius: 4,
              border: "1px solid #cbd5e1",
            }}
          />
        );
      },
    },
    {
      field: "acao",
      headerName: "",
      flex: 0.6,
      sortable: false,
      renderCell: (params) => {
        const {
          cpf_colaborador: cpf,
          nome_colaborador: nome,
          mrh,
        } = params.row;

        return (
          <div className="acoes-documentacao">
            <button
              className="action-btn"
              title="Checklist"
              onClick={() => setChecklistSelecionado({ cpf, nome })}
            >
              <FaClipboardCheck size={14} />
            </button>

            <button
              className="action-btn"
              title="Arquivos"
              onClick={() => setArquivosSelecionado({ cpf, nome })}
            >
              <FaPaperclip size={14} />
            </button>

            <button
              className="action-btn action-confirm"
              title="Concluir"
              disabled={concluindo[mrh]}
              onClick={() => concluirEtapa(mrh)}
            >
              <FaCheckCircle size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className={`mrhs-wrapper ${minimized ? "sidebar-minimized" : ""}`}>
        <div className="mrhs-container">
          <div className="mrhs-header">
            <h2>Documentação</h2>
          </div>

          <div className="datagrid-wrapper compact-height">
            <DataGrid
              rows={lista.map((r, index) => ({
                id: r.mrh ?? index,
                ...r,
              }))}
              columns={colunas}
              loading={loading}
              disableRowSelectionOnClick
              density="compact"
              pageSizeOptions={[30]}
              rowHeight={45}
              headerHeight={36}
            />
          </div>
        </div>
      </div>

      {checklistSelecionado && (
        <CheckDocsModalByCpf
          cpf={checklistSelecionado.cpf}
          nome={checklistSelecionado.nome}
          fechar={() => setChecklistSelecionado(null)}
        />
      )}

      {arquivosSelecionado && (
        <DocumentosCandidatoModal
          cpf={arquivosSelecionado.cpf}
          nome={arquivosSelecionado.nome}
          fechar={() => setArquivosSelecionado(null)}
        />
      )}
    </>
  );
}
