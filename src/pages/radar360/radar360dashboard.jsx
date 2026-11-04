import React, { useCallback, useEffect, useMemo, useState } from "react";

import "./radar360dashboard.css";

import { api } from "../../services/api";

import NovaVisita from "./novavisita.jsx";
import Acompanhamento from "./acompanhamento.jsx";
import PlanodeAcao from "./planodeacao.jsx";
import AcaoPontual from "./acaopontual.jsx";
import Contrato from "./contrato.jsx";
import Dashboard from "./dashboard.jsx";

/* ============================================================
   CONFIGURAÇÃO
============================================================ */

const TABS = [
  {
    id: "dashboard",
    label: "Visão Geral",
  },
  {
    id: "bi",
    label: "Dashboard",
  },
  {
    id: "contract",
    label: "Contrato",
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

  // Algumas rotas enviam coleções com um nome específico.
  for (const key of ["contracts", "visits", "tracking", "actions", "punctualActions", "punctual_actions", "results", "items"]) {
    if (Array.isArray(response?.data?.[key])) {
      return response.data[key];
    }
  }

  return [];
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

/*
  Retorna o primeiro valor realmente preenchido.

  Diferente do operador ??, ele ignora também strings vazias.
*/
function firstNonEmpty(...values) {
  for (const value of values) {
    const text = normalizeText(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function getBP(item) {
  return firstNonEmpty(
    item?.bp,
    item?.business_partner,
    item?.businessPartner,
    item?.business_partner_name,
    item?.contract_data?.business_partner,
    item?.contractData?.business_partner,
    item?.contractData?.businessPartner,
  );
}

function getCR(item) {
  return firstNonEmpty(
    item?.cr,
    item?.contract,
    item?.contract_number,
    item?.contractNumber,
    item?.contract_cr,
    item?.contractCR,
    item?.contract_data?.cr,
    item?.contract_data?.contract,
    item?.contractData?.cr,
    item?.contractData?.contract,
  );
}

function getStatus(item) {
  return firstNonEmpty(item?.status, item?.stage);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  /*
    Evita problema de timezone quando o backend retorna:
    2026-09-29

    new Date("2026-09-29") interpreta como UTC e, dependendo
    do fuso, pode mostrar o dia anterior.
  */
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split("-");

    return `${day}/${month}/${year}`;
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
   HELPERS ESPECÍFICOS DA VISÃO GERAL
============================================================ */

// Lê números brasileiros sem transformar campo vazio em zero.
function parseNumberBR(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let cleaned = String(raw).replace(/[^0-9,.-]/g, "");
  if (!cleaned || cleaned === "-") return null;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  // Um único ponto é separador decimal, compatível com NUMERIC do PostgreSQL.

  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

// A referência precisa representar o mês do indicador, não o dia em que
// o usuário digitou a informação no sistema.
function getReferenceMonth(item) {
  const raw = firstNonEmpty(
    item?.reference_month, item?.month_reference, item?.referenceMonth,
    item?.reference_date, item?.referenceDate, item?.mes_referencia,
    item?.mesReferencia, item?.competencia, item?.competence,
    item?.month_year, item?.monthYear, item?.period, item?.month,
    item?.data_referencia,
  );
  if (!raw) return "";
  const text = String(raw).trim();
  let match = text.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?/);
  if (match) {
    const month = Number(match[2]);
    return month >= 1 && month <= 12 ? `${match[1]}-${String(month).padStart(2, "0")}` : "";
  }
  match = text.match(/^(\d{1,2})[-/](\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    return month >= 1 && month <= 12 ? `${match[2]}-${String(month).padStart(2, "0")}` : "";
  }
  match = text.match(/^(\d{4})(\d{2})$/);
  if (match) {
    const month = Number(match[2]);
    return month >= 1 && month <= 12 ? `${match[1]}-${match[2]}` : "";
  }
  return "";
}

const METRICS = [
  {
    key: "turnover", title: "Turnover", unit: "%", color: "#2563eb",
    fields: ["turnover", "turnover_percent", "turnover_percentage", "turnover_rate", "turnover_pct", "turnoverPercent"],
  },
  {
    key: "absenteeism", title: "Absenteísmo", unit: "%", color: "#8b5cf6",
    fields: ["absenteeism", "absenteeism_percent", "absenteeism_percentage", "absenteeism_rate", "absenteeism_pct", "absenteeismo"],
  },
  {
    key: "hei", title: "HEI • Hora Extra Ineficiência", unit: "R$", color: "#ea580c",
    fields: ["he_inefficiency", "he_inefficiency_value", "hei", "hei_value", "overtime_inefficiency", "hora_ineficiencia", "heInefficiency"],
  },
  {
    key: "tmr", title: "TMR • Tempo Médio de Reposição", unit: "dias", color: "#0891b2",
    fields: ["replacement_days", "replacement_time", "average_replacement_days", "average_replacement_time", "tmr", "tempo_medio_reposicao", "tempo_medio_para_reposicao"],
  },
];

function getMetricValue(item, metric) {
  for (const field of metric.fields) {
    const raw = item?.[field] ?? item?.indicators?.[field] ?? item?.metrics?.[field];
    if (raw === null || raw === undefined || String(raw).trim() === "") continue;
    const number = parseNumberBR(raw);
    if (number !== null) return number;
  }
  return null;
}

function formatMetric(value, metric, compact = false) {
  if (value === null || value === undefined) return "—";
  if (metric.key === "hei") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency", currency: "BRL", notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 2,
    }).format(value);
  }
  const number = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: compact ? 0 : 2,
  }).format(value);
  return `${number}${metric.unit === "%" ? "%" : " dias"}`;
}

function monthLabel(monthKey, includeYear = false) {
  if (!monthKey) return "—";
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1))).replace(".", "");
  return includeYear ? `${label}/${String(year).slice(-2)}` : label;
}

