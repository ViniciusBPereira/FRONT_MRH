import React, { useEffect, useMemo, useState } from "react";
import "./acaopontual.css";

export default function AcaoPontual({
  visits,
  contratoSelecionado,
}) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    cr: contratoSelecionado || "",
    data_execucao: "",
    acao: "",
    programacao: "",
    dados_visita: "",
    data_conclusao: "",
  });

  const [files, setFiles] = useState([]);

  const contratos = useMemo(() => {
    return [
      ...new Set(
        visits
          .map((v) => v.cr)
          .filter(Boolean),
      ),
    ].sort();
  }, [visits]);

  useEffect(() => {
    setForm((old) => ({
      ...old,
      cr: contratoSelecionado || "",
    }));
  }, [contratoSelecionado]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("cr", form.cr);

      formData.append(
        "description",
        form.acao
      );

      formData.append(
        "execution",
        form.programacao
      );

      formData.append(
        "indicators",
        form.dados_visita
      );

      formData.append(
        "due_date",
        form.data_conclusao || form.data_execucao
      );

      formData.append(
        "owner",
        ""
      );

      formData.append(
        "stage",
        "CONCLUÍDO"
      );

      formData.append(
        "action_type",
        "PONTUAL"
      );

      files.forEach((file) => {
        formData.append(
          "files",
          file
        );
      });

      const response = await fetch(
        "/api/actions",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erro ao salvar."
        );
      }

      alert("Ação cadastrada com sucesso!");

      setForm({
        cr: contratoSelecionado || "",
        data_execucao: "",
        acao: "",
        programacao: "",
        dados_visita: "",
        data_conclusao: "",
      });

      setFiles([]);

      e.target.reset();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="acao-page">
      <div className="acao-card">

        <div className="acao-header">
          <span className="acao-eyebrow">
            Radar BP
          </span>

          <h2>Ação Pontual</h2>

          <p>
            Cadastro de ações executadas fora do plano de ação.
          </p>
        </div>

        <form
          className="acao-form"
          onSubmit={handleSubmit}
        >

          <div className="form-grid">

            <div className="form-group">
              <label>Contrato</label>

              <select
                name="cr"
                value={form.cr}
                onChange={handleChange}
                required
              >
                <option value="">
                  Selecione o contrato
                </option>

                {contratos.map((cr) => (
                  <option
                    key={cr}
                    value={cr}
                  >
                    {cr}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Data da ação</label>

              <input
                type="date"
                name="data_execucao"
                value={form.data_execucao}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full">
              <label>
                O que será feito
              </label>

              <textarea
                rows={4}
                name="acao"
                value={form.acao}
                onChange={handleChange}
                placeholder="Descreva a ação..."
                required
              />
            </div>

            <div className="form-group full">
              <label>
                Programação
              </label>

              <textarea
                rows={4}
                name="programacao"
                value={form.programacao}
                onChange={handleChange}
                placeholder="Informe a programação..."
              />
            </div>

            <div className="form-group full">
              <label>
                Dados da visita
              </label>

              <textarea
                rows={4}
                name="dados_visita"
                value={form.dados_visita}
                onChange={handleChange}
                placeholder="Informações coletadas na visita..."
              />
            </div>

            <div className="form-group full">
              <label>
                Fotos / PDF
              </label>

              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) =>
                  setFiles(
                    Array.from(
                      e.target.files
                    )
                  )
                }
              />

              {files.length > 0 && (
                <div className="files-preview">
                  {files.map(
                    (file, index) => (
                      <div
                        key={index}
                        className="file-item"
                      >
                        📎 {file.name}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>
                Data de conclusão
              </label>

              <input
                type="date"
                name="data_conclusao"
                value={form.data_conclusao}
                onChange={handleChange}
              />
            </div>

          </div>

          <div className="buttons">

            <button
              type="submit"
              className="primary"
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : "Salvar Ação"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}
