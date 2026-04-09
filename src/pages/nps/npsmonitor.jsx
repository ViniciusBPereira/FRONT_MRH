import {
  useEffect,
  useState,
  memo
} from "react";

import { io } from "socket.io-client";
import "./npsmonitor.css";

/* ================= SOCKET ================= */
const socket = io(import.meta.env.VITE_API_URL);

/* =====================================================
   ✅ LINHA MEMOIZADA (PERFORMANCE)
===================================================== */
const LinhaNPS = memo(({ nps }) => {
  const nota = Number(nps.nota);

  const getClass = () => {
    if (nota >= 9) return "nota alta";
    if (nota >= 7) return "nota media";
    return "nota baixa";
  };

  return (
    <tr>
      <td>{nps.id.slice(0, 6)}</td>
      <td>{nps.nome_respondente}</td>
      <td>{nps.email_respondente}</td>
      <td>{nps.grupo_cliente}</td>
      <td>{nps.vinculado_por}</td>
      <td className={getClass()}>{nota}</td>
      <td>{formatarData(nps.respondido_em)}</td>
    </tr>
  );
});

/* =====================================================
   FORMATADOR
===================================================== */
function formatarData(data) {
  if (!data) return "-";

  return new Date(data).toLocaleString("pt-BR");
}

/* =====================================================
   COMPONENT
===================================================== */
export default function NPSMonitor() {

  /* ================= REMOVER SIDEBAR ================= */
  useEffect(() => {
    document.body.classList.add("hide-sidebar");
    return () =>
      document.body.classList.remove("hide-sidebar");
  }, []);

  const [npsList, setNpsList] = useState([]);

  /* ================= SOCKET ================= */
  useEffect(() => {

    Notification.requestPermission();

    socket.on("connect", () => {
      console.log("[NPS] Socket conectado:", socket.id);
    });

    socket.on("nova-nps", (dados) => {

      /* 🔥 prepend sem recriar tudo */
      setNpsList((prev) => [...dados, ...prev]);

      /* 🔔 notificação */
      dados.forEach((nps) => {
        new Notification("Nova NPS", {
          body: `${nps.nome_respondente} • Nota ${nps.nota}`,
        });
      });

    });

    return () => socket.off("nova-nps");

  }, []);

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <div className="nps-wrapper">

      <div className="nps-container">

        <header className="nps-header">
          <h1>Monitor NPS</h1>
          <span className="badge-live">● AO VIVO</span>
        </header>

        {/* ================= TABELA ================= */}
        <section className="table-card">
          <div className="table-wrapper">

            {npsList.length === 0 ? (
              <div className="loading">
                Aguardando NPS...
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Email</th>
                    <th>Grupo</th>
                    <th>Analista</th>
                    <th>Nota</th>
                    <th>Data</th>
                  </tr>
                </thead>

                <tbody>
                  {npsList.map((nps) => (
                    <LinhaNPS key={nps.id} nps={nps} />
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