function monthRange(latestMonth, count) {
  if (!latestMonth) return [];
  const [year, month] = latestMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - index - 1), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function normalizeKey(value) {
  return normalizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
}

function getContractStatus(contract) {
  const raw = firstNonEmpty(
    contract?.operational_status, contract?.monitoring_status, contract?.contract_status,
    contract?.tracking_status, contract?.status, contract?.stage,
  );
  const normalized = normalizeKey(raw);
  if (["em acompanhamento", "acompanhamento"].includes(normalized)) return "Em acompanhamento";
  if (["standby", "stand by"].includes(normalized)) return "Standby";
  if (["encerrado", "encerrada"].includes(normalized)) return "Encerrado";
  return raw || "Não informado";
}

function getContractNote(contract) {
  return firstNonEmpty(
    contract?.status_observation, contract?.status_notes, contract?.status_note,
    contract?.contract_observation, contract?.observation, contract?.observations,
    contract?.observacao, contract?.notes, contract?.note,
  );
}

function planStatusGroup(action) {
  const status = normalizeKey(getStatus(action));
  if (["concluido", "concluida", "finalizado", "finalizada"].includes(status)) return "completed";
  if (["em andamento", "em execucao", "executando"].includes(status)) return "executing";
  if (["a fazer", "planejado", "planejada", "pendente"].includes(status)) return "pending";
  return "undefined";
}

function isPlanAction(action) {
  const type = normalizeKey(firstNonEmpty(action?.action_type, action?.actionType));
  return type !== "pontual" && type !== "acao pontual";
}

function getRootCauses(visit) {
  const raw = visit?.root_cause ?? visit?.rootCause ?? visit?.causa_raiz
    ?? visit?.causas_raiz ?? visit?.diagnostic_root_cause;
  if (raw === null || raw === undefined) return [];
  const values = Array.isArray(raw) ? raw : String(raw).split(/[;\n]+/);
  return values.map((value) => normalizeText(value)).filter(Boolean);
}

