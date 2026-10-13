import React, { useMemo, useState } from "react";
import "./dashboard.css";

import {
  downloadVisitsDashboardPdf,
} from "./visitsDashboardPdf.jsx";

/* ============================================================
   HELPERS
============================================================ */

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = normalizeText(value);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatNumber(
  value,
  decimals = 0,
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    },
  ).format(toNumber(value));
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const raw =
    String(value).slice(0, 10);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      raw,
    )
  ) {
    const [
      year,
      month,
      day,
    ] = raw.split("-");

    return `${day}/${month}/${year}`;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "pt-BR",
  );
}

function average(
  items,
  field,
) {
  if (!Array.isArray(items)) {
    return 0;
  }

  const values = items
    .map((item) =>
      Number(item?.[field]),
    )
    .filter((value) =>
      Number.isFinite(value),
    );

  if (!values.length) {
    return 0;
  }

  return (
    values.reduce(
      (total, value) =>
        total + value,
      0,
    ) / values.length
  );
}

function sum(
  items,
  field,
) {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce(
    (total, item) =>
      total +
      toNumber(
        item?.[field],
      ),
    0,
  );
}

function clampScore(value) {
  return Math.min(
    100,
    Math.max(
      0,
      toNumber(value),
    ),
  );
}

/* ============================================================
   CONTRATO / BP
============================================================ */

function getContract(visit) {
  return firstNonEmpty(
    visit?.cr,
    visit?.contract,
    visit?.contract_number,
    visit?.contractNumber,
    visit?.client,
    "Contrato não informado",
  );
}

function getBP(visit) {
  return firstNonEmpty(
    visit?.bp,
    visit?.business_partner,
    visit?.businessPartner,
    "Não informado",
  );
}

/* ============================================================
   STATUS VISUAL
============================================================ */

function getClassificationClass(
  classification,
) {
  switch (
    normalizeText(
      classification,
    )
  ) {
    case "Referência":
      return "reference";

    case "Estável":
      return "stable";

    case "Alerta":
      return "alert";

    case "Crítico":
      return "critical";

    default:
      return "neutral";
  }
}

function getScoreClass(score) {
  const value =
    toNumber(score);

  if (value >= 80) {
    return "good";
  }

  if (value >= 60) {
    return "attention";
  }

  return "critical";
}

/* ============================================================
   ROOT CAUSE
============================================================ */

