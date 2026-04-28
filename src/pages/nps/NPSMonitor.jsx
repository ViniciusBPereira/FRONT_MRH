import { useEffect, useState } from "react";
import "./npsmonitor.css";

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

const dashboards = [
  {
    id: 1,
    nome: "Central de Monitoramento",
    descricao:
      "Visão consolidando de Centrais de Monitoramento, indicadores críticos, status de atendimentos, eventos e ocorrências atendidas.",
    img: "https://ik.imagekit.io/5tz98tpoh/Centraol%20de%20Monitoramento.PNG",
    embed:
      "https://app.powerbi.com/reportEmbed?reportId=be66e6fc-35ea-4c4e-9734-a8e1fdffdd60&autoAuth=true&ctid=428525d9-23bd-4f8c-afa2-5600f401f326",
  },
  {
    id: 2,
    nome: "Completude de Ronda",
    descricao:
      "Acompanhamento detalhado da execução das rondas operacionais, garantindo conformidade com o planejamento, identificação de falhas operacionais.",
    img: "https://ik.imagekit.io/5tz98tpoh/Rondas.PNG?updatedAt=1777409938812",
    embed:
      "https://app.powerbi.com/reportEmbed?reportId=bba5df63-304d-4ae9-8ec0-2d7d980ed5c1&autoAuth=true&ctid=428525d9-23bd-4f8c-afa2-5600f401f326",
  },
  {
    id: 3,
    nome: "Inspeções Operacionais",
    descricao:
      "Dashboard completo para auditoria e controle das inspeções realizadas, permitindo avaliar conformidade, identificar desvios e garantir o cumprimento dos padrões operacionais e de segurança.",
    img: "https://ik.imagekit.io/5tz98tpoh/Inspe%C3%A7%C3%A3o.PNG",
    embed:
      "https://app.powerbi.com/reportEmbed?reportId=64e38651-7997-4c11-b2d9-7b38526fe0f9&autoAuth=true&ctid=428525d9-23bd-4f8c-afa2-5600f401f326",
  },
  {
    id: 4,
    nome: "Gestão de Ocorrências/Eventos",
    descricao:
      "Análise estratégica dos eventos e incidentes registrados, com categorização e volumetria, auxiliando na prevenção de perdas.",
    img: "https://ik.imagekit.io/5tz98tpoh/Ocorr%C3%AAncias.PNG",
    embed:
      "https://app.powerbi.com/reportEmbed?reportId=012351e3-fa95-4720-ab76-9a55e13c9ed3&autoAuth=true&ctid=428525d9-23bd-4f8c-afa2-5600f401f326",
  },
  {
    id: 5,
    nome: "Rondas com Drone",
    descricao:
      "Monitoramento das operações realizadas com drones, incluindo cobertura, rotas executadas e eficiência das inspeções aéreas.",
    img: "https://ik.imagekit.io/5tz98tpoh/Drone.PNG",
    embed:
      "https://app.powerbi.com/reportEmbed?reportId=35ccc77e-0cfb-494a-8844-871183693f06&autoAuth=true&ctid=428525d9-23bd-4f8c-afa2-5600f401f326",
  },
  {
    id: 6,
    nome: "Livro de ATA Digital",
    descricao:
      "Registro e acompanhamento digital do Livro Preto, relatório de plantão e conformidade dos materiais dos Contratos.",
    img: "https://ik.imagekit.io/5tz98tpoh/Livro.PNG",
    embed:
      "https://app.powerbi.com/reportEmbed?reportId=f1b57298-dcf3-458e-b139-a4fd6f5befc4&autoAuth=true&ctid=428525d9-23bd-4f8c-afa2-5600f401f326",
  },
  {
    id: 7,
    nome: "Indicadores de KM & Combustível",
    descricao:
      "Análise de consumo, deslocamento e eficiência operacional da frota, permitindo controle de custos, otimização de rotas e identificação de oportunidades de redução de despesas.",
    img: "https://ik.imagekit.io/5tz98tpoh/Km&Combustivel.PNG",
    embed:
      "https://app.powerbi.com/reportEmbed?reportId=2a6dd300-1aaa-4bc0-9581-ff732fc6f3c7&autoAuth=true&ctid=428525d9-23bd-4f8c-afa2-5600f401f326",
  },
  {
    id: 8,
    nome: "OEA & Inspeção de Fumaça",
    descricao:
      "Painel analítico corporativo com visão consolidada de controle de entrada/saída de veículos.",
    img: "https://ik.imagekit.io/5tz98tpoh/OEA.PNG",
    embed:
      "https://app.powerbi.com/reportEmbed?reportId=d20b8710-e2a7-4671-9a27-4431988c9346&autoAuth=true&ctid=428525d9-23bd-4f8c-afa2-5600f401f326",
  },
];

export default function NPSMonitor() {
  const [ativo, setAtivo] = useState(null);

  useEffect(() => {
    document.body.classList.add("hide-sidebar");
    return () => document.body.classList.remove("hide-sidebar");
  }, []);

  return (
    <div className={`nps-scope ${ativo ? "blur-bg" : ""}`}>
      {/* HEADER */}
      <header className="gps-header">
        <div className="gps-header-content">
          <div className="gps-logo">
            <img
              src="https://ik.imagekit.io/5tz98tpoh/unnamed__2_-removebg-preview.png"
              alt="Grupo GPS"
            />
          </div>

          <nav className="gps-nav">
            <a>QUEM SOMOS</a>
            <a>NOSSOS PILARES</a>
            <a>NOSSAS SOLUÇÕES</a>
            <a>INVESTIDORES</a>
            <a>EXTRANET</a>
            <a>TRABALHE CONOSCO</a>
            <button className="fullscreen-floating" onClick={toggleFullscreen}>
              ⛶
            </button>
          </nav>
        </div>
      </header>

      <div className="carousel-center">
        <div className="carousel-track">
          {[...dashboards, ...dashboards].map((item, i) => (
            <div
              key={i}
              className="carousel-card"
              onClick={() => setAtivo(item)}
            >
              <img src={item.img} alt={item.nome} />

              <div className="card-text">
                <div className="card-title">{item.nome}</div>
                <div className="card-desc">{item.descricao}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {ativo && (
        <div className="modal-overlay" onClick={() => setAtivo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAtivo(null)}>
              ✕
            </button>

            <iframe src={ativo.embed} title={ativo.nome} allowFullScreen />
          </div>
        </div>
      )}
    </div>
  );
}
