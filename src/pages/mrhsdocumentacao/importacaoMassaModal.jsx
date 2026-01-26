import React, { useState } from "react";
import "./importacaoMassaModal.css";
import { api } from "../../services/api";

export default function ImportacaoMassaModal({ fechar, onSucesso }) {
  const [linhas, setLinhas] = useState([{ mrh: "", data_exame: "" }]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const authHeader = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  function atualizarLinha(index, campo, valor) {
    setLinhas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [campo]: valor } : l)),
    );
  }

  function adicionarLinha() {
    setLinhas((prev) => [...prev, { mrh: "", data_exame: "" }]);
  }

  function removerLinha(index) {
    setLinhas((prev) => prev.filter((_, i) => i !== index));
  }

  async function importar() {
    setErro(null);

    const validas = linhas.filter((l) => l.mrh && l.data_exame);

    if (validas.length === 0) {
      setErro("Informe ao menos uma MRH com data de exame.");
      return;
    }

    try {
      setEnviando(true);

      await api.post(
        "/mrhsdocumentacao/importacao-massa",
        { itens: validas },
        { headers: authHeader() },
      );

      onSucesso?.();
      fechar();
    } catch (err) {
      console.error("[IMPORTAÇÃO MASSA]", err);
      setErro("Erro ao realizar importação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="importacao-overlay">
      <div className="importacao-modal">
        <div className="importacao-header">
          <h3>Importação em Massa</h3>
          <button onClick={fechar}>✕</button>
        </div>

        <div className="importacao-body">
          <table>
            <thead>
              <tr>
                <th>MRH</th>
                <th>Data do Exame</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="number"
                      value={linha.mrh}
                      onChange={(e) => atualizarLinha(i, "mrh", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={linha.data_exame}
                      onChange={(e) =>
                        atualizarLinha(i, "data_exame", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <button className="remover" onClick={() => removerLinha(i)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="add" onClick={adicionarLinha}>
            + Adicionar linha
          </button>

          {erro && <div className="erro">{erro}</div>}
        </div>

        <div className="importacao-footer">
          <button onClick={fechar} disabled={enviando}>
            Cancelar
          </button>
          <button className="confirmar" onClick={importar} disabled={enviando}>
            {enviando ? "Importando..." : "Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}
