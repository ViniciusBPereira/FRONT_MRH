import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import "./novavisita.css";

export default function NovaVisita({
  editTracking,
  trackingId,
  visit,
}) {
  
  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

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
  const initialState = {
    // Dados da visita
    visit_date: "",
    pec: "",
cr: "",
    client: "",
    unit: "",
    bp: "",
    leadership_name: "",
    headcount: "",
    employees_approached: "",

    // Indicadores
    turnover: "",
    absenteeism: "",
    he_inefficiency: "",
    open_positions: "",
    replacement_days: "",
    labor_actions: 0,
    warnings: 0,
    enps: 30,

    // Liderança
    leadership_presence: 0,
    leadership_communication: 0,
    leadership_routine: 0,
    leadership_deviation: 0,

    // Clima
    climate_engagement: 0,
    climate_listening: 0,
    climate_relationship: 0,
    climate_satisfaction: 0,

    // Estrutura
    structure_resources: 0,
    structure_staffing: 0,
    structure_environment: 0,
    structure_support: 0,

    // Cliente
    customer_expectation: 0,
    customer_communication: 0,
    customer_quality: 0,
    customer_requests: 0,

    // Qualitativo
    root_cause: [],
    evidence: "",
    overview: "",

    action_plan: [],
  };


  
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const handleChange = ({ target }) => {
  const { name, value } = target;

  const numericFields = [
    "headcount",
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
  ];

  setForm((old) => ({
    ...old,
    [name]: numericFields.includes(name)
      ? Number(value)
      : value,
  }));
};
  
useEffect(() => {
  if (!editTracking || !visit) return;

  setForm({
    ...initialState,
    ...visit,
    visit_date: visit.visit_date
      ? visit.visit_date.substring(0, 10)
      : "",
    root_cause: visit.root_cause || [],
    action_plan: visit.action_plan || [],
  });
}, [editTracking, visit]);

  const average = (...values) => {
    console.log("Average:", values);

    return Math.round(
      values.reduce((a, b) => a + Number(b || 0), 0) / values.length,
    );
  };

  const limparFormulario = () => {
    setForm(initialState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
  ...form,

  leadership_score: leadershipScore,
  climate_score: climateScore,
  structure_score: structureScore,
  customer_score: customerScore,

  indicator_score: indicatorPreview,
  final_score: finalPreview,
  classification,
  priority,
};
      if (editTracking) {

  await api.put(
    `/tracking/${trackingId}/edit`,
    payload,
    {
      headers: authHeader(),
    }
  );

  alert("Visita e acompanhamento atualizados com sucesso.");

  window.location.reload();

} else {

  await api.post(
    "/visits",
    payload,
    {
      headers: authHeader(),
    }
  );

  alert("Visita cadastrada com sucesso.");

  limparFormulario();

}
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Erro ao cadastrar visita.");
    } finally {
      setLoading(false);
    }
  };

  const leadershipScore = useMemo(
    () =>
      average(
        form.leadership_presence,
        form.leadership_communication,
        form.leadership_routine,
        form.leadership_deviation,
      ),
    [form],
  );

  const climateScore = useMemo(
    () =>
      average(
        form.climate_engagement,
        form.climate_listening,
        form.climate_relationship,
        form.climate_satisfaction,
      ),
    [form],
  );

  const structureScore = useMemo(
    () =>
      average(
        form.structure_resources,
        form.structure_staffing,
        form.structure_environment,
        form.structure_support,
      ),
    [form],
  );

  const customerScore = useMemo(
    () =>
      average(
        form.customer_expectation,
        form.customer_communication,
        form.customer_quality,
        form.customer_requests,
      ),
    [form],
  );

  const scorePreview = useMemo(
    () => average(leadershipScore, climateScore, structureScore, customerScore),
    [leadershipScore, climateScore, structureScore, customerScore],
  );
  const indicatorPreview = useMemo(() => {
    let total = 0;
    let peso = 0;

    const calc = (score, weight) => {
      total += score * weight;
      peso += weight;
    };

    // Turnover
    calc(
      form.turnover <= 3.5
        ? 100
        : form.turnover <= 7
          ? 75
          : form.turnover <= 11
            ? 45
            : 20,
      0.22,
    );

    // Absenteísmo
    calc(
      form.absenteeism <= 3.5
        ? 100
        : form.absenteeism <= 7
          ? 75
          : form.absenteeism <= 11
            ? 45
            : 20,
      0.22,
    );

    // HE Ineficiência
    calc(
      form.he_inefficiency <= 0
        ? 100
        : form.he_inefficiency <= 1000
          ? 75
          : form.he_inefficiency <= 5000
            ? 45
            : 20,
      0.2,
    );

    // Ações Trabalhistas
    calc(
      form.labor_actions === 0
        ? 100
        : form.labor_actions === 1
          ? 55
          : form.labor_actions === 2
            ? 35
            : 15,
      0.18,
    );

    // Tempo reposição
    calc(
      form.replacement_days <= 12
        ? 100
        : form.replacement_days <= 20
          ? 75
          : form.replacement_days <= 30
            ? 45
            : 20,
      0.12,
    );

    return Math.round(total / peso);
  }, [form]);

  const finalPreview = useMemo(() => {
    return Math.round(indicatorPreview * 0.65 + scorePreview * 0.35);
  }, [indicatorPreview, scorePreview]);

  const classification = useMemo(() => {
    if (finalPreview >= 85) return "Referência";

    if (finalPreview >= 70) return "Estável";

    if (finalPreview >= 50) return "Alerta";

    return "Crítico";
  }, [finalPreview]);

  const priority = useMemo(() => {
    if (classification === "Crítico" || finalPreview < 45)
      return "Prioridade Máxima BP";

    if (classification === "Alerta" && finalPreview < 60) return "War Room BP";

    if (classification === "Alerta") return "Plano 30 dias";

    return "Monitoramento";
  }, [classification, finalPreview]);

  return (
    <div className="nova-visita">
      <div className="nv-header">
        <div>
          <span className="eyebrow">COLETA DE CAMPO</span>

          <h2>
  {editTracking
    ? "Editar Visita"
    : "Nova Visita BP"}
</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="nv-grid">
        {/* =========================
    DADOS DA VISITA
========================= */}

        <div className="nv-card">
          <h3>Dados da Visita</h3>

          <div className="nv-fields">
            <label>
              Data da visita
              <input
                type="date"
                name="visit_date"
                value={form.visit_date}
                onChange={handleChange}
              />
            </label>

            <label>
  PEC
  <input
    type="text"
    name="pec"
    value={form.pec}
    onChange={handleChange}
  />
</label>
<label>
  CR
  <input
    type="text"
    name="cr"
    value={form.cr}
    onChange={handleChange}
  />
</label>

            <label>
              Cliente
              <input
                type="text"
                name="client"
                value={form.client}
                onChange={handleChange}
              />
            </label>

            <label>
              Unidade
              <input
                type="text"
                name="unit"
                value={form.unit}
                onChange={handleChange}
              />
            </label>

            <label>
              Business Partner
              <input
                type="text"
                name="bp"
                value={form.bp}
                onChange={handleChange}
              />
            </label>

            <label>
              Liderança Responsável
              <input
                type="text"
                name="leadership_name"
                value={form.leadership_name}
                onChange={handleChange}
              />
            </label>

            <label>
              Efetivo
              <input
                type="number"
                min="0"
                name="headcount"
                value={form.headcount}
                onChange={handleChange}
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
        </div>

        {/* =========================
      INDICADORES
========================= */}

        <div className="nv-card">
          <h3>Indicadores Operacionais</h3>

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
              H.E Ineficiência (R$)
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
              Tempo médio reposição
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
        {/* =========================
      PILARES DO DIAGNÓSTICO
========================= */}

        <div className="nv-card">
          <div className="nv-card-header">
            <div>
              <h3>Pilares do Diagnóstico</h3>
              <small>Avaliação visual dos quatro pilares da operação</small>
            </div>

            <div className="score-preview">
              <span>Score Parcial</span>

              <strong>{scorePreview}</strong>
            </div>
          </div>

          <div className="pillar-grid">
            {/* ================= LIDERANÇA ================= */}

            <div className="pillar-card">
              <h4>Liderança</h4>

              <label>
                Presença ativa na operação
                <select
                  name="leadership_presence"
                  value={form.leadership_presence}
                  onChange={handleChange}
                >
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pillar-total">
                Score Liderança: <strong>{leadershipScore}</strong>
              </div>
            </div>

            {/* ================= CLIMA ================= */}

            <div className="pillar-card">
              <h4>Clima</h4>

              <label>
                Engajamento percebido
                <select
                  name="climate_engagement"
                  value={form.climate_engagement}
                  onChange={handleChange}
                >
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pillar-total">
                Score Clima: <strong>{climateScore}</strong>
              </div>
            </div>

            {/* ================= ESTRUTURA ================= */}

            <div className="pillar-card">
              <h4>Estrutura</h4>

              <label>
                Recursos e equipamentos
                <select
                  name="structure_resources"
                  value={form.structure_resources}
                  onChange={handleChange}
                >
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pillar-total">
                Score Estrutura: <strong>{structureScore}</strong>
              </div>
            </div>

            {/* ================= CLIENTE ================= */}

            <div className="pillar-card">
              <h4>Cliente</h4>

              <label>
                Alinhamento das expectativas
                <select
                  name="customer_expectation"
                  value={form.customer_expectation}
                  onChange={handleChange}
                >
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pillar-total">
                Score Cliente: <strong>{customerScore}</strong>
              </div>
            </div>
          </div>
        </div>
        {/* =========================
      ANÁLISE QUALITATIVA
========================= */}

        <div className="nv-card">
          <h3>Análise Qualitativa</h3>

          <div className="nv-fields">
            <label className="full">
  Causa Raiz

  <div className="root-cause-grid">
    {ROOT_CAUSES.map((cause) => (
      <label key={cause} className="root-cause-item">
        <input
          type="checkbox"
          checked={form.root_cause.includes(cause)}
          onChange={(e) => {
            if (e.target.checked) {
              setForm((old) => ({
                ...old,
                root_cause: [...old.root_cause, cause],
              }));
            } else {
              setForm((old) => ({
                ...old,
                root_cause: old.root_cause.filter((item) => item !== cause),
              }));
            }
          }}
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

        {/* =========================
      PRÉVIA DO DIAGNÓSTICO
========================= */}

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

            <div className="preview-item">
              <span>Efetivo</span>
              <strong>{form.headcount || 0}</strong>
            </div>
          </div>
        </aside>
        {/* =========================
      AÇÕES
========================= */}

        <div className="nv-actions">
          <button
            type="button"
            className="secondary"
            onClick={limparFormulario}
          >
            Limpar formulário
          </button>

          <button
  type="submit"
  className="primary"
  disabled={loading}
>
  {loading
    ? "Salvando..."
    : editTracking
      ? "Atualizar Visita"
      : "Salvar Visita"}
</button>
        </div>
      </form>
    </div>
  );
}
