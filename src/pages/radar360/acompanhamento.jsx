import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import "./acompanhamento.css";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function Tracking({
  tracking = [],
  contratoSelecionado,
  onReload,
}) {
  // ============================================================
  // AUTENTICAÇÃO
  // ============================================================

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // ============================================================
  // ESTADO INICIAL
  // ============================================================

  const initialState = {
    contract_id: "",
    reference_month: "",

    turnover: "",
    absenteeism: "",
    he_inefficiency: "",

    open_positions: "",
    replacement_days: "",

    headcount: "",

    labor_actions: "",

    notes: "",
  };

  // ============================================================
  // STATES
  // ============================================================

  const [form, setForm] = useState(initialState);

  const [contracts, setContracts] = useState([]);

  const [trackingData, setTrackingData] = useState(
    Array.isArray(tracking) ? tracking : [],
  );

  const [loadingContracts, setLoadingContracts] = useState(false);

  const [loadingTracking, setLoadingTracking] = useState(false);

  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [graficoSelecionado, setGraficoSelecionado] = useState("todos");

  // ============================================================
  // CARREGAR CONTRATOS
  // ============================================================

  const loadContracts = async () => {
    try {
      setLoadingContracts(true);

      const response = await api.get("/contracts", {
        headers: authHeader(),
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.contracts || [];

      console.log("[TRACKING] Contratos carregados:", data);

      setContracts(data);
    } catch (err) {
      console.error("[TRACKING] Erro ao carregar contratos:", err);

      alert(err.response?.data?.message || "Erro ao carregar contratos.");
    } finally {
      setLoadingContracts(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  // ============================================================
  // NORMALIZAR TRACKING
  // ============================================================
  //
  // Aceita diferentes formatos que podem chegar do backend/pai:
  //
  // {
  //   id,
  //   contract_id
  // }
  //
  // ou
  //
  // {
  //   tracking_id,
  //   tracking_contract_id
  // }
  //
  // ============================================================

  const normalizeTrackingItem = (item) => {
    if (!item) {
      return null;
    }

    return {
      ...item,

      id: item.id ?? item.tracking_id ?? null,

      contract_id:
        item.contract_id ??
        item.tracking_contract_id ??
        item.contractId ??
        null,

      reference_month: item.reference_month ?? item.referenceMonth ?? "",

      turnover: item.turnover ?? 0,

      absenteeism: item.absenteeism ?? 0,

      he_inefficiency: item.he_inefficiency ?? 0,

      open_positions: item.open_positions ?? 0,

      replacement_days: item.replacement_days ?? 0,

      headcount: item.headcount ?? 0,

      labor_actions: item.labor_actions ?? 0,

      notes: item.notes ?? "",
    };
  };

  // ============================================================
  // SINCRONIZAR TRACKING RECEBIDO POR PROPS
  // ============================================================

  useEffect(() => {
    if (!Array.isArray(tracking)) {
      return;
    }

    const normalized = tracking.map(normalizeTrackingItem).filter(Boolean);

    console.log("[TRACKING] Tracking recebido via props:", normalized);

    setTrackingData(normalized);
  }, [tracking]);

  // ============================================================
  // CONTRATO SELECIONADO
  // ============================================================

  const selectedContractId = useMemo(() => {
    if (!contratoSelecionado) {
      return "";
    }

    const value = String(contratoSelecionado).trim();

    console.log("[TRACKING] Procurando contrato selecionado:", value);

    // ------------------------------------------------------------
    // 1. Tentar diretamente pelo ID
    // ------------------------------------------------------------

    const byId = contracts.find(
      (contract) => String(contract.id ?? "").trim() === value,
    );

    if (byId) {
      console.log("[TRACKING] Contrato encontrado por ID:", byId);

      return String(byId.id);
    }

    // ------------------------------------------------------------
    // 2. Tentar pelo código do contrato
    // ------------------------------------------------------------

    const byCode = contracts.find((contract) => {
      const possibleCodes = [
        contract.contract,
        contract.contract_number,
        contract.code,
        contract.contract_code,
        contract.number,
      ];

      return possibleCodes.some(
        (code) =>
          code !== undefined && code !== null && String(code).trim() === value,
      );
    });

    if (byCode) {
      console.log("[TRACKING] Contrato encontrado por código:", byCode);

      return String(byCode.id);
    }

    // ------------------------------------------------------------
    // 3. Caso contratoSelecionado já seja UUID
    //
    // Mesmo que a lista ainda esteja carregando, podemos usar
    // diretamente se parecer com UUID.
    // ------------------------------------------------------------

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(value)) {
      console.log("[TRACKING] contratoSelecionado parece ser UUID:", value);

      return value;
    }

    console.warn(
      "[TRACKING] Não foi possível resolver contratoSelecionado:",
      value,
    );

    return "";
  }, [contracts, contratoSelecionado]);

  // ============================================================
  // CONTRATO ATUAL
  // ============================================================

  const selectedContract = useMemo(() => {
    if (!selectedContractId) {
      return null;
    }

    return (
      contracts.find(
        (contract) => String(contract.id) === String(selectedContractId),
      ) || null
    );
  }, [contracts, selectedContractId]);

  // ============================================================
  // TEXTO DO CONTRATO
  // ============================================================

  const getContractLabel = (contract) => {
    if (!contract) {
      return "";
    }

    const contractCode =
      contract.contract ??
      contract.contract_number ??
      contract.code ??
      contract.contract_code ??
      contract.number ??
      "";

    const client = contract.client ?? contract.client_name ?? "";

    const unit = contract.unit ?? contract.unit_name ?? "";

    if (contractCode && client && unit) {
      return `${contractCode} — ${client} — ${unit}`;
    }

    if (contractCode && client) {
      return `${contractCode} — ${client}`;
    }

    if (contractCode) {
      return String(contractCode);
    }

    return contract.id ? String(contract.id) : "";
  };

  // ============================================================
  // SINCRONIZAR CONTRATO COM FORMULÁRIO
  // ============================================================

  useEffect(() => {
    if (selectedContractId && !editingId) {
      setForm((old) => ({
        ...old,
        contract_id: selectedContractId,
      }));
    }
  }, [selectedContractId, editingId]);

  // ============================================================
  // BUSCAR TRACKING DO CONTRATO
  // ============================================================
  //
  // IMPORTANTE:
  //
  // Agora o frontend NÃO depende somente do tracking recebido
  // pelo componente pai.
  //
  // Sempre que o contrato mudar:
  //
  // GET /tracking/contract/:contractId
  //
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const loadTrackingByContract = async () => {
      if (!selectedContractId) {
        console.log(
          "[TRACKING] Nenhum contrato selecionado. Limpando tracking.",
        );

        setTrackingData([]);
        return;
      }

      try {
        setLoadingTracking(true);

        console.log("[TRACKING] Buscando histórico diretamente do backend...");

        console.log("[TRACKING] contractId:", selectedContractId);

        const response = await api.get(
          `/tracking/contract/${selectedContractId}`,
          {
            headers: authHeader(),
          },
        );

        console.log(
          "[TRACKING] Resposta GET /tracking/contract:",
          response.data,
        );

        if (cancelled) {
          return;
        }

        // --------------------------------------------------------
        // O backend pode retornar:
        //
        // []
        //
        // ou
        //
        // { tracking: [] }
        // --------------------------------------------------------

        let data = [];

        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (Array.isArray(response.data?.tracking)) {
          data = response.data.tracking;
        } else if (Array.isArray(response.data?.data)) {
          data = response.data.data;
        }

        const normalized = data.map(normalizeTrackingItem).filter(Boolean);

        console.log("[TRACKING] Histórico normalizado:", normalized);

        console.table(
          normalized.map((item) => ({
            id: item.id,
            contract_id: item.contract_id,
            reference_month: item.reference_month,
          })),
        );

        setTrackingData(normalized);
      } catch (err) {
        console.error("[TRACKING] Erro ao buscar histórico do contrato:", err);

        if (!cancelled) {
          setTrackingData([]);

          console.error("[TRACKING] Resposta do backend:", err.response?.data);
        }
      } finally {
        if (!cancelled) {
          setLoadingTracking(false);
        }
      }
    };

    loadTrackingByContract();

    return () => {
      cancelled = true;
    };
  }, [selectedContractId]);

  // ============================================================
  // ALTERAÇÃO DOS CAMPOS
  // ============================================================

  const handleChange = ({ target }) => {
    const { name, value, type } = target;

    setForm((old) => ({
      ...old,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  // ============================================================
  // ALTERAÇÃO DO CONTRATO
  // ============================================================

  const handleContractChange = (event) => {
    const contractId = event.target.value;

    console.log("[TRACKING] Contrato alterado manualmente:", contractId);

    setEditingId(null);

    setForm((old) => ({
      ...old,
      contract_id: contractId,
    }));
  };

  // ============================================================
  // LIMPAR
  // ============================================================

  const clearForm = () => {
    setEditingId(null);

    setForm({
      ...initialState,
      contract_id: selectedContractId || "",
    });
  };

  // ============================================================
  // SALVAR
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.contract_id) {
      alert("Selecione um contrato.");
      return;
    }

    if (!form.reference_month) {
      alert("Informe o mês de referência.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        contract_id: form.contract_id,

        reference_month: form.reference_month,

        turnover: form.turnover === "" ? 0 : Number(form.turnover),

        absenteeism: form.absenteeism === "" ? 0 : Number(form.absenteeism),

        he_inefficiency:
          form.he_inefficiency === "" ? 0 : Number(form.he_inefficiency),

        open_positions:
          form.open_positions === "" ? 0 : Number(form.open_positions),

        replacement_days:
          form.replacement_days === "" ? 0 : Number(form.replacement_days),

        headcount: form.headcount === "" ? 0 : Number(form.headcount),

        labor_actions:
          form.labor_actions === "" ? 0 : Number(form.labor_actions),

        notes: form.notes || "",
      };

      console.log("[TRACKING] Enviando acompanhamento:", payload);

      let response;

      if (editingId) {
        response = await api.put(`/tracking/${editingId}`, payload, {
          headers: authHeader(),
        });

        alert("Acompanhamento atualizado com sucesso.");
      } else {
        response = await api.post("/tracking", payload, {
          headers: authHeader(),
        });

        alert("Acompanhamento cadastrado com sucesso.");
      }

      console.log("[TRACKING] Resposta ao salvar:", response.data);

      clearForm();

      // ----------------------------------------------------------
      // IMPORTANTE:
      // Buscar novamente diretamente do backend.
      // ----------------------------------------------------------

      if (selectedContractId) {
        try {
          const refreshResponse = await api.get(
            `/tracking/contract/${selectedContractId}`,
            {
              headers: authHeader(),
            },
          );

          const data = Array.isArray(refreshResponse.data)
            ? refreshResponse.data
            : refreshResponse.data?.tracking ||
              refreshResponse.data?.data ||
              [];

          const normalized = data.map(normalizeTrackingItem).filter(Boolean);

          setTrackingData(normalized);
        } catch (refreshError) {
          console.error(
            "[TRACKING] Erro ao atualizar histórico:",
            refreshError,
          );
        }
      }

      if (onReload) {
        await onReload();
      }
    } catch (err) {
      console.error("[TRACKING] Erro ao salvar acompanhamento:", err);

      console.error("[TRACKING] Backend respondeu:", err.response?.data);

      alert(err.response?.data?.message || "Erro ao salvar acompanhamento.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // EDITAR
  // ============================================================

  const handleEdit = (item) => {
    setEditingId(item.id);

    setForm({
      contract_id: item.contract_id || "",

      reference_month: item.reference_month || "",

      turnover:
        item.turnover !== null && item.turnover !== undefined
          ? Number(item.turnover)
          : "",

      absenteeism:
        item.absenteeism !== null && item.absenteeism !== undefined
          ? Number(item.absenteeism)
          : "",

      he_inefficiency:
        item.he_inefficiency !== null && item.he_inefficiency !== undefined
          ? Number(item.he_inefficiency)
          : "",

      open_positions:
        item.open_positions !== null && item.open_positions !== undefined
          ? Number(item.open_positions)
          : "",

      replacement_days:
        item.replacement_days !== null && item.replacement_days !== undefined
          ? Number(item.replacement_days)
          : "",

      headcount:
        item.headcount !== null && item.headcount !== undefined
          ? Number(item.headcount)
          : "",

      labor_actions:
        item.labor_actions !== null && item.labor_actions !== undefined
          ? Number(item.labor_actions)
          : "",

      notes: item.notes || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ============================================================
  // EXCLUIR
  // ============================================================

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente remover este acompanhamento?")) {
      return;
    }

    try {
      setLoading(true);

      await api.delete(`/tracking/${id}`, {
        headers: authHeader(),
      });

      if (editingId === id) {
        clearForm();
      }

      // ----------------------------------------------------------
      // Recarregar tracking diretamente do backend
      // ----------------------------------------------------------

      if (selectedContractId) {
        const response = await api.get(
          `/tracking/contract/${selectedContractId}`,
          {
            headers: authHeader(),
          },
        );

        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.tracking || response.data?.data || [];

        setTrackingData(data.map(normalizeTrackingItem).filter(Boolean));
      }

      if (onReload) {
        await onReload();
      }

      alert("Acompanhamento removido com sucesso.");
    } catch (err) {
      console.error("[TRACKING] Erro ao excluir acompanhamento:", err);

      alert(err.response?.data?.message || "Erro ao remover acompanhamento.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FILTRAR TRACKING
  // ============================================================

  const filteredTracking = useMemo(() => {
    if (!selectedContractId) {
      return [];
    }

    const selectedId = String(selectedContractId).trim();

    const result = trackingData
      .map(normalizeTrackingItem)
      .filter(Boolean)
      .filter((item) => {
        const itemContractId = String(item.contract_id ?? "").trim();

        return itemContractId === selectedId;
      })
      .sort((a, b) =>
        String(a.reference_month || "").localeCompare(
          String(b.reference_month || ""),
        ),
      );

    console.log("[TRACKING] selectedContractId:", selectedContractId);

    console.log("[TRACKING] trackingData:", trackingData);

    console.log("[TRACKING] filteredTracking:", result);

    console.table(
      result.map((item) => ({
        id: item.id,
        contract_id: item.contract_id,
        reference_month: item.reference_month,
      })),
    );

    return result;
  }, [trackingData, selectedContractId]);

  // ============================================================
  // GRÁFICO
  // ============================================================

  const evolutionData = useMemo(() => {
    return filteredTracking.map((item) => ({
      ...item,

      reference_month: item.reference_month || "",

      turnover: Number(item.turnover || 0),

      absenteeism: Number(item.absenteeism || 0),

      he_inefficiency: Number(item.he_inefficiency || 0),

      open_positions: Number(item.open_positions || 0),

      replacement_days: Number(item.replacement_days || 0),

      headcount: Number(item.headcount || 0),

      labor_actions: Number(item.labor_actions || 0),
    }));
  }, [filteredTracking]);

  // ============================================================
  // FORMATADORES
  // ============================================================

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
    });
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="tracking-page">
      {/* ======================================================
          GRID SUPERIOR
      ====================================================== */}

      <div className="tracking-grid">
        {/* ====================================================
            FORMULÁRIO
        ==================================================== */}

        <form className="tracking-card tracking-form" onSubmit={handleSubmit}>
          <div className="tracking-card-header">
            <div>
              <h2>
                {editingId ? "Editar acompanhamento" : "Novo acompanhamento"}
              </h2>

              <small>
                Registre mensalmente os indicadores operacionais do contrato.
              </small>
            </div>
          </div>

          <div className="tracking-fields">
            {/* CONTRATO */}

            <label className="full">
              Contrato
              <select
                required
                name="contract_id"
                value={form.contract_id}
                onChange={handleContractChange}
                disabled={loadingContracts || loading}
              >
                <option value="">
                  {loadingContracts
                    ? "Carregando contratos..."
                    : "Selecione um contrato"}
                </option>

                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {getContractLabel(contract)}
                  </option>
                ))}
              </select>
            </label>

            {/* MÊS */}

            <label>
              Mês de Referência
              <input
                required
                type="month"
                name="reference_month"
                value={form.reference_month}
                onChange={handleChange}
              />
            </label>

            {/* TURNOVER */}

            <label>
              Turnover (%)
              <input
                required
                type="number"
                min="0"
                max="100"
                step="0.1"
                name="turnover"
                value={form.turnover}
                onChange={handleChange}
              />
            </label>

            {/* ABSENTEÍSMO */}

            <label>
              Absenteísmo (%)
              <input
                required
                type="number"
                min="0"
                max="100"
                step="0.1"
                name="absenteeism"
                value={form.absenteeism}
                onChange={handleChange}
              />
            </label>

            {/* H.E. */}

            <label>
              H.E. Ineficiência (R$)
              <input
                required
                type="number"
                min="0"
                step="0.01"
                name="he_inefficiency"
                value={form.he_inefficiency}
                onChange={handleChange}
              />
            </label>

            {/* VAGAS */}

            <label>
              Vagas em Aberto
              <input
                required
                type="number"
                min="0"
                step="1"
                name="open_positions"
                value={form.open_positions}
                onChange={handleChange}
              />
            </label>

            {/* REPOSIÇÃO */}

            <label>
              Dias para Reposição
              <input
                required
                type="number"
                min="0"
                step="0.1"
                name="replacement_days"
                value={form.replacement_days}
                onChange={handleChange}
              />
            </label>

            {/* EFETIVO */}

            <label>
              Efetivo
              <input
                required
                type="number"
                min="0"
                step="1"
                name="headcount"
                value={form.headcount}
                onChange={handleChange}
              />
            </label>

            {/* AÇÕES TRABALHISTAS */}

            <label>
              Ações Trabalhistas
              <input
                required
                type="number"
                min="0"
                step="1"
                name="labor_actions"
                value={form.labor_actions}
                onChange={handleChange}
              />
            </label>

            {/* OBSERVAÇÕES */}

            <label className="full">
              Observações
              <textarea
                rows={5}
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Registre avanços, riscos, decisões e acontecimentos relevantes do mês."
              />
            </label>
          </div>

          {/* AÇÕES */}

          <div className="tracking-actions">
            <button
              type="button"
              className="secondary"
              onClick={clearForm}
              disabled={loading}
            >
              {editingId ? "Cancelar edição" : "Limpar"}
            </button>

            <button
              type="submit"
              className="primary"
              disabled={loading || loadingContracts}
            >
              {loading
                ? "Salvando..."
                : editingId
                  ? "Atualizar acompanhamento"
                  : "Salvar acompanhamento"}
            </button>
          </div>
        </form>

        {/* ====================================================
            GRÁFICO
        ==================================================== */}

        <div className="tracking-card tracking-chart-card">
          <div className="tracking-card-header">
            <div>
              <h2>Evolução do Contrato</h2>

              <small>Acompanhe a evolução mensal dos indicadores.</small>
            </div>

            <div className="chart-filter">
              <select
                value={graficoSelecionado}
                onChange={(e) => setGraficoSelecionado(e.target.value)}
              >
                <option value="todos">Todos</option>

                <option value="turnover">Turnover</option>

                <option value="absenteeism">Absenteísmo</option>

                <option value="he_inefficiency">H.E.</option>

                <option value="open_positions">Vagas</option>

                <option value="replacement_days">Reposição</option>

                <option value="headcount">Efetivo</option>

                <option value="labor_actions">Trabalhistas</option>
              </select>
            </div>
          </div>

          {/* CONTRATO ATUAL */}

          {selectedContract && (
            <div className="tracking-selected-contract">
              <strong>{getContractLabel(selectedContract)}</strong>
            </div>
          )}

          {/* LEGENDA */}

          <div className="chart-legend">
            <span>
              <i className="legend-turnover" />
              Turnover
            </span>

            <span>
              <i className="legend-absenteeism" />
              Absenteísmo
            </span>

            <span>
              <i className="legend-he" />
              H.E.
            </span>

            <span>
              <i className="legend-labor" />
              Trabalhistas
            </span>

            <span>
              <i className="legend-replacement" />
              Reposição
            </span>
          </div>

          {/* GRÁFICO */}

          <div className="tracking-chart">
            {!selectedContractId ? (
              <div className="chart-empty">
                Selecione um contrato para visualizar a evolução.
              </div>
            ) : loadingTracking ? (
              <div className="chart-empty">Carregando histórico...</div>
            ) : evolutionData.length === 0 ? (
              <div className="chart-empty">
                Nenhum acompanhamento encontrado para este contrato.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={430}>
                <LineChart
                  data={evolutionData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 10,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="reference_month" />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  {(graficoSelecionado === "todos" ||
                    graficoSelecionado === "turnover") && (
                    <Line
                      type="monotone"
                      dataKey="turnover"
                      name="Turnover"
                      stroke="#2563eb"
                      strokeWidth={3}
                    />
                  )}

                  {(graficoSelecionado === "todos" ||
                    graficoSelecionado === "absenteeism") && (
                    <Line
                      type="monotone"
                      dataKey="absenteeism"
                      name="Absenteísmo"
                      stroke="#10b981"
                      strokeWidth={3}
                    />
                  )}

                  {(graficoSelecionado === "todos" ||
                    graficoSelecionado === "he_inefficiency") && (
                    <Line
                      type="monotone"
                      dataKey="he_inefficiency"
                      name="H.E."
                      stroke="#f59e0b"
                      strokeWidth={3}
                    />
                  )}

                  {(graficoSelecionado === "todos" ||
                    graficoSelecionado === "open_positions") && (
                    <Line
                      type="monotone"
                      dataKey="open_positions"
                      name="Vagas"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                    />
                  )}

                  {(graficoSelecionado === "todos" ||
                    graficoSelecionado === "replacement_days") && (
                    <Line
                      type="monotone"
                      dataKey="replacement_days"
                      name="Reposição"
                      stroke="#ec4899"
                      strokeWidth={3}
                    />
                  )}

                  {(graficoSelecionado === "todos" ||
                    graficoSelecionado === "headcount") && (
                    <Line
                      type="monotone"
                      dataKey="headcount"
                      name="Efetivo"
                      stroke="#06b6d4"
                      strokeWidth={3}
                    />
                  )}

                  {(graficoSelecionado === "todos" ||
                    graficoSelecionado === "labor_actions") && (
                    <Line
                      type="monotone"
                      dataKey="labor_actions"
                      name="Trabalhistas"
                      stroke="#ef4444"
                      strokeWidth={3}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          HISTÓRICO
      ======================================================== */}

      <div className="tracking-table-card">
        <div className="tracking-card-header">
          <div>
            <h2>Histórico de Acompanhamentos</h2>

            <small>
              Indicadores mensais registrados para o contrato selecionado.
            </small>
          </div>

          <div>
            Total registros: <strong>{filteredTracking.length}</strong>
          </div>
        </div>

        <div className="tracking-table-wrapper">
          <table className="tracking-table-simple">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Turnover</th>
                <th>Absenteísmo</th>
                <th>H.E.</th>
                <th>Vagas</th>
                <th>Reposição</th>
                <th>Efetivo</th>
                <th>Trabalhistas</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredTracking.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    {loadingTracking
                      ? "Carregando histórico..."
                      : "Nenhum acompanhamento encontrado."}
                  </td>
                </tr>
              ) : (
                filteredTracking.map((item) => (
                  <tr key={item.id}>
                    <td>{item.reference_month || "-"}</td>

                    <td>{formatNumber(item.turnover)}%</td>

                    <td>{formatNumber(item.absenteeism)}%</td>

                    <td>R$ {formatCurrency(item.he_inefficiency)}</td>

                    <td>{formatNumber(item.open_positions)}</td>

                    <td>{formatNumber(item.replacement_days)} dias</td>

                    <td>{formatNumber(item.headcount)}</td>

                    <td>{formatNumber(item.labor_actions)}</td>

                    <td>{item.notes || "-"}</td>

                    <td>
                      <div className="tracking-row-actions">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          disabled={loading}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={loading}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          RESUMO
      ======================================================== */}

      <div className="tracking-footer">
        <div className="tracking-summary">
          <span>Total de acompanhamentos</span>

          <strong>{filteredTracking.length}</strong>
        </div>

        {selectedContract && (
          <div className="tracking-summary">
            <span>Contrato selecionado</span>

            <strong>{getContractLabel(selectedContract)}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
