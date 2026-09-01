import React, { useCallback, useEffect, useMemo, useState } from "react";

import "./radar360dashboard.css";

import { api } from "../../services/api";

import NovaVisita from "./novavisita.jsx";
import Acompanhamento from "./acompanhamento.jsx";
import PlanodeAcao from "./planodeacao.jsx";
import AcaoPontual from "./acaopontual.jsx";

/* ============================================================
   CONFIGURAÇÃO
============================================================ */

const TABS = [
  {
    id: "dashboard",
    label: "Visão Geral",
  },
  {
    id: "visit",
    label: "Nova Visita",
  },
  {
    id: "tracking",
    label: "Acompanhamento",
  },
  {
    id: "actions",
    label: "Plano de Ação",
  },
  {
    id: "punctual",
    label: "Ação Pontual",
  },
];

const CLASSIFICATIONS = ["Referência", "Estável", "Alerta", "Crítico"];

/* ============================================================
   HELPERS
============================================================ */

function getAuthConfig() {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function getArrayResponse(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data?.rows)) {
    return response.data.rows;
  }

  return [];
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function getBP(item) {
  return normalizeText(
    item?.bp ??
      item?.business_partner ??
      item?.businessPartner ??
      item?.business_partner_name,
  );
}

function getCR(item) {
  return normalizeText(
    item?.cr ?? item?.contract ?? item?.contract_number ?? item?.contractNumber,
  );
}

