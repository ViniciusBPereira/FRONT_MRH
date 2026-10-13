import React from "react";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

/* ============================================================
   CORES
============================================================ */

const COLORS = {
  navy: "#0F2742",
  navySecondary: "#183B60",

  blue: "#2563EB",
  blueSoft: "#EFF6FF",

  text: "#0F172A",
  textSoft: "#334155",
  muted: "#64748B",
  mutedLight: "#94A3B8",

  white: "#FFFFFF",
  page: "#F5F7FB",
  soft: "#F8FAFC",

  border: "#DDE5EE",
  borderSoft: "#E9EEF5",

  green: "#15803D",
  greenSoft: "#F0FDF4",

  yellow: "#B45309",
  yellowSoft: "#FFFBEB",

  red: "#B91C1C",
  redSoft: "#FEF2F2",
};

/* ============================================================
   HELPERS
============================================================ */

function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function text(
  value,
  fallback = "-",
) {
  const normalized =
    normalizeText(value);

  return normalized || fallback;
}

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatNumber(
  value,
  decimals = 0,
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      minimumFractionDigits:
        decimals,

      maximumFractionDigits:
        decimals,
    },
  ).format(
    toNumber(value),
  );
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

function formatDateTime(value) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  );
}

function getContract(visit) {
  return text(
    visit?.cr ||
      visit?.contract ||
      visit?.contract_number ||
      visit?.contractNumber ||
      visit?.client,

    "Contrato não informado",
  );
}

function getBP(visit) {
  return text(
    visit?.bp ||
      visit?.business_partner ||
      visit?.businessPartner,

    "Não informado",
  );
}

/* ============================================================
   CAUSAS RAIZ
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
        normalizeText(parsed),
      ].filter(Boolean);
    } catch {
      return [trimmed];
    }
  }

  return [];
}

/* ============================================================
   CORES DA CLASSIFICAÇÃO
============================================================ */

function classificationColors(
  classification,
) {
  switch (
    normalizeText(
      classification,
    )
  ) {
    case "Referência":
      return {
        backgroundColor:
          COLORS.greenSoft,

        color:
          COLORS.green,
      };

    case "Alerta":
      return {
        backgroundColor:
          COLORS.yellowSoft,

        color:
          COLORS.yellow,
      };

    case "Crítico":
      return {
        backgroundColor:
          COLORS.redSoft,

        color:
          COLORS.red,
      };

    case "Estável":
      return {
        backgroundColor:
          COLORS.blueSoft,

        color:
          COLORS.blue,
      };

    default:
      return {
        backgroundColor:
          "#F1F5F9",

        color:
          COLORS.muted,
      };
  }
}

/* ============================================================
   NOME DO ARQUIVO
============================================================ */

