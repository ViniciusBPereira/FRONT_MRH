import { useState, useEffect } from "react";
import "./npsmonitor.css";

/* =====================================================
   DADOS MOCK (SUBSTITUA PELOS SEUS BIs)
===================================================== */
const dashboards = [
  {
    id: 1,
    nome: "Performance Operacional",
    descricao: "SLA, contratos e execução",
    imagem: "/imgs/performance.png"
  },
  {
    id: 2,
    nome: "Produtividade",
    descricao: "Eficiência e tempo produtivo",
    imagem: "/imgs/produtividade.png"
  },
  {
    id: 3,
    nome: "Planejamento",
    descricao: "Controle e execução de agenda",
    imagem: "/imgs/planejamento.png"
  }
];

/* =====================================================
   COMPONENT
===================================================== */
export default function NPSMonitor() {

  const [ativo, setAtivo] = useState(null);

  useEffect(() => {
    document.body.classList.add("hide-sidebar");
    return () =>
      document.body.classList.remove("hide-sidebar");
  }, []);

  return (
    <div className="nps-scope">
      <div className="nps-container">

        {/* HEADER */}
        <header className="nps-header">
          <h1>Analytics Experience</h1>
          <p>Explore nossos dashboards</p>
        </header>

        {/* CATÁLOGO */}
        {!ativo && (
          <div className="nps-grid">
            {dashboards.map((item) => (
              <div
                key={item.id}
                className="nps-card"
                onClick={() => setAtivo(item)}
              >
                <img src={item.imagem} alt={item.nome} />

                <div className="nps-card-content">
                  <h3>{item.nome}</h3>
                  <p>{item.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISUALIZAÇÃO */}
        {ativo && (
          <div className="nps-viewer">

            <button
              className="nps-back"
              onClick={() => setAtivo(null)}
            >
              ← Voltar
            </button>

            <h2>{ativo.nome}</h2>

            <div className="nps-embed">

              {/* 🔥 SUBSTITUIR PELO POWER BI */}
              
              {/* OPÇÃO 1 - IFRAME */}
              {/*
              <iframe
                src="URL_DO_SEU_POWER_BI"
                title="BI"
                frameBorder="0"
                allowFullScreen
              />
              */}

              {/* OPÇÃO 2 - PREVIEW (RECOMENDADO PRA FEIRA) */}
              <img
                src={ativo.imagem}
                alt="preview"
                className="nps-preview"
              />

            </div>

            <div className="nps-info">
              <p>
                Dashboard interativo focado em tomada de decisão
                e análise operacional em tempo real.
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
