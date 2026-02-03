import { useEffect, useRef, useState } from "react";
import "./rondascorp.css";
import { api } from "../../services/api";

const REFRESH_INTERVAL = 5 * 60 * 1000;
const LIMIT_MAX = 5000;

/**
 * =====================================================
 * FORMATA hora_chegada SEM CONVERTER TIMEZONE
 *
 * Aceita:
 * - 2026-02-02 17:14:16.167
 * - 2026-02-02T17:14:16.167Z
 *
 * Retorna:
 * - 02/02/2026 17:14:16
 * =====================================================
 */
function formatarHoraChegada(valor) {
  if (!valor) return "-";

  const limpo = valor.replace("T", " ").replace("Z", "").split(".")[0];
  const [data, hora] = limpo.split(" ");

  if (!data || !hora) return valor;

  const [yyyy, mm, dd] = data.split("-");
  if (!yyyy || !mm || !dd) return valor;

  return `${dd}/${mm}/${yyyy} ${hora}`;
}

export default function RondasCorp() {
  const [rondas, setRondas] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔎 filtros
  const [dataInicio, setDataInicio] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [roteiro, setRoteiro] = useState("");

  const refreshTimer = useRef(null);

  /* =====================================================
     🔄 CARREGAMENTO DE DADOS
  ===================================================== */
  async function carregarDados(silent = false) {
    try {
      if (!silent) setLoading(true);

      const params = {
        limit: LIMIT_MAX,
        offset: 0,
      };

      if (dataInicio) {
        params.dataInicio = dataInicio;
        params.horaInicio = horaInicio || "00:00";
      }

      if (dataFim) {
        params.dataFim = dataFim;
        params.horaFim = horaFim || "23:59";
      }

      if (roteiro) {
        params.roteiro = roteiro;
      }

      const res = await api.get("/rondas", { params });
      setRondas(res.data);
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
    carregarDados();
  }

  function limparFiltro() {
    setDataInicio("");
    setHoraInicio("");
    setDataFim("");
    setHoraFim("");
    setRoteiro("");
    carregarDados();
  }

  /* =====================================================
     📥 EXPORTAÇÃO CSV
  ===================================================== */
  function exportarCsv() {
    const params = {};

    if (dataInicio) {
      params.dataInicio = dataInicio;
      params.horaInicio = horaInicio || "00:00";
    }

    if (dataFim) {
      params.dataFim = dataFim;
      params.horaFim = horaFim || "23:59";
    }

    if (roteiro) {
      params.roteiro = roteiro;
    }

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
  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      carregarDados(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshTimer.current);
  }, []);

  /* =====================================================
     🖥️ RENDER
  ===================================================== */
  return (
    <div className="rondas-wrapper">
      <div className="rondas-container">
        {/* ================= HEADER ================= */}
        <header className="rondas-header">
          <h1>Rondas – Hospital</h1>

          <div className="actions">
            <button onClick={aplicarFiltro}>Atualizar</button>
            <button className="primary" onClick={exportarCsv}>
              Exportar CSV
            </button>
          </div>
        </header>

        {/* ================= FILTROS ================= */}
        <section className="rondas-filter-card">
          <div className="filter-fields">
            <div className="filter-field">
              <label>Data início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Hora início</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Data fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Hora fim</label>
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </div>

            <div className="filter-field filter-roteiro">
              <label>Roteiro</label>
              <input
                type="text"
                placeholder="Contém..."
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
                    <th>Hora chegada</th>
                  </tr>
                </thead>
                <tbody>
                  {rondas.map((r) => (
                    <tr key={r.tarefa_numero}>
                      <td>{r.nome_departamento}</td>
                      <td>{r.nome_roteiro}</td>
                      <td>{r.nome_cliente}</td>
                      <td>{r.nome_guarda}</td>
                      <td>{formatarHoraChegada(r.hora_chegada)}</td>
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
