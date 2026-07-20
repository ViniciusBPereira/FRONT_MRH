import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function Tracking({ visits, tracking, contratoSelecionado,onReload }) {
  const navigate = useNavigate();
  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  /* ============================================
      ESTADO INICIAL
  ============================================ */

  const initialState = {
    cr: "",
    month: "",

    turnover: "",
    absenteeism: "",
    he_inefficiency: "",

    labor_actions: 0,

    replacement_days: "",

    headcount: "",

    notes: "",
  };

  /* ============================================
      STATES
  ============================================ */
  const [graficoSelecionado, setGraficoSelecionado] = useState("todos");
  const [form, setForm] = useState(initialState);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
  if (contratoSelecionado) {
    setForm((old) => ({
      ...old,
      cr: contratoSelecionado,
    }));
  }
}, [contratoSelecionado]);
  /* ============================================
      ALTERAÇÃO DOS CAMPOS
  ============================================ */

  const handleChange = ({ target }) => {
    const { name, value, type } = target;

    setForm((old) => ({
      ...old,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  /* ============================================
      LIMPAR FORMULÁRIO
  ============================================ */

  const clearForm = () => {

  setForm({
    ...initialState,
    cr: contratoSelecionado || "",
  });

};
  /* ============================================
      SALVAR
  ============================================ */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

     await api.post("/tracking", form, {
  headers: authHeader(),
});

      clearForm();
await onReload();
      alert(
  "Acompanhamento cadastrado com sucesso."
);
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Erro ao salvar acompanhamento.");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================
      EDITAR
  ============================================ */

  const handleEdit = (item) => {

  navigate(`/visitas/nova/${item.id}`);

};

  /* ============================================
      EXCLUIR
  ============================================ */

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja remover este acompanhamento?")) return;

    try {
      await api.delete(`/tracking/${id}`, {
        headers: authHeader(),
      });
      await onReload();
    } catch (err) {
      console.error(err);

      alert("Erro ao remover acompanhamento.");
    }
  };

  /* ============================================
      FILTROS
  ============================================ */

  const filteredTracking = useMemo(() => {
  if (!contratoSelecionado) return [];

  return tracking.filter(
    (item) => item.cr === contratoSelecionado
  );

}, [tracking, contratoSelecionado]);

  /* ============================================
      EVOLUÇÃO DO CONTRATO
  ============================================ */

  const evolutionData = useMemo(() => {
    if (!contratoSelecionado) return [];

    return filteredTracking
      .filter((item) => item.cr === contratoSelecionado)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTracking, contratoSelecionado]);

  /* ============================================
    RENDER
============================================ */

  return (
    <div className="tracking-page">
      {/* ==========================================================
        GRID SUPERIOR
    =========================================================== */}
      <div className="tracking-grid">
        {/* formulário */}

        <form className="tracking-card tracking-form" onSubmit={handleSubmit}>
          <div className="tracking-card-header">
            <div>
              <h2>
  Novo acompanhamento
</h2>

              <small>Registre mensalmente os indicadores do contrato.</small>
            </div>
          </div>

          <div className="tracking-fields">

            <label>
              Mês de Referência
              <input
                required
                type="month"
                name="month"
                value={form.month}
                onChange={handleChange}
              />
            </label>

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

            <label>
              Ações Trabalhistas
              <input
                required
                type="number"
                min="0"
                name="labor_actions"
                value={form.labor_actions}
                onChange={handleChange}
              />
            </label>

            <label>
              Fechamento de Vagas
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

            <label>
              Efetivo
              <input
                required
                type="number"
                min="0"
                name="headcount"
                value={form.headcount}
                onChange={handleChange}
              />
            </label>

            <label className="full">
              Observações
              <textarea
                rows={5}
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Registre avanços, riscos e decisões do mês."
              />
            </label>
          </div>

          <div className="tracking-actions">
            <button type="button" className="secondary" onClick={clearForm}>
              Limpar
            </button>

            <button type="submit" className="primary" disabled={loading}>
              {loading
  ? "Salvando..."
  : "Salvar acompanhamento"}
            </button>
          </div>
        </form>
        {/* ==========================================================
            GRÁFICO / EVOLUÇÃO
        =========================================================== */}

        <div className="tracking-card tracking-chart-card">
          <div className="tracking-card-header">
            <div className="chart-filter">
              <select
                value={graficoSelecionado}
                onChange={(e) => setGraficoSelecionado(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="turnover">Turnover</option>
                <option value="absenteeism">Absenteísmo</option>
                <option value="he_inefficiency">H.E.</option>
                <option value="labor_actions">Trabalhistas</option>
                <option value="replacement_days">Fechamento</option>
              </select>
            </div>
            <div>
              <h2>Evolução do Contrato</h2>

              <small>Acompanhe a evolução mensal dos indicadores.</small>
            </div>
          </div>

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
              Fechamento
            </span>
          </div>

          <div className="tracking-chart">
            {!contratoSelecionado ? (
              <div className="chart-empty">
                Selecione um contrato para visualizar a evolução.
              </div>
            ) : evolutionData.length === 0 ? (
              <div className="chart-empty">
                Nenhum acompanhamento encontrado.
              </div>
            ) : (
              <div className="chart-placeholder">
                <div className="tracking-chart">
                  <ResponsiveContainer width="100%" height={430}>
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="month" />

                      <YAxis />

                      <Tooltip />

                      <Legend />

                      {(graficoSelecionado === "todos" ||
                        graficoSelecionado === "turnover") && (
                        <Line
                          type="monotone"
                          dataKey="turnover"
                          stroke="#2563eb"
                          strokeWidth={3}
                        />
                      )}

                      {(graficoSelecionado === "todos" ||
                        graficoSelecionado === "absenteeism") && (
                        <Line
                          type="monotone"
                          dataKey="absenteeism"
                          stroke="#10b981"
                          strokeWidth={3}
                        />
                      )}

                      {(graficoSelecionado === "todos" ||
                        graficoSelecionado === "he_inefficiency") && (
                        <Line
                          type="monotone"
                          dataKey="he_inefficiency"
                          stroke="#f59e0b"
                          strokeWidth={3}
                        />
                      )}

                      {(graficoSelecionado === "todos" ||
                        graficoSelecionado === "labor_actions") && (
                        <Line
                          type="monotone"
                          dataKey="labor_actions"
                          stroke="#ef4444"
                          strokeWidth={3}
                        />
                      )}

                      {(graficoSelecionado === "todos" ||
                        graficoSelecionado === "replacement_days") && (
                        <Line
                          type="monotone"
                          dataKey="replacement_days"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ==========================================================
    HISTÓRICO DE ACOMPANHAMENTOS
=========================================================== */}
<div className="tracking-table-card">

  <div className="tracking-card-header">
    <div>
      <h2>Histórico de Acompanhamentos</h2>
      <small>Evolução mensal registrada para cada contrato.</small>
    </div>
  </div>


  <div>
    Total registros: {filteredTracking.length}
  </div>


  <table className="tracking-table-simple">

    <thead>
      <tr>
        <th>Mês</th>
        <th>CR</th>
        <th>Turnover</th>
        <th>Absenteísmo</th>
        <th>H.E.</th>
        <th>Trabalhistas</th>
        <th>Fechamento</th>
        <th>Efetivo</th>
        <th>Observações</th>
        <th>Ações</th>
      </tr>
    </thead>


    <tbody>

      {filteredTracking.length === 0 ? (

        <tr>
          <td colSpan="10">
            Nenhum acompanhamento encontrado.
          </td>
        </tr>

      ) : (

        filteredTracking.map((item) => (

          <tr key={item.id}>

            <td>{item.month}</td>

            <td>{item.cr}</td>

            <td>{Number(item.turnover).toFixed(1)}%</td>

            <td>{Number(item.absenteeism).toFixed(1)}%</td>

            <td>
              R$ {Number(item.he_inefficiency).toLocaleString("pt-BR", {
                minimumFractionDigits: 2
              })}
            </td>

            <td>{item.labor_actions}</td>

            <td>{item.replacement_days} dias</td>

            <td>{item.headcount}</td>

            <td>
              {item.notes || "-"}
            </td>


            <td>

              <button
                type="button"
                onClick={() => handleEdit(item)}
              >
                Editar
              </button>


              <button
                type="button"
                onClick={() => handleDelete(item.id)}
              >
                Excluir
              </button>

            </td>


          </tr>

        ))

      )}

    </tbody>


  </table>

</div>
      {/* ==========================================================
          HISTÓRICO DAS VISITAS
      =========================================================== */}
      <div className="tracking-history">
        <div className="tracking-card-header">
          <div>
            <h2>Histórico de Visitas</h2>

            <small>Visitas realizadas para o contrato selecionado.</small>
          </div>
        </div>
        {contratoSelecionado === "" ? (
          <div className="history-empty">
            Selecione um contrato para visualizar o histórico das visitas.
          </div>
        ) : (
          visits
            .filter((visit) => visit.cr === contratoSelecionado)
            .sort(
              (a, b) =>
                new Date(b.visit_date).getTime() -
                new Date(a.visit_date).getTime(),
            )
            .map((visit) => (
              <div className="history-card" key={visit.id}>
                <div className="history-header">
                  <div>
                    <h4>{visit.client}</h4>

                    <span>CR {visit.cr}</span>
                  </div>

                  <div className="history-date">
                    {new Date(visit.visit_date).toLocaleDateString("pt-BR")}
                  </div>
                </div>

                <div className="history-grid">
                  <div>
                    <span>BP</span>

                    <strong>{visit.bp}</strong>
                  </div>

                  <div>
                    <span>Unidade</span>

                    <strong>{visit.unit}</strong>
                  </div>

                  <div>
                    <span>Liderança</span>

                    <strong>{visit.leadership_name}</strong>
                  </div>

                  <div>
                    <span>Efetivo</span>

                    <strong>{visit.headcount}</strong>
                  </div>
                </div>

                <div className="history-scores">
                  <div>
                    <span>Liderança</span>
                    <strong>{visit.leadership_score}</strong>
                  </div>

                  <div>
                    <span>Clima</span>
                    <strong>{visit.climate_score}</strong>
                  </div>

                  <div>
                    <span>Estrutura</span>
                    <strong>{visit.structure_score}</strong>
                  </div>

                  <div>
                    <span>Cliente</span>
                    <strong>{visit.customer_score}</strong>
                  </div>

                  <div>
                    <span>Pulse</span>
                    <strong>{visit.pulse}</strong>
                  </div>

                  <div>
                    <span>eNPS</span>
                    <strong>{visit.enps}</strong>
                  </div>
                </div>

                {visit.overview && (
                  <div className="history-overview">
                    <h5>Panorama Geral</h5>

                    <p>{visit.overview}</p>
                  </div>
                )}
              </div>
            ))
        )}
      </div>{" "}
      {/* tracking-history */}
      <div className="tracking-footer">
        <div className="tracking-summary">
          <span>Total de acompanhamentos</span>

          <strong>{filteredTracking.length}</strong>
        </div>

        {contratoSelecionado && (
          <div className="tracking-summary">
            <span>CR selecionado</span>

            <strong>{contratoSelecionado}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
