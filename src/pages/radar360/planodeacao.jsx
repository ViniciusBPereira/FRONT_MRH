import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import "./planodeacao.css";
import {downloadActionPlanPdf} from "./actionPlanPdf.jsx";

export default function ActionPlan({
  actions: actionsProp = [],
  contracts: contractsProp = [],
  bpSelecionado = "",
  contratoSelecionado = "",
}) {
  /* ============================================================
     AUTH
  ============================================================ */

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  /* ============================================================
     HELPERS
  ============================================================ */
  const [exportingPdf, setExportingPdf] =
    useState(false);

  function normalizeText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      const text = normalizeText(value);

      if (text) {
        return text;
      }
    }

    return "";
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    const raw = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split("-");

      return `${day}/${month}/${year}`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("pt-BR");
  }

  function formatMonth(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
  }

  /* ============================================================
     FORM
  ============================================================ */

  const emptyForm = {
    contract_id: "",
    description: "",
    execution_plan: "",
    indicators: "",
    responsible: "",
    due_date: "",
    status: "A fazer",
  };

  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ============================================================
     AÇÕES
  ============================================================ */

  const [localActions, setLocalActions] = useState(
    Array.isArray(actionsProp) ? actionsProp : [],
  );

  /* ============================================================
     CONTRATOS
  ============================================================ */

  const [contracts, setContracts] = useState(
    Array.isArray(contractsProp) ? contractsProp : [],
  );

  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState("");

  /* ============================================================
     ARQUIVOS
  ============================================================ */

  const [selectedAction, setSelectedAction] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  /* ============================================================
     SINCRONIZAR AÇÕES VINDAS DO PAI

     IMPORTANTE:
     Radar360Dashboard já envia filteredActionPlans.

     Então NÃO devemos tentar comparar contratoSelecionado
     diretamente com contract_id novamente.
  ============================================================ */

  useEffect(() => {
    if (Array.isArray(actionsProp)) {
      setLocalActions(actionsProp);
    }
  }, [actionsProp]);

  /* ============================================================
     CARREGAR CONTRATOS
  ============================================================ */

  async function loadContracts() {
    try {
      setContractsLoading(true);
      setContractsError("");

      const response = await api.get("/contracts", {
        headers: authHeader(),
      });

      const data = response.data;

      if (Array.isArray(data)) {
        setContracts(data);
        return;
      }

      if (Array.isArray(data?.contracts)) {
        setContracts(data.contracts);
        return;
      }

      if (Array.isArray(data?.data)) {
        setContracts(data.data);
        return;
      }

      setContracts([]);

      setContractsError(
        "A API de contratos não retornou uma lista válida.",
      );
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao carregar contratos:",
        error.response?.data || error,
      );

      setContracts([]);

      setContractsError(
        error.response?.data?.message ||
          "Não foi possível carregar os contratos.",
      );
    } finally {
      setContractsLoading(false);
    }
  }

  useEffect(() => {
    loadContracts();
  }, []);

  /* ============================================================
     NORMALIZAR CONTRATOS
  ============================================================ */

  const normalizedContracts = useMemo(() => {
    if (!Array.isArray(contracts)) {
      return [];
    }

    return contracts
      .map((contract) => {
        if (!contract || typeof contract !== "object") {
          return null;
        }

        const id =
          contract.id ??
          contract.contract_id ??
          contract.contractId;

        if (
          id === undefined ||
          id === null ||
          String(id).trim() === ""
        ) {
          return null;
        }

        const name = firstNonEmpty(
          contract.contract,
          contract.cr,
          contract.name,
          contract.contract_name,
          contract.contractName,
          contract.number,
          contract.code,
          contract.description,
          `Contrato #${id}`,
        );

        return {
          id: String(id),
          name,
          original: contract,
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [contracts]);

  /* ============================================================
     CONTRATO ESCOLHIDO NO FILTRO GLOBAL

     contratoSelecionado contém o CR/nome, não o UUID.
     Aqui transformamos o CR no ID real do contrato.
  ============================================================ */

  const selectedContract = useMemo(() => {
    if (!contratoSelecionado) {
      return null;
    }

    const selected = normalizeText(contratoSelecionado);

    return (
      normalizedContracts.find((contract) => {
        const original = contract.original;

        const candidates = [
          contract.id,
          contract.name,
          original?.cr,
          original?.contract,
          original?.contract_number,
          original?.contractNumber,
          original?.name,
          original?.code,
        ]
          .map(normalizeText)
          .filter(Boolean);

        return candidates.includes(selected);
      }) || null
    );
  }, [normalizedContracts, contratoSelecionado]);

  /* ============================================================
     SINCRONIZAR FORMULÁRIO COM O FILTRO GLOBAL
  ============================================================ */

  useEffect(() => {
    if (editingId) {
      return;
    }

    /*
      Agora usamos o ID real encontrado em /contracts.
      Não colocamos o texto do CR dentro de contract_id.
    */
    if (selectedContract?.id) {
      setForm((old) => ({
        ...old,
        contract_id: selectedContract.id,
      }));

      return;
    }

    if (!contratoSelecionado) {
      return;
    }
  }, [
    contratoSelecionado,
    selectedContract,
    editingId,
  ]);

  /* ============================================================
     AÇÕES EXIBIDAS

     O PAI JÁ ENTREGA AS AÇÕES FILTRADAS.

     Mantemos apenas uma validação de fallback caso o componente
     seja usado isoladamente no futuro.
  ============================================================ */

  const filteredActions = useMemo(() => {
    if (!Array.isArray(localActions)) {
      return [];
    }

    if (!contratoSelecionado) {
      return localActions;
    }

    /*
      Caso o dashboard já tenha filtrado corretamente,
      não precisamos remover mais nada.
    */
    if (!selectedContract) {
      return localActions;
    }

    const selectedId = String(selectedContract.id);
    const selectedCR = normalizeText(contratoSelecionado);

    return localActions.filter((item) => {
      const itemContractId = normalizeText(
        item?.contract_id ?? item?.contractId,
      );

      const itemCR = firstNonEmpty(
        item?.cr,
        item?.contract,
        item?.contract_number,
        item?.contractNumber,
      );

      /*
        Aceitamos tanto vínculo por UUID quanto pelo CR.
      */
      return (
        itemContractId === selectedId ||
        itemCR === selectedCR
      );
    });
  }, [
    localActions,
    contratoSelecionado,
    selectedContract,
  ]);

  /* ============================================================
     ESTATÍSTICAS
  ============================================================ */

  const stats = useMemo(() => {
    const total = filteredActions.length;

    const completed = filteredActions.filter(
      (action) => action.status === "Concluído",
    ).length;

    const running = filteredActions.filter(
      (action) => action.status === "Em andamento",
    ).length;

    const pending = filteredActions.filter(
      (action) =>
        action.status === "A fazer" ||
        action.status === "Planejado",
    ).length;

    const delayed = filteredActions.filter((action) => {
      if (
        action.status === "Concluído" ||
        !action.due_date
      ) {
        return false;
      }

      const due = new Date(
        `${String(action.due_date).slice(0, 10)}T00:00:00`,
      );

      const today = new Date();

      today.setHours(0, 0, 0, 0);

      return due < today;
    }).length;

    const progress =
      total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    return {
      total,
      completed,
      running,
      pending,
      delayed,
      progress,
    };
  }, [filteredActions]);

  /* ============================================================
     ALTERAR FORM
  ============================================================ */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  /* ============================================================
     LIMPAR FORM
  ============================================================ */

  function clearForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,

      contract_id:
        selectedContract?.id || "",
    });
  }

  /* ============================================================
     SALVAR
  ============================================================ */

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.contract_id) {
      alert("Selecione um contrato.");
      return;
    }

    if (!form.description.trim()) {
      alert("Informe a descrição da ação.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        contract_id: form.contract_id,

        description:
          form.description.trim(),

        execution_plan:
          form.execution_plan.trim() || null,

        indicators:
          form.indicators.trim() || null,

        responsible:
          form.responsible.trim() || null,

        due_date:
          form.due_date || null,

        status:
          form.status || "A fazer",
      };

      let response;

      if (editingId) {
        response = await api.put(
          `/actions/${editingId}`,
          payload,
          {
            headers: authHeader(),
          },
        );
      } else {
        response = await api.post(
          "/actions",
          payload,
          {
            headers: authHeader(),
          },
        );
      }

      const savedAction = response.data;

      if (editingId) {
        setLocalActions((old) =>
          old.map((item) =>
            String(item.id) === String(editingId)
              ? savedAction
              : item,
          ),
        );

        alert("Plano atualizado com sucesso.");
      } else {
        setLocalActions((old) => [
          savedAction,
          ...old,
        ]);

        alert("Plano criado com sucesso.");
      }

      clearForm();
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao salvar plano:",
        error,
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Erro ao salvar plano de ação.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     EDITAR
  ============================================================ */

  function handleEdit(action) {
    setEditingId(action.id);

    setForm({
      contract_id:
        action.contract_id !== undefined &&
        action.contract_id !== null
          ? String(action.contract_id)
          : "",

      description:
        action.description || "",

      execution_plan:
        action.execution_plan || "",

      indicators:
        action.indicators || "",

      responsible:
        action.responsible || "",

      due_date:
        action.due_date
          ? String(action.due_date).slice(0, 10)
          : "",

      status:
        action.status || "A fazer",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* ============================================================
     EXCLUIR
  ============================================================ */

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Deseja excluir este plano de ação?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/actions/${id}`, {
        headers: authHeader(),
      });

      setLocalActions((old) =>
        old.filter(
          (item) =>
            String(item.id) !== String(id),
        ),
      );

      if (
        selectedAction &&
        String(selectedAction.id) === String(id)
      ) {
        setSelectedAction(null);
      }

      alert("Plano excluído com sucesso.");
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao excluir:",
        error.response?.data || error,
      );

      alert(
        error.response?.data?.message ||
          "Erro ao excluir ação.",
      );
    }
  }

  /* ============================================================
     SINAL
  ============================================================ */

  function getSignal(action) {
    if (action.status === "Concluído") {
      return {
        text: "Concluído",
        className: "success",
      };
    }

    if (!action.due_date) {
      return {
        text: "Sem prazo",
        className: "neutral",
      };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const rawDate =
      String(action.due_date).slice(0, 10);

    const due = new Date(
      `${rawDate}T00:00:00`,
    );

    const diff = Math.ceil(
      (due - today) /
        (1000 * 60 * 60 * 24),
    );

    if (diff < 0) {
      return {
        text: "Atrasado",
        className: "danger",
      };
    }

    if (diff === 0) {
      return {
        text: "Vence hoje",
        className: "warning",
      };
    }

    if (diff <= 7) {
      return {
        text: `${diff}d restantes`,
        className: "warning",
      };
    }

    return {
      text: "No prazo",
      className: "success",
    };
  }

  /* ============================================================
     STATUS
  ============================================================ */

  function getStatusClass(status) {
    if (status === "Concluído") {
      return "completed";
    }

    if (status === "Em andamento") {
      return "running";
    }

    return "pending";
  }

  /* ============================================================
     CONTRATO
  ============================================================ */

  function getContractName(contractId, action = null) {
    /*
      Primeiro utiliza o CR já enriquecido pelo dashboard.
    */
    const directName = firstNonEmpty(
      action?.cr,
      action?.contract,
      action?.contract_number,
      action?.contractNumber,
    );

    if (directName) {
      return directName;
    }

    if (
      contractId === undefined ||
      contractId === null ||
      contractId === ""
    ) {
      return "Contrato não informado";
    }

    const contract =
      normalizedContracts.find(
        (item) =>
          String(item.id) === String(contractId),
      );

    return (
      contract?.name ||
      `Contrato #${contractId}`
    );
  }

  /* ============================================================
   EXPORTAR PDF
============================================================ */

async function handleExportPdf() {
  if (!filteredActions.length) {
    alert(
      "Não existem planos de ação no filtro atual para exportar.",
    );

    return;
  }

  try {
    setExportingPdf(true);

    /*
      Normalizamos os dados antes de entregar
      para o documento PDF.

      Dessa forma o componente responsável pelo
      PDF não precisa conhecer a estrutura interna
      da tela.
    */
    const plansForPdf =
      filteredActions.map((item) => {
        const signal =
          getSignal(item);

        return {
          id:
            item.id,

          contract:
            getContractName(
              item.contract_id,
              item,
            ),

          description:
            item.description,

          execution_plan:
            item.execution_plan,

          indicators:
            item.indicators,

          responsible:
            item.responsible,

          due_date:
            item.due_date,

          status:
            item.status,

          condition:
            signal.text,

          created_at:
            item.created_at,

          file_count:
            Array.isArray(item.files)
              ? item.files.length
              : 0,
        };
      });

    await downloadActionPlanPdf({
      plans: plansForPdf,

      bpSelecionado,

      contratoSelecionado,

      stats,
    });
  } catch (error) {
    console.error(
      "[ACTION PDF] Erro ao gerar relatório:",
      error,
    );

    alert(
      error?.message ||
        "Não foi possível gerar o PDF.",
    );
  } finally {
    setExportingPdf(false);
  }
}

  /* ============================================================
     ARQUIVOS
  ============================================================ */

  async function handleFiles(action) {
    setSelectedAction(action);
    setFiles([]);
    setSelectedFiles([]);

    try {
      const { data } = await api.get(
        `/actions/${action.id}/files`,
        {
          headers: authHeader(),
        },
      );

      setFiles(
        Array.isArray(data)
          ? data
          : [],
      );
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao carregar arquivos:",
        error.response?.data || error,
      );

      alert(
        error.response?.data?.message ||
          "Erro ao carregar arquivos.",
      );
    }
  }

  async function uploadActionFiles() {
    if (
      !selectedAction ||
      !selectedFiles.length
    ) {
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      setUploading(true);

      const { data } = await api.post(
        `/actions/${selectedAction.id}/files`,
        formData,
        {
          headers: {
            ...authHeader(),
            "Content-Type":
              "multipart/form-data",
          },
        },
      );

      setFiles(
        Array.isArray(data)
          ? data
          : [],
      );

      setSelectedFiles([]);

      setLocalActions((old) =>
        old.map((item) =>
          String(item.id) ===
          String(selectedAction.id)
            ? {
                ...item,
                files: Array.isArray(data)
                  ? data
                  : [],
              }
            : item,
        ),
      );

      alert("Arquivos enviados com sucesso.");
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro no upload:",
        error.response?.data || error,
      );

      alert(
        error.response?.data?.message ||
          "Erro ao enviar arquivos.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function downloadFile(file) {
    if (!selectedAction || !file) {
      return;
    }

    try {
      const response = await api.get(
        `/actions/${selectedAction.id}/files/${file.id}`,
        {
          headers: authHeader(),
          responseType: "blob",
        },
      );

      const blobUrl =
        window.URL.createObjectURL(
          new Blob([response.data]),
        );

      const link =
        document.createElement("a");

      link.href = blobUrl;

      link.download =
        file.originalName ||
        file.name ||
        "arquivo";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao baixar arquivo:",
        error.response?.data || error,
      );

      alert("Erro ao baixar arquivo.");
    }
  }

  async function removeFile(fileId) {
    if (!window.confirm("Excluir arquivo?")) {
      return;
    }

    if (!selectedAction) {
      return;
    }

    try {
      await api.delete(
        `/actions/${selectedAction.id}/files/${fileId}`,
        {
          headers: authHeader(),
        },
      );

      setFiles((old) =>
        old.filter(
          (file) =>
            String(file.id) !== String(fileId),
        ),
      );

      setLocalActions((old) =>
        old.map((item) => {
          if (
            String(item.id) !==
            String(selectedAction.id)
          ) {
            return item;
          }

          return {
            ...item,

            files: Array.isArray(item.files)
              ? item.files.filter(
                  (file) =>
                    String(file.id) !==
                    String(fileId),
                )
              : [],
          };
        }),
      );
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao excluir arquivo:",
        error.response?.data || error,
      );

      alert(
        error.response?.data?.message ||
          "Erro ao excluir arquivo.",
      );
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="action-page">
      {/* ======================================================
          HEADER EXECUTIVO
      ====================================================== */}

      <section className="action-hero">
        <div className="action-hero-copy">
          <span className="action-eyebrow">
            Execução assistida
          </span>

          <h1>Plano de Ação</h1>

          <p>
            Estruture iniciativas, acompanhe responsáveis,
            prazos e resultados dos contratos.
          </p>
        </div>

        <div className="action-hero-side">
        <div className="action-hero-context">
          <span>Visão atual</span>

          <strong>
            {contratoSelecionado ||
              "Todos os contratos"}
          </strong>

          <small>
            {stats.total} plano
            {stats.total !== 1 ? "s" : ""} encontrado
            {stats.total !== 1 ? "s" : ""}
          </small>
        </div>

        <button
          type="button"
          className="action-export-btn"
          onClick={handleExportPdf}
          disabled={
            exportingPdf ||
            filteredActions.length === 0
          }
        >
          <span className="action-export-icon">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M6 2.75h8l4 4V21.25H6V2.75Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />

              <path
                d="M14 2.75v4h4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />

              <path
                d="M12 10v6m0 0-2.5-2.5M12 16l2.5-2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span className="action-export-copy">
            <strong>
              {exportingPdf
                ? "Gerando PDF..."
                : "Exportar PDF"}
            </strong>

            <small>
              Relatório do filtro atual
            </small>
          </span>
        </button>
      </div>
      </section>

      {/* ======================================================
          INDICADORES
      ====================================================== */}

      <section className="action-kpi-grid">
        <article className="action-kpi">
          <div className="action-kpi-icon">
            01
          </div>

          <div>
            <span>Total de planos</span>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className="action-kpi">
          <div className="action-kpi-icon">
            02
          </div>

          <div>
            <span>Em andamento</span>
            <strong>{stats.running}</strong>
          </div>
        </article>

        <article className="action-kpi">
          <div className="action-kpi-icon danger">
            !
          </div>

          <div>
            <span>Atrasados</span>
            <strong>{stats.delayed}</strong>
          </div>
        </article>

        <article className="action-kpi">
          <div className="action-kpi-icon success">
            ✓
          </div>

          <div>
            <span>Concluídos</span>
            <strong>{stats.completed}</strong>
          </div>
        </article>
      </section>

      {/* ======================================================
          FORMULÁRIO
      ====================================================== */}

      <section className="action-editor">
        <div className="action-section-header">
          <div>
            <span className="section-kicker">
              {editingId
                ? "Editando plano"
                : "Novo plano"}
            </span>

            <h2>
              {editingId
                ? "Atualizar plano de ação"
                : "Cadastrar plano de ação"}
            </h2>
          </div>

          {editingId && (
            <button
              type="button"
              className="action-cancel-edit"
              onClick={clearForm}
            >
              Cancelar edição
            </button>
          )}
        </div>

        <form
          className="action-form"
          onSubmit={handleSubmit}
        >
          <div className="action-form-main">
            <label className="action-field contract-field">
              <span>Contrato</span>

              <select
                name="contract_id"
                value={form.contract_id}
                onChange={handleChange}
                required
                disabled={contractsLoading}
              >
                <option value="">
                  {contractsLoading
                    ? "Carregando contratos..."
                    : "Selecione um contrato"}
                </option>

                {normalizedContracts.map(
                  (contract) => (
                    <option
                      key={contract.id}
                      value={contract.id}
                    >
                      {contract.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="action-field description-field">
              <span>Ação</span>

              <input
                name="description"
                placeholder="Ex.: Implantar rotina preventiva de absenteísmo"
                value={form.description}
                onChange={handleChange}
                required
              />
            </label>

            <label className="action-field responsible-field">
              <span>Responsável</span>

              <input
                name="responsible"
                placeholder="Nome ou área"
                value={form.responsible}
                onChange={handleChange}
              />
            </label>

            <label className="action-field date-field">
              <span>Prazo</span>

              <input
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
              />
            </label>

            <label className="action-field status-field">
              <span>Status</span>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="A fazer">
                  A fazer
                </option>

                <option value="Em andamento">
                  Em andamento
                </option>

                <option value="Concluído">
                  Concluído
                </option>
              </select>
            </label>
          </div>

          <div className="action-form-details">
            <label className="action-field">
              <span>Plano de execução</span>

              <textarea
                rows={5}
                name="execution_plan"
                placeholder="Descreva como esta ação será executada, etapas, responsáveis envolvidos e abordagem..."
                value={form.execution_plan}
                onChange={handleChange}
              />
            </label>

            <label className="action-field">
              <span>Indicadores de acompanhamento</span>

              <textarea
                rows={5}
                name="indicators"
                placeholder="Defina métricas, evidências e critérios que indicarão a evolução ou conclusão..."
                value={form.indicators}
                onChange={handleChange}
              />
            </label>
          </div>

          {contractsError && (
            <div className="action-inline-error">
              <span>{contractsError}</span>

              <button
                type="button"
                onClick={loadContracts}
              >
                Tentar novamente
              </button>
            </div>
          )}

          <div className="action-form-footer">
            <div className="form-hint">
              <span className="form-hint-dot" />

              Os campos Ação e Contrato são obrigatórios.
            </div>

            <div className="form-actions">
              {editingId && (
                <button
                  type="button"
                  className="action-secondary-btn"
                  onClick={clearForm}
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                className="action-primary-btn"
                disabled={
                  loading ||
                  contractsLoading ||
                  normalizedContracts.length === 0
                }
              >
                {loading
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Adicionar plano"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* ======================================================
          PROGRESSO
      ====================================================== */}

      <section className="action-progress-card">
        <div className="action-progress-top">
          <div>
            <span className="section-kicker">
              Evolução
            </span>

            <h3>Andamento dos planos</h3>
          </div>

          <div className="action-progress-value">
            <strong>{stats.progress}%</strong>
            <span>concluído</span>
          </div>
        </div>

        <div className="action-progress-track">
          <div
            className="action-progress-fill"
            style={{
              width: `${stats.progress}%`,
            }}
          />
        </div>

        <div className="action-progress-caption">
          <span>
            {stats.completed} concluído
            {stats.completed !== 1 ? "s" : ""}
          </span>

          <span>
            {stats.running} em andamento
          </span>

          <span>
            {stats.pending} pendente
            {stats.pending !== 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {/* ======================================================
          PLANOS
      ====================================================== */}

      <section className="action-list-section">
        <div className="action-section-header">
          <div>
            <span className="section-kicker">
              Gestão
            </span>

            <h2>Planos cadastrados</h2>

            <p>
              Visualização detalhada das ações do filtro atual.
            </p>
          </div>

          <div className="action-list-count">
            {filteredActions.length}
          </div>
        </div>

        {filteredActions.length === 0 ? (
          <div className="action-empty">
            <div className="action-empty-icon">
              +
            </div>

            <strong>
              Nenhum plano encontrado
            </strong>

            <span>
              Não há planos de ação para o filtro selecionado.
            </span>
          </div>
        ) : (
          <div className="action-plan-list">
            {filteredActions.map((item) => {
              const signal = getSignal(item);

              const contractName =
                getContractName(
                  item.contract_id,
                  item,
                );

              return (
                <article
                  className="action-plan-card"
                  key={item.id}
                >
                  {/* CABEÇALHO */}

                  <div className="plan-card-header">
                    <div className="plan-main-info">
                      <div className="plan-contract-line">
                        <span className="plan-contract">
                          {contractName}
                        </span>

                        <span className="plan-period">
                          {formatMonth(
                            item.created_at,
                          )}
                        </span>
                      </div>

                      <h3>
                        {item.description ||
                          "Ação não informada"}
                      </h3>
                    </div>

                    <div className="plan-badges">
                      <span
                        className={`plan-status ${getStatusClass(
                          item.status,
                        )}`}
                      >
                        {item.status ||
                          "Sem status"}
                      </span>

                      <span
                        className={`plan-signal ${signal.className}`}
                      >
                        {signal.text}
                      </span>
                    </div>
                  </div>

                  {/* CONTEÚDO */}

                  <div className="plan-content-grid">
                    <div className="plan-content-block">
                      <span className="plan-content-label">
                        Execução
                      </span>

                      <p>
                        {item.execution_plan ||
                          "Plano de execução ainda não informado."}
                      </p>
                    </div>

                    <div className="plan-content-block">
                      <span className="plan-content-label">
                        Indicadores
                      </span>

                      <p>
                        {item.indicators ||
                          "Indicadores de acompanhamento ainda não informados."}
                      </p>
                    </div>
                  </div>

                  {/* RODAPÉ */}

                  <div className="plan-card-footer">
                    <div className="plan-metadata">
                      <div className="metadata-item">
                        <span>Responsável</span>

                        <strong>
                          {item.responsible ||
                            "Não informado"}
                        </strong>
                      </div>

                      <div className="metadata-item">
                        <span>Prazo</span>

                        <strong>
                          {formatDate(
                            item.due_date,
                          )}
                        </strong>
                      </div>

                      <div className="metadata-item">
                        <span>Arquivos</span>

                        <strong>
                          {Array.isArray(
                            item.files,
                          )
                            ? item.files.length
                            : 0}
                        </strong>
                      </div>
                    </div>

                    <div className="plan-actions">
                      <button
                        type="button"
                        className="plan-action-btn"
                        onClick={() =>
                          handleEdit(item)
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="plan-action-btn"
                        onClick={() =>
                          handleFiles(item)
                        }
                      >
                        Arquivos
                      </button>

                      <button
                        type="button"
                        className="plan-action-btn danger"
                        onClick={() =>
                          handleDelete(item.id)
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================================
          MODAL DE ARQUIVOS
      ====================================================== */}

      {selectedAction && (
        <div
          className="files-modal"
          onClick={() =>
            setSelectedAction(null)
          }
        >
          <div
            className="files-modal-content"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="files-header">
              <div>
                <span className="section-kicker">
                  Documentos
                </span>

                <h3>Arquivos da ação</h3>

                <p>
                  {selectedAction.description}
                </p>

                <small>
                  {getContractName(
                    selectedAction.contract_id,
                    selectedAction,
                  )}
                </small>
              </div>

              <button
                type="button"
                className="modal-close-x"
                onClick={() =>
                  setSelectedAction(null)
                }
              >
                ×
              </button>
            </div>

            <div className="upload-area">
              <label className="file-picker">
                <span>
                  Selecionar arquivos
                </span>

                <input
                  type="file"
                  multiple
                  onChange={(event) =>
                    setSelectedFiles(
                      Array.from(
                        event.target.files ||
                          [],
                      ),
                    )
                  }
                />
              </label>

              {selectedFiles.length > 0 && (
                <span className="selected-files-count">
                  {selectedFiles.length} arquivo
                  {selectedFiles.length !== 1
                    ? "s"
                    : ""}{" "}
                  selecionado
                  {selectedFiles.length !== 1
                    ? "s"
                    : ""}
                </span>
              )}

              <button
                type="button"
                className="upload-btn"
                onClick={uploadActionFiles}
                disabled={
                  uploading ||
                  !selectedFiles.length
                }
              >
                {uploading
                  ? "Enviando..."
                  : "Enviar arquivos"}
              </button>
            </div>

            <div className="files-list">
              {files.length === 0 ? (
                <div className="files-empty">
                  Nenhum arquivo enviado.
                </div>
              ) : (
                files.map((file) => (
                  <div
                    className="file-item"
                    key={file.id}
                  >
                    <div className="file-info">
                      <div className="file-icon">
                        DOC
                      </div>

                      <div>
                        <strong>
                          {file.originalName ||
                            file.name ||
                            "Arquivo"}
                        </strong>

                        <span>
                          Documento anexado
                        </span>
                      </div>
                    </div>

                    <div className="file-actions">
                      <button
                        type="button"
                        onClick={() =>
                          downloadFile(file)
                        }
                      >
                        Baixar
                      </button>

                      <button
                        type="button"
                        className="delete"
                        onClick={() =>
                          removeFile(file.id)
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="files-footer">
              <button
                type="button"
                onClick={() =>
                  setSelectedAction(null)
                }
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
