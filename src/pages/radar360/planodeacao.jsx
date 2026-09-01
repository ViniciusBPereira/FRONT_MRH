import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import "./planodeacao.css";

export default function ActionPlan({
  actions: actionsProp = [],
  contracts: contractsProp = [],
  contratoSelecionado = "",
}) {
  // ============================================================
  // AUTH
  // ============================================================

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  // ============================================================
  // FORM
  // ============================================================

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

  // ============================================================
  // AÇÕES
  // ============================================================

  const [localActions, setLocalActions] = useState(
    Array.isArray(actionsProp) ? actionsProp : []
  );

  // ============================================================
  // CONTRATOS
  // ============================================================

  const [contracts, setContracts] = useState(
    Array.isArray(contractsProp) ? contractsProp : []
  );

  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState("");

  // ============================================================
  // ARQUIVOS
  // ============================================================

  const [selectedAction, setSelectedAction] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // ============================================================
  // SINCRONIZAR AÇÕES VINDAS DO PAI
  // ============================================================

  useEffect(() => {
    if (Array.isArray(actionsProp)) {
      setLocalActions(actionsProp);
    }
  }, [actionsProp]);

  // ============================================================
  // BUSCAR CONTRATOS DIRETAMENTE DA API
  // ============================================================

  async function loadContracts() {
    try {
      setContractsLoading(true);
      setContractsError("");

      console.log("[ACTION FRONT] Buscando contratos em GET /contracts");

      const response = await api.get("/contracts", {
        headers: authHeader(),
      });

      console.log(
        "[ACTION FRONT] Resposta /contracts:",
        response.data
      );

      /*
       * Aceita os formatos:
       *
       * [
       *   { id: 1, name: "Contrato 001" }
       * ]
       *
       * ou:
       *
       * {
       *   contracts: [...]
       * }
       *
       * ou:
       *
       * {
       *   data: [...]
       * }
       */

      let data = response.data;

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

      console.warn(
        "[ACTION FRONT] /contracts não retornou uma lista:",
        data
      );

      setContracts([]);
      setContractsError(
        "A API de contratos não retornou uma lista válida."
      );
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao carregar contratos:",
        error.response?.data || error
      );

      setContracts([]);
      setContractsError(
        error.response?.data?.message ||
          "Não foi possível carregar os contratos."
      );
    } finally {
      setContractsLoading(false);
    }
  }

  useEffect(() => {
    loadContracts();
  }, []);

  // ============================================================
  // NORMALIZAR CONTRATOS
  // ============================================================

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

        /*
         * Aqui priorizamos os campos mais comuns.
         *
         * Se sua API possui "name", ele será usado.
         * Se não possui, tentamos os outros.
         */

        const name =
          contract.name ??
          contract.contract_name ??
          contract.contractName ??
          contract.number ??
          contract.code ??
          contract.description ??
          `Contrato #${id}`;

        return {
          id: String(id),
          name: String(name),
          original: contract,
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", {
          numeric: true,
          sensitivity: "base",
        })
      );
  }, [contracts]);

  // ============================================================
  // INICIALIZAR CONTRATO SELECIONADO
  // ============================================================

  useEffect(() => {
    if (editingId) {
      return;
    }

    if (contratoSelecionado !== undefined) {
      setForm((old) => ({
        ...old,
        contract_id: contratoSelecionado
          ? String(contratoSelecionado)
          : old.contract_id,
      }));
    }
  }, [contratoSelecionado, editingId]);

  // ============================================================
  // AÇÕES FILTRADAS
  // ============================================================

  const filteredActions = useMemo(() => {
    if (!Array.isArray(localActions)) {
      return [];
    }

    if (!contratoSelecionado) {
      return localActions;
    }

    return localActions.filter(
      (item) =>
        String(item.contract_id) ===
        String(contratoSelecionado)
    );
  }, [localActions, contratoSelecionado]);

  // ============================================================
  // PROGRESSO
  // ============================================================

  const progress = useMemo(() => {
    if (!filteredActions.length) {
      return 0;
    }

    const done = filteredActions.filter(
      (action) => action.status === "Concluído"
    ).length;

    return Math.round(
      (done / filteredActions.length) * 100
    );
  }, [filteredActions]);

  // ============================================================
  // ALTERAR FORM
  // ============================================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  // ============================================================
  // LIMPAR FORMULÁRIO
  // ============================================================

  function clearForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      contract_id: contratoSelecionado
        ? String(contratoSelecionado)
        : "",
    });
  }

  // ============================================================
  // SALVAR
  // ============================================================

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
        description: form.description.trim(),

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

      console.log(
        "[ACTION FRONT] Payload:",
        payload
      );

      let response;

      if (editingId) {
        response = await api.put(
          `/actions/${editingId}`,
          payload,
          {
            headers: authHeader(),
          }
        );
      } else {
        response = await api.post(
          "/actions",
          payload,
          {
            headers: authHeader(),
          }
        );
      }

      const savedAction = response.data;

      console.log(
        "[ACTION FRONT] Resposta:",
        savedAction
      );

      if (editingId) {
        setLocalActions((old) =>
          old.map((item) =>
            String(item.id) === String(editingId)
              ? savedAction
              : item
          )
        );

        alert("Plano atualizado com sucesso.");
      } else {
        setLocalActions((old) => [
          ...old,
          savedAction,
        ]);

        alert("Plano criado com sucesso.");
      }

      clearForm();
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao salvar plano:",
        error
      );

      console.error(
        "[ACTION FRONT] Status:",
        error.response?.status
      );

      console.error(
        "[ACTION FRONT] Response:",
        error.response?.data
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Erro ao salvar plano de ação."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // EDITAR
  // ============================================================

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

  // ============================================================
  // EXCLUIR
  // ============================================================

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Deseja excluir esta ação?"
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
            String(item.id) !== String(id)
        )
      );

      if (
        selectedAction &&
        String(selectedAction.id) === String(id)
      ) {
        setSelectedAction(null);
      }

      alert("Ação excluída com sucesso.");
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao excluir:",
        error.response?.data || error
      );

      alert(
        error.response?.data?.message ||
          "Erro ao excluir ação."
      );
    }
  }

  // ============================================================
  // SINAL
  // ============================================================

  function getSignal(action) {
    if (action.status === "Concluído") {
      return {
        text: "Concluído",
        className: "green",
      };
    }

    if (!action.due_date) {
      return {
        text: "Sem prazo",
        className: "yellow",
      };
    }

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const due = new Date(
      action.due_date
    );

    due.setHours(
      0,
      0,
      0,
      0
    );

    const diff = Math.ceil(
      (due - today) /
        (1000 * 60 * 60 * 24)
    );

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

  // ============================================================
  // NOME DO CONTRATO
  // ============================================================

  function getContractName(contractId) {
    if (
      contractId === undefined ||
      contractId === null ||
      contractId === ""
    ) {
      return "-";
    }

    const contract =
      normalizedContracts.find(
        (item) =>
          String(item.id) ===
          String(contractId)
      );

    return (
      contract?.name ||
      `Contrato #${contractId}`
    );
  }

  // ============================================================
  // ARQUIVOS
  // ============================================================

  async function handleFiles(action) {
    setSelectedAction(action);
    setFiles([]);
    setSelectedFiles([]);

    try {
      const { data } = await api.get(
        `/actions/${action.id}/files`,
        {
          headers: authHeader(),
        }
      );

      setFiles(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao carregar arquivos:",
        error.response?.data || error
      );

      alert(
        error.response?.data?.message ||
          "Erro ao carregar arquivos."
      );
    }
  }

  // ============================================================
  // UPLOAD
  // ============================================================

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

      const { data } =
        await api.post(
          `/actions/${selectedAction.id}/files`,
          formData,
          {
            headers: {
              ...authHeader(),
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      setFiles(
        Array.isArray(data)
          ? data
          : []
      );

      setSelectedFiles([]);

      /*
       * Atualiza a contagem de arquivos
       * na tabela sem recarregar a página.
       */
      setLocalActions((old) =>
        old.map((item) =>
          String(item.id) ===
          String(selectedAction.id)
            ? {
                ...item,
                files:
                  Array.isArray(data)
                    ? data
                    : [],
              }
            : item
        )
      );

      alert(
        "Arquivos enviados com sucesso."
      );
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro no upload:",
        error.response?.data ||
          error
      );

      alert(
        error.response?.data?.message ||
          "Erro ao enviar arquivos."
      );
    } finally {
      setUploading(false);
    }
  }

  // ============================================================
  // DOWNLOAD DO ARQUIVO
  // ============================================================

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
        }
      );

      const blobUrl =
        window.URL.createObjectURL(
          new Blob([response.data])
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

      window.URL.revokeObjectURL(
        blobUrl
      );
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao baixar arquivo:",
        error.response?.data ||
          error
      );

      alert(
        "Erro ao baixar arquivo."
      );
    }
  }

  // ============================================================
  // REMOVER ARQUIVO
  // ============================================================

  async function removeFile(fileId) {
    if (
      !window.confirm(
        "Excluir arquivo?"
      )
    ) {
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
        }
      );

      setFiles((old) =>
        old.filter(
          (file) =>
            String(file.id) !==
            String(fileId)
        )
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
                    String(fileId)
                )
              : [],
          };
        })
      );
    } catch (error) {
      console.error(
        "[ACTION FRONT] Erro ao excluir arquivo:",
        error.response?.data ||
          error
      );

      alert(
        error.response?.data?.message ||
          "Erro ao excluir arquivo."
      );
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="action-page">
      <div className="action-card">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="action-header">
          <div>
            <span className="action-eyebrow">
              Execução Assistida
            </span>

            <h2>
              Plano de Ação
            </h2>

            <p>
              Cadastre, acompanhe e
              gerencie os planos de
              ação diretamente por
              contrato.
            </p>
          </div>
        </div>

        {/* =====================================================
            FORMULÁRIO
        ====================================================== */}

        <form
          className="action-form-horizontal"
          onSubmit={handleSubmit}
        >

          {/* CONTRATO */}

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
                : "Selecione o contrato"}
            </option>

            {normalizedContracts.map(
              (contract) => (
                <option
                  key={contract.id}
                  value={contract.id}
                >
                  {contract.name}
                </option>
              )
            )}
          </select>

          {/* DESCRIÇÃO */}

          <input
            name="description"
            placeholder="Descrição da ação"
            value={form.description}
            onChange={handleChange}
            required
          />

          {/* RESPONSÁVEL */}

          <input
            name="responsible"
            placeholder="Responsável"
            value={form.responsible}
            onChange={handleChange}
          />

          {/* PRAZO */}

          <input
            type="date"
            name="due_date"
            value={form.due_date}
            onChange={handleChange}
          />

          {/* STATUS */}

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="A fazer">
              A Fazer
            </option>

            <option value="Em andamento">
              Em andamento
            </option>

            <option value="Concluído">
              Concluído
            </option>
          </select>

          {/* SALVAR */}

          <button
            type="submit"
            className="primary"
            disabled={
              loading ||
              contractsLoading ||
              normalizedContracts.length === 0
            }
          >
            {loading
              ? "Salvando..."
              : editingId
                ? "Atualizar"
                : "Adicionar"}
          </button>

          {/* CANCELAR */}

          {editingId && (
            <button
              type="button"
              onClick={clearForm}
            >
              Cancelar
            </button>
          )}
        </form>

        {/* ERRO CONTRATOS */}

        {contractsError && (
          <div
            style={{
              marginTop: 10,
              color: "#b91c1c",
              fontSize: 14,
            }}
          >
            {contractsError}

            <button
              type="button"
              onClick={loadContracts}
              style={{
                marginLeft: 10,
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* NENHUM CONTRATO */}

        {!contractsLoading &&
          !contractsError &&
          normalizedContracts.length === 0 && (
            <div
              style={{
                marginTop: 10,
                color: "#b45309",
                fontSize: 14,
              }}
            >
              Nenhum contrato encontrado.
            </div>
          )}

        {/* =====================================================
            CAMPOS COMPLEMENTARES
        ====================================================== */}

        <div className="action-textareas">

          <textarea
            rows={3}
            name="execution_plan"
            placeholder="Plano de execução..."
            value={form.execution_plan}
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

        {/* =====================================================
            PROGRESSO
        ====================================================== */}

        <div className="plan-progress">

          <div className="progress-header">
            <span>
              Andamento do Plano
            </span>

            <strong>
              {progress}%
            </strong>
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

        {/* =====================================================
            TABELA
        ====================================================== */}

        <div className="action-table">

          <table>

            <thead>
              <tr>
                <th>Mês</th>
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
                  <td colSpan="10">
                    Nenhuma ação cadastrada.
                  </td>
                </tr>

              ) : (

                filteredActions.map(
                  (item) => {
                    const signal =
                      getSignal(item);

                    return (
                      <tr
                        key={item.id}
                      >

                        {/* MÊS */}

                        <td>
                          {item.created_at
                            ? new Date(
                                item.created_at
                              ).toLocaleDateString(
                                "pt-BR",
                                {
                                  month:
                                    "2-digit",
                                  year:
                                    "numeric",
                                }
                              )
                            : "-"}
                        </td>

                        {/* CONTRATO */}

                        <td>
                          {getContractName(
                            item.contract_id
                          )}
                        </td>

                        {/* AÇÃO */}

                        <td>
                          {item.description ||
                            "-"}
                        </td>

                        {/* EXECUÇÃO */}

                        <td>
                          {item.execution_plan ||
                            "-"}
                        </td>

                        {/* INDICADORES */}

                        <td>
                          {item.indicators ||
                            "-"}
                        </td>

                        {/* RESPONSÁVEL */}

                        <td>
                          {item.responsible ||
                            "-"}
                        </td>

                        {/* PRAZO */}

                        <td>
                          {item.due_date
                            ? new Date(
                                item.due_date
                              ).toLocaleDateString(
                                "pt-BR"
                              )
                            : "-"}
                        </td>

                        {/* STATUS */}

                        <td>
                          {item.status ||
                            "-"}
                        </td>

                        {/* CONDIÇÃO */}

                        <td>
                          <span
                            className={`action-signal ${signal.className}`}
                          >
                            {signal.text}
                          </span>
                        </td>

                        {/* AÇÕES */}

                        <td className="action-buttons">

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(item)
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleFiles(item)
                            }
                          >
                            Arquivo
                            {item.files?.length
                              ? ` (${item.files.length})`
                              : ""}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                item.id
                              )
                            }
                          >
                            Excluir
                          </button>

                        </td>
                      </tr>
                    );
                  }
                )
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================
          MODAL ARQUIVOS
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

            {/* HEADER */}

            <div className="files-header">

              <div>

                <h3>
                  Arquivos da ação
                </h3>

                <p>
                  <strong>
                    Ação:
                  </strong>{" "}
                  {
                    selectedAction.description
                  }
                </p>

                <p>
                  <strong>
                    Contrato:
                  </strong>{" "}
                  {getContractName(
                    selectedAction.contract_id
                  )}
                </p>

              </div>
            </div>

            {/* UPLOAD */}

            <div className="upload-area">

              <input
                type="file"
                multiple
                onChange={(event) =>
                  setSelectedFiles(
                    Array.from(
                      event.target.files ||
                        []
                    )
                  )
                }
              />

              <button
                type="button"
                className="upload-btn"
                onClick={
                  uploadActionFiles
                }
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

            {/* ARQUIVOS */}

            <div className="files-table">

              <table>

                <thead>

                  <tr>

                    <th>
                      Arquivo
                    </th>

                    <th
                      style={{
                        width: 180,
                      }}
                    >
                      Ações
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {files.length === 0 ? (

                    <tr>

                      <td colSpan="2">
                        Nenhum arquivo
                        enviado.
                      </td>

                    </tr>

                  ) : (

                    files.map(
                      (file) => (
                        <tr
                          key={
                            file.id
                          }
                        >

                          <td className="file-name">

                            📄{" "}

                            {
                              file.originalName ||
                              file.name ||
                              "Arquivo"
                            }

                          </td>

                          <td>

                            <div className="file-actions">

                              <button
                                type="button"
                                className="download-btn"
                                onClick={() =>
                                  downloadFile(
                                    file
                                  )
                                }
                              >
                                Baixar
                              </button>

                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() =>
                                  removeFile(
                                    file.id
                                  )
                                }
                              >
                                Excluir
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

            {/* FECHAR */}

            <div className="files-footer">

              <button
                type="button"
                className="close-modal-btn"
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