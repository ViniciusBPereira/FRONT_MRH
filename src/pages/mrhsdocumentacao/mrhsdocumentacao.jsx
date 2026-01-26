import React, { useEffect, useState, useRef, useCallback } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  FaClipboardCheck,
  FaPaperclip,
  FaCheckCircle,
  FaFileImport,
} from "react-icons/fa";
import "./mrhsdocumentacao.css";
import { useSidebar } from "../../components/sidebarcontext";
import { api } from "../../services/api";
import ExcelJS from "exceljs";

/* MODAIS */
import CheckDocsModalByCpf from "./checkDocsModalByCpf";
import DocumentosCandidatoModal from "./documentosCandidatoModal";

export default function MRHsDocumentacao() {
  const minimized = useSidebar?.()?.minimized ?? false;

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const listaRef = useRef([]);

  /* ===== FILE INPUT CSV ===== */
  const fileInputRef = useRef(null);

  /* ===== EXAME (EDIÇÃO INLINE) ===== */
  const [examesEditando, setExamesEditando] = useState({});

  /* ===== CONTROLE DE MODAIS ===== */
  const [checklistSelecionado, setChecklistSelecionado] = useState(null);
  const [arquivosSelecionado, setArquivosSelecionado] = useState(null);

  /* ===== CONTROLE CONCLUIR ===== */
  const [concluindo, setConcluindo] = useState({});

  /* ===== ALERTA DE EXAMES POR DIA ===== */
  const [alertaExames, setAlertaExames] = useState(null);

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
        n.dias_em_aberto !== a.dias_em_aberto ||
        n.exame !== a.exame ||
        n.condicao !== a.condicao
      ) {
        return true;
      }
    }
    return false;
  }
  function verificarExamesPorDia(lista) {
    const contador = {};

    lista.forEach((item) => {
      if (!item.exame) return;

      const data = item.exame.trim();
      if (!data) return;

      contador[data] = (contador[data] || 0) + 1;
    });

    const excedente = Object.entries(contador).find(([, total]) => total > 10);

    if (excedente) {
      const [data, total] = excedente;
      setAlertaExames({ data, total });
    } else {
      setAlertaExames(null);
    }
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

      if (dadosMudaram(dados, listaRef.current)) {
        listaRef.current = dados;
        setLista(dados);
        verificarExamesPorDia(dados);
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
        { headers: authHeader() },
      );
    } catch (err) {
      console.error("[EXAME] Erro ao salvar:", err);
    }
  }

  /* ===== ATUALIZAR CONDIÇÃO ===== */
  async function atualizarCondicao(mrh, condicao) {
    try {
      await api.patch(
        `/mrhsdocumentacao/condicao/${mrh}`,
        { condicao },
        { headers: authHeader() },
      );

      setLista((prev) =>
        prev.map((i) => (i.mrh === mrh ? { ...i, condicao } : i)),
      );
    } catch (err) {
      console.error("[CONDICAO] Erro:", err);
      alert("Erro ao atualizar condição.");
    }
  }

  /* ===== CONCLUIR ETAPA ===== */
  async function concluirEtapa(mrh) {
    try {
      setConcluindo((p) => ({ ...p, [mrh]: true }));

      await api.patch(`/mrhsdocumentacao/concluir/${mrh}`, null, {
        headers: authHeader(),
      });

      setLista((prev) => prev.filter((item) => item.mrh !== mrh));
      listaRef.current = listaRef.current.filter((i) => i.mrh !== mrh);
    } catch (err) {
      console.error("[CONCLUIR] Erro:", err);
      alert("Erro ao concluir a documentação.");
    } finally {
      setConcluindo((p) => ({ ...p, [mrh]: false }));
    }
  }

  /* ===== IMPORTAÇÃO CSV ===== */
  async function importarCSV(file) {
    if (!file) return;

    const formData = new FormData();
    formData.append("arquivo", file);

    try {
      await api.post("/mrhsdocumentacao/importacao/csv", formData, {
        headers: {
          ...authHeader(),
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Importação realizada com sucesso!");
      carregar();
    } catch (err) {
      console.error("[IMPORTAÇÃO CSV]", err);
      alert(err?.response?.data?.message || "Erro ao importar o arquivo CSV.");
    } finally {
      fileInputRef.current.value = "";
    }
  }
  /* ===== EXPORTAÇÃO EXCEL ===== */
  async function exportarExcel() {
    if (!lista.length) {
      alert("Não há dados para exportar.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Documentação");

    sheet.columns = [
      { header: "Abertura", key: "data_abertura", width: 15 },
      { header: "Dias", key: "dias_em_aberto", width: 10 },
      { header: "MRH", key: "mrh", width: 10 },
      { header: "Colaborador", key: "nome_colaborador", width: 30 },
      { header: "CPF", key: "cpf_colaborador", width: 18 },
      { header: "Função", key: "funcao", width: 25 },
      { header: "Empresa", key: "empresa", width: 30 },
      { header: "CR", key: "cr", width: 30 },
      { header: "Responsável", key: "responsavel", width: 25 },
      { header: "Status RH", key: "status_rh", width: 15 },
      { header: "Status DP", key: "status_dp", width: 15 },
      { header: "Condição", key: "condicao", width: 15 },
      { header: "Exame", key: "exame", width: 20 },
    ];

    lista.forEach((item) => {
      sheet.addRow({
        data_abertura: item.data_abertura,
        dias_em_aberto: item.dias_em_aberto ?? "",
        mrh: item.mrh,
        nome_colaborador: item.nome_colaborador,
        cpf_colaborador: item.cpf_colaborador,
        funcao: item.funcao,
        empresa: item.empresa,
        cr: item.cr,
        responsavel: item.responsavel,
        status_rh: item.status_rh,
        status_dp: item.status_dp,
        condicao: item.condicao,
        exame: item.exame,
      });
    });

    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documentacao_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
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
      field: "dias_em_aberto",
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
      field: "condicao",
      headerName: "Condição",
      flex: 0.8,
      renderCell: (params) => {
        const mrh = params.row.mrh;
        const valor = params.value || "PENDENTE";

        return (
          <select
            value={valor}
            onChange={(e) => atualizarCondicao(mrh, e.target.value)}
            style={{
              width: "100%",
              height: 26,
              fontSize: 12,
              borderRadius: 4,
              color: "#000",
              border: "1px solid #cbd5e1",
              background: valor === "CONCLUIDO" ? "#dcfce7" : "#fef9c3",
            }}
          >
            <option value="PENDENTE">Pendente</option>
            <option value="CONCLUIDO">Concluído</option>
          </select>
        );
      },
    },
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
              setExamesEditando((p) => ({
                ...p,
                [mrh]: e.target.value,
              }))
            }
            onBlur={() => {
              const v = examesEditando[mrh] ?? params.value ?? "";
              salvarExame(mrh, v);
              setLista((p) =>
                p.map((i) => (i.mrh === mrh ? { ...i, exame: v } : i)),
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
            {alertaExames && (
              <div className="alerta-exames">
                ⚠️ {alertaExames.total} exames agendados para{" "}
                {alertaExames.data}
              </div>
            )}

            <div className="mrhs-header-actions">
              <button
                className="btn-importacao"
                onClick={() => fileInputRef.current.click()}
                title="Importar CSV"
              >
                <FaFileImport size={13} />
                Importar CSV
              </button>

              <button
                className="btn-export-excel"
                onClick={exportarExcel}
                title="Exportar para Excel"
              >
                Exportar
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => importarCSV(e.target.files[0])}
              />
            </div>
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
