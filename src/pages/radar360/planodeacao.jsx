import React, { useMemo, useState } from "react";
import { api } from "../../services/api";
import "./planodeacao.css";

export default function ActionPlan({ actions, visits, contratoSelecionado }) {
  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });
async function handleFiles(action) {
  setSelectedAction(action);

  try {
    const { data } = await api.get(
      `/actions/${action.id}/files`,
      {
        headers: authHeader(),
      }
    );

    setFiles(data);
  } catch {
    alert("Erro ao carregar arquivos.");
  }
}



  const initialState = {
    visit_id: "",
    cr: contratoSelecionado || "",
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
const [selectedAction, setSelectedAction] = useState(null);
const [files, setFiles] = useState([]);
const [selectedFiles, setSelectedFiles] = useState([]);
const [uploading, setUploading] = useState(false);

  const contracts = useMemo(() => {
    return [...new Set(visits.map((v) => v.cr).filter(Boolean))].sort();
  }, [visits]);

  const filteredActions = useMemo(() => {
    if (!contratoSelecionado) return actions;

    return actions.filter((item) => item.cr === contratoSelecionado);
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
async function removeFile(fileId) {

    if (!window.confirm("Excluir arquivo?"))
        return;

    try {

        await api.delete(
            `/actions/${selectedAction.id}/files/${fileId}`,
            {
                headers: authHeader()
            }
        );

        setFiles(files.filter(f => f.id !== fileId));

    } catch {

        alert("Erro ao excluir.");

    }

}
  function clearForm() {
    setEditingId(null);

    setForm({
  ...initialState,
  cr: contratoSelecionado || "",
});
  }
async function uploadActionFiles() {
  if (!selectedFiles.length) return;

  const formData = new FormData();

  selectedFiles.forEach(file => {
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
          "Content-Type": "multipart/form-data",
        },
      }
    );

    setFiles(data);

    setSelectedFiles([]);

    alert("Arquivos enviados.");
  } catch {
    alert("Erro ao enviar.");
  } finally {
    setUploading(false);
  }
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
  cr: action.cr,
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
  name="cr"
  value={form.cr}
  onChange={handleChange}
  required
>
  <option value="">CR</option>

  {contracts.map((cr) => (
    <option key={cr} value={cr}>
      {cr}
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
        <th>Mês</th>
        <th>CR</th>
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
          <td colSpan="10">
            Nenhuma ação cadastrada.
          </td>
        </tr>

      ) : (

        filteredActions.map((item) => {

          const signal = getSignal(item);

          return (

            <tr key={item.id}>

              <td>
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString(
                      "pt-BR",
                      {
                        month: "2-digit",
                        year: "numeric",
                      }
                    )
                  : "-"}
              </td>


              <td>
                {item.cr}
              </td>


              <td>
                {item.description}
              </td>


              <td>
                {item.execution || "-"}
              </td>


              <td>
                {item.indicators || "-"}
              </td>


              <td>
                {item.owner}
              </td>


              <td>
                {new Date(item.due_date).toLocaleDateString("pt-BR")}
              </td>


              <td>
                {item.stage === "todo"
                  ? "A Fazer"
                  : item.stage === "doing"
                    ? "Em andamento"
                    : "Concluído"}
              </td>


              <td>
                {signal.text}
              </td>


              <td className="action-buttons">

  <button
    type="button"
    onClick={() => handleEdit(item)}
  >
    Editar
  </button>

  <button
    type="button"
    onClick={() => handleFiles(item)}
  >
    Arquivo
    {item.files?.length > 0 && ` (${item.files.length})`}
  </button>

  <button
    type="button"
    onClick={() => handleDelete(item.id)}
  >
    Excluir
  </button>

</td>


            </tr>

          );

        })

      )}

    </tbody>

  </table>

</div>
      </div>
      {selectedAction && (
  <div
    className="files-modal"
    onClick={() => setSelectedAction(null)}
  >
    <div
      className="files-modal-content"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="files-header">
        <div>
          <h3>Arquivos da ação</h3>
          <p>
            <strong>Ação:</strong> {selectedAction.description}
          </p>
        </div>
      </div>

      <div className="upload-area">
        <input
          type="file"
          multiple
          onChange={(e) =>
            setSelectedFiles([...e.target.files])
          }
        />

        <button
          className="upload-btn"
          onClick={uploadActionFiles}
          disabled={uploading}
        >
          {uploading
            ? "Enviando..."
            : "Enviar arquivos"}
        </button>
      </div>

      <div className="files-table">
        <table>
          <thead>
            <tr>
              <th>Arquivo</th>
              <th style={{ width: 180 }}>
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan="2">
                  Nenhum arquivo enviado.
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id}>
                  <td className="file-name">
                    📄 {file.originalName}
                  </td>

                  <td>
                    <div className="file-actions">
                      <button
                        className="download-btn"
                        onClick={() =>
                          window.open(
                            `${api.defaults.baseURL}/actions/${selectedAction.id}/files/${file.id}`,
                            "_blank"
                          )
                        }
                      >
                        Baixar
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() =>
                          removeFile(file.id)
                        }
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

      <div className="files-footer">
        <button
          className="close-modal-btn"
          onClick={() => setSelectedAction(null)}
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
