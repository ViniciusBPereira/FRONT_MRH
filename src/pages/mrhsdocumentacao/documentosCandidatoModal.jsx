import React, { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";

export default function DocumentosCandidatoModal({ cpf, nome, fechar }) {
  const [arquivos, setArquivos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("loading");
  // loading | ok | sem-documentos | candidato-inexistente | erro | nao-autorizado

  const fileInputRef = useRef(null);

  /* ===== AUTH HEADER ===== */
  const authHeader = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  /* =====================================================
     📂 LISTAR UPLOADS PELO CPF
  ===================================================== */
  async function carregarArquivos() {
    if (!cpf) {
      setArquivos([]);
      setStatus("erro");
      return;
    }

    try {
      setStatus("loading");

      const res = await api.get(`/mrhsdocumentacao/upload/${cpf}`, {
        headers: authHeader(),
      });

      const data = res.data;

      if (!Array.isArray(data) || data.length === 0) {
        setArquivos([]);
        setStatus("sem-documentos");
        return;
      }

      setArquivos(data);
      setStatus("ok");
    } catch (err) {
      if (err.response?.status === 401) {
        setArquivos([]);
        setStatus("nao-autorizado");
      } else if (
        err.response?.status === 404 &&
        err.response?.data?.code === "CANDIDATO_NAO_LOCALIZADO"
      ) {
        setArquivos([]);
        setStatus("candidato-inexistente");
      } else {
        console.error("[UPLOADS] Erro ao buscar uploads:", err);
        setArquivos([]);
        setStatus("erro");
      }
    }
  }

  useEffect(() => {
    carregarArquivos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpf]);

  /* =====================================================
     ⬆️ UPLOAD DE DOCUMENTO PELO CPF
  ===================================================== */
  async function enviarArquivo(e) {
    const file = e.target.files?.[0];
    if (!file || !cpf) return;

    const formData = new FormData();
    formData.append("arquivo", file);

    try {
      setUploading(true);

      await api.post(`/mrhsdocumentacao/upload/${cpf}`, formData, {
        headers: {
          ...authHeader(),
          "Content-Type": "multipart/form-data",
        },
      });

      await carregarArquivos();
    } catch (err) {
      if (err.response?.status === 401) {
        alert("Sessão expirada. Faça login novamente.");
        setStatus("nao-autorizado");
      } else if (
        err.response?.status === 404 &&
        err.response?.data?.code === "CANDIDATO_NAO_LOCALIZADO"
      ) {
        setStatus("candidato-inexistente");
      } else {
        console.error("[UPLOAD] Erro ao enviar arquivo:", err);
        alert("Erro ao enviar documento.");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* =====================================================
     🧱 RENDER
  ===================================================== */
  return (
    <div className="modal-overlay">
      <div className="modal-card docs-modal-card">
        <button className="docs-close-btn" onClick={fechar}>
          ✕
        </button>

        <h2 className="docs-title">Documentos – {nome}</h2>

        {/* UPLOAD */}
        {status !== "candidato-inexistente" && status !== "nao-autorizado" && (
          <label className="docs-upload-btn">
            📎 Anexar Documento
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={enviarArquivo}
            />
          </label>
        )}

        {uploading && <p className="docs-uploading">Enviando arquivo...</p>}

        {/* LISTA / MENSAGENS */}
        <div className="docs-list">
          {status === "loading" && (
            <p className="docs-empty">Carregando documentos...</p>
          )}

          {status === "nao-autorizado" && (
            <p className="docs-empty">Sessão expirada. Faça login novamente.</p>
          )}

          {status === "candidato-inexistente" && (
            <p className="docs-empty">
              Nenhum candidato localizado para este CPF.
            </p>
          )}

          {status === "sem-documentos" && (
            <p className="docs-empty">Nenhum documento enviado.</p>
          )}

          {status === "erro" && (
            <p className="docs-empty">Erro ao carregar documentos.</p>
          )}

          {status === "ok" &&
            arquivos.map((doc, index) => (
              <div key={doc.id ?? `${doc.nome}-${index}`} className="docs-item">
                <span className="docs-name">{doc.nome}</span>

                <div className="docs-actions">
                  <a
                    href={`/api${doc.path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="docs-btn"
                  >
                    Baixar
                  </a>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
