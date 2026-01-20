import React, { useEffect, useState, useRef, useCallback } from "react";
import { DataGrid } from "@mui/x-data-grid";
import ExcelJS from "exceljs";
import "./mrhsagendamento.css";
import { useSidebar } from "../../components/sidebarcontext";
import { api } from "../../services/api";

export default function MRHsAgendamento() {
  const minimized = useSidebar?.()?.minimized ?? false;

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const listaRef = useRef([]);

  /* ===== CONTROLE DE EDIÇÃO INLINE ===== */
  const [editando, setEditando] = useState({});

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
        n.exame !== a.exame ||
        n.uniformes !== a.uniformes ||
        n.data_integracao !== a.data_integracao ||
        n.data_admissao !== a.data_admissao
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

      const res = await api.get("/mrhsagendamento", {
        headers: authHeader(),
      });

      const dados = res.data;
      if (!Array.isArray(dados)) return;

      if (dadosMudaram(dados, listaRef.current)) {
        listaRef.current = dados;
        setLista(dados);
      }
    } catch (err) {
      console.error("❌ Erro ao carregar agendamentos:", err);
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

  /* ===== AUTO SAVE ===== */
  async function salvarCampo(mrh, campo, valor) {
    try {
      await api.patch(
        `/mrhsagendamento/${campo}/${mrh}`,
        { valor },
        { headers: authHeader() }
      );
    } catch (err) {
      console.error(`[AGENDAMENTO] Erro ao salvar ${campo}`, err);
    }
  }

  /* ===== INPUT PADRÃO ===== */
  const renderInput = (campo) => (params) => {
    const mrh = params.row.mrh;

    return (
      <input
        value={
          editando[`${campo}_${mrh}`] !== undefined
            ? editando[`${campo}_${mrh}`]
            : params.value || ""
        }
        onChange={(e) =>
          setEditando((p) => ({
            ...p,
            [`${campo}_${mrh}`]: e.target.value,
          }))
        }
        onBlur={() => {
          const valor = editando[`${campo}_${mrh}`] ?? params.value ?? "";

          salvarCampo(mrh, campo, valor);

          setLista((prev) =>
            prev.map((i) => (i.mrh === mrh ? { ...i, [campo]: valor } : i))
          );
        }}
        className="inline-input"
      />
    );
  };

  /* ===== EXPORTAÇÃO EXCEL (.xlsx) ===== */
  async function exportarExcel() {
    if (!lista.length) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Agendamento");

    sheet.columns = [
      { header: "MRH", key: "mrh", width: 12 },
      { header: "Colaborador", key: "nome_colaborador", width: 30 },
      { header: "CPF", key: "cpf_colaborador", width: 18 },
      { header: "Função", key: "funcao", width: 25 },
      { header: "Empresa", key: "empresa", width: 30 },
      { header: "CR", key: "cr", width: 35 },
      { header: "Exame", key: "exame", width: 15 },
      { header: "Uniformes", key: "uniformes", width: 40 },
      { header: "Integração", key: "data_integracao", width: 18 },
      { header: "Admissão", key: "data_admissao", width: 18 },
    ];

    lista.forEach((item) => {
      sheet.addRow({
        mrh: item.mrh,
        nome_colaborador: item.nome_colaborador,
        cpf_colaborador: item.cpf_colaborador,
        funcao: item.funcao,
        empresa: item.empresa,
        cr: item.cr,
        exame: item.exame,
        uniformes: item.uniformes,
        data_integracao: item.data_integracao,
        data_admissao: item.data_admissao,
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
    a.download = `agendamento_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ===== COLUNAS ===== */
  const colunas = [
    { field: "mrh", headerName: "MRH", flex: 0.5 },
    { field: "nome_colaborador", headerName: "Colaborador", flex: 1.3 },
    { field: "cpf_colaborador", headerName: "CPF", flex: 0.9 },
    { field: "funcao", headerName: "Função", flex: 1 },
    { field: "empresa", headerName: "Empresa", flex: 1.3 },
    { field: "cr", headerName: "CR", flex: 1.3 },
    {
      field: "exame",
      headerName: "Exame",
      flex: 1,
      sortable: false,
      renderCell: renderInput("exame"),
    },
    {
      field: "uniformes",
      headerName: "Uniformes",
      flex: 1.5,
      sortable: false,
      renderCell: renderInput("uniformes"),
    },
    {
      field: "data_integracao",
      headerName: "Integração",
      flex: 1,
      sortable: false,
      renderCell: renderInput("data_integracao"),
    },
    {
      field: "data_admissao",
      headerName: "Admissão",
      flex: 1,
      sortable: false,
      renderCell: renderInput("data_admissao"),
    },
  ];

  return (
    <div className={`mrhs-wrapper ${minimized ? "sidebar-minimized" : ""}`}>
      <div className="mrhs-container">
        <div className="mrhs-header">
          <h2>Agendamento</h2>
        </div>

        <div className="table-actions">
          <button
            className="btn-export-excel"
            onClick={exportarExcel}
            title="Exportar para Excel"
          >
            Exportar
          </button>
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
            rowHeight={44}
            headerHeight={36}
          />
        </div>
      </div>
    </div>
  );
}
