import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "../../services/api";
import "./acaopontual.css";

export default function AcaoPontual({
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
  // LOADING
  // ============================================================

  const [loading, setLoading] = useState(false);
  const [loadingContracts, setLoadingContracts] =
    useState(true);

  // ============================================================
  // CONTRATOS
  // ============================================================

  const [contracts, setContracts] = useState([]);

  // ============================================================
  // FORMULÁRIO
  // ============================================================

  const emptyForm = {
    contract_id: "",
    action_date: "",
    action_description: "",
    schedule: "",
    visit_data: "",
    completion_date: "",
    status: "A fazer",
  };

  const [form, setForm] = useState({
    ...emptyForm,
  });

  // ============================================================
  // ARQUIVOS
  // ============================================================

  const [files, setFiles] = useState([]);

  // ============================================================
  // BUSCAR CONTRATOS
  //
  // A origem agora é:
  //
  // GET /contracts
  //
  // NÃO usamos mais visits.
  // NÃO usamos mais CR.
  // ============================================================

  useEffect(() => {
    async function loadContracts() {
      try {
        setLoadingContracts(true);

        const response = await api.get(
          "/contracts",
          {
            headers: authHeader(),
          }
        );

        console.log(
          "[PUNCTUAL ACTION FRONT] Contratos recebidos:",
          response.data
        );

        const data =
          Array.isArray(response.data)
            ? response.data
            : response.data?.contracts ||
              response.data?.data ||
              [];

        setContracts(data);
      } catch (error) {
        console.error(
          "[PUNCTUAL ACTION FRONT] Erro ao buscar contratos:",
          error
        );

        console.error(
          "[PUNCTUAL ACTION FRONT] Response:",
          error.response?.data
        );

        alert(
          error.response?.data?.message ||
            "Erro ao carregar contratos."
        );
      } finally {
        setLoadingContracts(false);
      }
    }

    loadContracts();
  }, []);

  // ============================================================
  // NORMALIZAR CONTRATOS
  //
  // A coluna principal solicitada é:
  //
  // contracts.Contract
  //
  // Porém deixamos algumas alternativas para caso o PostgreSQL /
  // backend transforme o nome da propriedade.
  // ============================================================

  const normalizedContracts = useMemo(() => {
    return (contracts || [])
      .map((contract) => {
        const id =
          contract.id ??
          contract.contract_id ??
          contract.contractId;

        const contractName =
          contract.Contract ??
          contract.contract ??
          contract.contract_name ??
          contract.contractName ??
          contract.name ??
          contract.description ??
          "";

        return {
          id,
          name: contractName,
        };
      })
      .filter(
        (contract) =>
          contract.id !== undefined &&
          contract.id !== null &&
          contract.id !== ""
      )
      .sort((a, b) =>
        String(a.name).localeCompare(
          String(b.name),
          "pt-BR"
        )
      );
  }, [contracts]);

  // ============================================================
  // CONTRATO SELECIONADO
  //
  // Se o componente pai mandar contratoSelecionado,
  // usamos diretamente como contract_id.
  // ============================================================

  useEffect(() => {
    if (!contratoSelecionado) {
      return;
    }

    const contrato = normalizedContracts.find(
      (item) =>
        String(item.id) ===
        String(contratoSelecionado)
    );

    setForm((old) => ({
      ...old,
      contract_id:
        contrato?.id ??
        contratoSelecionado ??
        "",
    }));
  }, [
    contratoSelecionado,
    normalizedContracts,
  ]);

  // ============================================================
  // ALTERAR FORM
  // ============================================================

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  // ============================================================
  // LIMPAR FORMULÁRIO
  // ============================================================

  function clearForm() {
    setForm({
      ...emptyForm,
      contract_id:
        contratoSelecionado || "",
    });

    setFiles([]);
  }

  // ============================================================
  // SALVAR
  // ============================================================

  async function handleSubmit(event) {
    event.preventDefault();

    // ----------------------------------------------------------
    // VALIDAÇÃO
    // ----------------------------------------------------------

    if (!form.contract_id) {
      alert("Selecione um contrato.");
      return;
    }

    if (!form.action_date) {
      alert("Informe a data da ação.");
      return;
    }

    if (
      !form.action_description.trim()
    ) {
      alert(
        "Informe o que será feito."
      );
      return;
    }

    try {
      setLoading(true);

      // --------------------------------------------------------
      // FORMDATA
      // --------------------------------------------------------

      const formData =
        new FormData();

      formData.append(
        "contract_id",
        form.contract_id
      );

      formData.append(
        "action_date",
        form.action_date
      );

      formData.append(
        "action_description",
        form.action_description.trim()
      );

      formData.append(
        "schedule",
        form.schedule.trim()
      );

      formData.append(
        "visit_data",
        form.visit_data.trim()
      );

      if (form.completion_date) {
        formData.append(
          "completion_date",
          form.completion_date
        );
      }

      formData.append(
        "status",
        form.status
      );

      // --------------------------------------------------------
      // ARQUIVOS
      // --------------------------------------------------------

      files.forEach((file) => {
        formData.append(
          "files",
          file
        );
      });

      // --------------------------------------------------------
      // DEBUG
      // --------------------------------------------------------

      console.log(
        "[PUNCTUAL ACTION FRONT] Enviando:"
      );

      for (const [
        key,
        value,
      ] of formData.entries()) {
        console.log(
          "[PUNCTUAL ACTION FRONT]",
          key,
          value
        );
      }

      // --------------------------------------------------------
      // POST
      // --------------------------------------------------------

      const response =
        await api.post(
          "/punctual-actions",
          formData,
          {
            headers: {
              ...authHeader(),
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      console.log(
        "[PUNCTUAL ACTION FRONT] Resposta:",
        response.data
      );

      alert(
        "Ação pontual cadastrada com sucesso."
      );

      // --------------------------------------------------------
      // LIMPAR
      // --------------------------------------------------------

      clearForm();

      // --------------------------------------------------------
      // RECARREGAR PAI
      // --------------------------------------------------------

      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error(
        "[PUNCTUAL ACTION FRONT] Erro:",
        error
      );

      console.error(
        "[PUNCTUAL ACTION FRONT] Status:",
        error.response?.status
      );

      console.error(
        "[PUNCTUAL ACTION FRONT] Response:",
        error.response?.data
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Erro ao salvar ação pontual."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // REMOVER ARQUIVO DA SELEÇÃO
  // ============================================================

  function removeSelectedFile(index) {
    setFiles((old) =>
      old.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="acao-page">
      <div className="acao-card">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="acao-header">
          <span className="acao-eyebrow">
            Radar BP
          </span>

          <h2>
            Ação Pontual
          </h2>

          <p>
            Cadastro de ações executadas
            fora do plano de ação.
          </p>
        </div>

        {/* ====================================================
            FORMULÁRIO
        ==================================================== */}

        <form
          className="acao-form"
          onSubmit={handleSubmit}
        >

          <div className="form-grid">

            {/* ==================================================
                CONTRATO
            ================================================== */}

            <div className="form-group">
              <label>
                Contrato
              </label>

              <select
                name="contract_id"
                value={
                  form.contract_id
                }
                onChange={
                  handleChange
                }
                required
                disabled={
                  loadingContracts
                }
              >
                <option value="">
                  {loadingContracts
                    ? "Carregando contratos..."
                    : "Selecione o contrato"}
                </option>

                {normalizedContracts.map(
                  (contract) => (
                    <option
                      key={String(
                        contract.id
                      )}
                      value={
                        contract.id
                      }
                    >
                      {contract.name ||
                        `Contrato #${contract.id}`}
                    </option>
                  )
                )}
              </select>

              {!loadingContracts &&
                normalizedContracts.length ===
                  0 && (
                  <small>
                    Nenhum contrato encontrado.
                  </small>
                )}
            </div>

            {/* ==================================================
                DATA DA AÇÃO
            ================================================== */}

            <div className="form-group">
              <label>
                Data da ação
              </label>

              <input
                type="date"
                name="action_date"
                value={
                  form.action_date
                }
                onChange={
                  handleChange
                }
                required
              />
            </div>

            {/* ==================================================
                O QUE SERÁ FEITO
            ================================================== */}

            <div className="form-group full">
              <label>
                O que será feito
              </label>

              <textarea
                rows={4}
                name="action_description"
                value={
                  form.action_description
                }
                onChange={
                  handleChange
                }
                placeholder="Descreva a ação pontual..."
                required
              />
            </div>

            {/* ==================================================
                PROGRAMAÇÃO
            ================================================== */}

            <div className="form-group full">
              <label>
                Programação
              </label>

              <textarea
                rows={4}
                name="schedule"
                value={
                  form.schedule
                }
                onChange={
                  handleChange
                }
                placeholder="Informe a programação da ação..."
              />
            </div>

            {/* ==================================================
                DADOS DA VISITA
            ================================================== */}

            <div className="form-group full">
              <label>
                Dados da visita
              </label>

              <textarea
                rows={4}
                name="visit_data"
                value={
                  form.visit_data
                }
                onChange={
                  handleChange
                }
                placeholder="Informações coletadas durante a visita..."
              />
            </div>

            {/* ==================================================
                DATA DE CONCLUSÃO
            ================================================== */}

            <div className="form-group">
              <label>
                Data de conclusão
              </label>

              <input
                type="date"
                name="completion_date"
                value={
                  form.completion_date
                }
                onChange={
                  handleChange
                }
              />
            </div>

            {/* ==================================================
                STATUS
            ================================================== */}

            <div className="form-group">
              <label>
                Status
              </label>

              <select
                name="status"
                value={
                  form.status
                }
                onChange={
                  handleChange
                }
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
            </div>

            {/* ==================================================
                ARQUIVOS
            ================================================== */}

            <div className="form-group full">
              <label>
                Fotos / PDF
              </label>

              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(
                  event
                ) => {
                  const selected =
                    Array.from(
                      event.target
                        .files || []
                    );

                  setFiles(
                    (old) => [
                      ...old,
                      ...selected,
                    ]
                  );

                  // Permite selecionar
                  // novamente o mesmo arquivo.
                  event.target.value =
                    "";
                }}
              />

              {/* ------------------------------------------------
                  PREVIEW
              ------------------------------------------------ */}

              {files.length > 0 && (
                <div className="files-preview">

                  {files.map(
                    (
                      file,
                      index
                    ) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="file-item"
                      >
                        <span>
                          📎{" "}
                          {file.name}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeSelectedFile(
                              index
                            )
                          }
                          title="Remover arquivo"
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}

                </div>
              )}
            </div>

          </div>

          {/* ====================================================
              BOTÕES
          ==================================================== */}

          <div className="buttons">

            <button
              type="submit"
              className="primary"
              disabled={
                loading ||
                loadingContracts
              }
            >
              {loading
                ? "Salvando..."
                : "Salvar Ação"}
            </button>

            <button
              type="button"
              onClick={
                clearForm
              }
              disabled={loading}
            >
              Limpar
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}