function slugify(value) {
  return text(
    value,
    "Todos-os-Contratos",
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .slice(0, 70);
}

/* ============================================================
   ESTILOS
============================================================ */

const styles =
  StyleSheet.create({
    page: {
      fontFamily:
        "Helvetica",

      backgroundColor:
        COLORS.page,

      color:
        COLORS.text,

      paddingBottom: 40,
    },

    /* ========================================================
       HEADER
    ======================================================== */

    header: {
      paddingHorizontal: 28,
      paddingTop: 23,
      paddingBottom: 21,

      backgroundColor:
        COLORS.navy,
    },

    headerRow: {
      flexDirection: "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",
    },

    headerBrand: {
      color: "#93C5FD",

      fontSize: 7,

      fontWeight:
        "bold",

      letterSpacing: 1.4,
    },

    headerTitle: {
      marginTop: 6,

      color:
        COLORS.white,

      fontSize: 21,

      fontWeight:
        "bold",
    },

    headerSubtitle: {
      marginTop: 6,

      maxWidth: 420,

      color: "#CBD5E1",

      fontSize: 8,

      lineHeight: 1.4,
    },

    headerMeta: {
      alignItems:
        "flex-end",
    },

    headerMetaLabel: {
      color: "#94A3B8",

      fontSize: 6,

      textTransform:
        "uppercase",

      letterSpacing: 0.7,
    },

    headerMetaValue: {
      marginTop: 4,

      color:
        COLORS.white,

      fontSize: 7,
    },

    /* ========================================================
       BODY
    ======================================================== */

    body: {
      paddingHorizontal: 28,
      paddingTop: 18,
    },

    sectionEyebrow: {
      color:
        COLORS.blue,

      fontSize: 6.5,

      fontWeight:
        "bold",

      letterSpacing: 0.8,

      textTransform:
        "uppercase",
    },

    sectionTitle: {
      marginTop: 4,

      color:
        COLORS.text,

      fontSize: 14,

      fontWeight:
        "bold",
    },

    sectionDescription: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontSize: 7.5,

      lineHeight: 1.4,
    },

    /* ========================================================
       FILTROS
    ======================================================== */

    filterCard: {
      marginTop: 13,

      flexDirection: "row",

      padding: 12,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      borderRadius: 8,

      backgroundColor:
        COLORS.white,
    },

    filterColumn: {
      width: "50%",

      paddingRight: 14,
    },

    filterColumnRight: {
      width: "50%",

      paddingLeft: 14,

      borderLeftWidth: 1,

      borderLeftColor:
        COLORS.borderSoft,
    },

    filterLabel: {
      color:
        COLORS.muted,

      fontSize: 6,

      fontWeight:
        "bold",

      letterSpacing: 0.5,

      textTransform:
        "uppercase",
    },

    filterValue: {
      marginTop: 4,

      color:
        COLORS.textSoft,

      fontSize: 8.5,

      fontWeight:
        "bold",
    },

    /* ========================================================
       KPIs
    ======================================================== */

    kpiRow: {
      flexDirection: "row",

      justifyContent:
        "space-between",

      marginTop: 13,
    },

    kpiCard: {
      width: "15.8%",

      minHeight: 58,

      padding: 10,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 7,

      backgroundColor:
        COLORS.white,
    },

    kpiLabel: {
      color:
        COLORS.muted,

      fontSize: 6,
    },

    kpiValue: {
      marginTop: 6,

      color:
        COLORS.text,

      fontSize: 16,

      fontWeight:
        "bold",
    },

    /* ========================================================
       BLOCOS DO RESUMO
    ======================================================== */

    twoColumns: {
      flexDirection: "row",

      marginTop: 13,
    },

    summaryBox: {
      width: "49%",

      padding: 12,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 7,

      backgroundColor:
        COLORS.white,
    },

    summaryBoxRight: {
      width: "49%",

      marginLeft: "2%",

      padding: 12,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 7,

      backgroundColor:
        COLORS.white,
    },

    boxTitle: {
      marginBottom: 9,

      color:
        COLORS.text,

      fontSize: 8.5,

      fontWeight:
        "bold",
    },

    metricRow: {
      flexDirection: "row",

      justifyContent:
        "space-between",

      marginBottom: 5,
    },

    metricLabel: {
      maxWidth: "74%",

      color:
        COLORS.muted,

      fontSize: 6.5,

      lineHeight: 1.3,
    },

    metricValue: {
      color:
        COLORS.textSoft,

      fontSize: 6.5,

      fontWeight:
        "bold",
    },

    /* ========================================================
       PÁGINA DE VISITA
    ======================================================== */

    visitHeader: {
      paddingHorizontal: 28,
      paddingTop: 17,
      paddingBottom: 16,

      backgroundColor:
        COLORS.navy,
    },

    visitHeaderRow: {
      flexDirection: "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",
    },

    visitHeaderLeft: {
      width: "73%",
    },

    visitIndex: {
      color: "#93C5FD",

      fontSize: 6.5,

      fontWeight:
        "bold",

      letterSpacing: 0.8,

      textTransform:
        "uppercase",
    },

    visitContract: {
      marginTop: 5,

      color:
        COLORS.white,

      fontSize: 13,

      fontWeight:
        "bold",
    },

    visitSubtitle: {
      marginTop: 5,

      color: "#CBD5E1",

      fontSize: 7,
    },

    badge: {
      paddingHorizontal: 9,

      paddingVertical: 5,

      borderRadius: 12,

      fontSize: 7,

      fontWeight:
        "bold",
    },

    visitBody: {
      paddingHorizontal: 28,
      paddingTop: 16,
    },

    /* ========================================================
       SCORES
    ======================================================== */

    scoreGrid: {
      flexDirection: "row",

      justifyContent:
        "space-between",
    },

    scoreCard: {
      width: "15.8%",

      minHeight: 56,

      padding: 9,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 7,

      backgroundColor:
        COLORS.white,
    },

    scoreLabel: {
      color:
        COLORS.muted,

      fontSize: 5.8,

      textTransform:
        "uppercase",

      letterSpacing: 0.3,
    },

    scoreValue: {
      marginTop: 5,

      color:
        COLORS.text,

      fontSize: 13,

      fontWeight:
        "bold",
    },

    /* ========================================================
       INDICADORES
    ======================================================== */

    indicatorSection: {
      marginTop: 11,

      padding: 11,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 7,

      backgroundColor:
        COLORS.white,
    },

    indicatorSectionTitle: {
      marginBottom: 8,

      color:
        COLORS.blue,

      fontSize: 6.5,

      fontWeight:
        "bold",

      letterSpacing: 0.6,

      textTransform:
        "uppercase",
    },

    indicatorGrid: {
      flexDirection: "row",

      flexWrap: "wrap",
    },

    indicatorItem: {
      width: "25%",

      paddingRight: 9,

      marginBottom: 8,
    },

    indicatorLabel: {
      color:
        COLORS.muted,

      fontSize: 5.7,

      lineHeight: 1.2,
    },

    indicatorValue: {
      marginTop: 3,

      color:
        COLORS.textSoft,

      fontSize: 8,

      fontWeight:
        "bold",
    },

    /* ========================================================
       TEXTO
    ======================================================== */

    textGrid: {
      flexDirection: "row",

      marginTop: 11,
    },

    textBox: {
      width: "49%",

      padding: 11,

      borderWidth: 1,

      borderColor:
        COLORS.borderSoft,

      borderRadius: 7,

      backgroundColor:
        COLORS.white,
    },

    textBoxRight: {
      width: "49%",

      marginLeft: "2%",

      padding: 11,

      borderWidth: 1,

      borderColor:
        COLORS.borderSoft,

      borderRadius: 7,

      backgroundColor:
        COLORS.white,
    },

    textTitle: {
      color:
        COLORS.blue,

      fontSize: 6,

      fontWeight:
        "bold",

      letterSpacing: 0.6,

      textTransform:
        "uppercase",
    },

    paragraph: {
      marginTop: 6,

      color:
        COLORS.textSoft,

      fontSize: 7,

      lineHeight: 1.45,
    },

    /* ========================================================
       CAUSA RAIZ
    ======================================================== */

    rootCauseBox: {
      marginTop: 11,

      padding: 11,

      borderWidth: 1,

      borderColor:
        COLORS.borderSoft,

      borderRadius: 7,

      backgroundColor:
        COLORS.white,
    },

    rootCauseTitle: {
      color:
        COLORS.blue,

      fontSize: 6,

      fontWeight:
        "bold",

      letterSpacing: 0.6,

      textTransform:
        "uppercase",
    },

    rootCauseContainer: {
      flexDirection: "row",

      flexWrap: "wrap",

      marginTop: 7,
    },

    rootCauseTag: {
      marginRight: 5,

      marginBottom: 5,

      paddingHorizontal: 7,

      paddingVertical: 4,

      borderRadius: 8,

      backgroundColor:
        COLORS.yellowSoft,

      color:
        COLORS.yellow,

      fontSize: 6,
    },

    /* ========================================================
       FOOTER
    ======================================================== */

    footer: {
      position:
        "absolute",

      left: 28,
      right: 28,
      bottom: 13,

      flexDirection: "row",

      justifyContent:
        "space-between",

      paddingTop: 6,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,
    },

    footerText: {
      color:
        COLORS.mutedLight,

      fontSize: 5.8,
    },
  });

