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
  navyLight: "#173A5E",

  blue: "#2563EB",
  blueSoft: "#EFF6FF",

  text: "#0F172A",
  textSoft: "#334155",
  muted: "#64748B",
  mutedLight: "#94A3B8",

  page: "#F5F7FB",
  white: "#FFFFFF",

  border: "#DDE5EE",
  borderSoft: "#E9EEF5",

  green: "#15803D",
  greenBg: "#F0FDF4",

  amber: "#B45309",
  amberBg: "#FFFBEB",

  red: "#B91C1C",
  redBg: "#FEF2F2",

  grayBg: "#F8FAFC",
};

/* ============================================================
   HELPERS
============================================================ */

function text(value, fallback = "-") {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value).trim();
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const raw = String(value).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");

    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value) {
  const date = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatMonth(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function statusColors(status) {
  switch (status) {
    case "Concluído":
      return {
        backgroundColor: COLORS.greenBg,
        color: COLORS.green,
      };

    case "Em andamento":
      return {
        backgroundColor: COLORS.amberBg,
        color: COLORS.amber,
      };

    default:
      return {
        backgroundColor: "#F1F5F9",
        color: "#475569",
      };
  }
}

function conditionColors(condition) {
  if (condition === "Atrasado") {
    return {
      backgroundColor: COLORS.redBg,
      color: COLORS.red,
    };
  }

  if (
    condition === "Próximo" ||
    condition === "Vence hoje" ||
    String(condition || "").includes("restantes")
  ) {
    return {
      backgroundColor: COLORS.amberBg,
      color: COLORS.amber,
    };
  }

  if (
    condition === "Concluído" ||
    condition === "No prazo"
  ) {
    return {
      backgroundColor: COLORS.greenBg,
      color: COLORS.green,
    };
  }

  return {
    backgroundColor: "#F1F5F9",
    color: "#64748B",
  };
}

function slugify(value) {
  return text(value, "Todos-os-Contratos")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/* ============================================================
   ESTILOS
============================================================ */

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.page,
    fontFamily: "Helvetica",
    color: COLORS.text,
    paddingBottom: 42,
  },

  /* ========================================================
     HEADER
  ======================================================== */

  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 22,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerBrand: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1.5,
    color: "#93C5FD",
    marginBottom: 7,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 9,
    color: "#CBD5E1",
    marginTop: 6,
  },

  headerMeta: {
    alignItems: "flex-end",
  },

  headerMetaLabel: {
    fontSize: 7,
    textTransform: "uppercase",
    color: "#94A3B8",
    letterSpacing: 0.8,
  },

  headerMetaValue: {
    marginTop: 4,
    fontSize: 8,
    color: COLORS.white,
  },

  /* ========================================================
     BODY
  ======================================================== */

  body: {
    paddingHorizontal: 28,
    paddingTop: 22,
  },

  sectionLabel: {
    fontSize: 7,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.blue,
    marginBottom: 6,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
  },

  sectionDescription: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 1.5,
  },

  /* ========================================================
     CONTEXTO
  ======================================================== */

  contextCard: {
    marginTop: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    padding: 15,
  },

  contextRow: {
    flexDirection: "row",
  },

  contextColumn: {
    width: "50%",
  },

  contextColumnRight: {
    width: "50%",
    paddingLeft: 18,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.borderSoft,
  },

  contextLabel: {
    fontSize: 7,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  contextValue: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.textSoft,
  },

  /* ========================================================
     KPIs
  ======================================================== */

  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  kpiCard: {
    width: "19%",
    padding: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },

  kpiLabel: {
    fontSize: 7,
    color: COLORS.muted,
  },

  kpiValue: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },

  /* ========================================================
     PROGRESSO
  ======================================================== */

  progressCard: {
    marginTop: 14,
    padding: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  progressTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.textSoft,
  },

  progressValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.blue,
  },

  progressTrack: {
    marginTop: 11,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: 6,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
  },

  progressFooter: {
    flexDirection: "row",
    marginTop: 9,
  },

  progressItem: {
    fontSize: 7,
    color: COLORS.muted,
    marginRight: 18,
  },

  /* ========================================================
     PLANO INDIVIDUAL
  ======================================================== */

  planHeader: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 28,
    paddingTop: 17,
    paddingBottom: 16,
  },

  planHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  planIndex: {
    fontSize: 7,
    color: "#93C5FD",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  planContract: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.white,
  },

  planPeriod: {
    marginTop: 5,
    fontSize: 8,
    color: "#CBD5E1",
    textTransform: "capitalize",
  },

  badgeRow: {
    flexDirection: "row",
  },

  badge: {
    fontSize: 7,
    fontWeight: "bold",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 6,
  },

  planBody: {
    paddingHorizontal: 28,
    paddingTop: 18,
  },

  planCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 17,
  },

  actionBlock: {
    backgroundColor: COLORS.grayBg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 7,
    padding: 13,
  },

  fieldLabel: {
    fontSize: 7,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: COLORS.muted,
    marginBottom: 5,
  },

  actionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.text,
    lineHeight: 1.35,
  },

  /* ========================================================
     META
  ======================================================== */

  metaRow: {
    flexDirection: "row",
    marginTop: 12,
  },

  metaItem: {
    width: "25%",
    paddingRight: 10,
  },

  metaItemBorder: {
    width: "25%",
    paddingHorizontal: 10,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.borderSoft,
  },

  metaLabel: {
    fontSize: 6.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: COLORS.mutedLight,
  },

  metaValue: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: "bold",
    color: COLORS.textSoft,
  },

  /* ========================================================
     EXECUÇÃO / INDICADORES
  ======================================================== */

  detailsRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  detailsColumn: {
    width: "49%",
    backgroundColor: "#FBFCFE",
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 8,
    padding: 13,
  },

  detailsColumnRight: {
    width: "49%",
    marginLeft: "2%",
    backgroundColor: "#FBFCFE",
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 8,
    padding: 13,
  },

  detailsTitle: {
    fontSize: 7,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: COLORS.blue,
    marginBottom: 7,
  },

  detailsText: {
    fontSize: 8.5,
    lineHeight: 1.55,
    color: COLORS.textSoft,
  },

  planId: {
    marginTop: 10,
    textAlign: "right",
    fontSize: 6.5,
    color: COLORS.mutedLight,
  },

  /* ========================================================
     FOOTER
  ======================================================== */

  footer: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 15,

    paddingTop: 7,

    borderTopWidth: 1,
    borderTopColor: COLORS.border,

    flexDirection: "row",
    justifyContent: "space-between",
  },

  footerText: {
    fontSize: 6.5,
    color: COLORS.mutedLight,
  },
});

