import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { DataGrid } from "@mui/x-data-grid";
import {
  FaFileCsv,
  FaUserPlus,
  FaRegFileAlt,
  FaPaperclip,
} from "react-icons/fa";
import { api } from "../../services/api";

import "./candidatosMRH.css";

import FichaCandidato from "./fichacandidato";
import DocumentosCandidato from "./documentoscandidato";
import CheckDocsModal from "./checkdocsmodal";

function CandidatosMRH() {
  const { mrhId } = useParams();
  const location = useLocation();
  const mrhData = location.state || {};

  const [candidatos, setCandidatos] = useState([]);
  const candidatosRef = useRef([]);
  const [showCheckDocsModal, setShowCheckDocsModal] = useState(false);

  const [loading, setLoading] = useState(true);

  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  const [candidatoSelecionado, setCandidatoSelecionado] = useState(null);

  const [popupAberto, setPopupAberto] = useState(null);

  const [formNovo, setFormNovo] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    endereco: "",
  });

  /* ---------------- carregar candidatos ----------------*/
  const carregarCandidatos = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);

        const res = await api.get(`/candidatos/${mrhId}`);
        const data = res.data;

        if (!Array.isArray(data)) return;

        candidatosRef.current = data;
        setCandidatos(data);
      } catch (err) {
        console.error("Erro ao carregar candidatos", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [mrhId]
  );

  useEffect(() => {
    carregarCandidatos(false);
  }, [carregarCandidatos]);

  /* ---------------- AUTO-REFRESH AJUSTADO PARA 10s ----------------*/
  useEffect(() => {
    if (showNovoModal || showFichaModal || showDocsModal) return;

    const interval = setInterval(() => carregarCandidatos(true), 10000);
    return () => clearInterval(interval);
  }, [carregarCandidatos, showNovoModal, showFichaModal, showDocsModal]);

  /* ---------------- importar CSV ----------------*/
  async function importarCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("arquivo", file);

    try {
      await api.post(`/candidatos/importar-csv/${mrhId}`, form);

      carregarCandidatos(false);
    } catch (err) {
      console.error("Erro ao importar CSV", err);
    }
  }

  /* ---------------- Alterar Status ----------------*/
  async function alterarStatus(id, novoStatus) {
    try {
      await api.put(`/candidatos/status/${id}`, {
        status: novoStatus,
      });

      setCandidatos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: novoStatus } : c))
      );
      candidatosRef.current = candidatosRef.current.map((c) =>
        c.id === id ? { ...c, status: novoStatus } : c
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  }

  /* ---------------- Atualizar validação ----------------*/
  async function atualizarValidacao(id, campo, valor) {
    const anterior = candidatosRef.current.find((c) => c.id === id)?.[campo];

    try {
      await api.put(`/candidatos/validacao/${id}`, {
        campo,
        valor,
      });

      setCandidatos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c))
      );

      candidatosRef.current = candidatosRef.current.map((c) =>
        c.id === id ? { ...c, [campo]: valor } : c
      );
    } catch (err) {
      console.error("Erro ao atualizar validação:", err);

      if (anterior !== undefined) {
        setCandidatos((prev) =>
          prev.map((c) => (c.id === id ? { ...c, [campo]: anterior } : c))
        );

        candidatosRef.current = candidatosRef.current.map((c) =>
          c.id === id ? { ...c, [campo]: anterior } : c
        );
      }
    }
  }

  /* ---------------- Lista de validações ----------------*/
  const validacoesCampos = [
    { label: "APT", campo: "validacaoAPT" },
    { label: "CARD", campo: "validacaoCARD" },
    { label: "Ocorrências", campo: "validacaoOcorrencias" },
    { label: "PF", campo: "validacaoBrickPF" },
    { label: "Mandado", campo: "validacaoBrickMandado" },
    { label: "Processos", campo: "validacaoBrickProcessos" },
    { label: "2ª Etapa", campo: "validacaoSegundaEtapa" },
    { label: "Currículo App", campo: "validacaoCurriculoGPSvc" },
    { label: "Reservista", campo: "validacaoReservista" },
  ];

  const opcoesValidacao = [
    "pendente",
    "aprovado",
    "rejeitado",
    "não necessário",
  ];

  /* ---------------- MODAL DE VALIDAÇÕES ----------------*/
  function ValidacoesModal() {
    if (!popupAberto) return null;

    const row = candidatos.find((c) => c.id === popupAberto);
    if (!row) return null;

    return (
      <div className="val-modal-overlay" onClick={() => setPopupAberto(null)}>
        <div className="val-modal" onClick={(e) => e.stopPropagation()}>
          <h3>Validações – {row.nome}</h3>

          {validacoesCampos.map((v) => (
            <div key={v.campo} className="val-row">
              <span>{v.label}</span>

              <select
                value={row[v.campo] ?? "pendente"}
                onChange={(e) =>
                  atualizarValidacao(row.id, v.campo, e.target.value)
                }
              >
                {opcoesValidacao.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <button className="fechar-btn" onClick={() => setPopupAberto(null)}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- DROPDOWN PARA ABRIR MODAL ----------------*/
  function ValidacoesDropdown({ row }) {
    return (
      <button className="val-toggle" onClick={() => setPopupAberto(row.id)}>
        Validações ▾
      </button>
    );
  }

  /* ---------------- COLUNAS GRID ----------------*/
  const colunas = [
    { field: "nome", headerName: "Nome", flex: 1 },
    { field: "cpf", headerName: "CPF", flex: 0.6 },
    { field: "telefone", headerName: "Telefone", flex: 0.7 },
    { field: "email", headerName: "E-mail", flex: 1 },

    {
      field: "validacoes",
      headerName: "Validações",
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: (p) => <ValidacoesDropdown row={p.row} />,
    },

    {
      field: "documentacao",
      headerName: "Documentação",
      flex: 0.7,
      minWidth: 160,
      sortable: false,
      renderCell: (p) => (
        <button className="btn-docs" onClick={() => abrirDocumentacao(p.row)}>
          📄 Documentação
        </button>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.6,
      minWidth: 140,
      sortable: false,
      renderCell: (p) => (
        <select
          className="status-dropdown"
          value={p.row.status || ""}
          onChange={(e) => alterarStatus(p.row.id, e.target.value)}
        >
          <option value="">Não Selecionado</option>
          <option value="Selecionado">Selecionado</option>
        </select>
      ),
    },

    {
      field: "ficha",
      headerName: "Ficha",
      flex: 0.5,
      renderCell: (p) =>
        p.row.ficha_id ? (
          <span className="status-tag status-ficha">Com Ficha</span>
        ) : (
          <span className="status-tag status-sem-ficha">Sem Ficha</span>
        ),
    },

    {
      field: "anexos",
      headerName: "Anexos",
      flex: 0.5,
      renderCell: (p) => {
        const qtd = Array.isArray(p.row.docs) ? p.row.docs.length : 0;
        return qtd > 0 ? (
          <span className="status-tag status-ficha">Com Anexo ({qtd})</span>
        ) : (
          <span className="status-tag status-sem-ficha">Sem Anexo</span>
        );
      },
    },

    {
      field: "acoes_ficha",
      headerName: "",
      flex: 0.2,
      sortable: false,
      renderCell: (p) => (
        <button className="btn-ficha" onClick={() => abrirFicha(p.row)}>
          <FaRegFileAlt size={15} />
        </button>
      ),
    },

    {
      field: "docs",
      headerName: "",
      flex: 0.2,
      sortable: false,
      renderCell: (p) => (
        <button className="btn-ficha" onClick={() => abrirDocumentos(p.row)}>
          <FaPaperclip size={15} />
        </button>
      ),
    },
  ];
  function abrirDocumentacao(row) {
    setCandidatoSelecionado(row);
    setShowCheckDocsModal(true);
  }

  /* ---------------- ABRIR FICHA ----------------*/
  function abrirFicha(row) {
    setCandidatoSelecionado(row);
    setShowFichaModal(true);
  }

  /* ---------------- ABRIR DOCUMENTOS ----------------*/
  function abrirDocumentos(row) {
    setCandidatoSelecionado(row);
    setShowDocsModal(true);
  }

  /* ---------------- RENDER ----------------*/
  return (
    <div className="candidatos-wrapper">
      <div className="candidatos-header">
        <div>
          <h2>Gestão de Candidatos – MRH {mrhId}</h2>
          <p className="mrh-desc">
            <strong>Função:</strong> {mrhData.funcao} |{" "}
            <strong>Empresa:</strong> {mrhData.empresa} |{" "}
            <strong>Endereço:</strong> {mrhData.endereco}
          </p>
        </div>

        <div className="header-btns">
          {/* IMPORTAR CSV */}
          <label className="btn csv-btn">
            <FaFileCsv size={14} /> Importar CSV
            <input type="file" accept=".csv" hidden onChange={importarCSV} />
          </label>

          {/* NOVO CANDIDATO */}
          <button
            className="btn add-btn"
            onClick={() => setShowNovoModal(true)}
          >
            <FaUserPlus size={14} /> Novo Candidato
          </button>
        </div>
      </div>

      <div className="datagrid-wrapper">
        <DataGrid
          rows={candidatos.map((c) => ({ id: c.id, ...c }))}
          columns={colunas}
          loading={loading}
          disableRowSelectionOnClick
          density="compact"
          rowHeight={32}
          headerHeight={36}
          sx={{ height: "100% !important" }}
        />
      </div>

      <ValidacoesModal />

      {/* MODAL FICHA */}
      {showFichaModal && candidatoSelecionado && (
        <FichaCandidato
          candidato={candidatoSelecionado}
          fechar={() => setShowFichaModal(false)}
          atualizarLista={() => carregarCandidatos(false)}
        />
      )}

      {/* MODAL DOCUMENTOS CHECK */}
      {showCheckDocsModal && candidatoSelecionado && (
        <CheckDocsModal
          candidato={candidatoSelecionado}
          fechar={() => setShowCheckDocsModal(false)}
        />
      )}

      {/* MODAL DOCUMENTOS */}
      {showDocsModal && candidatoSelecionado && (
        <DocumentosCandidato
          candidato={candidatoSelecionado}
          fechar={() => setShowDocsModal(false)}
        />
      )}

      {/* MODAL NOVO */}
      {showNovoModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Novo Candidato</h3>
            </div>

            <div className="modal-form">
              <label>Nome</label>
              <input
                value={formNovo.nome}
                onChange={(e) =>
                  setFormNovo({ ...formNovo, nome: e.target.value })
                }
              />

              <label>CPF</label>
              <input
                value={formNovo.cpf}
                onChange={(e) =>
                  setFormNovo({ ...formNovo, cpf: e.target.value })
                }
              />

              <label>Telefone</label>
              <input
                value={formNovo.telefone}
                onChange={(e) =>
                  setFormNovo({ ...formNovo, telefone: e.target.value })
                }
              />

              <label>Email</label>
              <input
                value={formNovo.email}
                onChange={(e) =>
                  setFormNovo({ ...formNovo, email: e.target.value })
                }
              />

              <label>Endereço</label>
              <input
                value={formNovo.endereco}
                onChange={(e) =>
                  setFormNovo({ ...formNovo, endereco: e.target.value })
                }
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowNovoModal(false)}
              >
                Cancelar
              </button>

              <button
                className="btn-save"
                onClick={async () => {
                  try {
                    await api.post(`/candidatos/${mrhId}`, formNovo);

                    setShowNovoModal(false);
                    setFormNovo({
                      nome: "",
                      cpf: "",
                      telefone: "",
                      email: "",
                      endereco: "",
                    });

                    carregarCandidatos(false);
                  } catch (err) {
                    console.error("Erro criar candidato", err);
                    alert("Erro ao criar candidato.");
                  }
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CandidatosMRH;
