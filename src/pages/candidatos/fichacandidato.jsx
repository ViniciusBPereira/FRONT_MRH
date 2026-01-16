import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

/* -----------------------------------------------------
 * COMPONENTE PRINCIPAL
 * ----------------------------------------------------- */
export default function FichaCandidato({ candidato, fechar, atualizarLista }) {
  const [ficha, setFicha] = useState(null);
  const [aba, setAba] = useState("dados");
  const [msg, setMsg] = useState({ visible: false, type: "success", text: "" });
  const [saving, setSaving] = useState(false);

  /* -----------------------------------------------------
   * HELPERS
   * ----------------------------------------------------- */
  const parseMaybeJSON = (v) => {
    if (v == null) return v;
    if (typeof v === "object") return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };

  const normalizeFicha = (raw = {}) => {
    const wrap = (v) => {
      if (!v) return { itens: [] };
      if (Array.isArray(v)) return { itens: v };
      if (typeof v === "object" && Array.isArray(v.itens)) return v;
      return { itens: [] };
    };

    return {
      ...raw,
      formacao: wrap(parseMaybeJSON(raw.formacao)),
      cursos: wrap(parseMaybeJSON(raw.cursos)),
      experiencias: wrap(parseMaybeJSON(raw.experiencias)),
      disponibilidade_texto: parseMaybeJSON(raw.disponibilidade)?.texto || "",
      informacoes_adicionais_texto:
        parseMaybeJSON(raw.informacoes_adicionais)?.texto || "",
      como_conheceu_texto: parseMaybeJSON(raw.como_conheceu)?.texto || "",
    };
  };

  const sanitize = (v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (Array.isArray(v))
      return v
        .map((i) => sanitize(i))
        .filter((i) => i && Object.keys(i).length);
    if (typeof v === "object") {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        const sv = sanitize(val);
        if (sv !== undefined) out[k] = sv;
      }
      return out;
    }
    if (typeof v === "string") return v.trim() === "" ? null : v.trim();
    return v;
  };

  /* -----------------------------------------------------
   * CARREGAR FICHA
   * ----------------------------------------------------- */
  async function carregarFicha() {
    try {
      // 🔹 SE NÃO EXISTE FICHA, CRIA UMA NOVA
      if (!candidato.ficha_id) {
        const res = await api.post(`/fichas/candidato/${candidato.id}`, {});
        setFicha(normalizeFicha(res.data));
        atualizarLista();
        return;
      }

      // 🔹 SE JÁ EXISTE, BUSCA A FICHA
      const res = await api.get(`/fichas/${candidato.ficha_id}`);
      setFicha(normalizeFicha(res.data));
    } catch (err) {
      console.error("Erro ao carregar ficha:", err);
      showMsg("error", "Erro ao carregar ficha.");
    }
  }

  useEffect(() => {
    carregarFicha();
  }, []);

  /* -----------------------------------------------------
   * MENSAGENS
   * ----------------------------------------------------- */
  const showMsg = (type, text) => {
    setMsg({ visible: true, type, text });
    setTimeout(() => setMsg({ visible: false, type, text: "" }), 2000);
  };

  /* -----------------------------------------------------
   * CRUD
   * ----------------------------------------------------- */
  const updateField = (key, value) =>
    setFicha((old) => ({ ...old, [key]: value }));

  const addItem = (field, emptyObj) =>
    setFicha((old) => ({
      ...old,
      [field]: { itens: [...(old[field]?.itens || []), emptyObj] },
    }));

  const updateItem = (field, index, key, value) =>
    setFicha((old) => {
      const itens = [...(old[field]?.itens || [])];
      itens[index] = { ...(itens[index] || {}), [key]: value };
      return { ...old, [field]: { itens } };
    });

  const removeItem = (field, index) =>
    setFicha((old) => {
      const itens = [...(old[field]?.itens || [])];
      itens.splice(index, 1);
      return { ...old, [field]: { itens } };
    });

  /* -----------------------------------------------------
   * SALVAR FICHA
   * ----------------------------------------------------- */
  async function salvarFicha() {
    if (!ficha) return;

    setSaving(true);

    const payload = {
      ...ficha,
      formacao: sanitize(ficha.formacao),
      cursos: sanitize(ficha.cursos),
      experiencias: sanitize(ficha.experiencias),
      disponibilidade: { texto: ficha.disponibilidade_texto || "" },
      informacoes_adicionais: {
        texto: ficha.informacoes_adicionais_texto || "",
      },
      como_conheceu: { texto: ficha.como_conheceu_texto || "" },
    };

    // 🔥 remove campos auxiliares do front
    delete payload.disponibilidade_texto;
    delete payload.informacoes_adicionais_texto;
    delete payload.como_conheceu_texto;

    try {
      await api.put(`/fichas/${ficha.id}`, payload);

      showMsg("success", "Ficha salva!");
      atualizarLista();

      setTimeout(() => fechar(), 900);
    } catch (err) {
      console.error("Erro ao salvar ficha:", err);
      showMsg("error", "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!ficha) return null;

  /* -----------------------------------------------------
   * JSX AJUSTADO — X FIXO NO CANTO
   * ----------------------------------------------------- */
  return (
    <div className="modal-overlay">
      <div className="modal-card ficha-modal-card">
        {/* X FIXO NO CANTO SUPERIOR DIREITO */}
        <button className="ficha-close-absolute" onClick={fechar}>
          ✕
        </button>

        {/* MESSAGE */}
        {msg.visible && (
          <div
            style={{
              position: "absolute",
              right: 20,
              top: 60,
              background: msg.type === "success" ? "#e6ffe8" : "#ffe6e6",
              color: msg.type === "success" ? "#2e7d32" : "#b71c1c",
              padding: "12px 16px",
              borderRadius: 8,
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              zIndex: 20,
            }}
          >
            {msg.text}
          </div>
        )}

        {/* HEADER */}
        <div className="ficha-header">
          <h2>Ficha – {candidato.nome}</h2>
        </div>

        {/* TABS */}
        <div className="ficha-tabs">
          {[
            ["dados", "Dados Pessoais"],
            ["contatos", "Contatos"],
            ["formacao", "Formação"],
            ["experiencias", "Experiências"],
            ["outros", "Outros"],
          ].map(([id, label]) => (
            <div
              key={id}
              className={`ficha-tab ${aba === id ? "active" : ""}`}
              onClick={() => setAba(id)}
            >
              {label}
            </div>
          ))}
        </div>

        {/* ======== ABA: DADOS ======== */}
        {aba === "dados" && (
          <div className="ficha-section">
            <label>Sexo</label>
            <input
              value={ficha.sexo || ""}
              onChange={(e) => updateField("sexo", e.target.value)}
            />

            <label>Idade</label>
            <input
              value={ficha.idade || ""}
              onChange={(e) => updateField("idade", e.target.value)}
            />

            <label>Estado Civil</label>
            <input
              value={ficha.estado_civil || ""}
              onChange={(e) => updateField("estado_civil", e.target.value)}
            />

            <label>Data Nascimento</label>
            <input
              type="date"
              value={ficha.data_nascimento || ""}
              onChange={(e) => updateField("data_nascimento", e.target.value)}
            />
          </div>
        )}

        {/* ======== ABA: CONTATOS ======== */}
        {aba === "contatos" && (
          <div className="ficha-section">
            <label>Telefone Residencial</label>
            <input
              value={ficha.telefone_residencial || ""}
              onChange={(e) =>
                updateField("telefone_residencial", e.target.value)
              }
            />

            <label>Telefone Recados</label>
            <input
              value={ficha.telefone_recados || ""}
              onChange={(e) => updateField("telefone_recados", e.target.value)}
            />
          </div>
        )}

        {/* ======== ABA: FORMAÇÃO ======== */}
        {aba === "formacao" && (
          <div className="ficha-section">
            <button
              className="btn-add"
              onClick={() =>
                addItem("formacao", { curso: "", instituicao: "", ano: "" })
              }
            >
              Adicionar Formação
            </button>

            {(ficha.formacao?.itens || []).map((f, i) => (
              <div className="card" key={i}>
                <label>Curso</label>
                <input
                  value={f.curso || ""}
                  onChange={(e) =>
                    updateItem("formacao", i, "curso", e.target.value)
                  }
                />

                <label>Instituição</label>
                <input
                  value={f.instituicao || ""}
                  onChange={(e) =>
                    updateItem("formacao", i, "instituicao", e.target.value)
                  }
                />

                <label>Ano</label>
                <input
                  value={f.ano || ""}
                  onChange={(e) =>
                    updateItem("formacao", i, "ano", e.target.value)
                  }
                />

                <button
                  className="btn-remove"
                  onClick={() => removeItem("formacao", i)}
                >
                  Remover
                </button>
              </div>
            ))}

            {/* Cursos */}
            <button
              className="btn-add"
              style={{ marginTop: 20 }}
              onClick={() =>
                addItem("cursos", { nome: "", carga: "", instituicao: "" })
              }
            >
              Adicionar Curso
            </button>

            {(ficha.cursos?.itens || []).map((c, i) => (
              <div className="card" key={i}>
                <label>Nome</label>
                <input
                  value={c.nome || ""}
                  onChange={(e) =>
                    updateItem("cursos", i, "nome", e.target.value)
                  }
                />

                <label>Carga Horária</label>
                <input
                  value={c.carga || ""}
                  onChange={(e) =>
                    updateItem("cursos", i, "carga", e.target.value)
                  }
                />

                <label>Instituição</label>
                <input
                  value={c.instituicao || ""}
                  onChange={(e) =>
                    updateItem("cursos", i, "instituicao", e.target.value)
                  }
                />

                <button
                  className="btn-remove"
                  onClick={() => removeItem("cursos", i)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ======== ABA: EXPERIÊNCIAS ======== */}
        {aba === "experiencias" && (
          <div className="ficha-section">
            <button
              className="btn-add"
              onClick={() =>
                addItem("experiencias", {
                  empresa: "",
                  funcao: "",
                  inicio: "",
                  fim: "",
                })
              }
            >
              Adicionar Experiência
            </button>

            {(ficha.experiencias?.itens || []).map((exp, i) => (
              <div className="card" key={i}>
                <label>Empresa</label>
                <input
                  value={exp.empresa || ""}
                  onChange={(e) =>
                    updateItem("experiencias", i, "empresa", e.target.value)
                  }
                />

                <label>Função</label>
                <input
                  value={exp.funcao || ""}
                  onChange={(e) =>
                    updateItem("experiencias", i, "funcao", e.target.value)
                  }
                />

                <label>Início</label>
                <input
                  type="date"
                  value={exp.inicio || ""}
                  onChange={(e) =>
                    updateItem("experiencias", i, "inicio", e.target.value)
                  }
                />

                <label>Fim</label>
                <input
                  type="date"
                  value={exp.fim || ""}
                  onChange={(e) =>
                    updateItem("experiencias", i, "fim", e.target.value)
                  }
                />

                <button
                  className="btn-remove"
                  onClick={() => removeItem("experiencias", i)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ======== ABA: OUTROS ======== */}
        {aba === "outros" && (
          <div className="ficha-section">
            <label>Disponibilidade</label>
            <textarea
              rows={3}
              value={ficha.disponibilidade_texto || ""}
              onChange={(e) =>
                updateField("disponibilidade_texto", e.target.value)
              }
            />

            <label>Informações Adicionais</label>
            <textarea
              rows={5}
              value={ficha.informacoes_adicionais_texto || ""}
              onChange={(e) =>
                updateField("informacoes_adicionais_texto", e.target.value)
              }
            />

            <label>Como Conheceu</label>
            <input
              value={ficha.como_conheceu_texto || ""}
              onChange={(e) =>
                updateField("como_conheceu_texto", e.target.value)
              }
            />
          </div>
        )}

        {/* SALVAR */}
        <button
          className="btn-save-ficha"
          onClick={salvarFicha}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Salvando..." : "Salvar Ficha"}
        </button>
      </div>
    </div>
  );
}
