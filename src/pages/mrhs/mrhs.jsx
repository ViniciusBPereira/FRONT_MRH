import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { FaPlus, FaRegCommentDots } from "react-icons/fa";
import "./mrhs.css";
import { useSidebar } from "../../components/sidebarcontext";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://api-info.xyz/api";

export default function MRHs() {
  const minimized = useSidebar?.()?.minimized ?? false;
  const navigate = useNavigate();

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const listaRef = useRef([]);

  /* ================= MODAL COMENTÁRIOS ================= */
  const [modalComentario, setModalComentario] = useState(false);
  const [mrhSelecionada, setMrhSelecionada] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [salvando, setSalvando] = useState(false);

    /* ================= EXPORT EXCEL ================= */
async function exportarExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("MRHs Abertas");

  worksheet.columns = [
    { header: "Abertura", key: "data_abertura", width: 15 },
    { header: "Dias", key: "dias_em_aberto", width: 10 },
    { header: "MRH", key: "mrh", width: 10 },
    { header: "Função", key: "funcao", width: 25 },
    { header: "Motivo", key: "motivo_admissao", width: 20 },
    { header: "Escala", key: "escala", width: 15 },
    { header: "Período", key: "periodo", width: 15 },
    { header: "Empresa", key: "empresa", width: 25 },
    { header: "Endereço", key: "endereco", width: 35 },
    { header: "CR", key: "cr", width: 20 },
    { header: "Usuário Abertura", key: "usuario_abertura", width: 20 },
    { header: "Diretor", key: "diretor", width: 20 },
    { header: "Gerente Regional", key: "gerente_regional", width: 20 },
    { header: "Gerente", key: "gerente", width: 20 },
    { header: "Supervisor", key: "supervisor", width: 20 },
    { header: "Responsável", key: "responsavel", width: 20 },
    { header: "Comentários", key: "total_comentarios", width: 15 },
    { header: "Candidatos", key: "total_candidatos", width: 15 },
  ];

  lista.forEach((r) => {
    worksheet.addRow({
      data_abertura: r.data_abertura,
      dias_em_aberto: r.dias_em_aberto ?? 0,
      mrh: r.mrh,
      funcao: r.funcao,
      motivo_admissao: r.motivo_admissao,
      escala: r.escala,
      periodo: r.periodo,
      empresa: r.empresa,
      endereco: r.endereco,
      cr: r.cr,
      usuario_abertura: r.usuario_abertura,
      diretor: r.diretor,
      gerente_regional: r.gerente_regional,
      gerente: r.gerente,
      supervisor: r.supervisor,
      responsavel: r.responsavel,
      total_comentarios: r.total_comentarios,
      total_candidatos: r.total_candidatos,
    });
  });

  // Estilo do header
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "MRHs_Abertas.xlsx"
  );
}


  /* ================= COMPARAÇÃO ================= */
  function dadosMudaram(novos, antigos) {
    if (novos.length !== antigos.length) return true;

    for (let i = 0; i < novos.length; i++) {
      const n = novos[i];
      const a = antigos[i];

      if (
        n.mrh !== a.mrh ||
        n.dias_em_aberto !== a.dias_em_aberto ||
        n.total_candidatos !== a.total_candidatos ||
        n.total_comentarios !== a.total_comentarios
      ) {
        return true;
      }
    }
    return false;
  }

  /* ================= FETCH MRHs ================= */
  const carregar = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/mrhsabertas`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error("Erro ao buscar MRHs");

      const dados = await res.json();
      if (!Array.isArray(dados)) return;

      if (dadosMudaram(dados, listaRef.current)) {
        listaRef.current = dados;
        setLista(dados);
      }
    } catch (err) {
      console.error("Erro ao carregar MRHs:", err);
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

  /* ================= FETCH COMENTÁRIOS ================= */
  async function carregarComentarios(mrhId) {
    try {
      const token = localStorage.getItem("token");
      const id = Number(mrhId); // 🔧 AJUSTE

      const res = await fetch(`${API_BASE}/mrhs/${id}/comentarios`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error("Erro ao carregar comentários");

      const dados = await res.json();
      if (Array.isArray(dados)) setComentarios(dados);
    } catch (err) {
      console.error(err);
    }
  }

  /* ================= SALVAR COMENTÁRIO ================= */
  async function salvarComentario() {
    const texto = novoComentario.trim();
    console.log("ENVIANDO COMENTARIO =>", {
      raw: novoComentario,
      trimmed: novoComentario.trim(),
      length: novoComentario.trim().length,
    });

    if (!texto || !mrhSelecionada || salvando) return;

    try {
      setSalvando(true);
      const token = localStorage.getItem("token");
      const id = Number(mrhSelecionada); // 🔧 AJUSTE

      const res = await fetch(`${API_BASE}/mrhs/${id}/comentarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ comentario: texto }),
      });

      if (!res.ok) {
        const erro = await res.json();
        throw new Error(erro.message || "Erro ao salvar comentário.");
      }

      setNovoComentario("");
      await carregarComentarios(id);
      await carregar(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  }

  /* ================= CORES ================= */
  const getDiasBg = (d) =>
    d == null
      ? "#eef7ee"
      : d <= 0
      ? "#c8f7c5"
      : d <= 3
      ? "#f7f3c5"
      : d <= 6
      ? "#f7d1a9"
      : "#f7b5b5";

  /* ================= COLUNAS ================= */
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
          {p.value ?? 0}
        </div>
      ),
    },
    { field: "mrh", headerName: "MRH", flex: 0.5 },
    { field: "funcao", headerName: "Função", flex: 1 },
    { field: "motivo_admissao", headerName: "Motivo", flex: 0.9 },
    { field: "escala", headerName: "Escala", flex: 0.55 },
    { field: "periodo", headerName: "Período", flex: 0.6 },
    { field: "empresa", headerName: "Empresa", flex: 1.2 },
    { field: "endereco", headerName: "Endereço", flex: 1.4 },
    { field: "cr", headerName: "CR", flex: 1.3 },
    { field: "usuario_abertura", headerName: "Usuário Abertura", flex: 1 },
    { field: "diretor", headerName: "Diretor", flex: 1 },
    { field: "gerente_regional", headerName: "Ger. Regional", flex: 1 },
    { field: "gerente", headerName: "Gerente", flex: 1 },
    { field: "supervisor", headerName: "Supervisor", flex: 1 },
    { field: "responsavel", headerName: "Responsável", flex: 1 },
    {
      field: "total_comentarios",
      headerName: "Obs.",
      flex: 0.35,
      align: "center",
      renderCell: (p) =>
        p.value > 0 ? (
          <span className="badge badge-comentario">{p.value}</span>
        ) : (
          ""
        ),
    },
    {
      field: "total_candidatos",
      headerName: "Cand.",
      flex: 0.35,
      align: "center",
      renderCell: (p) =>
        p.value > 0 ? (
          <span className="badge badge-candidato">{p.value}</span>
        ) : (
          ""
        ),
    },
    {
      field: "acao",
      headerName: "",
      flex: 0.4,
      sortable: false,
      renderCell: (params) => {
        const id = Number(params.row.mrh); // 🔧 AJUSTE

        return (
          <div className="acoes-wrapper">
            <button
              className="action-btn comment-btn"
              title="Comentários"
              onClick={() => {
                setMrhSelecionada(id);
                setNovoComentario(""); // 🔧 reset
                setComentarios([]); // 🔧 evita lixo visual
                setModalComentario(true);
                carregarComentarios(id);
              }}
            >
              <FaRegCommentDots size={12} />
            </button>

            <button
              className="action-btn"
              title="Gerenciar MRH"
              onClick={() =>
                navigate(`/mrhs/${id}/candidatos`, { state: params.row })
              }
            >
              <FaPlus size={11} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className={`mrhs-wrapper ${minimized ? "sidebar-minimized" : ""}`}>
      <div className="mrhs-container">
        <div className="mrhs-header">
          <h2>Admissões Abertas</h2>
          <button
    className="btn-export"
    onClick={exportarExcel}
  >
    Exportar Excel
  </button>
        </div>

        <div className="datagrid-wrapper">
          <DataGrid
            rows={lista.map((r) => ({
              id: Number(r.mrh),
              ...r,
            }))}
            columns={colunas}
            loading={loading}
            density="compact"
            pageSizeOptions={[30]}
            rowHeight={40}
            headerHeight={36}
            disableRowSelectionOnClick
          />
        </div>
      </div>

      {modalComentario && (
        <div className="modal-overlay">
          <div className="modal chat-modal">
            <h3>Comentários da MRH {mrhSelecionada}</h3>

            <div className="chat-messages">
              {comentarios.length === 0 && (
                <div className="chat-empty">Nenhum comentário ainda.</div>
              )}

              {comentarios.map((c) => (
                <div
                  key={c.id}
                  className={`chat-message ${
                    c.usuario_nome === "SISTEMA" ? "sistema" : "usuario"
                  }`}
                >
                  <div className="chat-header">
                    <strong>{c.usuario_nome || "Usuário"}</strong>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div className="chat-text">{c.comentario}</div>
                </div>
              ))}
            </div>

            <div className="chat-input">
              <textarea
                placeholder="Digite uma observação..."
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
              />

              <button
                className="chat-btn primary"
                onClick={salvarComentario}
                disabled={salvando || !novoComentario.trim()}
              >
                {salvando ? "Enviando..." : "Enviar"}
              </button>

              <button
                className="chat-btn secondary"
                onClick={() => {
                  setModalComentario(false);
                  setNovoComentario("");
                  setComentarios([]);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