function getStatus(item) {
  return normalizeText(item?.status ?? item?.stage);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR");
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

/* ============================================================
   COMPONENT
============================================================ */

export default function Radar360Dashboard() {
  /* ==========================================================
     ESTADO
  ========================================================== */

  const [activeTab, setActiveTab] = useState("dashboard");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [contracts, setContracts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [tracking, setTracking] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  const [punctualActions, setPunctualActions] = useState([]);

  const [bpSelecionado, setBpSelecionado] = useState("");
  const [contratoSelecionado, setContratoSelecionado] = useState("");

  const [visitEdit, setVisitEdit] = useState(null);

  /* ==========================================================
     CARREGAR DADOS
  ========================================================== */

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const config = getAuthConfig();

      const [
        contractsResponse,
        visitsResponse,
        trackingResponse,
        actionsResponse,
        punctualActionsResponse,
      ] = await Promise.all([
        api.get("/contracts", config),
        api.get("/visits", config),
        api.get("/tracking", config),
        api.get("/actions", config),
        api.get("/punctual-actions", config),
      ]);

      setContracts(getArrayResponse(contractsResponse));
      setVisits(getArrayResponse(visitsResponse));
      setTracking(getArrayResponse(trackingResponse));
      setActionPlans(getArrayResponse(actionsResponse));
      setPunctualActions(getArrayResponse(punctualActionsResponse));
    } catch (err) {
      console.error("Erro ao carregar dados do Radar 360:", err);

      setError(
        err?.response?.data?.message ||
          "Não foi possível carregar os dados do Radar 360.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();

    const interval = setInterval(carregar, 300000);

    return () => clearInterval(interval);
  }, [carregar]);

  /* ==========================================================
     BASE ÚNICA DOS CONTRATOS
     
     O filtro passa a usar /contracts como fonte principal.
     Isso evita depender de existir uma visita para um contrato
     aparecer no filtro.
  ========================================================== */

  const contratosBase = useMemo(() => {
    const mapa = new Map();

    contracts.forEach((contract) => {
      const cr = getCR(contract);
      const bp = getBP(contract);

      if (!cr) {
        return;
      }

      mapa.set(cr, {
        cr,
        bp,
        original: contract,
      });
    });

    /*
      Caso algum CR exista nas visitas mas ainda não tenha
      vindo corretamente pelo endpoint de contratos, adicionamos
      como fallback.
    */
    visits.forEach((visit) => {
      const cr = getCR(visit);

      if (!cr || mapa.has(cr)) {
        return;
      }

      mapa.set(cr, {
        cr,
        bp: getBP(visit),
        original: null,
      });
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.cr.localeCompare(b.cr, "pt-BR"),
    );
  }, [contracts, visits]);

  /* ==========================================================
     BPs
  ========================================================== */

  const bps = useMemo(() => {
    return Array.from(
      new Set(contratosBase.map((item) => item.bp).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [contratosBase]);

  /* ==========================================================
     CONTRATOS DISPONÍVEIS
     
     Se BP estiver selecionado:
       mostra somente CRs daquele BP.
  ========================================================== */

  const contratosDisponiveis = useMemo(() => {
    return contratosBase
      .filter((item) => {
        return !bpSelecionado || item.bp === bpSelecionado;
      })
      .map((item) => item.cr);
  }, [contratosBase, bpSelecionado]);

  /* ==========================================================
     GARANTE QUE O CR NÃO FIQUE INVÁLIDO AO TROCAR O BP
  ========================================================== */

  useEffect(() => {
    if (
      contratoSelecionado &&
      !contratosDisponiveis.includes(contratoSelecionado)
    ) {
      setContratoSelecionado("");
    }
  }, [contratoSelecionado, contratosDisponiveis]);

  /* ==========================================================
     FILTRO GLOBAL
  ========================================================== */

  const matchesFilter = useCallback(
    (item) => {
      const itemCR = getCR(item);

      /*
        Se não houver CR no registro, ele não consegue ser
        associado a um BP de forma segura.
      */
      if (!itemCR) {
        return !contratoSelecionado && !bpSelecionado;
      }

      if (contratoSelecionado && itemCR !== contratoSelecionado) {
        return false;
      }

      if (!bpSelecionado) {
        return true;
      }

      const contract = contratosBase.find(
        (itemContract) => itemContract.cr === itemCR,
      );

      if (contract?.bp) {
        return contract.bp === bpSelecionado;
      }

      /*
        Fallback para registros que não foram encontrados
        no endpoint /contracts.
      */
      return getBP(item) === bpSelecionado;
    },
    [bpSelecionado, contratoSelecionado, contratosBase],
  );

  /* ==========================================================
     DADOS FILTRADOS
  ========================================================== */

  const filteredVisits = useMemo(
    () => visits.filter(matchesFilter),
    [visits, matchesFilter],
  );

  const filteredTracking = useMemo(
    () => tracking.filter(matchesFilter),
    [tracking, matchesFilter],
  );

  const filteredActionPlans = useMemo(
    () => actionPlans.filter(matchesFilter),
    [actionPlans, matchesFilter],
  );

  const filteredPunctualActions = useMemo(
    () => punctualActions.filter(matchesFilter),
    [punctualActions, matchesFilter],
  );

  /* ==========================================================
     CONTRATOS FILTRADOS
  ========================================================== */

  const filteredContracts = useMemo(() => {
    return contratosBase.filter((contract) => {
      if (bpSelecionado && contract.bp !== bpSelecionado) {
        return false;
      }

      if (contratoSelecionado && contract.cr !== contratoSelecionado) {
        return false;
      }

      return true;
    });
  }, [contratosBase, bpSelecionado, contratoSelecionado]);

  /* ==========================================================
     RESUMO
  ========================================================== */

  const summary = useMemo(() => {
    const totalScore = filteredVisits.reduce(
      (total, visit) => total + Number(visit.final_score || 0),
      0,
    );

    const totalENPS = filteredVisits.reduce(
      (total, visit) => total + Number(visit.enps || 0),
      0,
    );

    const totalHeadcount = filteredVisits.reduce(
      (total, visit) => total + Number(visit.headcount || 0),
      0,
    );

    const critical = filteredVisits.filter(
      (visit) => visit.classification === "Crítico",
    ).length;

    const alert = filteredVisits.filter(
      (visit) => visit.classification === "Alerta",
    ).length;

    const stable = filteredVisits.filter(
      (visit) => visit.classification === "Estável",
    ).length;

    const reference = filteredVisits.filter(
      (visit) => visit.classification === "Referência",
    ).length;

    const completedPlans = filteredActionPlans.filter(
      (item) => getStatus(item) === "Concluído",
    ).length;

    const executingPlans = filteredActionPlans.filter(
      (item) => getStatus(item) === "Em andamento",
    ).length;

    const plannedPlans = filteredActionPlans.filter(
      (item) =>
        getStatus(item) === "A fazer" || getStatus(item) === "Planejado",
    ).length;

    const completedPunctual = filteredPunctualActions.filter(
      (item) => getStatus(item) === "Concluído",
    ).length;

    const executingPunctual = filteredPunctualActions.filter(
      (item) => getStatus(item) === "Em andamento",
    ).length;

    const pendingPunctual = filteredPunctualActions.filter(
      (item) =>
        getStatus(item) === "A fazer" || getStatus(item) === "Planejado",
    ).length;

    return {
      contracts: filteredContracts.length,

      visits: filteredVisits.length,

      tracking: filteredTracking.length,

      actionPlans: filteredActionPlans.length,

      punctualActions: filteredPunctualActions.length,

      avgScore:
        filteredVisits.length > 0
          ? Math.round(totalScore / filteredVisits.length)
          : 0,

      avgENPS:
        filteredVisits.length > 0
          ? Math.round(totalENPS / filteredVisits.length)
          : 0,

      headcount: totalHeadcount,

      critical,
      alert,
      stable,
      reference,

      completedPlans,
      executingPlans,
      plannedPlans,

      completedPunctual,
      executingPunctual,
      pendingPunctual,
    };
  }, [
    filteredContracts,
    filteredVisits,
    filteredTracking,
    filteredActionPlans,
    filteredPunctualActions,
  ]);

  /* ==========================================================
     CLASSIFICAÇÃO
  ========================================================== */

  const classificationData = useMemo(() => {
    const total = filteredVisits.length || 1;

    return CLASSIFICATIONS.map((classification) => {
      const value = filteredVisits.filter(
        (visit) => visit.classification === classification,
      ).length;

      return {
        name: classification,
        value,
        percentage: (value / total) * 100,
      };
    });
  }, [filteredVisits]);

  /* ==========================================================
     PRÓXIMOS PLANOS
  ========================================================== */

  const upcomingPlans = useMemo(() => {
    return [...filteredActionPlans]
      .filter((item) => getStatus(item) !== "Concluído")
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;

        return new Date(a.due_date) - new Date(b.due_date);
      })
      .slice(0, 6);
  }, [filteredActionPlans]);

  /* ==========================================================
     EVENTOS RECENTES
  ========================================================== */

  const timeline = useMemo(() => {
    const events = [];

    filteredVisits.forEach((visit) => {
      if (!visit.visit_date) {
        return;
      }

      events.push({
        id: `visit-${visit.id}`,
        type: "Visita",
        cr: getCR(visit),
        date: visit.visit_date,
        status: visit.classification || "Realizada",
      });
    });

    filteredActionPlans.forEach((action) => {
      if (!action.due_date) {
        return;
      }

      events.push({
        id: `plan-${action.id}`,
        type: "Plano de ação",
        cr: getCR(action),
        date: action.due_date,
        status: getStatus(action),
      });
    });

    filteredPunctualActions.forEach((action) => {
      const date =
        action.completion_date || action.action_date || action.due_date;

      if (!date) {
        return;
      }

      events.push({
        id: `punctual-${action.id}`,
        type: "Ação pontual",
        cr: getCR(action),
        date,
        status: getStatus(action),
      });
    });

    return events
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  }, [filteredVisits, filteredActionPlans, filteredPunctualActions]);

  /* ==========================================================
     KPIs
  ========================================================== */

  const kpis = [
    {
      label: "Contratos",
      value: summary.contracts,
      helper: "No filtro atual",
      type: "",
    },
    {
      label: "Visitas realizadas",
      value: summary.visits,
      helper: "Visitas registradas",
      type: "",
    },
    {
      label: "Score médio",
      value: summary.avgScore,
      helper: "Últimos registros",
      type: "",
    },
    {
      label: "Críticos",
      value: summary.critical,
      helper: "Exigem atenção",
      type: "danger",
    },
    {
      label: "Em alerta",
      value: summary.alert,
      helper: "Monitoramento",
      type: "warning",
    },
    {
      label: "eNPS médio",
      value: summary.avgENPS,
      helper: "Índice médio",
      type: "",
    },
    {
      label: "Efetivo coberto",
      value: summary.headcount,
      helper: "Colaboradores",
      type: "",
    },
    {
      label: "Planos em execução",
      value: summary.executingPlans,
      helper: `${summary.actionPlans} planos`,
      type: "warning",
    },
  ];

  /* ==========================================================
     AÇÕES
  ========================================================== */

  const abrirNovaVisita = useCallback(() => {
    setVisitEdit(null);
    setActiveTab("visit");
  }, []);

  const editarVisita = useCallback((trackingId, visit) => {
    setVisitEdit({
      trackingId,
      visit,
    });

    setActiveTab("visit");
  }, []);

  /* ==========================================================
     TROCA DE BP
     
     Importante:
     NÃO altera activeTab.
     
     Portanto:
       usuário está em Acompanhamento
       troca BP
       continua em Acompanhamento
       apenas os dados mudam.
  ========================================================== */

  const handleBPChange = (event) => {
    setBpSelecionado(event.target.value);
    setContratoSelecionado("");
  };

  /* ==========================================================
     PROPS DOS MÓDULOS
  ========================================================== */

  const moduleProps = {
    visits: filteredVisits,
    tracking: filteredTracking,
    actions: filteredActionPlans,
    actionPlans: filteredActionPlans,
    punctualActions: filteredPunctualActions,

    bpSelecionado,
    contratoSelecionado,

    onReload: carregar,
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="radar-wrapper">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="radar-header">
        <div className="radar-title">
          <span className="radar-eyebrow">RADAR 360</span>

          <h1>Gestão de risco por contrato</h1>

          <p>
            Acompanhe a operação, os riscos e os planos de ação em um único
            lugar.
          </p>
        </div>

        <div className="radar-filters">
          <div className="filter-group">
            <label>Business Partner</label>

            <select
              value={bpSelecionado}
              onChange={handleBPChange}
              disabled={loading}
            >
              <option value="">Todos os BPs</option>

              {bps.map((bp) => (
                <option key={bp} value={bp}>
                  {bp}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Contrato / CR</label>

            <select
              value={contratoSelecionado}
              onChange={(event) => setContratoSelecionado(event.target.value)}
              disabled={loading || contratosDisponiveis.length === 0}
            >
              <option value="">Todos os CRs</option>

              {contratosDisponiveis.map((contrato) => (
                <option key={contrato} value={contrato}>
                  {contrato}
                </option>
              ))}
            </select>
          </div>

          {(bpSelecionado || contratoSelecionado) && (
            <button
              type="button"
              className="clear-filter"
              onClick={() => {
                setBpSelecionado("");
                setContratoSelecionado("");
              }}
            >
              Limpar
            </button>
          )}
        </div>
      </header>

      {/* ======================================================
          STATUS
      ====================================================== */}

      <div className="radar-status">
        <span className={loading ? "status-dot loading" : "status-dot"} />

        <span>{loading ? "Atualizando dados..." : "Dados atualizados"}</span>

        <span className="status-separator">•</span>

        <span>
          {summary.contracts} contrato
          {summary.contracts !== 1 ? "s" : ""}
        </span>

        {bpSelecionado && (
          <>
            <span className="status-separator">•</span>

            <strong>BP: {bpSelecionado}</strong>
          </>
        )}

        {contratoSelecionado && (
          <>
            <span className="status-separator">•</span>

            <strong>CR: {contratoSelecionado}</strong>
          </>
        )}
      </div>

      {/* ======================================================
          ERRO
      ====================================================== */}

      {error && (
        <div className="radar-error">
          <strong>Não foi possível carregar os dados.</strong>

          <span>{error}</span>

          <button type="button" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* ======================================================
          NAVEGAÇÃO
      ====================================================== */}

      <nav className="radar-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => {
              if (tab.id === "visit") {
                abrirNovaVisita();
                return;
              }

              setActiveTab(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ======================================================
          DASHBOARD
      ====================================================== */}

      {activeTab === "dashboard" && (
        <main className="dashboard-content">
          {/* KPIs */}

          <section className="kpi-grid">
            {kpis.map((kpi) => (
              <article key={kpi.label} className={`kpi-card ${kpi.type}`}>
                <div className="kpi-card-top">
                  <span>{kpi.label}</span>
                </div>

                <strong>{loading ? "—" : formatNumber(kpi.value)}</strong>

                <small>{kpi.helper}</small>
              </article>
            ))}
          </section>

          {/* RESUMO OPERACIONAL */}

          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">RISCO</span>

                  <h2>Saúde dos contratos</h2>
                </div>

                <span className="panel-total">{summary.visits} visitas</span>
              </div>

              <div className="classification-list">
                {classificationData.map((item) => (
                  <div className="classification-row" key={item.name}>
                    <div className="classification-label">
                      <span
                        className={`classification-dot ${item.name
                          .toLowerCase()
                          .replace("ê", "e")}`}
                      />

                      <span>{item.name}</span>
                    </div>

                    <div className="classification-bar">
                      <div
                        style={{
                          width: `${item.percentage}%`,
                        }}
                      />
                    </div>

                    <strong>{item.value}</strong>

                    <small>{Math.round(item.percentage)}%</small>
                  </div>
                ))}
              </div>
            </article>

            {/* PLANOS */}

            <article className="panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">AÇÕES</span>

                  <h2>Próximos planos</h2>
                </div>

                <span className="panel-total">{summary.actionPlans} total</span>
              </div>

              {upcomingPlans.length === 0 ? (
                <div className="empty-state">
                  <strong>Nenhum plano pendente</strong>

                  <span>
                    Não existem planos de ação pendentes para o filtro atual.
                  </span>
                </div>
              ) : (
                <div className="action-list">
                  {upcomingPlans.map((action) => (
                    <div className="action-item" key={action.id}>
                      <div className="action-main">
                        <strong>
                          {getCR(action) || "Contrato não informado"}
                        </strong>

                        <span>{action.description || "Sem descrição"}</span>
                      </div>

                      <div className="action-meta">
                        <span
                          className={`status-badge ${getStatus(action)
                            .toLowerCase()
                            .replaceAll(" ", "-")}`}
                        >
                          {getStatus(action) || "Sem status"}
                        </span>

                        <small>{formatDate(action.due_date)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          {/* SEGUNDO BLOCO */}

          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">ACOMPANHAMENTO</span>

                  <h2>Status das ações</h2>
                </div>
              </div>

              <div className="action-summary">
                <div className="action-summary-card">
                  <span>Planos</span>

                  <strong>{summary.actionPlans}</strong>
                </div>

                <div className="action-summary-card warning">
                  <span>Em execução</span>

                  <strong>{summary.executingPlans}</strong>
                </div>

                <div className="action-summary-card">
                  <span>Planejados</span>

                  <strong>{summary.plannedPlans}</strong>
                </div>

                <div className="action-summary-card success">
                  <span>Concluídos</span>

                  <strong>{summary.completedPlans}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">AÇÃO PONTUAL</span>

                  <h2>Indicadores</h2>
                </div>
              </div>

              <div className="action-summary">
                <div className="action-summary-card">
                  <span>Total</span>

                  <strong>{summary.punctualActions}</strong>
                </div>

                <div className="action-summary-card warning">
                  <span>Em execução</span>

                  <strong>{summary.executingPunctual}</strong>
                </div>

                <div className="action-summary-card">
                  <span>Pendentes</span>

                  <strong>{summary.pendingPunctual}</strong>
                </div>

                <div className="action-summary-card success">
                  <span>Concluídas</span>

                  <strong>{summary.completedPunctual}</strong>
                </div>
              </div>
            </article>
          </section>

          {/* LINHA DO TEMPO */}

          <section className="panel timeline-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">HISTÓRICO</span>

                <h2>Atividade recente</h2>
              </div>

              <span className="panel-total">{timeline.length} eventos</span>
            </div>

            {timeline.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma atividade</strong>

                <span>Não existem eventos para os filtros selecionados.</span>
              </div>
            ) : (
              <div className="timeline">
                {timeline.map((event) => (
                  <div className="timeline-item" key={event.id}>
                    <div className="timeline-marker" />

                    <div className="timeline-content">
                      <div>
                        <strong>{event.type}</strong>

                        <span>{event.cr || "Contrato não informado"}</span>
                      </div>

                      <div className="timeline-right">
                        <small>{formatDate(event.date)}</small>

                        <span className="status-badge">{event.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ======================================================
          NOVA / EDITAR VISITA
      ====================================================== */}

      {activeTab === "visit" && (
        <NovaVisita
          editTracking={Boolean(visitEdit)}
          trackingId={visitEdit?.trackingId}
          visit={visitEdit?.visit}
        />
      )}

      {/* ======================================================
          ACOMPANHAMENTO
      ====================================================== */}

      {activeTab === "tracking" && (
        <Acompanhamento {...moduleProps} onEditVisit={editarVisita} />
      )}

      {/* ======================================================
          PLANO DE AÇÃO
      ====================================================== */}

      {activeTab === "actions" && <PlanodeAcao {...moduleProps} />}

      {/* ======================================================
          AÇÃO PONTUAL
      ====================================================== */}

      {activeTab === "punctual" && <AcaoPontual {...moduleProps} />}
    </div>
  );
}