// Gráfico SVG sem dependência adicional (Recharts / Chart.js).
function IndicatorChart({ metric, data }) {
  const valid = data.filter((point) => point.value !== null);
  if (!valid.length) {
    return <div className="overview-chart-empty">Sem dados mensais para o filtro atual.</div>;
  }

  const minObserved = Math.min(...valid.map((point) => point.value));
  const maxObserved = Math.max(...valid.map((point) => point.value));
  const extra = Math.max((maxObserved - minObserved) * 0.15, Math.abs(maxObserved) * 0.08, 1);
  const minY = Math.max(0, minObserved - extra);
  const maxY = maxObserved + extra;
  const left = 55, top = 15, width = 515, height = 130;
  const x = (index) => left + (data.length === 1 ? width / 2 : index * width / (data.length - 1));
  const y = (value) => top + height - (value - minY) * height / (maxY - minY || 1);
  // Quebra a linha nos meses sem registros, para não simular uma tendência inexistente.
  let path = "";
  data.forEach((point, index) => {
    if (point.value === null) return;
    const previous = data[index - 1];
    path += `${index === 0 || !previous || previous.value === null ? "M" : "L"}${x(index)},${y(point.value)} `;
  });

  const labelStep = data.length > 6 ? 2 : 1;
  return (
    <svg className="overview-trend-svg" viewBox="0 0 600 198" role="img"
      aria-label={`Evolução mensal de ${metric.title}`} preserveAspectRatio="xMidYMid meet">
      {[0, 1, 2].map((tick) => {
        const axisValue = maxY - (maxY - minY) * tick / 2;
        const axisY = top + height * tick / 2;
        return (
          <g key={tick}>
            <line x1={left} x2={left + width} y1={axisY} y2={axisY} stroke="currentColor" strokeOpacity="0.12" />
            <text x={left - 8} y={axisY + 4} textAnchor="end" className="overview-axis-label">
              {formatMetric(axisValue, metric, true)}
            </text>
          </g>
        );
      })}
      <path d={path} fill="none" stroke={metric.color} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
      {data.map((point, index) => point.value !== null && (
        <circle key={point.month} cx={x(index)} cy={y(point.value)} r="4.5"
          fill={metric.color} stroke="var(--overview-chart-dot-outline, #ffffff)" strokeWidth="2">
          <title>{`${monthLabel(point.month, true)}: ${formatMetric(point.value, metric)}`}</title>
        </circle>
      ))}
      {data.map((point, index) =>
        (index % labelStep === 0 || index === data.length - 1) && (
          <text key={point.month} x={x(index)} y="176" textAnchor="middle" className="overview-axis-label">
            {monthLabel(point.month, data.length > 6)}
          </text>
        ))}
    </svg>
  );
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
  const [mesesExibidos, setMesesExibidos] = useState(6);

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
     MAPA DE CONTRATOS POR ID

     Permite encontrar rapidamente o contrato através de
     contract_id.
  ========================================================== */

  const contractsById = useMemo(() => {
    const mapa = new Map();

    contracts.forEach((contract) => {
      if (contract?.id === null || contract?.id === undefined) {
        return;
      }

      mapa.set(String(contract.id), contract);
    });

    return mapa;
  }, [contracts]);

  /* ==========================================================
     MAPA DE VISITAS POR ID

     Plano de ação normalmente está relacionado à visita
     através de visit_id.
  ========================================================== */

  const visitsById = useMemo(() => {
    const mapa = new Map();

    visits.forEach((visit) => {
      if (visit?.id === null || visit?.id === undefined) {
        return;
      }

      mapa.set(String(visit.id), visit);
    });

    return mapa;
  }, [visits]);

  /* ==========================================================
     RESOLVER CR

     Tenta encontrar o CR em vários níveis:

     1. diretamente no registro;
     2. pela visita relacionada;
     3. pelo contrato da visita;
     4. pelo contract_id do próprio registro.
  ========================================================== */

  const resolveCR = useCallback(
    (item) => {
      if (!item) {
        return "";
      }

      // ======================================================
      // 1. CR DIRETAMENTE NO REGISTRO
      // ======================================================

      const directCR = getCR(item);

      if (directCR) {
        return directCR;
      }

      // ======================================================
      // 2. PROCURAR ATRAVÉS DA VISITA
      // ======================================================

      const visitId = firstNonEmpty(
        item?.visit_id,
        item?.visitId,
        item?.visit?.id,
      );

      if (visitId) {
        const visit = visitsById.get(String(visitId));

        if (visit) {
          // CR já retornado pela própria visita
          const visitCR = getCR(visit);

          if (visitCR) {
            return visitCR;
          }

          // ==================================================
          // 3. VISITA -> CONTRACT_ID -> CONTRATO
          // ==================================================

          const visitContractId = firstNonEmpty(
            visit?.contract_id,
            visit?.contractId,
            visit?.contract_data?.id,
            visit?.contractData?.id,
          );

          if (visitContractId) {
            const contract = contractsById.get(String(visitContractId));

            const contractCR = getCR(contract);

            if (contractCR) {
              return contractCR;
            }
          }
        }
      }

      // ======================================================
      // 4. CONTRACT_ID DIRETAMENTE NO REGISTRO
      // ======================================================

      const contractId = firstNonEmpty(
        item?.contract_id,
        item?.contractId,
        item?.contract_data?.id,
        item?.contractData?.id,
      );

      if (contractId) {
        const contract = contractsById.get(String(contractId));

        const contractCR = getCR(contract);

        if (contractCR) {
          return contractCR;
        }
      }

      return "";
    },
    [visitsById, contractsById],
  );

  /* ==========================================================
     RESOLVER BP

     Mesma lógica do CR, mas para Business Partner.
  ========================================================== */

  const resolveBP = useCallback(
    (item) => {
      if (!item) {
        return "";
      }

      const directBP = getBP(item);

      if (directBP) {
        return directBP;
      }

      const visitId = firstNonEmpty(
        item?.visit_id,
        item?.visitId,
        item?.visit?.id,
      );

      if (visitId) {
        const visit = visitsById.get(String(visitId));

        if (visit) {
          const visitBP = getBP(visit);

          if (visitBP) {
            return visitBP;
          }

          const visitContractId = firstNonEmpty(
            visit?.contract_id,
            visit?.contractId,
          );

          if (visitContractId) {
            const contract = contractsById.get(String(visitContractId));

            const contractBP = getBP(contract);

            if (contractBP) {
              return contractBP;
            }
          }
        }
      }

      const contractId = firstNonEmpty(
        item?.contract_id,
        item?.contractId,
      );

      if (contractId) {
        const contract = contractsById.get(String(contractId));

        const contractBP = getBP(contract);

        if (contractBP) {
          return contractBP;
        }
      }

      return "";
    },
    [visitsById, contractsById],
  );

  /* ==========================================================
     ENRIQUECER VISITAS

     Mantém o formato original, mas garante CR e BP sempre
     que for possível encontrá-los.
  ========================================================== */

  const visitsResolved = useMemo(() => {
    return visits.map((visit) => ({
      ...visit,
      cr: resolveCR(visit),
      bp: resolveBP(visit),
    }));
  }, [visits, resolveCR, resolveBP]);

  /* ==========================================================
     ENRIQUECER ACOMPANHAMENTOS
  ========================================================== */

  const trackingResolved = useMemo(() => {
    return tracking.map((item) => ({
      ...item,
      cr: resolveCR(item),
      bp: resolveBP(item),
    }));
  }, [tracking, resolveCR, resolveBP]);

  /* ==========================================================
     ENRIQUECER PLANOS DE AÇÃO

     ESTA É UMA DAS PRINCIPAIS CORREÇÕES.
  ========================================================== */

  const actionPlansResolved = useMemo(() => {
    return actionPlans.map((action) => ({
      ...action,
      cr: resolveCR(action),
      bp: resolveBP(action),
    }));
  }, [actionPlans, resolveCR, resolveBP]);

  /* ==========================================================
     ENRIQUECER AÇÕES PONTUAIS
  ========================================================== */

  const punctualActionsResolved = useMemo(() => {
    return punctualActions.map((action) => ({
      ...action,
      cr: resolveCR(action),
      bp: resolveBP(action),
    }));
  }, [punctualActions, resolveCR, resolveBP]);

  /* ==========================================================
     BASE ÚNICA DOS CONTRATOS

     /contracts é a fonte principal.

     Visitas entram como fallback.
  ========================================================== */

  const contratosBase = useMemo(() => {
    const mapa = new Map();

    // ========================================================
    // 1. CONTRATOS
    // ========================================================

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

    // ========================================================
    // 2. VISITAS COMO FALLBACK
    // ========================================================

    visitsResolved.forEach((visit) => {
      const cr = getCR(visit);

      if (!cr) {
        return;
      }

      const bp = getBP(visit);
      const existente = mapa.get(cr);

      if (!existente) {
        mapa.set(cr, {
          cr,
          bp,
          original: null,
        });

        return;
      }

      if (!existente.bp && bp) {
        mapa.set(cr, {
          ...existente,
          bp,
        });
      }
    });

    // ========================================================
    // 3. PLANOS DE AÇÃO COMO FALLBACK
    // ========================================================

    actionPlansResolved.forEach((action) => {
      const cr = getCR(action);

      if (!cr) {
        return;
      }

      const existente = mapa.get(cr);

      if (!existente) {
        mapa.set(cr, {
          cr,
          bp: getBP(action),
          original: null,
        });
      }
    });

    // ========================================================
    // RESULTADO
    // ========================================================

    return Array.from(mapa.values()).sort((a, b) =>
      a.cr.localeCompare(b.cr, "pt-BR"),
    );
  }, [contracts, visitsResolved, actionPlansResolved]);

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
  ========================================================== */

  const contratosDisponiveis = useMemo(() => {
    return contratosBase
      .filter((item) => {
        return !bpSelecionado || item.bp === bpSelecionado;
      })
      .map((item) => item.cr);
  }, [contratosBase, bpSelecionado]);

  /* ==========================================================
     GARANTE QUE CR NÃO FIQUE INVÁLIDO AO TROCAR BP
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

      return getBP(item) === bpSelecionado;
    },
    [bpSelecionado, contratoSelecionado, contratosBase],
  );

  /* ==========================================================
     DADOS FILTRADOS
  ========================================================== */

  const filteredVisits = useMemo(
    () => visitsResolved.filter(matchesFilter),
    [visitsResolved, matchesFilter],
  );

  const filteredTracking = useMemo(
    () => trackingResolved.filter(matchesFilter),
    [trackingResolved, matchesFilter],
  );

  const filteredActionPlans = useMemo(
    () => actionPlansResolved.filter(matchesFilter),
    [actionPlansResolved, matchesFilter],
  );

  const filteredPunctualActions = useMemo(
    () => punctualActionsResolved.filter(matchesFilter),
    [punctualActionsResolved, matchesFilter],
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

  // As ações pontuais não devem entrar no consolidado dos planos.
  const filteredOnlyPlans = useMemo(
    () => filteredActionPlans.filter(isPlanAction),
    [filteredActionPlans],
  );

  const summary = useMemo(() => ({
    contracts: filteredContracts.length,
    visits: filteredVisits.length,
    actionPlans: filteredOnlyPlans.length,
  }), [filteredContracts, filteredVisits, filteredOnlyPlans]);

  const planSummary = useMemo(() => {
    const counts = { completed: 0, executing: 0, pending: 0, undefined: 0 };
    filteredOnlyPlans.forEach((action) => { counts[planStatusGroup(action)] += 1; });
    return counts;
  }, [filteredOnlyPlans]);

  const statusSummary = useMemo(() => {
    const counts = { "Em acompanhamento": 0, Standby: 0, Encerrado: 0, other: 0 };
    filteredContracts.forEach((item) => {
      const status = getContractStatus(item.original);
      if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
      else counts.other += 1;
    });
    return counts;
  }, [filteredContracts]);

  const contratoAtual = useMemo(() =>
    contratoSelecionado
      ? filteredContracts.find((item) => item.cr === contratoSelecionado) || null
      : null,
  [filteredContracts, contratoSelecionado]);

  // Última classificação por CR: uma visita não deve contar o mesmo contrato várias vezes.
  const healthSummary = useMemo(() => {
    const latest = new Map();
    filteredVisits.forEach((visit, index) => {
      const cr = getCR(visit);
      const category = normalizeKey(visit?.classification);
      if (!cr || !["referencia", "estavel", "alerta", "critico"].includes(category)) return;
      const timestamp = Date.parse(visit?.visit_date || visit?.created_at || "") || 0;
      const existing = latest.get(cr);
      if (!existing || timestamp > existing.timestamp ||
          (timestamp === existing.timestamp && index > existing.index)) {
        latest.set(cr, { category, timestamp, index });
      }
    });
    const counts = { referencia: 0, estavel: 0, alerta: 0, critico: 0 };
    latest.forEach((record) => { counts[record.category] += 1; });
    return { counts, total: latest.size };
  }, [filteredVisits]);

  const rootCauseData = useMemo(() => {
    const latestWithCause = new Map();
    filteredVisits.forEach((visit, index) => {
      const cr = getCR(visit);
      const labels = getRootCauses(visit);
      if (!cr || labels.length === 0) return;
      const timestamp = Date.parse(visit?.visit_date || visit?.created_at || "") || 0;
      const previous = latestWithCause.get(cr);
      if (!previous || timestamp > previous.timestamp ||
          (timestamp === previous.timestamp && index > previous.index)) {
        latestWithCause.set(cr, { labels, timestamp, index });
      }
    });
    const causes = new Map();
    latestWithCause.forEach(({ labels }) => {
      const unique = new Map();
      labels.forEach((label) => {
        const key = normalizeKey(label);
        if (key) unique.set(key, label);
      });
      unique.forEach((label, key) => {
        if (!causes.has(key)) causes.set(key, { name: label, count: 0 });
        causes.get(key).count += 1;
      });
    });
    return [...causes.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 5);
  }, [filteredVisits]);

  // Usa o último lançamento de cada CR em cada competência para não
  // duplicar indicadores se houver várias gravações no mesmo mês.
  const monthlyTracking = useMemo(() => {
    const rows = new Map();
    filteredTracking.forEach((item, index) => {
      const cr = getCR(item);
      const month = getReferenceMonth(item);
      if (!cr || !month) return;
      const key = `${cr}::${month}`;
      const updated = Date.parse(item?.updated_at || item?.created_at || "") || 0;
      const existing = rows.get(key);
      if (!existing || updated > existing.updated ||
        (updated === existing.updated && index > existing.index)) {
        rows.set(key, { cr, month, item, updated, index });
      }
    });
    return Array.from(rows.values());
  }, [filteredTracking]);

  const months = useMemo(() => {
    const latest = monthlyTracking.map((row) => row.month).sort().at(-1);
    return monthRange(latest, mesesExibidos);
  }, [monthlyTracking, mesesExibidos]);

  const indicatorSeries = useMemo(() => METRICS.map((metric) => {
    const data = months.map((month) => {
      const values = monthlyTracking.filter((row) => row.month === month)
        .map((row) => getMetricValue(row.item, metric))
        .filter((value) => value !== null);
      return {
        month,
        value: values.length
          ? (metric.key === "hei"
            ? values.reduce((sum, value) => sum + value, 0)
            : values.reduce((sum, value) => sum + value, 0) / values.length)
          : null,
      };
    });
    return { ...metric, data };
  }), [months, monthlyTracking]);

  const timeline = useMemo(() => {
    const events = [];
    filteredVisits.forEach((visit) => {
      if (!visit.visit_date) return;
      events.push({
        id: `visit-${visit.id}`, type: "Visita", cr: getCR(visit),
        date: visit.visit_date, status: visit.classification || "Realizada",
      });
    });
    filteredOnlyPlans.forEach((action) => {
      if (!action.due_date) return;
      events.push({
        id: `plan-${action.id}`, type: "Plano de ação", cr: getCR(action),
        date: action.due_date, status: getStatus(action) || "Sem status",
      });
    });
    filteredPunctualActions.forEach((action) => {
      const date = action.completion_date || action.action_date || action.due_date;
      if (!date) return;
      events.push({
        id: `punctual-${action.id}`, type: "Ação pontual", cr: getCR(action),
        date, status: getStatus(action) || "Sem status",
      });
    });
    return events.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  }, [filteredVisits, filteredOnlyPlans, filteredPunctualActions]);

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
              onChange={(event) =>
                setContratoSelecionado(event.target.value)
              }
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
        <span
          className={loading ? "status-dot loading" : "status-dot"}
        />

        <span>
          {loading ? "Atualizando dados..." : "Dados atualizados"}
        </span>

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
        <main className="dashboard-content overview-content">
          {/* VISÃO EXECUTIVA: somente contagens gerais, sem score médio ou eNPS. */}
          <section className="overview-top-summary" aria-label="Resumo da carteira">
            <article className="overview-number-card">
              <span>Contratos na carteira</span>
              <strong>{loading && !contracts.length ? "—" : formatNumber(summary.contracts)}</strong>
              <small>De acordo com os filtros selecionados</small>
            </article>
            <article className="overview-number-card">
              <span>Visitas registradas</span>
              <strong>{loading && !visits.length ? "—" : formatNumber(summary.visits)}</strong>
              <small>Histórico de atuação registrado</small>
            </article>
          </section>

          {/* STATUS E OBSERVAÇÃO: cadastrados/alterados na aba CONTRATO. */}
          <section className="overview-context-grid">
          <article className="panel overview-contract-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">CONTEXTO DO CONTRATO</span>
                <h2>{contratoAtual ? `Situação • CR ${contratoAtual.cr}` : "Situação da carteira"}</h2>
              </div>
              <button className="overview-text-button" type="button"
                onClick={() => setActiveTab("contract")}>Gerenciar contratos</button>
            </div>
            {contratoAtual ? (
              <div className="overview-selected-contract">
                <div>
                  <span className="overview-small-label">Status atual</span>
                  <span className={`overview-status-tag overview-status-${normalizeKey(getContractStatus(contratoAtual.original)).replace(/\s+/g, "-")}`}>
                    {getContractStatus(contratoAtual.original)}
                  </span>
                </div>
                <div className="overview-contract-note">
                  <span className="overview-small-label">Observações</span>
                  <p>{getContractNote(contratoAtual.original) || "Nenhuma observação registrada para este contrato."}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="overview-status-grid">
                  {[
                    ["Em acompanhamento", statusSummary["Em acompanhamento"], "active"],
                    ["Standby", statusSummary.Standby, "paused"],
                    ["Encerrado", statusSummary.Encerrado, "closed"],
                  ].map(([label, count, style]) => (
                    <div className={`overview-status-stat ${style}`} key={label}>
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
                {statusSummary.other > 0 && (
                  <p className="overview-footnote">
                    {statusSummary.other} contrato(s) com status diferente dos três previstos ou não informado.
                  </p>
                )}
                <p className="overview-footnote">Selecione um CR para visualizar o status e a observação informados na aba Contrato.</p>
              </>
            )}
          </article>
          <article className="panel overview-health-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">DIAGNÓSTICO</span>
                <h2>Saúde dos contratos</h2>
              </div>
              <span className="panel-total">{healthSummary.total} avaliados</span>
            </div>
            <p className="overview-health-description">Classificação da última visita registrada em cada contrato.</p>
            <div className="overview-health-list">
              {[
                ["Crítico", "critico", "critical"],
                ["Alerta", "alerta", "alert"],
                ["Estável", "estavel", "stable"],
                ["Referência", "referencia", "reference"],
              ].map(([label, key, style]) => (
                <div className="overview-health-row" key={key}>
                  <span className={`overview-health-dot ${style}`} />
                  <span>{label}</span>
                  <div className="overview-health-track">
                    <div className={`overview-health-fill ${style}`}
                      style={{ width: `${healthSummary.total ? (healthSummary.counts[key] / healthSummary.total) * 100 : 0}%` }} />
                  </div>
                  <strong>{healthSummary.counts[key]}</strong>
                </div>
              ))}
            </div>
            {healthSummary.total === 0 && <p className="overview-footnote">Nenhuma visita com classificação disponível.</p>}
          </article>
          </section>

          {/* EVOLUÇÃO MENSAL – quatro gráficos separados. */}
          <section className="overview-section" aria-label="Evolução dos indicadores">
            <div className="overview-section-heading">
              <div>
                <span className="panel-kicker">ACOMPANHAMENTO MENSAL</span>
                <h2>Evolução dos indicadores</h2>
                <p>Percentuais e TMR: média dos CRs com registro no mês. HEI: soma em R$.</p>
              </div>
              <div className="overview-period-control" aria-label="Período dos gráficos">
                <button type="button" className={mesesExibidos === 6 ? "selected" : ""}
                  onClick={() => setMesesExibidos(6)} aria-pressed={mesesExibidos === 6}>6 meses</button>
                <button type="button" className={mesesExibidos === 12 ? "selected" : ""}
                  onClick={() => setMesesExibidos(12)} aria-pressed={mesesExibidos === 12}>12 meses</button>
              </div>
            </div>
            <div className="overview-charts-grid">
              {indicatorSeries.map((metric) => {
                const last = [...metric.data].reverse().find((point) => point.value !== null);
                return (
                  <article className="panel overview-chart-card" key={metric.key}
                    style={{ "--overview-indicator-color": metric.color }}>
                    <div className="overview-chart-header">
                      <div>
                        <span className="overview-metric-name">{metric.title}</span>
                        <strong>{last ? formatMetric(last.value, metric) : "Sem registro"}</strong>
                      </div>
                      <small>{last ? `Último registro: ${monthLabel(last.month, true)}` : "Sem competência válida"}</small>
                    </div>
                    <IndicatorChart metric={metric} data={metric.data} />
                  </article>
                );
              })}
            </div>
            <p className="overview-footnote">Meses sem lançamento ficam sem ponto no gráfico; não são tratados como zero. O período termina na última competência disponível.</p>
          </section>

          {/* CAUSAS-RAIZ E CONSOLIDADO DOS PLANOS. */}
          <section className="overview-lower-grid">
            <article className="panel overview-root-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">DIAGNÓSTICO</span>
                  <h2>Principais causas-raiz</h2>
                </div>
              </div>
              {rootCauseData.length === 0 ? (
                <div className="empty-state">
                  <strong>Sem causas-raiz registradas</strong>
                  <span>Preencha a causa-raiz nas visitas para acompanhar os riscos prioritários.</span>
                </div>
              ) : (
                <div className="overview-causes">
                  {rootCauseData.map((item, index) => (
                    <div className="overview-cause-item" key={item.name}>
                      <div className="overview-cause-line">
                        <span title={item.name}>{index + 1}. {item.name}</span>
                        <strong>{item.count} {item.count === 1 ? "contrato" : "contratos"}</strong>
                      </div>
                      <div className="overview-cause-track">
                        <div style={{ width: `${(item.count / rootCauseData[0].count) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="overview-footnote">Cada contrato contribui com sua última causa-raiz registrada, sem duplicar visitas anteriores.</p>
                </div>
              )}
            </article>
            <article className="panel overview-plan-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">PLANO DE AÇÃO</span>
                  <h2>Status consolidado</h2>
                </div>
                <span className="panel-total">{summary.actionPlans} planos</span>
              </div>
              <div className="overview-plan-grid">
                <div className="overview-plan-stat complete"><span>Concluídos</span><strong>{planSummary.completed}</strong></div>
                <div className="overview-plan-stat execution"><span>Em execução</span><strong>{planSummary.executing}</strong></div>
                <div className="overview-plan-stat pending"><span>Pendentes</span><strong>{planSummary.pending}</strong></div>
              </div>
              {planSummary.undefined > 0 && (
                <p className="overview-footnote">{planSummary.undefined} plano(s) sem status reconhecido.</p>
              )}
              <div className="overview-plan-total">
                <span>Total de planos no filtro atual</span>
                <strong>{summary.actionPlans}</strong>
              </div>
              <button className="overview-text-button" type="button"
                onClick={() => setActiveTab("actions")}>Ver detalhes na aba Plano de Ação</button>
            </article>
          </section>

          {/* O histórico é o último bloco: nenhum painel redundante abaixo dele. */}
          <section className="panel timeline-panel overview-timeline-panel">
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
    DASHBOARD DE VISITAS
====================================================== */}

{activeTab === "bi" && (
  <Dashboard {...moduleProps} />
)}

      {/* ======================================================
          CADASTRO DE CONTRATO
      ====================================================== */}

      {activeTab === "contract" && (
        <Contrato onReload={carregar} />
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
        <Acompanhamento
          {...moduleProps}
          onEditVisit={editarVisita}
        />
      )}

      {/* ======================================================
          PLANO DE AÇÃO
      ====================================================== */}

      {activeTab === "actions" && (
        <PlanodeAcao {...moduleProps} />
      )}

      {/* ======================================================
          AÇÃO PONTUAL
      ====================================================== */}

      {activeTab === "punctual" && (
        <AcaoPontual {...moduleProps} />
      )}
    </div>
  );
}