function normalizeRootCauses(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        normalizeText(item),
      )
      .filter(Boolean);
  }

  if (
    typeof value === "string"
  ) {
    const trimmed =
      value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed =
        JSON.parse(trimmed);

      if (
        Array.isArray(parsed)
      ) {
        return parsed
          .map((item) =>
            normalizeText(
              item,
            ),
          )
          .filter(Boolean);
      }

      return [
        normalizeText(
          parsed,
        ),
      ].filter(Boolean);
    } catch {
      return [trimmed];
    }
  }

  return [];
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function Dashboard({
  visits = [],
  bpSelecionado = "",
  contratoSelecionado = "",
}) {
  /* ==========================================================
     STATES
  ========================================================== */

  const [
    exportingPdf,
    setExportingPdf,
  ] = useState(false);

  const [
    selectedVisitId,
    setSelectedVisitId,
  ] = useState(null);

  /* ==========================================================
     VISITAS
  ========================================================== */

  const normalizedVisits =
    useMemo(() => {
      if (
        !Array.isArray(visits)
      ) {
        return [];
      }

      return [...visits].sort(
        (a, b) => {
          const dateA =
            new Date(
              a?.visit_date ||
                0,
            );

          const dateB =
            new Date(
              b?.visit_date ||
                0,
            );

          return (
            dateB -
            dateA
          );
        },
      );
    }, [visits]);

  /* ==========================================================
     RESUMO
  ========================================================== */

  const summary =
    useMemo(() => {
      const total =
        normalizedVisits.length;

      const contracts =
        new Set(
          normalizedVisits
            .map((visit) =>
              firstNonEmpty(
                visit?.contract_id,
                visit?.contract,
                visit?.cr,
              ),
            )
            .filter(Boolean),
        ).size;

      const employeesApproached =
        sum(
          normalizedVisits,
          "employees_approached",
        );

      const avgFinalScore =
        average(
          normalizedVisits,
          "final_score",
        );

      const avgIndicatorScore =
        average(
          normalizedVisits,
          "indicator_score",
        );

      const avgPillarScore =
        average(
          normalizedVisits,
          "pillar_score",
        );

      const avgENPS =
        average(
          normalizedVisits,
          "enps",
        );

      const critical =
        normalizedVisits.filter(
          (visit) =>
            visit?.classification ===
            "Crítico",
        ).length;

      const alert =
        normalizedVisits.filter(
          (visit) =>
            visit?.classification ===
            "Alerta",
        ).length;

      const stable =
        normalizedVisits.filter(
          (visit) =>
            visit?.classification ===
            "Estável",
        ).length;

      const reference =
        normalizedVisits.filter(
          (visit) =>
            visit?.classification ===
            "Referência",
        ).length;

      return {
        total,
        contracts,

        employeesApproached,

        avgFinalScore,
        avgIndicatorScore,
        avgPillarScore,
        avgENPS,

        critical,
        alert,
        stable,
        reference,
      };
    }, [normalizedVisits]);

  /* ==========================================================
     PILARES
  ========================================================== */

  const pillars =
    useMemo(() => {
      return [
        {
          key: "leadership",
          label:
            "Liderança",

          value:
            average(
              normalizedVisits,
              "leadership_score",
            ),
        },

        {
          key: "climate",
          label:
            "Clima",

          value:
            average(
              normalizedVisits,
              "climate_score",
            ),
        },

        {
          key: "structure",
          label:
            "Estrutura",

          value:
            average(
              normalizedVisits,
              "structure_score",
            ),
        },

        {
          key: "customer",
          label:
            "Cliente",

          value:
            average(
              normalizedVisits,
              "customer_score",
            ),
        },
      ];
    }, [normalizedVisits]);

  /* ==========================================================
     COMPOSIÇÃO DA PONTUAÇÃO
  ========================================================== */

  const scoreComposition =
    useMemo(() => {
      return [
        {
          key: "indicator",
          label:
            "Score de Indicadores",

          description:
            "Resultado consolidado dos indicadores operacionais.",

          value:
            summary.avgIndicatorScore,
        },

        {
          key: "pillar",
          label:
            "Score dos Pilares",

          description:
            "Resultado médio das avaliações qualitativas.",

          value:
            summary.avgPillarScore,
        },

        {
          key: "final",
          label:
            "Score Final",

          description:
            "Resultado consolidado do diagnóstico da visita.",

          value:
            summary.avgFinalScore,
        },
      ];
    }, [summary]);

  /* ==========================================================
     INDICADORES OPERACIONAIS
  ========================================================== */

  const operationalIndicators =
    useMemo(() => {
      return [
        {
          key: "turnover",
          label:
            "Turnover médio",

          value:
            average(
              normalizedVisits,
              "turnover",
            ),

          decimals: 1,
          suffix: "%",
        },

        {
          key: "absenteeism",
          label:
            "Absenteísmo médio",

          value:
            average(
              normalizedVisits,
              "absenteeism",
            ),

          decimals: 1,
          suffix: "%",
        },

        {
          key: "he",
          label:
            "Ineficiência HE",

          value:
            average(
              normalizedVisits,
              "he_inefficiency",
            ),

          decimals: 1,
          suffix: "%",
        },

        {
          key: "openPositions",
          label:
            "Vagas abertas",

          value:
            sum(
              normalizedVisits,
              "open_positions",
            ),

          decimals: 0,
          suffix: "",
        },

        {
          key: "replacement",
          label:
            "Dias de reposição",

          value:
            average(
              normalizedVisits,
              "replacement_days",
            ),

          decimals: 1,
          suffix: " dias",
        },

        {
          key: "laborActions",
          label:
            "Ações trabalhistas",

          value:
            sum(
              normalizedVisits,
              "labor_actions",
            ),

          decimals: 0,
          suffix: "",
        },

        {
          key: "warnings",
          label:
            "Advertências",

          value:
            sum(
              normalizedVisits,
              "warnings",
            ),

          decimals: 0,
          suffix: "",
        },

        {
          key: "enps",
          label:
            "eNPS médio",

          value:
            summary.avgENPS,

          decimals: 1,
          suffix: "",
        },
      ];
    }, [
      normalizedVisits,
      summary.avgENPS,
    ]);

  /* ==========================================================
     CLASSIFICAÇÕES
  ========================================================== */

  const classifications =
    useMemo(() => {
      const total =
        normalizedVisits.length ||
        1;

      return [
        {
          label:
            "Referência",

          value:
            summary.reference,

          className:
            "reference",
        },

        {
          label:
            "Estável",

          value:
            summary.stable,

          className:
            "stable",
        },

        {
          label:
            "Alerta",

          value:
            summary.alert,

          className:
            "alert",
        },

        {
          label:
            "Crítico",

          value:
            summary.critical,

          className:
            "critical",
        },
      ].map((item) => ({
        ...item,

        percentage:
          (item.value /
            total) *
          100,
      }));
    }, [
      normalizedVisits,
      summary.reference,
      summary.stable,
      summary.alert,
      summary.critical,
    ]);

  /* ==========================================================
     CAUSAS RAIZ
  ========================================================== */

  const rootCauses =
    useMemo(() => {
      const counter =
        new Map();

      normalizedVisits.forEach(
        (visit) => {
          const causes =
            normalizeRootCauses(
              visit?.root_cause,
            );

          causes.forEach(
            (cause) => {
              counter.set(
                cause,

                (
                  counter.get(
                    cause,
                  ) || 0
                ) + 1,
              );
            },
          );
        },
      );

      return Array.from(
        counter.entries(),
      )
        .map(
          ([
            label,
            count,
          ]) => ({
            label,
            count,
          }),
        )
        .sort(
          (a, b) =>
            b.count -
            a.count,
        )
        .slice(0, 8);
    }, [normalizedVisits]);

  /* ==========================================================
     EXPORTAÇÃO
  ========================================================== */

  async function handleExportPdf() {
    if (
      !normalizedVisits.length
    ) {
      alert(
        "Não existem visitas no filtro atual para exportar.",
      );

      return;
    }

    try {
      setExportingPdf(true);

      await downloadVisitsDashboardPdf({
        visits:
          normalizedVisits,

        summary,

        pillars,

        scoreComposition,

        operationalIndicators,

        classifications,

        rootCauses,

        bpSelecionado,

        contratoSelecionado,
      });
    } catch (error) {
      console.error(
        "[VISITS PDF] Erro ao gerar relatório:",
        error,
      );

      alert(
        error?.message ||
          "Não foi possível gerar o relatório em PDF.",
      );
    } finally {
      setExportingPdf(false);
    }
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="visits-dashboard">
      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="visits-hero">
        <div className="visits-hero-copy">
          <span className="visits-eyebrow">
            RADAR 360
          </span>

          <h1>
            Indicadores de Visitas
          </h1>

          <p>
            Consolidação das visitas,
            pontuações, riscos e principais
            pontos observados nos contratos.
          </p>
        </div>

        <div className="visits-hero-actions">
          <div className="visits-current-view">
            <span>
              Visão atual
            </span>

            <strong>
              {contratoSelecionado ||
                bpSelecionado ||
                "Todos os contratos"}
            </strong>

            <small>
              {summary.total} visita
              {summary.total !== 1
                ? "s"
                : ""}{" "}
              encontrada
              {summary.total !== 1
                ? "s"
                : ""}
            </small>
          </div>

          <button
            type="button"
            className="visits-export-button"
            onClick={
              handleExportPdf
            }
            disabled={
              exportingPdf ||
              !normalizedVisits.length
            }
          >
            <span className="visits-export-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M6 2.75h8l4 4V21.25H6V2.75Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />

                <path
                  d="M14 2.75v4h4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />

                <path
                  d="M12 10v6m0 0-2.5-2.5M12 16l2.5-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span className="visits-export-copy">
              <strong>
                {exportingPdf
                  ? "Gerando PDF..."
                  : "Exportar relatório"}
              </strong>

              <small>
                PDF do filtro atual
              </small>
            </span>
          </button>
        </div>
      </section>

      {/* ======================================================
          KPIs
      ====================================================== */}

      <section className="visits-kpi-grid">
        <article className="visit-kpi-card">
          <span>
            Visitas realizadas
          </span>

          <strong>
            {summary.total}
          </strong>

          <small>
            Registros no filtro atual
          </small>
        </article>

        <article className="visit-kpi-card">
          <span>
            Contratos visitados
          </span>

          <strong>
            {summary.contracts}
          </strong>

          <small>
            Cobertura registrada
          </small>
        </article>

        <article className="visit-kpi-card">
          <span>
            Colaboradores abordados
          </span>

          <strong>
            {formatNumber(
              summary.employeesApproached,
            )}
          </strong>

          <small>
            Total de colaboradores
          </small>
        </article>

        <article
          className={`visit-kpi-card ${getScoreClass(
            summary.avgFinalScore,
          )}`}
        >
          <span>
            Score médio
          </span>

          <strong>
            {formatNumber(
              summary.avgFinalScore,
              1,
            )}
          </strong>

          <small>
            Diagnóstico consolidado
          </small>
        </article>

        <article className="visit-kpi-card">
          <span>
            eNPS médio
          </span>

          <strong>
            {formatNumber(
              summary.avgENPS,
              1,
            )}
          </strong>

          <small>
            Percepção dos colaboradores
          </small>
        </article>

        <article className="visit-kpi-card critical">
          <span>
            Visitas críticas
          </span>

          <strong>
            {summary.critical}
          </strong>

          <small>
            Exigem maior atenção
          </small>
        </article>
      </section>

      {/* ======================================================
          COMPOSIÇÃO DO SCORE
      ====================================================== */}

      <section className="visits-panel">
        <div className="visits-panel-header">
          <div>
            <span className="panel-eyebrow">
              DIAGNÓSTICO
            </span>

            <h2>
              Composição da pontuação
            </h2>

            <p>
              Visão consolidada da pontuação
              calculada nas visitas realizadas.
            </p>
          </div>
        </div>

        <div className="score-composition-grid">
          {scoreComposition.map(
            (item) => {
              const score =
                clampScore(
                  item.value,
                );

              return (
                <article
                  className={`score-composition-card ${getScoreClass(
                    score,
                  )}`}
                  key={item.key}
                >
                  <div className="score-composition-header">
                    <div>
                      <span>
                        {item.label}
                      </span>

                      <p>
                        {item.description}
                      </p>
                    </div>

                    <strong>
                      {formatNumber(
                        item.value,
                        1,
                      )}
                    </strong>
                  </div>

                  <div className="score-composition-track">
                    <div
                      className={`score-composition-fill ${getScoreClass(
                        score,
                      )}`}
                      style={{
                        width: `${score}%`,
                      }}
                    />
                  </div>
                </article>
              );
            },
          )}
        </div>
      </section>

      {/* ======================================================
          PONTUAÇÃO DOS PILARES + CLASSIFICAÇÃO
      ====================================================== */}

      <section className="visits-main-grid">
        {/* PILARES */}

        <article className="visits-panel">
          <div className="visits-panel-header">
            <div>
              <span className="panel-eyebrow">
                PONTUAÇÃO
              </span>

              <h2>
                Pontuação média dos pilares
              </h2>

              <p>
                Resultado médio dos pontos
                avaliados nas visitas.
              </p>
            </div>
          </div>

          <div className="pillar-list">
            {pillars.map(
              (pillar) => {
                const score =
                  clampScore(
                    pillar.value,
                  );

                return (
                  <div
                    className="pillar-row"
                    key={
                      pillar.key
                    }
                  >
                    <div className="pillar-info">
                      <span>
                        {pillar.label}
                      </span>

                      <strong>
                        {formatNumber(
                          pillar.value,
                          1,
                        )}
                      </strong>
                    </div>

                    <div className="pillar-track">
                      <div
                        className={`pillar-fill ${getScoreClass(
                          score,
                        )}`}
                        style={{
                          width: `${score}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </article>

        {/* CLASSIFICAÇÃO */}

        <article className="visits-panel">
          <div className="visits-panel-header">
            <div>
              <span className="panel-eyebrow">
                RISCO
              </span>

              <h2>
                Classificação das visitas
              </h2>

              <p>
                Distribuição das classificações
                obtidas no diagnóstico.
              </p>
            </div>
          </div>

          <div className="classification-dashboard">
            {classifications.map(
              (item) => (
                <div
                  className="classification-dashboard-row"
                  key={
                    item.label
                  }
                >
                  <div className="classification-title">
                    <span
                      className={`classification-dot ${item.className}`}
                    />

                    <span>
                      {item.label}
                    </span>
                  </div>

                  <div className="classification-track">
                    <div
                      className={`classification-fill ${item.className}`}
                      style={{
                        width: `${item.percentage}%`,
                      }}
                    />
                  </div>

                  <strong>
                    {item.value}
                  </strong>

                  <small>
                    {Math.round(
                      item.percentage,
                    )}
                    %
                  </small>
                </div>
              ),
            )}
          </div>
        </article>
      </section>

      {/* ======================================================
          INDICADORES OPERACIONAIS
      ====================================================== */}

      <section className="visits-panel">
        <div className="visits-panel-header">
          <div>
            <span className="panel-eyebrow">
              INDICADORES
            </span>

            <h2>
              Pontos acompanhados nas visitas
            </h2>

            <p>
              Consolidado dos principais indicadores
              operacionais informados durante as visitas.
            </p>
          </div>
        </div>

        <div className="operational-grid">
          {operationalIndicators.map(
            (indicator) => (
              <article
                className="operational-card"
                key={
                  indicator.key
                }
              >
                <span>
                  {indicator.label}
                </span>

                <strong>
                  {formatNumber(
                    indicator.value,
                    indicator.decimals,
                  )}
                  {indicator.suffix}
                </strong>
              </article>
            ),
          )}
        </div>
      </section>

      {/* ======================================================
          CAUSAS RAIZ
      ====================================================== */}

      <section className="visits-panel">
        <div className="visits-panel-header">
          <div>
            <span className="panel-eyebrow">
              RECORRÊNCIA
            </span>

            <h2>
              Principais causas raiz
            </h2>

            <p>
              Pontos de atenção mais recorrentes
              identificados nas visitas.
            </p>
          </div>
        </div>

        {!rootCauses.length ? (
          <div className="visits-empty">
            Nenhuma causa raiz informada
            para o filtro atual.
          </div>
        ) : (
          <div className="root-cause-grid">
            {rootCauses.map(
              (
                cause,
                index,
              ) => (
                <article
                  className="root-cause-card"
                  key={
                    cause.label
                  }
                >
                  <span className="root-cause-index">
                    {String(
                      index + 1,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </span>

                  <div>
                    <strong>
                      {cause.label}
                    </strong>

                    <small>
                      {cause.count} ocorrência
                      {cause.count !== 1
                        ? "s"
                        : ""}
                    </small>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      {/* ======================================================
          HISTÓRICO
      ====================================================== */}

      <section className="visits-panel">
        <div className="visits-panel-header">
          <div>
            <span className="panel-eyebrow">
              HISTÓRICO
            </span>

            <h2>
              Visitas realizadas
            </h2>

            <p>
              Clique em uma visita para visualizar
              as pontuações e análises registradas.
            </p>
          </div>

          <span className="visits-count">
            {normalizedVisits.length}
          </span>
        </div>

        {!normalizedVisits.length ? (
          <div className="visits-empty">
            Nenhuma visita encontrada
            para o filtro atual.
          </div>
        ) : (
          <div className="visit-list">
            {normalizedVisits.map(
              (visit) => {
                const isOpen =
                  String(
                    selectedVisitId,
                  ) ===
                  String(
                    visit.id,
                  );

                const rootCausesVisit =
                  normalizeRootCauses(
                    visit.root_cause,
                  );

                return (
                  <article
                    className={`visit-item ${
                      isOpen
                        ? "open"
                        : ""
                    }`}
                    key={
                      visit.id
                    }
                  >
                    {/* HEADER */}

                    <button
                      type="button"
                      className="visit-item-header"
                      onClick={() =>
                        setSelectedVisitId(
                          isOpen
                            ? null
                            : visit.id,
                        )
                      }
                    >
                      <div className="visit-main">
                        <span className="visit-date">
                          {formatDate(
                            visit.visit_date,
                          )}
                        </span>

                        <div>
                          <strong>
                            {getContract(
                              visit,
                            )}
                          </strong>

                          <small>
                            {firstNonEmpty(
                              visit.client,
                              visit.unit,
                              getBP(
                                visit,
                              ),
                            )}
                          </small>
                        </div>
                      </div>

                      <div className="visit-item-summary">
                        <div className="visit-score">
                          <span>
                            Score
                          </span>

                          <strong>
                            {formatNumber(
                              visit.final_score,
                              1,
                            )}
                          </strong>
                        </div>

                        <span
                          className={`visit-classification ${getClassificationClass(
                            visit.classification,
                          )}`}
                        >
                          {visit.classification ||
                            "Sem classificação"}
                        </span>

                        <span
                          className={`visit-chevron ${
                            isOpen
                              ? "open"
                              : ""
                          }`}
                        >
                          ↓
                        </span>
                      </div>
                    </button>

                    {/* DETALHES */}

                    {isOpen && (
                      <div className="visit-details">
                        {/* SCORE */}

                        <div className="visit-detail-grid">
                          <div className="visit-detail-card">
                            <span>
                              Score Final
                            </span>

                            <strong>
                              {formatNumber(
                                visit.final_score,
                                1,
                              )}
                            </strong>
                          </div>

                          <div className="visit-detail-card">
                            <span>
                              Indicadores
                            </span>

                            <strong>
                              {formatNumber(
                                visit.indicator_score,
                                1,
                              )}
                            </strong>
                          </div>

                          <div className="visit-detail-card">
                            <span>
                              Pilares
                            </span>

                            <strong>
                              {formatNumber(
                                visit.pillar_score,
                                1,
                              )}
                            </strong>
                          </div>

                          <div className="visit-detail-card">
                            <span>
                              Liderança
                            </span>

                            <strong>
                              {formatNumber(
                                visit.leadership_score,
                                1,
                              )}
                            </strong>
                          </div>

                          <div className="visit-detail-card">
                            <span>
                              Clima
                            </span>

                            <strong>
                              {formatNumber(
                                visit.climate_score,
                                1,
                              )}
                            </strong>
                          </div>

                          <div className="visit-detail-card">
                            <span>
                              Estrutura
                            </span>

                            <strong>
                              {formatNumber(
                                visit.structure_score,
                                1,
                              )}
                            </strong>
                          </div>

                          <div className="visit-detail-card">
                            <span>
                              Cliente
                            </span>

                            <strong>
                              {formatNumber(
                                visit.customer_score,
                                1,
                              )}
                            </strong>
                          </div>

                          <div className="visit-detail-card">
                            <span>
                              eNPS
                            </span>

                            <strong>
                              {formatNumber(
                                visit.enps,
                                1,
                              )}
                            </strong>
                          </div>
                        </div>

                        {/* INDICADORES DA VISITA */}

                        <div className="visit-indicators-grid">
                          <div>
                            <span>
                              Turnover
                            </span>

                            <strong>
                              {formatNumber(
                                visit.turnover,
                                1,
                              )}
                              %
                            </strong>
                          </div>

                          <div>
                            <span>
                              Absenteísmo
                            </span>

                            <strong>
                              {formatNumber(
                                visit.absenteeism,
                                1,
                              )}
                              %
                            </strong>
                          </div>

                          <div>
                            <span>
                              Ineficiência HE
                            </span>

                            <strong>
                              {formatNumber(
                                visit.he_inefficiency,
                                1,
                              )}
                              %
                            </strong>
                          </div>

                          <div>
                            <span>
                              Vagas abertas
                            </span>

                            <strong>
                              {formatNumber(
                                visit.open_positions,
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Reposição
                            </span>

                            <strong>
                              {formatNumber(
                                visit.replacement_days,
                                1,
                              )}{" "}
                              dias
                            </strong>
                          </div>

                          <div>
                            <span>
                              Ações trabalhistas
                            </span>

                            <strong>
                              {formatNumber(
                                visit.labor_actions,
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Advertências
                            </span>

                            <strong>
                              {formatNumber(
                                visit.warnings,
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Abordados
                            </span>

                            <strong>
                              {formatNumber(
                                visit.employees_approached,
                              )}
                            </strong>
                          </div>
                        </div>

                        {/* TEXTOS */}

                        <div className="visit-text-grid">
                          <div>
                            <span>
                              Visão geral
                            </span>

                            <p>
                              {visit.overview ||
                                "Não informado."}
                            </p>
                          </div>

                          <div>
                            <span>
                              Evidências
                            </span>

                            <p>
                              {visit.evidence ||
                                "Não informado."}
                            </p>
                          </div>

                          <div>
                            <span>
                              Opinião executiva
                            </span>

                            <p>
                              {visit.executive_opinion ||
                                "Não informado."}
                            </p>
                          </div>

                          <div>
                            <span>
                              Prioridade
                            </span>

                            <p>
                              {visit.priority ||
                                "Não informada."}
                            </p>
                          </div>
                        </div>

                        {/* CAUSAS */}

                        {rootCausesVisit.length >
                          0 && (
                          <div className="visit-root-causes">
                            <span className="visit-root-title">
                              Causas raiz apontadas
                            </span>

                            <div className="visit-root-tags">
                              {rootCausesVisit.map(
                                (
                                  cause,
                                  index,
                                ) => (
                                  <span
                                    key={`${visit.id}-${index}`}
                                  >
                                    {cause}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}