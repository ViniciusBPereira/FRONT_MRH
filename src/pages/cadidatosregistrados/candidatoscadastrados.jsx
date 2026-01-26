import React, { useEffect, useState, useCallback, useRef } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { FaTrash } from "react-icons/fa";
import "./candidatoscadastrados.css";
import { api } from "../../services/api";

export default function CandidatosCadastrados() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const refLista = useRef([]);

  /* ===== AUTH HEADER ===== */
  const authHeader = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  // ------------------------------------------------------------
  // 🔄 CARREGAR CANDIDATOS
  // ------------------------------------------------------------
  const carregar = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const res = await api.get("/candidatosregistrados", {
        headers: authHeader(),
      });

      const dados = res.data;
      if (!Array.isArray(dados)) return;

      refLista.current = dados;
      setLista(dados);
    } catch (err) {
      console.error("❌ Erro ao carregar candidatos:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // 🔄 Atualização automática (3s)
  useEffect(() => {
    const timer = setInterval(() => carregar(true), 3000);
    return () => clearInterval(timer);
  }, [carregar]);

  // ------------------------------------------------------------
  // ☑️ ATUALIZAR DESISTENTE
  // ------------------------------------------------------------
  async function atualizarDesistente(id, valor) {
    try {
      await api.patch(
        `/candidatosregistrados/${id}/desistente`,
        { desistente: valor },
        { headers: authHeader() },
      );

      setLista((prev) =>
        prev.map((c) => (c.id === id ? { ...c, desistente: valor } : c)),
      );
    } catch (err) {
      console.error("❌ Erro ao atualizar desistente:", err);
      alert("Erro ao atualizar status de desistente.");
    }
  }

  // ------------------------------------------------------------
  // 🗑️ EXCLUIR CANDIDATO
  // ------------------------------------------------------------
  async function excluir(id, nome) {
    if (!window.confirm(`Deseja excluir o candidato "${nome}"?`)) return;

    try {
      await api.delete(`/candidatosregistrados/${id}`, {
        headers: authHeader(),
      });

      setLista((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("❌ Erro ao excluir candidato:", err);

      if (err.response) {
        alert(err.response.data?.erro || "Erro ao excluir candidato.");
      } else {
        alert("Erro ao conectar com o servidor.");
      }
    }
  }

  // ------------------------------------------------------------
  // 🧱 COLUNAS DO DATAGRID
  // ------------------------------------------------------------
  const colunas = [
    { field: "id", headerName: "ID", width: 80 },

    {
      field: "mrh_id",
      headerName: "MRH",
      width: 90,
      align: "center",
    },

    {
      field: "nome",
      headerName: "Nome",
      flex: 1.2,
      minWidth: 150,
      renderCell: (p) => <span className="ellipsis">{p.value}</span>,
    },

    { field: "cpf", headerName: "CPF", flex: 0.6 },
    { field: "telefone", headerName: "Telefone", flex: 0.6 },
    { field: "email", headerName: "E-mail", flex: 1 },

    {
      field: "endereco",
      headerName: "Endereço",
      flex: 1.4,
      renderCell: (p) => (
        <span className="ellipsis" title={p.value}>
          {p.value}
        </span>
      ),
    },

    {
      field: "status",
      headerName: "Status",
      flex: 0.6,
      renderCell: (p) =>
        p.value === "selecionado" || p.value === "aprovado" ? (
          <span className="tag aprovado">Selecionado</span>
        ) : (
          <span className="tag pendente">Não Selecionado</span>
        ),
    },

    {
      field: "desistente",
      headerName: "Desistente",
      width: 110,
      align: "center",
      sortable: false,
      renderCell: (p) => (
        <input
          type="checkbox"
          checked={!!p.value}
          onChange={(e) => atualizarDesistente(p.row.id, e.target.checked)}
        />
      ),
    },

    {
      field: "docs",
      headerName: "Anexos",
      flex: 0.5,
      renderCell: (p) => {
        const qtd = Array.isArray(p.value) ? p.value.length : 0;
        return qtd > 0 ? (
          <span className="tag aprovado">{qtd} arquivo(s)</span>
        ) : (
          <span className="tag pendente">Nenhum</span>
        );
      },
    },

    {
      field: "acao",
      headerName: "",
      width: 50,
      sortable: false,
      filterable: false,
      align: "center",
      renderCell: (p) => (
        <button
          className="btn-delete"
          title="Excluir candidato"
          onClick={() => excluir(p.row.id, p.row.nome)}
        >
          <FaTrash size={12} />
        </button>
      ),
    },
  ];

  return (
    <div className="candidatos-wrapper">
      <div className="candidatos-header">
        <h2>Banco Geral de Candidatos</h2>
      </div>

      <div className="datagrid-wrapper">
        <DataGrid
          rows={lista.map((c) => ({ id: c.id, ...c }))}
          columns={colunas}
          loading={loading}
          disableRowSelectionOnClick
          density="compact"
          rowHeight={32}
          headerHeight={36}
          pageSizeOptions={[30]}
          paginationModel={{ pageSize: 30, page: 0 }}
          getRowClassName={(params) =>
            params.row.desistente ? "row-desistente" : ""
          }
          sx={{ height: "100% !important" }}
        />
      </div>
    </div>
  );
}
