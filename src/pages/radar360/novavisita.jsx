import React, { useMemo, useState } from "react";
import { api } from "../../services/api";
import "./novavisita.css";

export default function NovaVisita() {
  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const initialState = {
    // Dados da visita
    visit_date: "",
    contract: "",
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
    complaints: 0,

    // Scores
    leadership_score: 75,
    climate_score: 75,
    structure_score: 75,
    customer_score: 75,

    pulse: 75,
    enps: 30,

    // Qualitativo
    root_cause: "liderança",
    evidence: "",
    overview: "",

    action_plan: [],
  };

  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const handleChange = ({ target }) => {
    const { name, value, type } = target;

    setForm((old) => ({
      ...old,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const limparFormulario = () => {
    setForm(initialState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await api.post("/visits", form, {
        headers: authHeader(),
      });

      alert("Visita cadastrada com sucesso!");

      limparFormulario();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Erro ao cadastrar visita.");
    } finally {
      setLoading(false);
    }
  };

  const pilares = {
    liderança: [
      "Presença ativa na operação",
      "Comunicação com equipe",
      "Gestão de rotina e feedback",
      "Tratativa de desvios",
    ],

    clima: [
      "Engajamento percebido",
      "Escuta e acolhimento",
      "Relações internas",
      "Sinais de satisfação",
    ],

    estrutura: [
      "Recursos e equipamentos",
      "Dimensionamento",
      "Escalas",
      "Organização",
    ],

    cliente: ["Relacionamento", "SLA", "Qualidade", "Comunicação"],
  };

  const scorePreview = useMemo(() => {
    const valores = [
      form.leadership_score || 0,
      form.climate_score || 0,
      form.structure_score || 0,
      form.customer_score || 0,
    ];

    return Math.round(
      valores.reduce((a, b) => a + Number(b), 0) / valores.length,
    );
  }, [
    form.leadership_score,
    form.climate_score,
    form.structure_score,
    form.customer_score,
  ]);

  return (
    <div className="nova-visita">
      <div className="nv-header">
        <div>
          <span className="eyebrow">COLETA DE CAMPO</span>

          <h2>Nova Visita BP</h2>
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
                required
                name="visit_date"
                value={form.visit_date}
                onChange={handleChange}
              />
            </label>

            <label>
              Contrato
              <input
                type="text"
                required
                name="contract"
                value={form.contract}
                onChange={handleChange}
              />
            </label>

            <label>
              Cliente
              <input
                type="text"
                required
                name="client"
                value={form.client}
                onChange={handleChange}
              />
            </label>

            <label>
              Unidade
              <input
                type="text"
                required
                name="unit"
                value={form.unit}
                onChange={handleChange}
              />
            </label>

            <label>
              Business Partner
              <input
                type="text"
                required
                name="bp"
                value={form.bp}
                onChange={handleChange}
              />
            </label>

            <label>
              Liderança Responsável
              <input
                type="text"
                required
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
                required
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
              Reclamações
              <input
                type="number"
                min="0"
                name="complaints"
                value={form.complaints}
                onChange={handleChange}
              />
            </label>

            <label>
              Pulse Survey
              <input
                type="number"
                min="0"
                max="100"
                required
                name="pulse"
                value={form.pulse}
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
            {[
              {
                titulo: "Liderança",
                campo: "leadership_score",
                itens: pilares.liderança,
              },

              {
                titulo: "Clima",
                campo: "climate_score",
                itens: pilares.clima,
              },

              {
                titulo: "Estrutura",
                campo: "structure_score",
                itens: pilares.estrutura,
              },

              {
                titulo: "Cliente",
                campo: "customer_score",
                itens: pilares.cliente,
              },
            ].map((pillar) => (
              <div key={pillar.campo} className="pillar-card">
                <div className="pillar-title">{pillar.titulo}</div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  name={pillar.campo}
                  value={form[pillar.campo]}
                  onChange={handleChange}
                />

                <div className="pillar-score">{form[pillar.campo]}%</div>

                <ul>
                  {pillar.itens.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        {/* =========================
      ANÁLISE QUALITATIVA
========================= */}

        <div className="nv-card">
          <h3>Análise Qualitativa</h3>

          <div className="nv-fields">
            <label>
              Causa Raiz
              <select
                name="root_cause"
                value={form.root_cause}
                onChange={handleChange}
              >
                <option value="liderança">Liderança</option>

                <option value="clima">Clima</option>

                <option value="estrutura">Estrutura</option>

                <option value="cliente">Cliente</option>

                <option value="indicadores">Indicadores</option>
              </select>
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
              <span>Score</span>

              <strong>{scorePreview}</strong>
            </div>
          </div>

          <div className="preview-body">
            <div className="preview-item">
              <span>Pilar predominante</span>

              <strong>{form.root_cause}</strong>
            </div>

            <div className="preview-item">
              <span>Pulse Survey</span>

              <strong>{form.pulse}%</strong>
            </div>

            <div className="preview-item">
              <span>eNPS</span>

              <strong>{form.enps}</strong>
            </div>

            <div className="preview-item">
              <span>Efetivo</span>

              <strong>{form.headcount || 0}</strong>
            </div>

            <hr />
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

          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Visita"}
          </button>
        </div>
      </form>
    </div>
  );
}