/* ============================================================
   COMPONENTES
============================================================ */

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        RADAR 360 • Gestão de Risco por Contrato
      </Text>

      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

function Badge({
  children,
  colors,
}) {
  return (
    <Text
      style={[
        styles.badge,
        {
          backgroundColor:
            colors.backgroundColor,
          color:
            colors.color,
        },
      ]}
    >
      {children}
    </Text>
  );
}

function Kpi({
  label,
  value,
}) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>
        {label}
      </Text>

      <Text style={styles.kpiValue}>
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
   DOCUMENTO
============================================================ */

export function ActionPlanPdfDocument({
  plans = [],
  bpSelecionado = "",
  contratoSelecionado = "",
  stats = {},
  generatedAt = new Date(),
}) {
  const uniqueContracts =
    new Set(
      plans
        .map((plan) => plan.contract)
        .filter(Boolean),
    ).size;

  return (
    <Document
      title="Relatório - Plano de Ação"
      author="Radar 360"
      subject="Relatório corporativo de planos de ação"
      creator="Radar 360"
    >
      {/* =====================================================
          CAPA / RESUMO EXECUTIVO
      ====================================================== */}

      <Page
        size="A4"
        orientation="landscape"
        style={styles.page}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerBrand}>
                RADAR 360
              </Text>

              <Text style={styles.headerTitle}>
                Relatório Executivo
                {" - "}
                Plano de Ação
              </Text>

              <Text style={styles.headerSubtitle}>
                Consolidação das ações,
                responsáveis, prazos e
                indicadores de acompanhamento.
              </Text>
            </View>

            <View style={styles.headerMeta}>
              <Text style={styles.headerMetaLabel}>
                Documento gerado em
              </Text>

              <Text style={styles.headerMetaValue}>
                {formatDateTime(generatedAt)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionLabel}>
            Visão executiva
          </Text>

          <Text style={styles.sectionTitle}>
            Panorama dos planos de ação
          </Text>

          <Text style={styles.sectionDescription}>
            Indicadores consolidados considerando
            exclusivamente os filtros ativos no
            momento da exportação.
          </Text>

          <View style={styles.contextCard}>
            <View style={styles.contextRow}>
              <View style={styles.contextColumn}>
                <Text style={styles.contextLabel}>
                  Business Partner
                </Text>

                <Text style={styles.contextValue}>
                  {text(
                    bpSelecionado,
                    "Todos os Business Partners",
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.contextColumnRight
                }
              >
                <Text style={styles.contextLabel}>
                  Contrato / CR
                </Text>

                <Text style={styles.contextValue}>
                  {text(
                    contratoSelecionado,
                    "Todos os contratos",
                  )}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <Kpi
              label="Total de planos"
              value={stats.total ?? plans.length}
            />

            <Kpi
              label="Contratos"
              value={uniqueContracts}
            />

            <Kpi
              label="Em andamento"
              value={stats.running ?? 0}
            />

            <Kpi
              label="Atrasados"
              value={stats.delayed ?? 0}
            />

            <Kpi
              label="Concluídos"
              value={stats.completed ?? 0}
            />
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>
                  Progresso geral dos planos
                </Text>

                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 7,
                    color: COLORS.muted,
                  }}
                >
                  Percentual calculado com base
                  nos planos concluídos.
                </Text>
              </View>

              <Text style={styles.progressValue}>
                {stats.progress ?? 0}%
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        stats.progress ?? 0,
                      ),
                    )}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.progressFooter}>
              <Text style={styles.progressItem}>
                {stats.completed ?? 0} concluídos
              </Text>

              <Text style={styles.progressItem}>
                {stats.running ?? 0} em andamento
              </Text>

              <Text style={styles.progressItem}>
                {stats.pending ?? 0} pendentes
              </Text>

              <Text style={styles.progressItem}>
                {stats.delayed ?? 0} atrasados
              </Text>
            </View>
          </View>
        </View>

        <Footer />
      </Page>

      {/* =====================================================
          UMA FICHA POR PLANO
      ====================================================== */}

      {plans.map((plan, index) => (
        <Page
          key={plan.id || index}
          size="A4"
          orientation="landscape"
          style={styles.page}
          wrap
        >
          <View style={styles.planHeader}>
            <View style={styles.planHeaderRow}>
              <View
                style={{
                  width: "70%",
                }}
              >
                <Text style={styles.planIndex}>
                  Plano de ação{" "}
                  {String(index + 1).padStart(
                    2,
                    "0",
                  )}{" "}
                  /{" "}
                  {String(plans.length).padStart(
                    2,
                    "0",
                  )}
                </Text>

                <Text style={styles.planContract}>
                  {text(
                    plan.contract,
                    "Contrato não informado",
                  )}
                </Text>

                <Text style={styles.planPeriod}>
                  Registro:{" "}
                  {formatMonth(
                    plan.created_at,
                  )}
                </Text>
              </View>

              <View style={styles.badgeRow}>
                <Badge
                  colors={statusColors(
                    plan.status,
                  )}
                >
                  {text(
                    plan.status,
                    "Sem status",
                  )}
                </Badge>

                <Badge
                  colors={conditionColors(
                    plan.condition,
                  )}
                >
                  {text(
                    plan.condition,
                    "Sem condição",
                  )}
                </Badge>
              </View>
            </View>
          </View>

          <View style={styles.planBody}>
            <View style={styles.planCard}>
              {/* AÇÃO */}

              <View style={styles.actionBlock}>
                <Text style={styles.fieldLabel}>
                  Ação
                </Text>

                <Text style={styles.actionTitle}>
                  {text(
                    plan.description,
                    "Ação não informada",
                  )}
                </Text>
              </View>

              {/* METADADOS */}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>
                    Responsável
                  </Text>

                  <Text style={styles.metaValue}>
                    {text(
                      plan.responsible,
                      "Não informado",
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.metaItemBorder
                  }
                >
                  <Text style={styles.metaLabel}>
                    Prazo
                  </Text>

                  <Text style={styles.metaValue}>
                    {formatDate(
                      plan.due_date,
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.metaItemBorder
                  }
                >
                  <Text style={styles.metaLabel}>
                    Status
                  </Text>

                  <Text style={styles.metaValue}>
                    {text(
                      plan.status,
                      "Não informado",
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.metaItemBorder
                  }
                >
                  <Text style={styles.metaLabel}>
                    Evidências / arquivos
                  </Text>

                  <Text style={styles.metaValue}>
                    {plan.file_count ?? 0} arquivo
                    {(plan.file_count ?? 0) !== 1
                      ? "s"
                      : ""}
                  </Text>
                </View>
              </View>

              {/* EXECUÇÃO / INDICADORES */}

              <View style={styles.detailsRow}>
                <View
                  style={styles.detailsColumn}
                >
                  <Text style={styles.detailsTitle}>
                    Plano de execução
                  </Text>

                  <Text style={styles.detailsText}>
                    {text(
                      plan.execution_plan,
                      "Plano de execução não informado.",
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.detailsColumnRight
                  }
                >
                  <Text style={styles.detailsTitle}>
                    Indicadores de acompanhamento
                  </Text>

                  <Text style={styles.detailsText}>
                    {text(
                      plan.indicators,
                      "Indicadores não informados.",
                    )}
                  </Text>
                </View>
              </View>

              <Text style={styles.planId}>
                ID do registro:{" "}
                {text(
                  plan.id,
                  "não informado",
                )}
              </Text>
            </View>
          </View>

          <Footer />
        </Page>
      ))}
    </Document>
  );
}

/* ============================================================
   DOWNLOAD
============================================================ */

export async function downloadActionPlanPdf({
  plans = [],
  bpSelecionado = "",
  contratoSelecionado = "",
  stats = {},
}) {
  if (!plans.length) {
    throw new Error(
      "Não existem planos para exportação.",
    );
  }

  const generatedAt = new Date();

  const blob = await pdf(
    <ActionPlanPdfDocument
      plans={plans}
      bpSelecionado={bpSelecionado}
      contratoSelecionado={
        contratoSelecionado
      }
      stats={stats}
      generatedAt={generatedAt}
    />,
  ).toBlob();

  const url =
    window.URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  const reference =
    contratoSelecionado ||
    bpSelecionado ||
    "Todos-os-Contratos";

  const dateKey = generatedAt
    .toISOString()
    .slice(0, 10);

  link.href = url;

  link.download =
    `Plano-de-Acao-${slugify(
      reference,
    )}-${dateKey}.pdf`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}