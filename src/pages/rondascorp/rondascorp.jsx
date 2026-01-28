import { useEffect, useRef, useState } from "react";
import "./rondascorp.css";
import { api } from "../../services/api";

const REFRESH_INTERVAL = 5 * 60 * 1000;

export default function RondasCorp() {
  const [rondas, setRondas] = useState([]);
  const [syncInfo, setSyncInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const limit = 20;
  const refreshTimer = useRef(null);

  async function carregarDados(silent = false) {
    try {
      if (!silent) setLoading(true);

      const [rondasRes, syncRes] = await Promise.all([
        api.get("/rondas", { params: { limit, offset } }),
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

  function exportarCsv() {
    api.get("/rondas/export/csv", { responseType: "blob" }).then((res) => {
      const blob = new Blob([res.data], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rondas_hospital.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  useEffect(() => {
    carregarDados();
  }, [offset]);

  useEffect(() => {
    refreshTimer.current = setInterval(
      () => carregarDados(true),
      REFRESH_INTERVAL,
    );
    return () => clearInterval(refreshTimer.current);
  }, []);

  return (
    <div className="rondas-wrapper">
      <div className="rondas-container">
        {/* ================= HEADER ================= */}
        <header className="rondas-header">
          <div>
            <h1>Rondas – Hospital</h1>
            {syncInfo && (
              <span className="sync-status">
                Última sincronização:{" "}
                <strong>
                  {new Date(syncInfo.last_sync_at).toLocaleString()}
                </strong>
              </span>
            )}
          </div>

          <div className="actions">
            <button onClick={() => carregarDados()}>Atualizar</button>
            <button className="primary" onClick={exportarCsv}>
              Exportar CSV
            </button>
          </div>
        </header>

        {/* ================= TABELA ================= */}
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
                      <td>
                        {r.hora_chegada
                          ? new Date(r.hora_chegada).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ================= PAGINAÇÃO ================= */}
        <footer className="pagination">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(offset - limit)}
          >
            ◀ Anterior
          </button>
          <button onClick={() => setOffset(offset + limit)}>Próxima ▶</button>
        </footer>
      </div>
    </div>
  );
}
