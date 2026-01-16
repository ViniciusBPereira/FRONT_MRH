import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

export default function CheckDocsModal({ candidato, fechar }) {
  const [itens, setItens] = useState([]);
  const [novoNome, setNovoNome] = useState("");
  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------
     🔄 CARREGAR CHECKLIST
  -------------------------------------------------- */
  const carregarDocs = useCallback(async () => {
    if (!candidato?.id) return;

    try {
      setLoading(true);

      const res = await api.get(`/checkdocs/${candidato.id}`);
      setItens(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erro checklist:", err);
      setItens([]);
    } finally {
      setLoading(false);
    }
  }, [candidato?.id]);

  useEffect(() => {
    carregarDocs();
  }, [carregarDocs]);

  /* --------------------------------------------------
     ➕ ADICIONAR DOCUMENTO
  -------------------------------------------------- */
  async function adicionar() {
    if (!novoNome.trim()) return;

    try {
      await api.post(`/checkdocs/${candidato.id}`, {
        nome: novoNome.trim(),
      });

      setNovoNome("");
      carregarDocs();
    } catch (err) {
      console.error("Erro ao adicionar documento:", err);
      alert("Erro ao adicionar documento.");
    }
  }

  /* --------------------------------------------------
     ☑️ CHECK / UNCHECK
  -------------------------------------------------- */
  async function toggleCheck(id, checked) {
    try {
      await api.patch(`/checkdocs/item/${id}/check`, { checked });

      setItens((prev) =>
        prev.map((i) => (i.id === id ? { ...i, checked } : i))
      );
    } catch (err) {
      console.error("Erro ao atualizar documento:", err);
      alert("Erro ao atualizar documento.");
    }
  }

  /* --------------------------------------------------
     🗑️ REMOVER DOCUMENTO
  -------------------------------------------------- */
  async function remover(id) {
    if (!window.confirm("Remover este documento?")) return;

    try {
      await api.delete(`/checkdocs/item/${id}`);
      setItens((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Erro ao remover documento:", err);
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
          <h3>Documentação – {candidato?.nome}</h3>
          <button
            className="checklist-close"
            onClick={fechar}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* LISTA */}
        <div className="checklist-list">
          {loading && <div>Carregando...</div>}

          {!loading && itens.length === 0 && (
            <div className="checklist-empty">Nenhum documento cadastrado.</div>
          )}

          {!loading &&
            itens.map((item) => (
              <div key={item.id} className="checklist-item">
                <span className="checklist-name">{item.nome}</span>

                <div className="checklist-actions">
                  <input
                    type="checkbox"
                    checked={!!item.checked}
                    onChange={(e) => toggleCheck(item.id, e.target.checked)}
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

        {/* ADICIONAR */}
        <div className="checklist-form">
          <input
            placeholder="Novo documento"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <button onClick={adicionar}>Adicionar</button>
        </div>
      </div>
    </div>
  );
}
