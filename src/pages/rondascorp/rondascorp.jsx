import { useEffect, useRef, useState } from "react";
import "./rondascorp.css";
import { api } from "../../services/api";

const REFRESH_INTERVAL = 5 * 60 * 1000;
const TIMEZONE_BR = "America/Sao_Paulo";
const LIMIT_MAX = 5000; // 🔥 traz tudo

export default function RondasCorp() {
  const [rondas, setRondas] = useState([]);
  const [syncInfo, setSyncInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // filtros
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [roteiro, setRoteiro] = useState("");

  const refreshTimer = useRef(null);

  async function carregarDados(silent = false) {
    try {
      if (!silent) setLoading(true);

      const params = {
        limit: LIMIT_MAX, // 🔥 sem paginação
        offset: 0,
      };

      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;
      if (roteiro) params.roteiro = roteiro;

      const [rondasRes, syncRes] = await Promise.all([
        api.get("/rondas", { params }),
        api.get("/rondas/ultima-sincronizacao"),
      ]);

      setRondas(rondasRes.data);
      setSyncInfo(syncRes.data);
    } catch (err) {
      console.error("[RONDAS]", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function aplicarFiltro() {
    carregarDados();
  }

  function limparFiltro() {
    setDataInicio("");
    setDataFim("");
    setRoteiro("");
    carregarDados();
  }

  function exportarCsv() {
    const params = {};
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    if (roteiro) params.roteiro = roteiro;

    api
      .get("/rondas/export/csv", {
        params,
        responseType: "blob",
      })
      .then((res) => {
        const blob = new Blob([res.data], {
          type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "XRLssj_DLGA.csv";
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      carregarDados(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshTimer.current);
  }, []);

  return (
    <div className="rondas-wrapper">
      <div className="rondas-container">
        <header className="rondas-header">
          <div>
            <h1>Rondas – Hospital</h1>
            {syncInfo && (
              <span className="sync-status">
                Última sincronização:{" "}
                <strong>
                  {new Date(syncInfo.last_sync_at).toLocaleString("pt-BR", {
                    timeZone: TIMEZONE_BR,
                  })}
                </strong>
              </span>
            )}
          </div>

          <div className="actions">
            <button onClick={aplicarFiltro}>Atualizar</button>
            <button className="primary" onClick={exportarCsv}>
              Exportar CSV
            </button>
          </div>
        </header>

        <section className="table-card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading">Carregando dados…</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Departamento</th>
                    <th>Roteiro</th>
                    <th>Cliente</th>
                    <th>Guarda</th>
                    <th>Hora Chegada</th>
                  </tr>
                </thead>
                <tbody>
                  {rondas.map((r) => (
                    <tr key={r.tarefa_numero}>
                      <td>{r.nome_departamento}</td>
                      <td>{r.nome_roteiro}</td>
                      <td>{r.nome_cliente}</td>
                      <td>{r.nome_guarda}</td>
                     <td>{r.hora_chegada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
