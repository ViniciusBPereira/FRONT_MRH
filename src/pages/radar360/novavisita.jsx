import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import "./novavisita.css";

// Conversões e resolução de vínculos compartilhadas entre cadastro e histórico.
function getArrayResponse(response) {
  if (Array.isArray(response?.data)) return response.data;
  for (const key of ["visits", "data", "rows", "results"]) {
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }
  return [];
}

function contractCode(contract) {
  return String(
    contract?.contract ?? contract?.cr ?? contract?.contract_number ?? contract?.code ?? "",
  ).trim();
}

function visitCode(visit) {
  return String(
    visit?.cr ?? visit?.contract ?? visit?.contract_number ?? visit?.contract_data?.contract ?? "",
  ).trim();
}

function dateOnly(value) {
  if (!value) return "";
  const text = String(value);
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : "";
}

function formatVisitDate(value) {
  const iso = dateOnly(value);
  if (!iso) return "Data não informada";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

// Suporta vírgula decimal brasileira; não confunde vazio com zero.
function numberFromBR(value, emptyValue = null) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return emptyValue;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  let normalized = String(value).trim().replace(/\s/g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
  } else {
    normalized = normalized.replace(",", ".");
  }
  const result = Number(normalized);
  return Number.isFinite(result) ? result : NaN;
}

function normalizeRootCause(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch { /* texto simples, não JSON */ }
    return value.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function formatHistoryValue(value, format) {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "date") return formatVisitDate(value);
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (format === "percent" || format === "currency" || format === "days") {
    const parsed = numberFromBR(value, null);
    if (parsed !== null && Number.isFinite(parsed)) {
      const number = parsed.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
      if (format === "currency") return `R$ ${number}`;
      return format === "percent" ? `${number}%` : `${number} dias`;
    }
  }
  return String(value);
}

const HISTORICAL_GROUPS = [
  {
    title: "Identificação e operação",
    fields: [
      ["Cliente", "client"],
      ["Unidade", "unit"],
      ["Business Partner", "bp"],
      ["Liderança responsável", "leadership_name"],
      ["Efetivo", "headcount"],
      ["PEC", "pec"],
      ["Colaboradores abordados", "employees_approached"],
      ["Turnover", "turnover", "percent"],
      ["Absenteísmo", "absenteeism", "percent"],
      ["H.E. Ineficiência", "he_inefficiency", "currency"],
      ["Vagas abertas", "open_positions"],
      ["Tempo médio de reposição", "replacement_days", "days"],
      ["Ações trabalhistas", "labor_actions"],
      ["Advertências", "warnings"],
      ["eNPS", "enps"],
    ],
  },
  {
    title: "Diagnóstico dos pilares",
    fields: [
      ["Presença da liderança", "leadership_presence"],
      ["Comunicação com a equipe", "leadership_communication"],
      ["Gestão de rotina", "leadership_routine"],
      ["Tratativa de desvios", "leadership_deviation"],
      ["Engajamento", "climate_engagement"],
      ["Escuta e acolhimento", "climate_listening"],
      ["Relações internas", "climate_relationship"],
      ["Satisfação", "climate_satisfaction"],
      ["Recursos e equipamentos", "structure_resources"],
      ["Escalas e cobertura", "structure_staffing"],
      ["Ambiente de trabalho", "structure_environment"],
      ["Suporte administrativo", "structure_support"],
      ["Expectativas do cliente", "customer_expectation"],
      ["Comunicação com cliente", "customer_communication"],
      ["Qualidade percebida", "customer_quality"],
      ["Solicitações", "customer_requests"],
      ["Score Liderança", "leadership_score"],
      ["Score Clima", "climate_score"],
      ["Score Estrutura", "structure_score"],
      ["Score Cliente", "customer_score"],
    ],
  },
  {
    title: "Análise e direcionamento",
    fields: [
      ["Causas-raiz", "root_cause"],
      ["Evidências", "evidence"],
      ["Panorama geral", "overview"],
      ["Classificação", "classification"],
      ["Prioridade", "priority"],
      ["Parecer executivo", "executive_opinion"],
      ["Plano de ação da visita", "action_plan"],
    ],
  },
];

function fillFormFromVisit(visit, contracts) {
  const result = createInitialState();
  for (const key of Object.keys(result)) {
    if (visit?.[key] !== undefined && visit?.[key] !== null) {
      result[key] = visit[key];
    }
  }
  const directContractId = String(visit?.contract_id ?? "");
  const matchedContract = contracts.find((c) =>
    String(c.id) === directContractId ||
    (visitCode(visit) && contractCode(c).toLowerCase() === visitCode(visit).toLowerCase()),
  );
  result.contract_id = matchedContract?.id ?? directContractId;
  result.visit_date = dateOnly(visit?.visit_date);
  result.root_cause = normalizeRootCause(visit?.root_cause);
  return result;
}

