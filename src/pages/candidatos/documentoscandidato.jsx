import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function DocumentosCandidato({ candidato, fechar }) {
  const [arquivos, setArquivos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);

  /* ============================
     LIMPAR MENSAGEM AO ABRIR
  ============================ */
  useEffect(() => {
    setMsg(null);
  }, []);

  /* ============================
     FEEDBACK
  ============================ */
  function mostrarMensagem(tipo, texto) {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 2500);
  }

  /* ============================
     CARREGAR DOCUMENTOS
  ============================ */
  async function carregarDocs() {
    if (!candidato?.id) return;

    try {
      const res = await api.get(`/candidatos/docs/${candidato.id}`);
      setArquivos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
      setArquivos([]);
    }
  }

  useEffect(() => {
    carregarDocs();
  }, [candidato?.id]);

  /* ============================
     UPLOAD DOCUMENTO
  ============================ */
  async function enviarArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("arquivo", file);

    try {
      setUploading(true);

      await api.post(`/candidatos/upload/${candidato.id}`, form);

      mostrarMensagem("sucesso", "Arquivo enviado com sucesso!");
      await carregarDocs();
    } catch (err) {
      console.error("Erro upload:", err);
      mostrarMensagem("erro", "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  }

  /* ============================
     REMOVER DOCUMENTO
  ============================ */
  async function removerArquivo(nome) {
    if (!window.confirm("Remover este arquivo?")) return;

    try {
      await api.delete(`/candidatos/docs/${candidato.id}/${nome}`);

      mostrarMensagem("sucesso", "Documento removido!");
      carregarDocs();
    } catch (err) {
      console.error("Erro ao remover:", err);
      mostrarMensagem("erro", "Erro ao remover documento");
    }
  }

  /* ============================
     JSX
  ============================ */
  return (
    <div className="modal-overlay">
      <div className="modal-card docs-modal-card">
        {/* BOTÃO FECHAR */}
        <button className="docs-close-btn" onClick={fechar}>
          ✕
        </button>

        {/* FEEDBACK */}
        {msg && (
          <div
            className="docs-msg"
            style={{
              background: msg.tipo === "sucesso" ? "#d4ffcf" : "#ffd3d3",
              color: msg.tipo === "sucesso" ? "#256b1c" : "#a11",
              padding: "10px",
              borderRadius: 6,
              marginBottom: 10,
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {msg.texto}
          </div>
        )}

        <h2 className="docs-title">Documentos – {candidato?.nome}</h2>

        {/* UPLOAD */}
        <label className="docs-upload-btn">
          📎 Anexar Documento
          <input type="file" hidden onChange={enviarArquivo} />
        </label>

        {uploading && (
          <p className="docs-uploading" style={{ fontStyle: "italic" }}>
            Enviando arquivo...
          </p>
        )}

        {/* LISTA */}
        <div className="docs-list">
          {arquivos.length === 0 && (
            <p className="docs-empty">Nenhum documento enviado.</p>
          )}

          {arquivos.map((doc) => (
            <div key={doc.nome} className="docs-item">
              <span
                className="docs-name"
                style={{ color: "#111", fontWeight: 600 }}
              >
                {doc.nome}
              </span>

              <div className="docs-actions">
                <a
                  href={`${import.meta.env.VITE_API_BASE.replace("/api", "")}${
                    doc.path
                  }`}
                  target="_blank"
                  rel="noreferrer"
                  className="docs-btn"
                >
                  Baixar
                </a>

                <button
                  className="docs-btn-remove"
                  onClick={() => removerArquivo(doc.nome)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
