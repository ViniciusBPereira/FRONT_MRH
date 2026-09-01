import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import "./novavisita.css";

export default function NovaVisita({
  editVisit = false,
  visit = null,
  visitId = null,
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

  const createInitialState = () => ({
    // ----------------------------------------------------------
    // IDENTIFICAÇÃO
    // ----------------------------------------------------------

    contract_id: "",
    visit_date: "",
    employees_approached: "",

    // ----------------------------------------------------------
    // INDICADORES
    // ----------------------------------------------------------

    turnover: "",
    absenteeism: "",
    he_inefficiency: "",
    open_positions: "",
    replacement_days: "",
    labor_actions: 0,
    warnings: 0,
    enps: 30,

    // ----------------------------------------------------------
    // LIDERANÇA
    // ----------------------------------------------------------

    leadership_presence: 0,
    leadership_communication: 0,
    leadership_routine: 0,
    leadership_deviation: 0,

    // ----------------------------------------------------------
    // CLIMA
    // ----------------------------------------------------------

    climate_engagement: 0,
    climate_listening: 0,
    climate_relationship: 0,
    climate_satisfaction: 0,

    // ----------------------------------------------------------
    // ESTRUTURA
    // ----------------------------------------------------------

    structure_resources: 0,
    structure_staffing: 0,
    structure_environment: 0,
    structure_support: 0,

    // ----------------------------------------------------------
    // CLIENTE
    // ----------------------------------------------------------

    customer_expectation: 0,
    customer_communication: 0,
    customer_quality: 0,
    customer_requests: 0,

    // ----------------------------------------------------------
    // ANÁLISE QUALITATIVA
    // ----------------------------------------------------------

    root_cause: [],
    evidence: "",
    overview: "",
  });

  const [form, setForm] = useState(createInitialState);

  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(true);

  const [loading, setLoading] = useState(false);

  const [contractError, setContractError] = useState("");

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
  // CARREGAR VISITA PARA EDIÇÃO
  // ============================================================

  useEffect(() => {
    if (!editVisit || !visit) return;

    const initial = createInitialState();

    setForm({
      ...initial,

      // --------------------------------------------------------
      // Identificação
      // --------------------------------------------------------

      contract_id: visit.contract_id || "",

      visit_date: visit.visit_date
        ? String(visit.visit_date).substring(0, 10)
        : "",

      employees_approached: visit.employees_approached ?? "",

      // --------------------------------------------------------
      // Indicadores
      // --------------------------------------------------------

      turnover: visit.turnover ?? "",
      absenteeism: visit.absenteeism ?? "",
      he_inefficiency: visit.he_inefficiency ?? "",
      open_positions: visit.open_positions ?? "",
      replacement_days: visit.replacement_days ?? "",
      labor_actions: visit.labor_actions ?? 0,
      warnings: visit.warnings ?? 0,
      enps: visit.enps ?? 30,

      // --------------------------------------------------------
      // Pilares
      // --------------------------------------------------------

      leadership_presence: visit.leadership_presence ?? 0,

      leadership_communication: visit.leadership_communication ?? 0,

      leadership_routine: visit.leadership_routine ?? 0,

      leadership_deviation: visit.leadership_deviation ?? 0,

      climate_engagement: visit.climate_engagement ?? 0,

      climate_listening: visit.climate_listening ?? 0,

      climate_relationship: visit.climate_relationship ?? 0,

      climate_satisfaction: visit.climate_satisfaction ?? 0,

      structure_resources: visit.structure_resources ?? 0,

      structure_staffing: visit.structure_staffing ?? 0,

      structure_environment: visit.structure_environment ?? 0,

      structure_support: visit.structure_support ?? 0,

      customer_expectation: visit.customer_expectation ?? 0,

      customer_communication: visit.customer_communication ?? 0,

      customer_quality: visit.customer_quality ?? 0,

      customer_requests: visit.customer_requests ?? 0,

      // --------------------------------------------------------
      // Qualitativo
      // --------------------------------------------------------

      root_cause: Array.isArray(visit.root_cause) ? visit.root_cause : [],

      evidence: visit.evidence ?? "",

      overview: visit.overview ?? "",
    });
  }, [editVisit, visit]);

  // ============================================================
  // ALTERAÇÃO DOS CAMPOS
  // ============================================================

  const handleChange = ({ target }) => {
    const { name, value } = target;

    setForm((old) => ({
      ...old,

      [name]: numericFields.includes(name)
        ? value === ""
          ? ""
          : Number(value)
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

    const turnover = Number(form.turnover || 0);

    calc(
      turnover <= 3.5 ? 100 : turnover <= 7 ? 75 : turnover <= 11 ? 45 : 20,
      0.22,
    );

    // ----------------------------------------------------------
    // ABSENTEÍSMO
    // ----------------------------------------------------------

    const absenteeism = Number(form.absenteeism || 0);

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

    const heInefficiency = Number(form.he_inefficiency || 0);

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

    const laborActions = Number(form.labor_actions || 0);

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

    const replacementDays = Number(form.replacement_days || 0);

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

  const limparFormulario = () => {
    setForm(createInitialState());
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
    return {
      contract_id: form.contract_id,

      visit_date: form.visit_date,

      employees_approached: Number(form.employees_approached || 0),

      turnover: Number(form.turnover || 0),

      absenteeism: Number(form.absenteeism || 0),

      he_inefficiency: Number(form.he_inefficiency || 0),

      open_positions: Number(form.open_positions || 0),

      replacement_days: Number(form.replacement_days || 0),

      labor_actions: Number(form.labor_actions || 0),

      warnings: Number(form.warnings || 0),

      enps: Number(form.enps || 0),

      root_cause: Array.isArray(form.root_cause) ? form.root_cause : [],

      evidence: form.evidence?.trim() || "",

      overview: form.overview?.trim() || "",

      leadership_score: Number(leadershipScore || 0),

      climate_score: Number(climateScore || 0),

      structure_score: Number(structureScore || 0),

      customer_score: Number(customerScore || 0),
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

    try {
      setLoading(true);

      const payload = buildPayload();

      console.log("[NOVA VISITA] Payload enviado:", payload);

      // ========================================================
      // EDIÇÃO
      // ========================================================

      if (editVisit) {
        if (!visitId) {
          throw new Error("ID da visita é obrigatório para edição.");
        }

        await api.put(`/visits/${visitId}`, payload, {
          headers: authHeader(),
        });

        alert("Visita atualizada com sucesso.");

        window.location.reload();

        return;
      }

      // ========================================================
      // CRIAÇÃO
      // ========================================================

      await api.post("/visits", payload, {
        headers: authHeader(),
      });

      alert("Visita cadastrada com sucesso.");

      limparFormulario();
    } catch (error) {
      console.error("[NOVA VISITA] Erro ao salvar:", error);

      const message =
        error.response?.data?.message ||
        error.message ||
        "Erro ao salvar visita.";

      alert(message);
    } finally {
      setLoading(false);
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

          <h2>{editVisit ? "Editar Visita" : "Nova Visita"}</h2>

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
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                name="turnover"
                value={form.turnover}
                onChange={handleChange}
              />
            </label>

            <label>
              Absenteísmo (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                name="absenteeism"
                value={form.absenteeism}
                onChange={handleChange}
              />
            </label>

            <label>
              H.E. Ineficiência (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                name="he_inefficiency"
                value={form.he_inefficiency}
                onChange={handleChange}
              />
            </label>

            <label>
              Vagas abertas
              <input
                type="number"
                min="0"
                required
                name="open_positions"
                value={form.open_positions}
                onChange={handleChange}
              />
            </label>

            <label>
              Tempo médio de reposição
              <input
                type="number"
                min="0"
                step="0.1"
                required
                name="replacement_days"
                value={form.replacement_days}
                onChange={handleChange}
              />
            </label>

            <label>
              Ações Trabalhistas
              <input
                type="number"
                min="0"
                required
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
                required
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
                required
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
                required
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
          {!editVisit && (
            <button
              type="button"
              className="secondary"
              onClick={limparFormulario}
              disabled={loading}
            >
              Limpar formulário
            </button>
          )}

          <button
            type="submit"
            className="primary"
            disabled={loading || contractsLoading || !form.contract_id}
          >
            {loading
              ? "Salvando..."
              : editVisit
                ? "Atualizar Visita"
                : "Salvar Visita"}
          </button>
        </div>
      </form>
    </div>
  );
}
