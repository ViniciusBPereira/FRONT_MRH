import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

export default function CheckDocsModalByCpf({ cpf, nome, fechar }) {
  const [itens, setItens] = useState([]);
  const [novoNome, setNovoNome] = useState("");
  const [loading, setLoading] = useState(true);

  /**
   * status:
   * loading | ok | sem-documentos | cpf-inexistente | erro
   */
  const [status, setStatus] = useState("loading");

  /* ===== AUTH HEADER ===== */
  const authHeader = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  /* --------------------------------------------------
     🔄 CARREGAR DOCUMENTOS PELO CPF
  -------------------------------------------------- */
  const carregarDocs = useCallback(async () => {
    if (!cpf) return;

    try {
      setLoading(true);
      setStatus("loading");
      setItens([]);

      const res = await api.get(`/mrhsdocumentacao/itens/${cpf}`, {
        headers: authHeader(),
      });

      const data = res.data;

      if (!Array.isArray(data) || data.length === 0) {
        setStatus("sem-documentos");
        return;
      }

      setItens(data);
      setStatus("ok");
    } catch (err) {
      if (err.response?.status === 404) {
        setStatus("cpf-inexistente");
      } else {
        console.error("[CHECKDOCS CPF] Erro:", err);
        setStatus("erro");
      }
    } finally {
      setLoading(false);
    }
  }, [cpf]);

  useEffect(() => {
    carregarDocs();
  }, [carregarDocs]);

  /* --------------------------------------------------
     ➕ ADICIONAR DOCUMENTO POR CPF
  -------------------------------------------------- */
  async function adicionar() {
    if (!novoNome.trim()) return;

    try {
      await api.post(
        `/mrhsdocumentacao/itens/${cpf}`,
        { nome: novoNome.trim() },
        { headers: authHeader() }
      );

      setNovoNome("");
      carregarDocs();
    } catch (err) {
      if (err.response?.status === 404) {
        setStatus("cpf-inexistente");
      } else {
        alert(err.response?.data?.mensagem || "Erro ao adicionar documento.");
      }
    }
  }

  /* --------------------------------------------------
     ☑️ CHECK / UNCHECK
  -------------------------------------------------- */
  async function toggleCheck(id, concluidoAtual) {
    const novoValor = !concluidoAtual;

    try {
      await api.patch(
        `/checkdocs/item/${id}/check`,
        { checked: novoValor },
        { headers: authHeader() }
      );

      setItens((prev) =>
        prev.map((i) => (i.id === id ? { ...i, concluido: novoValor } : i))
      );
    } catch (err) {
      console.error("[CHECKDOCS] Erro ao atualizar:", err);
      alert("Erro ao atualizar documento.");
    }
  }

  /* --------------------------------------------------
     🗑️ REMOVER DOCUMENTO
  -------------------------------------------------- */
  async function remover(id) {
    if (!window.confirm("Remover este documento?")) return;

    try {
      await api.delete(`/checkdocs/item/${id}`, {
        headers: authHeader(),
      });

      setItens((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("[CHECKDOCS] Erro ao remover:", err);
      alert("Erro ao remover documento.");
    }
  }

  /* --------------------------------------------------
     🧱 RENDER
  -------------------------------------------------- */
  return (
    <div className="checklist-overlay">
      <div className="checklist-modal">
        {/* HEADER */}
        <div className="checklist-header">
          <h3 style={{ color: "#000" }}>Documentação – {nome}</h3>

          <button
            className="checklist-close"
            onClick={fechar}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="checklist-list">
          {loading && <div style={{ color: "#000" }}>Carregando...</div>}

          {!loading && status === "cpf-inexistente" && (
            <div
              className="checklist-alert checklist-alert-error"
              style={{ color: "#000" }}
            >
              Candidato não localizado no sistema
            </div>
          )}

          {!loading && status === "sem-documentos" && (
            <div className="checklist-empty" style={{ color: "#000" }}>
              Nenhum documento localizado para este CPF
            </div>
          )}

          {!loading && status === "erro" && (
            <div
              className="checklist-alert checklist-alert-error"
              style={{ color: "#000" }}
            >
              Erro ao carregar documentos
            </div>
          )}

          {!loading &&
            status === "ok" &&
            itens.map((item) => (
              <div key={item.id} className="checklist-item">
                <span className="checklist-name" style={{ color: "#000" }}>
                  {item.nome}
                </span>

                <div className="checklist-actions">
                  <input
                    type="checkbox"
                    checked={Boolean(item.concluido)}
                    onChange={() => toggleCheck(item.id, item.concluido)}
                  />

                  <button
                    className="checklist-remove"
                    onClick={() => remover(item.id)}
                    title="Excluir documento"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* ADICIONAR (somente se CPF existir) */}
        {status !== "cpf-inexistente" && (
          <div className="checklist-form">
            <input
              placeholder="Novo documento"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
            />
            <button onClick={adicionar}>Adicionar</button>
          </div>
        )}
      </div>
    </div>
  );
}
