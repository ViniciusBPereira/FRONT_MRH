import React, { useCallback, useEffect, useMemo, useState } from "react";

import "./radar360dashboard.css";
import { api } from "../../services/api";
import NovaVisita from "./novavisita.jsx";

export default function Radar360Dashboard() {
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("dashboard");
  const [visits, setVisits] = useState([]);
  const [tracking, setTracking] = useState([]);
  const [actions, setActions] = useState([]);
  const [bpSelecionado, setBpSelecionado] = useState("");
  const [contratoSelecionado, setContratoSelecionado] = useState("");

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const carregar = useCallback(async () => {
    try {
      setLoading(true);

      const [visitsRes, trackingRes, actionsRes] = await Promise.all([
        api.get("/visits", {
          headers: authHeader(),
        }),
        api.get("/tracking", {
          headers: authHeader(),
        }),
        api.get("/actions", {
          headers: authHeader(),
        }),
      ]);

      setVisits(visitsRes.data || []);
      setTracking(trackingRes.data || []);
      setActions(actionsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();

    const timer = setInterval(carregar, 300000);

    return () => clearInterval(timer);
  }, [carregar]);

  // ====================
  // FILTROS
  // ====================

  const bps = useMemo(() => {
    return [...new Set(visits.map((v) => v.bp).filter(Boolean))].sort();
  }, [visits]);

  const contratos = useMemo(() => {
    const lista = bpSelecionado
      ? visits.filter((v) => v.bp === bpSelecionado)
      : visits;

    return [...new Set(lista.map((v) => v.contract).filter(Boolean))].sort();
  }, [visits, bpSelecionado]);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const bpOk = !bpSelecionado || v.bp === bpSelecionado;
      const contratoOk =
        !contratoSelecionado || v.contract === contratoSelecionado;

      return bpOk && contratoOk;
    });
  }, [visits, bpSelecionado, contratoSelecionado]);

  // Contratos pertencentes ao BP filtrado
  const contratosDoBP = useMemo(() => {
    const lista = bpSelecionado
      ? visits.filter((v) => v.bp === bpSelecionado)
      : visits;

    return [...new Set(lista.map((v) => v.contract).filter(Boolean))];
  }, [visits, bpSelecionado]);

  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      const bpOk = !bpSelecionado || contratosDoBP.includes(a.contract);

      const contratoOk =
        !contratoSelecionado || a.contract === contratoSelecionado;

      return bpOk && contratoOk;
    });
  }, [actions, bpSelecionado, contratoSelecionado, contratosDoBP]);

  const filteredTracking = useMemo(() => {
    return tracking.filter((t) => {
      const bpOk = !bpSelecionado || contratosDoBP.includes(t.contract);

      const contratoOk =
        !contratoSelecionado || t.contract === contratoSelecionado;

      return bpOk && contratoOk;
    });
  }, [tracking, bpSelecionado, contratoSelecionado, contratosDoBP]);

  // ====================
  // KPIs
  // ====================

  const summary = useMemo(() => {
    const totalScore = filteredVisits.reduce(
      (t, v) => t + Number(v.final_score || 0),
      0,
    );

    const totalENPS = filteredVisits.reduce(
      (t, v) => t + Number(v.enps || 0),
      0,
    );

    const totalHeadcount = filteredVisits.reduce(
      (t, v) => t + Number(v.headcount || 0),
      0,
    );
    return {
      visits: filteredVisits.length,
      tracking: filteredTracking.length,
      actions: filteredActions.length,

      avgScore: Math.round(totalScore / (filteredVisits.length || 1)),
      avgENPS: Math.round(totalENPS / (filteredVisits.length || 1)),
      headcount: totalHeadcount,

      critical: filteredVisits.filter((v) => v.classification === "Crítico")
        .length,

      alert: filteredVisits.filter((v) => v.classification === "Alerta").length,

      stable: filteredVisits.filter((v) => v.classification === "Estável")
        .length,

      reference: filteredVisits.filter((v) => v.classification === "Referência")
        .length,

      completedActions: filteredActions.filter((a) => a.stage === "Concluído")
        .length,

      executingActions: filteredActions.filter(
        (a) => a.stage === "Em andamento",
      ).length,

      plannedActions: filteredActions.filter((a) => a.stage === "Planejado")
        .length,
    };
  }, [filteredVisits, filteredTracking, filteredActions]);

  const status = useMemo(() => {
    const total = filteredVisits.length || 1;

    return ["Referência", "Estável", "Alerta", "Crítico"].map((item) => ({
      nome: item,
      valor: filteredVisits.filter((v) => v.classification === item).length,
      width:
        (filteredVisits.filter((v) => v.classification === item).length /
          total) *
        100,
    }));
  }, [filteredVisits]);

  const proximasAcoes = useMemo(() => {
    return [...filteredActions]
      .filter((a) => a.stage !== "Concluído")
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 8);
  }, [filteredActions]);

  const calendario = useMemo(() => {
    const eventos = [];

    filteredVisits.forEach((v) =>
      eventos.push({
        tipo: "Visita",
        contrato: v.contract,
        data: v.visit_date,
      }),
    );

    filteredActions.forEach((a) =>
      eventos.push({
        tipo: "Ação",
        contrato: a.contract,
        data: a.due_date,
        etapa: a.stage,
      }),
    );

    return eventos
      .filter((e) => e.data)
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .slice(0, 12);
  }, [filteredVisits, filteredActions]);

  const kpis = [
    {
      titulo: "Visitas realizadas",
      valor: summary.visits,
    },
    {
      titulo: "Score médio",
      valor: summary.avgScore,
    },
    {
      titulo: "Contratos críticos",
      valor: summary.critical,
      tipo: "critical",
    },
    {
      titulo: "Contratos em alerta",
      valor: summary.alert,
      tipo: "warning",
    },
    {
      titulo: "eNPS médio",
      valor: summary.avgENPS,
    },
    {
      titulo: "Efetivo coberto",
      valor: summary.headcount,
    },
    {
      titulo: "Contratos em execução",
      valor: summary.executingActions,
      tipo: "warning",
    },
    {
      titulo: "Contratos concluídos",
      valor: summary.completedActions,
    },
  ];

  return (
    <div className="radar-wrapper">
      <div className="page-header">
        <div>
          <span className="eyebrow">VISÃO EXECUTIVA</span>

          <h2>Dashboard de Risco por Contrato</h2>
        </div>

        <div className="toolbar">
          <select
            value={bpSelecionado}
            onChange={(e) => setBpSelecionado(e.target.value)}
          >
            <option value="">Todos os BPs</option>

            {bps.map((bp) => (
              <option key={bp} value={bp}>
                {bp}
              </option>
            ))}
          </select>

          <select
            value={contratoSelecionado}
            onChange={(e) => setContratoSelecionado(e.target.value)}
          >
            <option value="">Todos os Contratos</option>

            {contratos.map((contrato) => (
              <option key={contrato} value={contrato}>
                {contrato}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="radar-tabs">
        <button
          className={aba === "dashboard" ? "active" : ""}
          onClick={() => setAba("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={aba === "visit" ? "active" : ""}
          onClick={() => setAba("visit")}
        >
          Nova Visita
        </button>

        <button
          className={aba === "tracking" ? "active" : ""}
          onClick={() => setAba("tracking")}
        >
          Acompanhamento
        </button>

        <button
          className={aba === "actions" ? "active" : ""}
          onClick={() => setAba("actions")}
        >
          Plano de Ação
        </button>

        <button
          className={aba === "contracts" ? "active" : ""}
          onClick={() => setAba("contracts")}
        >
          Contratos
        </button>
      </div>
      {aba === "dashboard" && (
        <>
          <div className="kpi-grid">
            {kpis.map((item) => (
              <div key={item.titulo} className={`kpi-card ${item.tipo || ""}`}>
                <span>{item.titulo}</span>

                <strong>{loading ? "..." : item.valor}</strong>
              </div>
            ))}
          </div>

          <div className="dashboard-grid">
            <section className="panel">
              <h3>Distribuição por classificação</h3>

              {status.map((item) => (
                <div key={item.nome} className="status-row">
                  <span>{item.nome}</span>

                  <div className="bar">
                    <div
                      style={{
                        width: `${item.width}%`,
                      }}
                    />
                  </div>

                  <strong>{item.valor}</strong>
                </div>
              ))}
            </section>

            <section className="panel">
              <h3>Próximas ações</h3>

              {proximasAcoes.length === 0 ? (
                <div className="priority">Nenhuma ação pendente.</div>
              ) : (
                proximasAcoes.map((acao) => (
                  <div
                    key={acao.id}
                    className="priority"
                    style={{ marginBottom: 12 }}
                  >
                    <strong>{acao.contract}</strong>

                    <br />

                    <small>{acao.description}</small>

                    <br />

                    <small>Responsável: {acao.owner}</small>

                    <br />

                    <small>Etapa: {acao.stage}</small>

                    <br />

                    <small>
                      Prazo:{" "}
                      {new Date(acao.due_date).toLocaleDateString("pt-BR")}
                    </small>
                  </div>
                ))
              )}
            </section>
          </div>

          <section className="panel">
            <h3>Calendário de Visitas e Ações</h3>

            <div className="calendar">
              {calendario.length === 0 ? (
                <div style={{ padding: 20 }}>Nenhum evento encontrado.</div>
              ) : (
                calendario.map((evento, index) => (
                  <div
                    key={index}
                    className="priority"
                    style={{ marginBottom: 12 }}
                  >
                    <strong>{evento.tipo}</strong>

                    <br />

                    <small>Contrato: {evento.contrato}</small>

                    <br />

                    <small>
                      Data: {new Date(evento.data).toLocaleDateString("pt-BR")}
                    </small>

                    {evento.etapa && (
                      <>
                        <br />
                        <small>Etapa: {evento.etapa}</small>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
      {aba === "visit" && <NovaVisita />}
    </div>
  );
}
