import React, { useMemo, useState } from "react";
import { api } from "../../services/api";
import "./planodeacao.css";

export default function ActionPlan({ actions, visits, contratoSelecionado }) {
  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const initialState = {
    visit_id: "",
    contract: contratoSelecionado || "",
    description: "",
    execution: "",
    indicators: "",
    owner: "",
    due_date: "",
    stage: "todo",
  };

  const [form, setForm] = useState(initialState);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const contracts = useMemo(() => {
    return [...new Set(visits.map((v) => v.contract).filter(Boolean))].sort();
  }, [visits]);

  const filteredActions = useMemo(() => {
    if (!contratoSelecionado) return actions;

    return actions.filter((item) => item.contract === contratoSelecionado);
  }, [actions, contratoSelecionado]);

  const progress = useMemo(() => {
    const done = filteredActions.filter((a) => a.stage === "done").length;

    return Math.round((done / (filteredActions.length || 1)) * 100);
  }, [filteredActions]);

  function handleChange({ target }) {
    const { name, value } = target;

    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  function clearForm() {
    setEditingId(null);

    setForm({
      ...initialState,
      contract: contratoSelecionado || "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);

      if (editingId) {
        await api.put(`/actions/${editingId}`, form, {
          headers: authHeader(),
        });
      } else {
        await api.post("/actions", form, {
          headers: authHeader(),
        });
      }

      clearForm();

      alert(
        editingId
          ? "Plano atualizado com sucesso."
          : "Plano criado com sucesso.",
      );

      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(action) {
    setEditingId(action.id);

    setForm({
      visit_id: action.visit_id || "",
      contract: action.contract,
      description: action.description,
      execution: action.execution,
      indicators: action.indicators,
      owner: action.owner,
      due_date: action.due_date?.slice(0, 10),
      stage: action.stage,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja excluir esta ação?")) return;

    try {
      await api.delete(`/actions/${id}`, {
        headers: authHeader(),
      });

      window.location.reload();
    } catch {
      alert("Erro ao excluir ação.");
    }
  }

  function getSignal(action) {
    if (action.stage === "done") {
      return {
        text: "Concluído",
        className: "green",
      };
    }

    const today = new Date();
    const due = new Date(action.due_date);

    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      return {
        text: "Atrasado",
        className: "red",
      };
    }

    if (diff <= 7) {
      return {
        text: "Próximo",
        className: "yellow",
      };
    }

    return {
      text: "No prazo",
      className: "green",
    };
  }
  return (
    <div className="action-page">
      <div className="action-card">
        <div className="action-header">
          <div>
            <span className="action-eyebrow">Execução Assistida</span>

            <h2>Plano consolidado por contrato</h2>

            <p>
              Cadastre ações, acompanhe a execução e monitore o progresso do
              plano de ação.
            </p>
          </div>
        </div>

        <form className="action-form-horizontal" onSubmit={handleSubmit}>
          <select
            name="contract"
            value={form.contract}
            onChange={handleChange}
            required
          >
            <option value="">Contrato</option>

            {contracts.map((contract) => (
              <option key={contract} value={contract}>
                {contract}
              </option>
            ))}
          </select>

          <input
            name="description"
            placeholder="Descrição da ação"
            value={form.description}
            onChange={handleChange}
            required
          />

          <input
            name="owner"
            placeholder="Responsável"
            value={form.owner}
            onChange={handleChange}
            required
          />

          <input
            type="date"
            name="due_date"
            value={form.due_date}
            onChange={handleChange}
            required
          />

          <select name="stage" value={form.stage} onChange={handleChange}>
            <option value="todo">A Fazer</option>
            <option value="doing">Em andamento</option>
            <option value="done">Concluído</option>
          </select>

          <button className="primary" disabled={loading}>
            {loading ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
          </button>
        </form>

        <div className="action-textareas">
          <textarea
            rows={3}
            name="execution"
            placeholder="Plano de execução..."
            value={form.execution}
            onChange={handleChange}
          />

          <textarea
            rows={3}
            name="indicators"
            placeholder="Indicadores de acompanhamento..."
            value={form.indicators}
            onChange={handleChange}
          />
        </div>

        <div className="plan-progress">
          <div className="progress-header">
            <span>Andamento do Plano</span>

            <strong>{progress}%</strong>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        <div className="action-table">
          <table>
            <thead>
              <tr>
                <th>Contrato</th>

                <th>Ação</th>

                <th>Execução</th>

                <th>Indicadores</th>

                <th>Responsável</th>

                <th>Prazo</th>

                <th>Status</th>

                <th>Condição</th>

                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-table">
                    Nenhuma ação cadastrada.
                  </td>
                </tr>
              ) : (
                filteredActions.map((item) => {
                  const signal = getSignal(item);

                  return (
                    <tr key={item.id}>
                      <td>{item.contract}</td>

                      <td className="description-column">{item.description}</td>

                      <td className="text-column">{item.execution || "-"}</td>

                      <td className="text-column">{item.indicators || "-"}</td>

                      <td>{item.owner}</td>

                      <td>
                        {new Date(item.due_date).toLocaleDateString("pt-BR")}
                      </td>

                      <td>
                        <span className={`badge ${item.stage}`}>
                          {item.stage === "todo"
                            ? "A Fazer"
                            : item.stage === "doing"
                              ? "Em andamento"
                              : "Concluído"}
                        </span>
                      </td>

                      <td>
                        <span className={`signal ${signal.className}`}>
                          {signal.text}
                        </span>
                      </td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="secondary small"
                            onClick={() => handleEdit(item)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="danger small"
                            onClick={() => handleDelete(item.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