/* ============================================================
   COMPONENTES AUXILIARES
============================================================ */

function Footer() {
  return (
    <View
      style={styles.footer}
      fixed
    >
      <Text
        style={
          styles.footerText
        }
      >
        RADAR 360 • Indicadores de Visitas
      </Text>

      <Text
        style={
          styles.footerText
        }
        render={({
          pageNumber,
          totalPages,
        }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

function Kpi({
  label,
  value,
}) {
  return (
    <View
      style={
        styles.kpiCard
      }
    >
      <Text
        style={
          styles.kpiLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.kpiValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function ScoreCard({
  label,
  value,
}) {
  return (
    <View
      style={
        styles.scoreCard
      }
    >
      <Text
        style={
          styles.scoreLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.scoreValue
        }
      >
        {formatNumber(
          value,
          1,
        )}
      </Text>
    </View>
  );
}

/* ============================================================
   DOCUMENTO
============================================================ */

export function VisitsDashboardPdfDocument({
  visits = [],

  summary = {},

  pillars = [],

  scoreComposition = [],

  operationalIndicators = [],

  classifications = [],

  rootCauses = [],

  bpSelecionado = "",

  contratoSelecionado = "",

  generatedAt =
    new Date(),
}) {
  return (
    <Document
      title="Indicadores de Visitas - Radar 360"
      author="Radar 360"
      subject="Relatório de visitas e diagnóstico dos contratos"
      creator="Radar 360"
    >
      {/* =====================================================
          PÁGINA 1 - RESUMO EXECUTIVO
      ====================================================== */}

      <Page
        size="A4"
        orientation="landscape"
        style={styles.page}
      >
        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerRow
            }
          >
            <View>
              <Text
                style={
                  styles.headerBrand
                }
              >
                RADAR 360
              </Text>

              <Text
                style={
                  styles.headerTitle
                }
              >
                Indicadores de Visitas
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Consolidação executiva das visitas,
                pontuações, riscos e principais pontos
                identificados nos contratos.
              </Text>
            </View>

            <View
              style={
                styles.headerMeta
              }
            >
              <Text
                style={
                  styles.headerMetaLabel
                }
              >
                Documento gerado em
              </Text>

              <Text
                style={
                  styles.headerMetaValue
                }
              >
                {formatDateTime(
                  generatedAt,
                )}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={
            styles.body
          }
        >
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            VISÃO EXECUTIVA
          </Text>

          <Text
            style={
              styles.sectionTitle
            }
          >
            Panorama das visitas
          </Text>

          <Text
            style={
              styles.sectionDescription
            }
          >
            Os indicadores abaixo consideram exclusivamente
            os filtros aplicados no Radar 360 no momento
            da exportação.
          </Text>

          {/* FILTROS */}

          <View
            style={
              styles.filterCard
            }
          >
            <View
              style={
                styles.filterColumn
              }
            >
              <Text
                style={
                  styles.filterLabel
                }
              >
                Business Partner
              </Text>

              <Text
                style={
                  styles.filterValue
                }
              >
                {text(
                  bpSelecionado,
                  "Todos os Business Partners",
                )}
              </Text>
            </View>

            <View
              style={
                styles.filterColumnRight
              }
            >
              <Text
                style={
                  styles.filterLabel
                }
              >
                Contrato / CR
              </Text>

              <Text
                style={
                  styles.filterValue
                }
              >
                {text(
                  contratoSelecionado,
                  "Todos os contratos",
                )}
              </Text>
            </View>
          </View>

          {/* KPIs */}

          <View
            style={
              styles.kpiRow
            }
          >
            <Kpi
              label="Visitas"
              value={
                summary.total ??
                visits.length
              }
            />

            <Kpi
              label="Contratos"
              value={
                summary.contracts ??
                0
              }
            />

            <Kpi
              label="Colaboradores abordados"
              value={
                summary.employeesApproached ??
                0
              }
            />

            <Kpi
              label="Score médio"
              value={formatNumber(
                summary.avgFinalScore,
                1,
              )}
            />

            <Kpi
              label="eNPS médio"
              value={formatNumber(
                summary.avgENPS,
                1,
              )}
            />

            <Kpi
              label="Visitas críticas"
              value={
                summary.critical ??
                0
              }
            />
          </View>

          {/* SCORE + PILARES */}

          <View
            style={
              styles.twoColumns
            }
          >
            <View
              style={
                styles.summaryBox
              }
            >
              <Text
                style={
                  styles.boxTitle
                }
              >
                Composição da pontuação
              </Text>

              {scoreComposition.length >
              0 ? (
                scoreComposition.map(
                  (item) => (
                    <View
                      style={
                        styles.metricRow
                      }
                      key={
                        item.key ||
                        item.label
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        {item.label}
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {formatNumber(
                          item.value,
                          1,
                        )}
                      </Text>
                    </View>
                  ),
                )
              ) : (
                <>
                  <View
                    style={
                      styles.metricRow
                    }
                  >
                    <Text
                      style={
                        styles.metricLabel
                      }
                    >
                      Score de Indicadores
                    </Text>

                    <Text
                      style={
                        styles.metricValue
                      }
                    >
                      {formatNumber(
                        summary.avgIndicatorScore,
                        1,
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.metricRow
                    }
                  >
                    <Text
                      style={
                        styles.metricLabel
                      }
                    >
                      Score dos Pilares
                    </Text>

                    <Text
                      style={
                        styles.metricValue
                      }
                    >
                      {formatNumber(
                        summary.avgPillarScore,
                        1,
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.metricRow
                    }
                  >
                    <Text
                      style={
                        styles.metricLabel
                      }
                    >
                      Score Final
                    </Text>

                    <Text
                      style={
                        styles.metricValue
                      }
                    >
                      {formatNumber(
                        summary.avgFinalScore,
                        1,
                      )}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View
              style={
                styles.summaryBoxRight
              }
            >
              <Text
                style={
                  styles.boxTitle
                }
              >
                Pontuação média dos pilares
              </Text>

              {pillars.length >
              0 ? (
                pillars.map(
                  (item) => (
                    <View
                      style={
                        styles.metricRow
                      }
                      key={
                        item.key ||
                        item.label
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        {item.label}
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {formatNumber(
                          item.value,
                          1,
                        )}
                      </Text>
                    </View>
                  ),
                )
              ) : (
                <Text
                  style={
                    styles.metricLabel
                  }
                >
                  Nenhuma pontuação disponível.
                </Text>
              )}
            </View>
          </View>

          {/* CLASSIFICAÇÃO + CAUSA RAIZ */}

          <View
            style={
              styles.twoColumns
            }
          >
            <View
              style={
                styles.summaryBox
              }
            >
              <Text
                style={
                  styles.boxTitle
                }
              >
                Classificação das visitas
              </Text>

              {classifications.length >
              0 ? (
                classifications.map(
                  (item) => (
                    <View
                      style={
                        styles.metricRow
                      }
                      key={
                        item.label
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        {item.label}
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {item.value} •{" "}
                        {Math.round(
                          toNumber(
                            item.percentage,
                          ),
                        )}
                        %
                      </Text>
                    </View>
                  ),
                )
              ) : (
                <Text
                  style={
                    styles.metricLabel
                  }
                >
                  Nenhuma classificação disponível.
                </Text>
              )}
            </View>

            <View
              style={
                styles.summaryBoxRight
              }
            >
              <Text
                style={
                  styles.boxTitle
                }
              >
                Principais causas raiz
              </Text>

              {rootCauses.length >
              0 ? (
                rootCauses
                  .slice(0, 6)
                  .map(
                    (item) => (
                      <View
                        style={
                          styles.metricRow
                        }
                        key={
                          item.label
                        }
                      >
                        <Text
                          style={
                            styles.metricLabel
                          }
                        >
                          {item.label}
                        </Text>

                        <Text
                          style={
                            styles.metricValue
                          }
                        >
                          {item.count}
                        </Text>
                      </View>
                    ),
                  )
              ) : (
                <Text
                  style={
                    styles.metricLabel
                  }
                >
                  Nenhuma causa raiz registrada.
                </Text>
              )}
            </View>
          </View>
        </View>

        <Footer />
      </Page>

      {/* =====================================================
          UMA PÁGINA PARA CADA VISITA
      ====================================================== */}

      {visits.map(
        (
          visit,
          index,
        ) => {
          const classification =
            classificationColors(
              visit.classification,
            );

          const visitRootCauses =
            normalizeRootCauses(
              visit.root_cause,
            );

          return (
            <Page
              key={
                visit.id ||
                index
              }
              size="A4"
              orientation="landscape"
              style={styles.page}
              wrap
            >
              {/* HEADER VISITA */}

              <View
                style={
                  styles.visitHeader
                }
              >
                <View
                  style={
                    styles.visitHeaderRow
                  }
                >
                  <View
                    style={
                      styles.visitHeaderLeft
                    }
                  >
                    <Text
                      style={
                        styles.visitIndex
                      }
                    >
                      VISITA{" "}
                      {String(
                        index + 1,
                      ).padStart(
                        2,
                        "0",
                      )}
                      {" / "}
                      {String(
                        visits.length,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </Text>

                    <Text
                      style={
                        styles.visitContract
                      }
                    >
                      {getContract(
                        visit,
                      )}
                    </Text>

                    <Text
                      style={
                        styles.visitSubtitle
                      }
                    >
                      {formatDate(
                        visit.visit_date,
                      )}
                      {" • "}
                      {text(
                        visit.unit ||
                          visit.client,
                        "Unidade não informada",
                      )}
                      {" • BP: "}
                      {getBP(
                        visit,
                      )}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.badge,

                      {
                        backgroundColor:
                          classification.backgroundColor,

                        color:
                          classification.color,
                      },
                    ]}
                  >
                    {text(
                      visit.classification,
                      "Sem classificação",
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.visitBody
                }
              >
                {/* SCORES */}

                <View
                  style={
                    styles.scoreGrid
                  }
                >
                  <ScoreCard
                    label="Score Final"
                    value={
                      visit.final_score
                    }
                  />

                  <ScoreCard
                    label="Indicadores"
                    value={
                      visit.indicator_score
                    }
                  />

                  <ScoreCard
                    label="Pilares"
                    value={
                      visit.pillar_score
                    }
                  />

                  <ScoreCard
                    label="Liderança"
                    value={
                      visit.leadership_score
                    }
                  />

                  <ScoreCard
                    label="Clima"
                    value={
                      visit.climate_score
                    }
                  />

                  <ScoreCard
                    label="Estrutura"
                    value={
                      visit.structure_score
                    }
                  />
                </View>

                {/* INDICADORES */}

                <View
                  style={
                    styles.indicatorSection
                  }
                >
                  <Text
                    style={
                      styles.indicatorSectionTitle
                    }
                  >
                    Indicadores acompanhados
                  </Text>

                  <View
                    style={
                      styles.indicatorGrid
                    }
                  >
                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Cliente
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.customer_score,
                          1,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        eNPS
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.enps,
                          1,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Colaboradores abordados
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.employees_approached,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Turnover
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.turnover,
                          1,
                        )}
                        %
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Absenteísmo
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.absenteeism,
                          1,
                        )}
                        %
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Ineficiência HE
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.he_inefficiency,
                          1,
                        )}
                        %
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Vagas abertas
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.open_positions,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Dias de reposição
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.replacement_days,
                          1,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Ações trabalhistas
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.labor_actions,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Advertências
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {formatNumber(
                          visit.warnings,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Prioridade
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {text(
                          visit.priority,
                          "Não informada",
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.indicatorItem
                      }
                    >
                      <Text
                        style={
                          styles.indicatorLabel
                        }
                      >
                        Liderança responsável
                      </Text>

                      <Text
                        style={
                          styles.indicatorValue
                        }
                      >
                        {text(
                          visit.leadership_responsible,
                          "Não informado",
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* VISÃO GERAL / EVIDÊNCIA */}

                <View
                  style={
                    styles.textGrid
                  }
                >
                  <View
                    style={
                      styles.textBox
                    }
                  >
                    <Text
                      style={
                        styles.textTitle
                      }
                    >
                      Visão geral
                    </Text>

                    <Text
                      style={
                        styles.paragraph
                      }
                    >
                      {text(
                        visit.overview,
                        "Não informado.",
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.textBoxRight
                    }
                  >
                    <Text
                      style={
                        styles.textTitle
                      }
                    >
                      Evidências
                    </Text>

                    <Text
                      style={
                        styles.paragraph
                      }
                    >
                      {text(
                        visit.evidence,
                        "Não informado.",
                      )}
                    </Text>
                  </View>
                </View>

                {/* OPINIÃO / PRIORIDADE */}

                <View
                  style={
                    styles.textGrid
                  }
                >
                  <View
                    style={
                      styles.textBox
                    }
                  >
                    <Text
                      style={
                        styles.textTitle
                      }
                    >
                      Opinião executiva
                    </Text>

                    <Text
                      style={
                        styles.paragraph
                      }
                    >
                      {text(
                        visit.executive_opinion,
                        "Não informado.",
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.textBoxRight
                    }
                  >
                    <Text
                      style={
                        styles.textTitle
                      }
                    >
                      Diagnóstico
                    </Text>

                    <Text
                      style={
                        styles.paragraph
                      }
                    >
                      Classificação:{" "}
                      {text(
                        visit.classification,
                        "Não informada",
                      )}
                      {"\n"}

                      Prioridade:{" "}
                      {text(
                        visit.priority,
                        "Não informada",
                      )}
                    </Text>
                  </View>
                </View>

                {/* CAUSAS RAIZ */}

                {visitRootCauses.length >
                  0 && (
                  <View
                    style={
                      styles.rootCauseBox
                    }
                  >
                    <Text
                      style={
                        styles.rootCauseTitle
                      }
                    >
                      Causas raiz apontadas
                    </Text>

                    <View
                      style={
                        styles.rootCauseContainer
                      }
                    >
                      {visitRootCauses.map(
                        (
                          cause,
                          causeIndex,
                        ) => (
                          <Text
                            key={`${visit.id}-${causeIndex}`}
                            style={
                              styles.rootCauseTag
                            }
                          >
                            {cause}
                          </Text>
                        ),
                      )}
                    </View>
                  </View>
                )}
              </View>

              <Footer />
            </Page>
          );
        },
      )}
    </Document>
  );
}

/* ============================================================
   DOWNLOAD DO PDF
============================================================ */

export async function downloadVisitsDashboardPdf({
  visits = [],

  summary = {},

  pillars = [],

  scoreComposition = [],

  operationalIndicators = [],

  classifications = [],

  rootCauses = [],

  bpSelecionado = "",

  contratoSelecionado = "",
}) {
  if (
    !Array.isArray(visits) ||
    !visits.length
  ) {
    throw new Error(
      "Não existem visitas para exportar.",
    );
  }

  const generatedAt =
    new Date();

  const blob = await pdf(
    <VisitsDashboardPdfDocument
      visits={visits}
      summary={summary}
      pillars={pillars}
      scoreComposition={
        scoreComposition
      }
      operationalIndicators={
        operationalIndicators
      }
      classifications={
        classifications
      }
      rootCauses={
        rootCauses
      }
      bpSelecionado={
        bpSelecionado
      }
      contratoSelecionado={
        contratoSelecionado
      }
      generatedAt={
        generatedAt
      }
    />,
  ).toBlob();

  const blobUrl =
    window.URL.createObjectURL(
      blob,
    );

  const link =
    document.createElement(
      "a",
    );

  const reference =
    contratoSelecionado ||
    bpSelecionado ||
    "Todos-os-Contratos";

  const safeReference =
    slugify(reference);

  const date =
    generatedAt
      .toISOString()
      .slice(0, 10);

  link.href =
    blobUrl;

  link.download =
    `Radar360-Visitas-${safeReference}-${date}.pdf`;

  document.body.appendChild(
    link,
  );

  link.click();

  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(
      blobUrl,
    );
  }, 1000);
}