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

  // filtros
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [roteiro, setRoteiro] = useState("");

  const refreshTimer = useRef(null);

  /* =====================================================
     🔄 CARREGAMENTO DE DADOS (CORRIGIDO)
  ===================================================== */
  async function carregarDados({ silent = false, resetOffset = false } = {}) {
  try {
    const finalOffset = resetOffset ? 0 : offset;

    if (resetOffset && offset !== 0) {
      setOffset(0);
    }

    if (!silent) setLoading(true);

    const params = {
      limit,
      offset: finalOffset,

      // 🔥 CACHE BUSTER (RESOLVE O PROBLEMA)
      _ts: Date.now(),
    };

    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    if (roteiro) params.roteiro = roteiro;

    const [rondasRes, syncRes] = await Promise.all([
      api.get("/rondas", { params }),
      api.get("/rondas/ultima-sincronizacao", {
        params: { _ts: Date.now() },
      }),
    ]);

    setRondas(rondasRes.data);
    setSyncInfo(syncRes.data);
  } catch (err) {
    console.error("[RONDAS]", err);
  } finally {
    if (!silent) setLoading(false);
  }
}


  /* =====================================================
     🎯 FILTROS
  ===================================================== */
  function aplicarFiltro() {
    carregarDados({ resetOffset: true });
  }

  function limparFiltro() {
    setDataInicio("");
    setDataFim("");
    setRoteiro("");
    carregarDados({ resetOffset: true });
  }

  /* =====================================================
     📥 EXPORTAÇÃO CSV
  ===================================================== */
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

  /* =====================================================
     ⚡ EFEITOS
  ===================================================== */

  // Paginação
  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  // Auto-refresh REAL (sempre busca os mais recentes)
  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      carregarDados({ silent: true, resetOffset: true });
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =====================================================
     🖥️ RENDER
  ===================================================== */
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
                  {new Date(syncInfo.last_sync_at).toLocaleString()}
                </strong>
              </span>
            )}
          </div>

          <div className="actions">
            <button onClick={() => carregarDados({ resetOffset: true })}>
              Atualizar
            </button>
            <button className="primary" onClick={exportarCsv}>
              Exportar CSV
            </button>
          </div>
        </header>

        <section className="rondas-filter-card">
          <div className="filter-fields">
            <div className="filter-field">
              <label>Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <div className="filter-field filter-roteiro">
              <label>Roteiro</label>
              <input
                type="text"
                placeholder="Ex: Vigilante, Supervisor..."
                value={roteiro}
                onChange={(e) => setRoteiro(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button className="btn-filter" onClick={aplicarFiltro}>
              Filtrar
            </button>
            <button className="btn-clear" onClick={limparFiltro}>
              Limpar
            </button>
          </div>
        </section>

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

        <footer className="pagination">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(offset - limit)}
          >
            ◀ Anterior
          </button>
          <button onClick={() => setOffset(offset + limit)}>
            Próxima ▶
          </button>
        </footer>
      </div>
    </div>
  );
}