// Estado inicial de um registro; os quatro pilares mantêm as opções atuais.
function createInitialState() {
  return {
    contract_id: "", visit_date: "", employees_approached: "",
    turnover: "", absenteeism: "", he_inefficiency: "",
    open_positions: "", replacement_days: "", labor_actions: "",
    warnings: "", enps: "",
    leadership_presence: 0, leadership_communication: 0,
    leadership_routine: 0, leadership_deviation: 0,
    climate_engagement: 0, climate_listening: 0,
    climate_relationship: 0, climate_satisfaction: 0,
    structure_resources: 0, structure_staffing: 0,
    structure_environment: 0, structure_support: 0,
    customer_expectation: 0, customer_communication: 0,
    customer_quality: 0, customer_requests: 0,
    root_cause: [], evidence: "", overview: "",
  };
}

export default function NovaVisita({
  editVisit = false,
  visit = null,
  visitId = null,
  editTracking = false,
  trackingId = null,
  contratoSelecionado = "",
  onReload,
}) {
  // ============================================================
  // AUTH
  // ============================================================

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // ============================================================
  // OPÇÕES
  // ============================================================

  const ROOT_CAUSES = [
    "liderança",
    "clima",
    "estrutura",
    "cliente",
    "indicadores",
  ];

  const OPTIONS = [
    { label: "Não atende", value: 0 },
    { label: "Atende parcialmente", value: 40 },
    { label: "Atende", value: 70 },
    { label: "Atende plenamente", value: 100 },
  ];

  // ============================================================
  // ESTADO INICIAL
  // ============================================================

  const [form, setForm] = useState(createInitialState);

  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(true);

  const [loading, setLoading] = useState(false);

  const [contractError, setContractError] = useState("");
  const [visitsHistory, setVisitsHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(8);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [externalEditDismissed, setExternalEditDismissed] = useState(false);
  const isExternalEdit = Boolean((editVisit || editTracking) && visit && !externalEditDismissed);
  const isEditing = isExternalEdit || editingHistoryId !== null;

  // ============================================================
  // CAMPOS NUMÉRICOS
  // ============================================================

  const numericFields = useMemo(
    () => [
      "employees_approached",

      "turnover",
      "absenteeism",
      "he_inefficiency",
      "open_positions",
      "replacement_days",
      "labor_actions",
      "warnings",
      "enps",

      "leadership_presence",
      "leadership_communication",
      "leadership_routine",
      "leadership_deviation",

      "climate_engagement",
      "climate_listening",
      "climate_relationship",
      "climate_satisfaction",

      "structure_resources",
      "structure_staffing",
      "structure_environment",
      "structure_support",

      "customer_expectation",
      "customer_communication",
      "customer_quality",
      "customer_requests",
    ],
    [],
  );

  // ============================================================
  // CARREGAR CONTRATOS
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function loadContracts() {
      try {
        setContractsLoading(true);
        setContractError("");

        const response = await api.get("/contracts", {
          headers: authHeader(),
        });

        if (!mounted) return;

        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.contracts || response.data?.data || [];

        setContracts(data);
      } catch (error) {
        console.error("[NOVA VISITA] Erro ao carregar contratos:", error);

        if (mounted) {
          setContractError(
            error.response?.data?.message ||
              "Não foi possível carregar os contratos.",
          );
        }
      } finally {
        if (mounted) {
          setContractsLoading(false);
        }
      }
    }

    loadContracts();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // HISTÓRICO: obtém visitas do backend e recarrega após salvar.
  // ============================================================
  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const response = await api.get("/visits", { headers: authHeader() });
      setVisitsHistory(getArrayResponse(response));
    } catch (error) {
      console.error("[NOVA VISITA] Erro ao consultar histórico:", error);
      setHistoryError(error.response?.data?.message || "Não foi possível carregar o histórico de visitas.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reinicia a edição externa quando o dashboard seleciona outro registro.
  useEffect(() => { setExternalEditDismissed(false); }, [editVisit, editTracking, visit]);

  // Compatibilidade com os dois formatos usados pelo dashboard.
  useEffect(() => {
    if (!isExternalEdit || !visit) return;
    setEditingHistoryId(null);
    setForm(fillFormFromVisit(visit, contracts));
  }, [isExternalEdit, visit, contracts]);

  // Permite pré-selecionar o CR quando o módulo recebe o filtro global.
  useEffect(() => {
    if (!contratoSelecionado || isEditing || form.contract_id) return;
    const selected = contracts.find((c) =>
      String(c.id) === String(contratoSelecionado) ||
      contractCode(c).toLowerCase() === String(contratoSelecionado).toLowerCase(),
    );
    if (selected) setForm((old) => ({ ...old, contract_id: selected.id }));
  }, [contratoSelecionado, contracts, isEditing, form.contract_id]);

  // Lista filtrada, mas preserva cada visita individualmente.
  const historyFiltered = useMemo(() => {
    const code = contractCode(contracts.find((c) => String(c.id) === String(form.contract_id)));
    const search = historySearch.trim().toLocaleLowerCase("pt-BR");
    return visitsHistory.filter((entry) => {
      const matchesContract = !form.contract_id ||
        String(entry.contract_id ?? "") === String(form.contract_id) ||
        Boolean(code && visitCode(entry).toLowerCase() === code.toLowerCase());
      if (!matchesContract) return false;
      if (!search) return true;
      const recordContract = contracts.find((c) => String(c.id) === String(entry.contract_id));
      const searchable = [
        contractCode(recordContract), visitCode(entry), entry.visit_date,
        formatVisitDate(entry.visit_date), recordContract?.client,
        entry.client, entry.evidence, entry.overview, entry.classification,
        ...normalizeRootCause(entry.root_cause),
      ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return searchable.includes(search);
    }).sort((a, b) => {
      const dateA = String(a.visit_date ?? a.created_at ?? "");
      const dateB = String(b.visit_date ?? b.created_at ?? "");
      return dateB.localeCompare(dateA);
    });
  }, [visitsHistory, contracts, form.contract_id, historySearch]);

  const historyVisible = useMemo(
    () => historyFiltered.slice(0, visibleHistoryCount),
    [historyFiltered, visibleHistoryCount],
  );

  useEffect(() => {
    setVisibleHistoryCount(8);
  }, [form.contract_id, historySearch]);

  const startHistoryEdit = (entry) => {
    if (loading) return;
    if (entry.id === null || entry.id === undefined) return;
    setExternalEditDismissed(true);
    setEditingHistoryId(entry.id);
    setForm(fillFormFromVisit(entry, contracts));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================================
  // ALTERAÇÃO DOS CAMPOS
  // ============================================================

  const handleChange = ({ target }) => {
    const { name, value } = target;
    const decimalFields = ["turnover", "absenteeism", "he_inefficiency", "replacement_days"];
    setForm((old) => ({
      ...old,
      [name]: decimalFields.includes(name)
        ? value
        : numericFields.includes(name)
          ? (value === "" ? "" : Number(value))
          : value,
    }));
  };

  // ============================================================
  // MÉDIA
  // ============================================================

  const average = (...values) => {
    if (!values.length) return 0;

    const numbers = values.map((value) => Number(value || 0));

    return Math.round(
      numbers.reduce((total, value) => total + value, 0) / numbers.length,
    );
  };

  // ============================================================
  // SCORE LIDERANÇA
  // ============================================================

  const leadershipScore = useMemo(
    () =>
      average(
        form.leadership_presence,
        form.leadership_communication,
        form.leadership_routine,
        form.leadership_deviation,
      ),
    [
      form.leadership_presence,
      form.leadership_communication,
      form.leadership_routine,
      form.leadership_deviation,
    ],
  );

  // ============================================================
  // SCORE CLIMA
  // ============================================================

  const climateScore = useMemo(
    () =>
      average(
        form.climate_engagement,
        form.climate_listening,
        form.climate_relationship,
        form.climate_satisfaction,
      ),
    [
      form.climate_engagement,
      form.climate_listening,
      form.climate_relationship,
      form.climate_satisfaction,
    ],
  );

  // ============================================================
  // SCORE ESTRUTURA
  // ============================================================

  const structureScore = useMemo(
    () =>
      average(
        form.structure_resources,
        form.structure_staffing,
        form.structure_environment,
        form.structure_support,
      ),
    [
      form.structure_resources,
      form.structure_staffing,
      form.structure_environment,
      form.structure_support,
    ],
  );

  // ============================================================
  // SCORE CLIENTE
  // ============================================================

  const customerScore = useMemo(
    () =>
      average(
        form.customer_expectation,
        form.customer_communication,
        form.customer_quality,
        form.customer_requests,
      ),
    [
      form.customer_expectation,
      form.customer_communication,
      form.customer_quality,
      form.customer_requests,
    ],
  );

  // ============================================================
  // SCORE DOS PILARES
  // ============================================================

  const scorePreview = useMemo(
    () => average(leadershipScore, climateScore, structureScore, customerScore),
    [leadershipScore, climateScore, structureScore, customerScore],
  );

  // ============================================================
  // SCORE DOS INDICADORES
  // ============================================================

  const indicatorPreview = useMemo(() => {
    let total = 0;
    let weight = 0;

    const calc = (score, itemWeight) => {
      total += score * itemWeight;
      weight += itemWeight;
    };

    // ----------------------------------------------------------
    // TURNOVER
    // ----------------------------------------------------------

    const turnover = numberFromBR(form.turnover, 0);

    calc(
      turnover <= 3.5 ? 100 : turnover <= 7 ? 75 : turnover <= 11 ? 45 : 20,
      0.22,
    );

    // ----------------------------------------------------------
    // ABSENTEÍSMO
    // ----------------------------------------------------------

    const absenteeism = numberFromBR(form.absenteeism, 0);

    calc(
      absenteeism <= 3.5
        ? 100
        : absenteeism <= 7
          ? 75
          : absenteeism <= 11
            ? 45
            : 20,
      0.22,
    );

    // ----------------------------------------------------------
    // H.E. INEFICIÊNCIA
    // ----------------------------------------------------------

    const heInefficiency = numberFromBR(form.he_inefficiency, 0);

    calc(
      heInefficiency <= 0
        ? 100
        : heInefficiency <= 1000
          ? 75
          : heInefficiency <= 5000
            ? 45
            : 20,
      0.2,
    );

    // ----------------------------------------------------------
    // AÇÕES TRABALHISTAS
    // ----------------------------------------------------------

    const laborActions = numberFromBR(form.labor_actions, 0);

    calc(
      laborActions === 0
        ? 100
        : laborActions === 1
          ? 55
          : laborActions === 2
            ? 35
            : 15,
      0.18,
    );

    // ----------------------------------------------------------
    // REPOSIÇÃO
    // ----------------------------------------------------------

    const replacementDays = numberFromBR(form.replacement_days, 0);

    calc(
      replacementDays <= 12
        ? 100
        : replacementDays <= 20
          ? 75
          : replacementDays <= 30
            ? 45
            : 20,
      0.12,
    );

    if (!weight) return 0;

    return Math.round(total / weight);
  }, [
    form.turnover,
    form.absenteeism,
    form.he_inefficiency,
    form.labor_actions,
    form.replacement_days,
  ]);

  // ============================================================
  // SCORE FINAL
  // ============================================================

  const finalPreview = useMemo(
    () => Math.round(indicatorPreview * 0.65 + scorePreview * 0.35),
    [indicatorPreview, scorePreview],
  );

  // ============================================================
  // CLASSIFICAÇÃO
  // ============================================================

  const classification = useMemo(() => {
    if (finalPreview >= 85) return "Referência";
    if (finalPreview >= 70) return "Estável";
    if (finalPreview >= 50) return "Alerta";

    return "Crítico";
  }, [finalPreview]);

  // ============================================================
  // PRIORIDADE
  // ============================================================

  const priority = useMemo(() => {
    if (classification === "Crítico" || finalPreview < 45) {
      return "Prioridade Máxima BP";
    }

    if (classification === "Alerta" && finalPreview < 60) {
      return "War Room BP";
    }

    if (classification === "Alerta") {
      return "Plano 30 dias";
    }

    return "Monitoramento";
  }, [classification, finalPreview]);

  // ============================================================
  // CONTRATO SELECIONADO
  // ============================================================

  const selectedContract = useMemo(() => {
    return contracts.find(
      (contract) => String(contract.id) === String(form.contract_id),
    );
  }, [contracts, form.contract_id]);

  // ============================================================
  // LIMPAR FORMULÁRIO
  // ============================================================

  const limparFormulario = (preserveContract = false) => {
    setForm((old) => ({
      ...createInitialState(),
      contract_id: preserveContract ? old.contract_id : "",
    }));
    setEditingHistoryId(null);
    setExternalEditDismissed(true);
  };

  // ============================================================
  // CAUSA RAIZ
  // ============================================================

  const toggleRootCause = (cause) => {
    setForm((old) => {
      const current = Array.isArray(old.root_cause) ? old.root_cause : [];

      const exists = current.includes(cause);

      return {
        ...old,

        root_cause: exists
          ? current.filter((item) => item !== cause)
          : [...current, cause],
      };
    });
  };

  // ============================================================
  // PAYLOAD
  // ============================================================

  const buildPayload = () => {
    const optionalNumericFields = [
      "employees_approached", "turnover", "absenteeism", "he_inefficiency",
      "open_positions", "replacement_days", "labor_actions", "warnings", "enps",
    ];
    const numericalValues = Object.fromEntries(
      optionalNumericFields.map((key) => [key, numberFromBR(form[key], null)]),
    );

    return {
      contract_id: form.contract_id,
      visit_date: form.visit_date,
      ...numericalValues,
      root_cause: normalizeRootCause(form.root_cause),
      evidence: form.evidence?.trim() || "",
      overview: form.overview?.trim() || "",
      leadership_score: leadershipScore,
      climate_score: climateScore,
      structure_score: structureScore,
      customer_score: customerScore,
      // Os campos de checklist de pilares são preservados na edição.
      ...Object.fromEntries(
        numericFields
          .filter((key) => /^(leadership|climate|structure|customer)_/.test(key))
          .map((key) => [key, numberFromBR(form[key], 0)]),
      ),
    };
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.contract_id) {
      alert("Selecione um contrato para lançar a visita.");
      return;
    }
    if (!form.visit_date) {
      alert("Informe a data da visita.");
      return;
    }

    const payload = buildPayload();
    const nonNegativeFields = [
      "employees_approached", "turnover", "absenteeism", "he_inefficiency",
      "open_positions", "replacement_days", "labor_actions", "warnings",
    ];
    if (nonNegativeFields.some((key) =>
      payload[key] !== null && (!Number.isFinite(payload[key]) || payload[key] < 0)
    ) || (payload.enps !== null && (!Number.isFinite(payload.enps) || payload.enps < -100 || payload.enps > 100))) {
      alert("Confira os indicadores: informe números válidos (vírgula decimal permitida), sem valores negativos, e eNPS de -100 a 100.");
      return;
    }
    if (["turnover", "absenteeism"].some((key) => payload[key] !== null && payload[key] > 100)) {
      alert("Turnover e Absenteísmo devem ficar entre 0 e 100%.");
      return;
    }
    if (["employees_approached", "open_positions", "labor_actions", "warnings"].some((key) =>
      payload[key] !== null && !Number.isInteger(payload[key])
    )) {
      alert("Colaboradores, vagas, ações trabalhistas e advertências devem ser números inteiros.");
      return;
    }

    let saveSucceeded = false;
    try {
      setLoading(true);
      const config = { headers: authHeader() };

      if (editingHistoryId !== null) {
        await api.put(`/visits/${editingHistoryId}`, payload, config);
      } else if (editTracking && !externalEditDismissed) {
        // Integração já utilizada no fluxo Acompanhamento -> Nova Visita.
        if (trackingId === null || trackingId === undefined) {
          throw new Error("ID do acompanhamento é obrigatório para edição.");
        }
        await api.put(`/tracking/${trackingId}/edit`, payload, config);
      } else if (editVisit && !externalEditDismissed) {
        const editingId = visitId ?? visit?.id;
        if (!editingId) throw new Error("ID da visita é obrigatório para edição.");
        await api.put(`/visits/${editingId}`, payload, config);
      } else {
        await api.post("/visits", payload, config);
      }

      saveSucceeded = true;
      alert(isEditing ? "Visita atualizada com sucesso." : "Visita cadastrada com sucesso.");
      limparFormulario(true);
    } catch (error) {
      console.error("[NOVA VISITA] Erro ao salvar:", error);
      alert(error.response?.data?.message || error.message || "Erro ao salvar visita.");
    } finally {
      setLoading(false);
    }

    if (saveSucceeded) {
      // Se a consulta ao histórico falhar, não informa que o salvamento falhou.
      await loadHistory();
      if (typeof onReload === "function") {
        try { await onReload(); } catch (error) {
          console.warn("[NOVA VISITA] Dados das outras abas não puderam ser atualizados:", error);
        }
      }
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="nova-visita">
      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <div className="nv-header">
        <div>
          <span className="eyebrow">COLETA DE CAMPO</span>

          <h2>{isEditing ? "Editar Visita" : "Nova Visita"}</h2>

          <p>
            Registre as informações observadas durante a visita e gere o
            diagnóstico da operação.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="nv-grid">
        {/* ====================================================
            IDENTIFICAÇÃO
        ==================================================== */}

        <div className="nv-card">
          <div className="nv-card-header">
            <div>
              <h3>Identificação da Visita</h3>

              <small>Toda visita deve estar vinculada a um contrato.</small>
            </div>
          </div>

          <div className="nv-fields">
            <label>
              Contrato
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

                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contract ||
                      contract.name ||
                      `Contrato ${contract.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Data da visita
              <input
                type="date"
                name="visit_date"
                value={form.visit_date}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Colaboradores abordados
              <input
                type="number"
                min="0"
                name="employees_approached"
                value={form.employees_approached}
                onChange={handleChange}
              />
            </label>
          </div>

          {contractError && <div className="nv-error">{contractError}</div>}

          {form.contract_id && selectedContract && (
            <div className="nv-contract-selected">
              <span>Contrato selecionado</span>

              <strong>
                {selectedContract.contract ||
                  selectedContract.name ||
                  selectedContract.id}
              </strong>
            </div>
          )}
        </div>

        {/* ====================================================
            INDICADORES
        ==================================================== */}

        <div className="nv-card">
          <div className="nv-card-header">
            <div>
              <h3>Indicadores Operacionais</h3>

              <small>Dados objetivos observados na operação.</small>
            </div>

            <div className="score-preview">
              <span>Score Indicadores</span>

              <strong>{indicatorPreview}</strong>
            </div>
          </div>

          <div className="nv-fields">
            <label>
              Turnover (%)
              <input
                type="text"
                inputMode="decimal"
                name="turnover"
                placeholder="Ex.: 3,5"
                value={form.turnover}
                onChange={handleChange}
              />
            </label>

            <label>
              Absenteísmo (%)
              <input
                type="text"
                inputMode="decimal"
                name="absenteeism"
                placeholder="Ex.: 3,5"
                value={form.absenteeism}
                onChange={handleChange}
              />
            </label>

            <label>
              H.E. Ineficiência (R$)
              <input
                type="text"
                inputMode="decimal"
                name="he_inefficiency"
                placeholder="Ex.: 1500,50"
                value={form.he_inefficiency}
                onChange={handleChange}
              />
            </label>

            <label>
              Vagas abertas
              <input
                type="number"
                min="0"
                name="open_positions"
                value={form.open_positions}
                onChange={handleChange}
              />
            </label>

            <label>
              Tempo médio de reposição
              <input
                type="text"
                inputMode="decimal"
                name="replacement_days"
                placeholder="Ex.: 15,5"
                value={form.replacement_days}
                onChange={handleChange}
              />
            </label>

            <label>
              Ações Trabalhistas
              <input
                type="number"
                min="0"
                name="labor_actions"
                value={form.labor_actions}
                onChange={handleChange}
              />
            </label>

            <label>
              Advertências
              <input
                type="number"
                min="0"
                name="warnings"
                value={form.warnings}
                onChange={handleChange}
              />
            </label>

            <label>
              eNPS
              <input
                type="number"
                min="-100"
                max="100"
                name="enps"
                value={form.enps}
                onChange={handleChange}
              />
            </label>
          </div>
        </div>

        {/* ====================================================
            PILARES
        ==================================================== */}

        <div className="nv-card">
          <div className="nv-card-header">
            <div>
              <h3>Pilares do Diagnóstico</h3>

              <small>Avaliação estruturada dos quatro pilares.</small>
            </div>

            <div className="score-preview">
              <span>Score dos Pilares</span>

              <strong>{scorePreview}</strong>
            </div>
          </div>

          <div className="pillar-grid">
            {/* ==================================================
                LIDERANÇA
            ================================================== */}

            <div className="pillar-card">
              <h4>Liderança</h4>

              <label>
                Presença ativa na operação
                <select
                  name="leadership_presence"
                  value={form.leadership_presence}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Comunicação com equipe
                <select
                  name="leadership_communication"
                  value={form.leadership_communication}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Gestão de rotina e feedback
                <select
                  name="leadership_routine"
                  value={form.leadership_routine}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tratativa de desvios
                <select
                  name="leadership_deviation"
                  value={form.leadership_deviation}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pillar-total">
                Score Liderança:
                <strong>{leadershipScore}</strong>
              </div>
            </div>

            {/* ==================================================
                CLIMA
            ================================================== */}

            <div className="pillar-card">
              <h4>Clima</h4>

              <label>
                Engajamento percebido
                <select
                  name="climate_engagement"
                  value={form.climate_engagement}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Escuta e acolhimento
                <select
                  name="climate_listening"
                  value={form.climate_listening}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Relações internas
                <select
                  name="climate_relationship"
                  value={form.climate_relationship}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sinais de satisfação
                <select
                  name="climate_satisfaction"
                  value={form.climate_satisfaction}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pillar-total">
                Score Clima:
                <strong>{climateScore}</strong>
              </div>
            </div>

            {/* ==================================================
                ESTRUTURA
            ================================================== */}

            <div className="pillar-card">
              <h4>Estrutura</h4>

              <label>
                Recursos e equipamentos
                <select
                  name="structure_resources"
                  value={form.structure_resources}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Escalas e cobertura
                <select
                  name="structure_staffing"
                  value={form.structure_staffing}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Ambiente de trabalho
                <select
                  name="structure_environment"
                  value={form.structure_environment}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Suporte administrativo
                <select
                  name="structure_support"
                  value={form.structure_support}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pillar-total">
                Score Estrutura:
                <strong>{structureScore}</strong>
              </div>
            </div>

            {/* ==================================================
                CLIENTE
            ================================================== */}

            <div className="pillar-card">
              <h4>Cliente</h4>

              <label>
                Alinhamento das expectativas
                <select
                  name="customer_expectation"
                  value={form.customer_expectation}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Comunicação com o cliente
                <select
                  name="customer_communication"
                  value={form.customer_communication}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Percepção de qualidade
                <select
                  name="customer_quality"
                  value={form.customer_quality}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tratativa de solicitações
                <select
                  name="customer_requests"
                  value={form.customer_requests}
                  onChange={handleChange}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pillar-total">
                Score Cliente:
                <strong>{customerScore}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            ANÁLISE QUALITATIVA
        ==================================================== */}

        <div className="nv-card">
          <div className="nv-card-header">
            <div>
              <h3>Análise Qualitativa</h3>

              <small>
                Registre as causas e evidências encontradas durante a visita.
              </small>
            </div>
          </div>

          <div className="nv-fields">
            <label className="full">
              Causa Raiz
              <div className="root-cause-grid">
                {ROOT_CAUSES.map((cause) => (
                  <label key={cause} className="root-cause-item">
                    <input
                      type="checkbox"
                      checked={form.root_cause.includes(cause)}
                      onChange={() => toggleRootCause(cause)}
                    />

                    <span>
                      {cause.charAt(0).toUpperCase() + cause.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </label>

            <label className="full">
              Evidências
              <textarea
                rows="6"
                name="evidence"
                value={form.evidence}
                onChange={handleChange}
                placeholder="Descreva fatos observados, entrevistas realizadas, evidências encontradas e comportamentos percebidos."
              />
            </label>

            <label className="full">
              Panorama Geral
              <textarea
                rows="5"
                name="overview"
                value={form.overview}
                onChange={handleChange}
                placeholder="Faça um resumo executivo da visita, principais riscos encontrados, percepção da liderança e direcionamentos."
              />
            </label>
          </div>
        </div>

        {/* ====================================================
            PRÉVIA
        ==================================================== */}

        <aside className="nv-preview">
          <div className="preview-header">
            <h3>Prévia do Diagnóstico</h3>

            <div className="preview-score">
              <span>Score Final</span>

              <strong>{finalPreview}</strong>
            </div>
          </div>

          <div className="preview-body">
            <div className="preview-item">
              <span>Score Indicadores</span>

              <strong>{indicatorPreview}</strong>
            </div>

            <div className="preview-item">
              <span>Score Pilares</span>

              <strong>{scorePreview}</strong>
            </div>

            <hr />

            <div className="preview-item">
              <span>Liderança</span>

              <strong>{leadershipScore}</strong>
            </div>

            <div className="preview-item">
              <span>Clima</span>

              <strong>{climateScore}</strong>
            </div>

            <div className="preview-item">
              <span>Estrutura</span>

              <strong>{structureScore}</strong>
            </div>

            <div className="preview-item">
              <span>Cliente</span>

              <strong>{customerScore}</strong>
            </div>

            <div className="preview-item">
              <span>Classificação</span>

              <strong className={`status ${classification.toLowerCase()}`}>
                {classification}
              </strong>
            </div>

            <div className="preview-item">
              <span>Priorização</span>

              <strong className="priority">{priority}</strong>
            </div>

            <hr />

            <div className="preview-item">
              <span>eNPS</span>

              <strong>{form.enps}</strong>
            </div>
          </div>
        </aside>

        {/* ====================================================
            AÇÕES
        ==================================================== */}

        <div className="nv-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => limparFormulario()}
            disabled={loading}
          >
            {isEditing ? "Cancelar edição / Limpar" : "Limpar formulário"}
          </button>

          <button
            type="submit"
            className="primary"
            disabled={loading || contractsLoading || !form.contract_id}
          >
            {loading
              ? "Salvando..."
              : isEditing
                ? "Atualizar Visita"
                : "Salvar Visita"}
          </button>
        </div>
      </form>

      {/* ============================================================
          HISTÓRICO DE VISITAS — ao final da aba Nova Visita
          Contém todos os registros retornados por GET /visits.
      ============================================================ */}
      <section className="nv-history nv-card" aria-label="Histórico de visitas">
        <div className="nv-history-header">
          <div>
            <span className="eyebrow">REGISTROS DA OPERAÇÃO</span>
            <h3>Histórico de visitas</h3>
            <p>
              {form.contract_id
                ? `Visitas registradas para o contrato ${contractCode(selectedContract) || "selecionado"}.`
                : "Selecione um contrato no formulário para filtrar, ou consulte todas as visitas."}
            </p>
          </div>
          <span className="nv-history-counter">
            {historyFiltered.length} {historyFiltered.length === 1 ? "visita" : "visitas"}
          </span>
        </div>

        <div className="nv-history-toolbar">
          <label className="nv-history-search-label">
            Buscar no histórico
            <input
              type="search"
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Pesquisar CR, data, causas, evidências..."
            />
          </label>
          <button
            className="nv-history-refresh"
            type="button"
            onClick={loadHistory}
            disabled={historyLoading}
          >
            {historyLoading ? "Atualizando..." : "Atualizar histórico"}
          </button>
        </div>

        {historyError && (
          <div className="nv-history-error" role="alert">
            {historyError}
            <button type="button" onClick={loadHistory}>Tentar novamente</button>
          </div>
        )}

        {historyLoading && visitsHistory.length === 0 ? (
          <p className="nv-history-empty">Carregando visitas...</p>
        ) : historyFiltered.length === 0 ? (
          <p className="nv-history-empty">
            Nenhuma visita encontrada {form.contract_id ? "para este contrato" : "com os filtros informados"}.
          </p>
        ) : (
          <div className="nv-history-list">
            {historyVisible.map((entry, index) => {
              const contract = contracts.find((item) => String(item.id) === String(entry.contract_id));
              const cr = contractCode(contract) || visitCode(entry) || "CR não informado";
              const causes = normalizeRootCause(entry.root_cause);
              const key = entry.id ?? `${entry.contract_id || cr}-${entry.visit_date}-${index}`;
              return (
                <details className="nv-history-record" key={key}>
                  <summary className="nv-history-record-heading">
                    <div className="nv-history-date">
                      <strong>{formatVisitDate(entry.visit_date)}</strong>
                      <span>{cr}</span>
                    </div>
                    <div className="nv-history-record-main">
                      <strong>{contract?.client || entry.client || "Visita registrada"}</strong>
                      <small>{causes.length ? `Causa-raiz: ${causes.join(", ")}` : "Sem causa-raiz registrada"}</small>
                    </div>
                    <span className="nv-history-classification">
                      {entry.classification || "Registrada"}
                    </span>
                    <span className="nv-history-chevron" aria-hidden="true">⌄</span>
                  </summary>

                  <div className="nv-history-details">
                    <p className="nv-history-intro">
                      Informações documentadas nesta visita (dados registrados na data indicada acima).
                    </p>
                    {HISTORICAL_GROUPS.map((group) => {
                      const available = group.fields.filter(([, field]) =>
                        entry[field] !== null && entry[field] !== undefined &&
                        entry[field] !== "" &&
                        (!Array.isArray(entry[field]) || entry[field].length > 0)
                      );
                      if (!available.length) return null;
                      return (
                        <section className="nv-history-detail-group" key={group.title}>
                          <h4>{group.title}</h4>
                          <dl className="nv-history-detail-grid">
                            {available.map(([label, field, format]) => (
                              <div className={field === "evidence" || field === "overview" ? "nv-history-wide" : ""} key={field}>
                                <dt>{label}</dt>
                                <dd>{formatHistoryValue(entry[field], format)}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      );
                    })}
                    {entry.id !== null && entry.id !== undefined && (
                      <div className="nv-history-record-actions">
                        <button
                          type="button"
                          onClick={() => startHistoryEdit(entry)}
                          disabled={loading}
                        >
                          Editar esta visita
                        </button>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
            {historyFiltered.length > visibleHistoryCount && (
              <button
                type="button"
                className="nv-history-more"
                onClick={() => setVisibleHistoryCount((old) => old + 8)}
              >
                Mostrar mais visitas ({historyFiltered.length - visibleHistoryCount} restantes)
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
