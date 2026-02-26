import {
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";

import "./rondascorp.css";
import { api } from "../../services/api";

const REFRESH_INTERVAL = 5 * 60 * 1000;
const LIMIT_MAX = 5000;

/* =====================================================
   FORMATADOR
===================================================== */
function formatarHoraChegada(valor) {
  if (!valor) return "-";

  const limpo = valor.replace("T", " ").replace("Z", "").split(".")[0];
  const [data, hora] = limpo.split(" ");

  if (!data || !hora) return valor;

  const [yyyy, mm, dd] = data.split("-");
  return `${dd}/${mm}/${yyyy} ${hora}`;
}

/* =====================================================
   ✅ LINHA MEMOIZADA
   (evita recriação de milhares de TR)
===================================================== */
const LinhaRonda = memo(({ r }) => (
  <tr>
    <td>{r.nome_departamento}</td>
    <td>{r.nome_roteiro}</td>
    <td>{r.nome_cliente}</td>
    <td>{r.nome_guarda}</td>
    <td>{formatarHoraChegada(r.hora_chegada)}</td>
  </tr>
));

export default function RondasCorp() {

  /* ================= SIDEBAR ================= */
  useEffect(() => {
    document.body.classList.add("hide-sidebar");
    return () =>
      document.body.classList.remove("hide-sidebar");
  }, []);

  const [rondas, setRondas] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FILTROS ================= */
  const [dataInicio, setDataInicio] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [roteiro, setRoteiro] = useState("");

  const refreshTimer = useRef(null);

  /* =====================================================
     ✅ CARREGAMENTO OTIMIZADO
  ===================================================== */
  const carregarDados = useCallback(async (silent = false) => {
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

      /* ✅ evita rebuild completo da tabela */
      setRondas((prev) => {
        if (
          prev.length === res.data.length &&
          prev[0]?.tarefa_numero === res.data[0]?.tarefa_numero &&
          prev[prev.length - 1]?.tarefa_numero ===
            res.data[res.data.length - 1]?.tarefa_numero
        ) {
          return prev;
        }

        return res.data;
      });

    } catch (err) {
      console.error("[RONDAS]", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [
    dataInicio,
    horaInicio,
    dataFim,
    horaFim,
    roteiro,
  ]);

  /* ================= FILTROS ================= */

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

  /* ================= EXPORT CSV ================= */

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

    api.get("/rondas/export/csv", {
      params,
      responseType: "blob",
    }).then((res) => {

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

  /* ================= LOAD INICIAL ================= */

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {
    refreshTimer.current = setInterval(
      () => carregarDados(true),
      REFRESH_INTERVAL
    );

    return () =>
      clearInterval(refreshTimer.current);
  }, [carregarDados]);

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <div className="rondas-wrapper">
      <div className="rondas-container">

        <header className="rondas-header">
          <h1>Rondas – Hospital</h1>

          <div className="actions">
            <button onClick={aplicarFiltro}>
              Atualizar
            </button>

            <button
              className="primary"
              onClick={exportarCsv}
            >
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
                onChange={(e) =>
                  setDataInicio(e.target.value)
                }
              />
            </div>

            <div className="filter-field">
              <label>Hora início</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) =>
                  setHoraInicio(e.target.value)
                }
              />
            </div>

            <div className="filter-field">
              <label>Data fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) =>
                  setDataFim(e.target.value)
                }
              />
            </div>

            <div className="filter-field">
              <label>Hora fim</label>
              <input
                type="time"
                value={horaFim}
                onChange={(e) =>
                  setHoraFim(e.target.value)
                }
              />
            </div>

            <div className="filter-field filter-roteiro">
              <label>Roteiro</label>
              <input
                type="text"
                placeholder="Contém..."
                value={roteiro}
                onChange={(e) =>
                  setRoteiro(e.target.value)
                }
              />
            </div>

          </div>

          <div className="filter-actions">
            <button
              className="btn-filter"
              onClick={aplicarFiltro}
            >
              Filtrar
            </button>

            <button
              className="btn-clear"
              onClick={limparFiltro}
            >
              Limpar
            </button>
          </div>
        </section>

        {/* ================= TABELA ================= */}
        <section className="table-card">
          <div className="table-wrapper">

            {loading ? (
              <div className="loading">
                Carregando dados…
              </div>
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
                    <LinhaRonda
                      key={r.tarefa_numero}
                      r={r}
                    />
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
