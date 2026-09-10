import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";

import {
  MdCheckCircle,
  MdSchedule,
  MdWarning,
  MdError,
  MdLocationOn,
  MdOpenInNew,
  MdRefresh,
  MdSensors,
  MdShield,
  MdDescription,
  MdReportProblem,
  MdMyLocation,
  MdAccessTime,
  MdChevronLeft,
  MdChevronRight,
  MdHistory,
} from "react-icons/md";

import "leaflet/dist/leaflet.css";
import "./EmaeMonitor.css";
import EmaePushButton from "./EmaePushButton";

const API_BASE =
  import.meta.env.VITE_API_URL || "";

const MONITORING_URL =
  `${API_BASE}/api/emae/sabara/monitoramento`;

const POLLING_INTERVAL = 5000;

// ============================================================
// HELPERS
// ============================================================

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function formatTime(value) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
  ).format(date);
}

function formatShortTime(value) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  ).format(date);
}

function formatWindowRange(
  inicio,
  fim,
) {
  return `${formatShortTime(
    inicio,
  )} — ${formatShortTime(fim)}`;
}

function cleanPointName(value) {
  return String(value || "-")
    .replace(/\/+$/, "")
    .trim();
}

function getStatusConfig(status) {
  switch (status) {
    case "REALIZADA":
      return {
        label: "Realizada",
        className: "status-realizada",
        color: "#22c55e",
      };

    case "PENDENTE":
      return {
        label: "Pendente",
        className: "status-pendente",
        color: "#f59e0b",
      };

    case "ATRASADA":
      return {
        label: "Atrasada",
        className: "status-atrasada",
        color: "#ef4444",
      };

    case "NAO_REALIZADA":
      return {
        label: "Não realizada",
        className:
          "status-nao-realizada",
        color: "#dc2626",
      };

    default:
      return {
        label: "Sem atividade",
        className:
          "status-sem-atividade",
        color: "#64748b",
      };
  }
}

function getFeedConfig(tipo) {
  switch (tipo) {
    case "RONDA":
      return {
        icon: <MdCheckCircle />,
        label: "Ronda",
        className: "feed-round",
      };

    case "RONDA_NAO_REALIZADA":
      return {
        icon: <MdError />,
        label:
          "Ronda não realizada",
        className: "feed-error",
      };

    case "OCORRENCIA":
      return {
        icon: <MdReportProblem />,
        label: "Ocorrência",
        className:
          "feed-occurrence",
      };

    case "JUSTIFICATIVA":
      return {
        icon: <MdDescription />,
        label: "Justificativa",
        className:
          "feed-justification",
      };

    default:
      return {
        icon: <MdSensors />,
        label: "Evento",
        className: "feed-default",
      };
  }
}

// ============================================================
// MAPA - AUTO FIT
// ============================================================

function MapAutoFit({
  points,
  enabled,
}) {
  const map = useMap();

  const alreadyFitted =
    useRef(false);

  useEffect(() => {
    if (
      !enabled ||
      alreadyFitted.current ||
      !points?.length
    ) {
      return;
    }

    const validPoints =
      points.filter(
        (point) =>
          Number.isFinite(
            Number(point.latitude),
          ) &&
          Number.isFinite(
            Number(point.longitude),
          ),
      );

    if (!validPoints.length) {
      return;
    }

    const bounds =
      validPoints.map(
        (point) => [
          Number(point.latitude),
          Number(point.longitude),
        ],
      );

    map.fitBounds(
      bounds,
      {
        padding: [40, 40],
        maxZoom: 17,
      },
    );

    alreadyFitted.current = true;
  }, [
    enabled,
    map,
    points,
  ]);

  return null;
}

// ============================================================
// MAPA - FOCO
// ============================================================

function MapFocus({
  focus,
}) {
  const map = useMap();

  useEffect(() => {
    if (
      !focus ||
      !Number.isFinite(
        Number(focus.latitude),
      ) ||
      !Number.isFinite(
        Number(focus.longitude),
      )
    ) {
      return;
    }

    map.flyTo(
      [
        Number(focus.latitude),
        Number(focus.longitude),
      ],
      18,
      {
        duration: 1.2,
      },
    );
  }, [
    focus,
    map,
  ]);

  return null;
}

// ============================================================
// PÁGINA
// ============================================================

export default function EmaeMonitor() {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastFetch, setLastFetch] =
    useState(null);

  const [
    focusPoint,
    setFocusPoint,
  ] = useState(null);

  const [
    newEvent,
    setNewEvent,
  ] = useState(null);

  const [
    pulsePoints,
    setPulsePoints,
  ] = useState([]);

  const [
    windowOffset,
    setWindowOffset,
  ] = useState(0);

  const knownEventsRef =
    useRef(new Set());

  const firstLoadRef =
    useRef(true);

  const pulseTimerRef =
    useRef(null);

  const alertTimerRef =
    useRef(null);

  // ==========================================================
  // RESET AO TROCAR A RONDA
  // ==========================================================

  useEffect(() => {
    knownEventsRef.current =
      new Set();

    firstLoadRef.current =
      true;

    setNewEvent(null);
    setPulsePoints([]);
    setFocusPoint(null);

    clearTimeout(
      pulseTimerRef.current,
    );

    clearTimeout(
      alertTimerRef.current,
    );
  }, [
    windowOffset,
  ]);

  // ==========================================================
  // CONSULTA API
  // ==========================================================

  const fetchMonitoring =
    useCallback(async () => {
      try {
        const url =
          `${MONITORING_URL}?windowOffset=${windowOffset}`;

        const response =
          await fetch(
            url,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",
              },

              cache:
                "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`,
          );
        }

        const payload =
          await response.json();

        if (
          !payload?.sucesso ||
          !payload?.data
        ) {
          throw new Error(
            payload?.mensagem ||
              "Resposta inválida da API.",
          );
        }

        const monitoring =
          payload.data;

        const feed =
          Array.isArray(
            monitoring.feed,
          )
            ? monitoring.feed
            : [];

        // ====================================================
        // PRIMEIRA CARGA DA JANELA
        // ====================================================

        if (
          firstLoadRef.current
        ) {
          for (
            const event
            of feed
          ) {
            knownEventsRef.current.add(
              event.id,
            );
          }

          firstLoadRef.current =
            false;
        }

        // ====================================================
        // NOVA TELEMETRIA
        // SOMENTE NA RONDA ATUAL
        // ====================================================

        else if (
          windowOffset === 0
        ) {
          const newEvents =
            feed.filter(
              (event) =>
                !knownEventsRef.current.has(
                  event.id,
                ),
            );

          for (
            const event
            of newEvents
          ) {
            knownEventsRef.current.add(
              event.id,
            );
          }

          if (
            newEvents.length
          ) {
            const latest =
              newEvents[0];

            setNewEvent(
              latest,
            );

            setPulsePoints(
              newEvents
                .filter(
                  (event) =>
                    event.tipo ===
                    "RONDA",
                )
                .map(
                  (event) =>
                    normalizeText(
                      event.local,
                    ),
                ),
            );

            clearTimeout(
              pulseTimerRef.current,
            );

            clearTimeout(
              alertTimerRef.current,
            );

            pulseTimerRef.current =
              setTimeout(
                () => {
                  setPulsePoints(
                    [],
                  );
                },
                10000,
              );

            alertTimerRef.current =
              setTimeout(
                () => {
                  setNewEvent(
                    null,
                  );
                },
                9000,
              );
          }
        }

        setData(monitoring);

        setError("");

        setLastFetch(
          new Date(),
        );
      } catch (err) {
        console.error(
          "Erro ao consultar EMAE:",
          err,
        );

        setError(
          `Não foi possível atualizar os dados: ${err.message}`,
        );
      } finally {
        setLoading(false);
      }
    }, [
      windowOffset,
    ]);

  // ==========================================================
  // POLLING
  // ==========================================================

  useEffect(() => {
    setLoading(
      !data,
    );

    fetchMonitoring();

    // Histórico não precisa polling.
    if (
      windowOffset !== 0
    ) {
      return undefined;
    }

    const interval =
      setInterval(
        fetchMonitoring,
        POLLING_INTERVAL,
      );

    return () => {
      clearInterval(
        interval,
      );
    };
  }, [
    fetchMonitoring,
    windowOffset,
  ]);

  // ==========================================================
  // DADOS
  // ==========================================================

  const points =
    useMemo(
      () =>
        Array.isArray(data?.pontos)
          ? data.pontos
          : [],
      [data],
    );

  const feed =
    useMemo(
      () =>
        Array.isArray(data?.feed)
          ? data.feed
          : [],
      [data],
    );

  const occurrences =
    useMemo(
      () =>
        Array.isArray(
          data?.ocorrencias,
        )
          ? data.ocorrencias
          : [],
      [data],
    );

  const justifications =
    useMemo(
      () =>
        Array.isArray(
          data?.justificativas,
        )
          ? data.justificativas
          : [],
      [data],
    );

  const validPoints =
    useMemo(
      () =>
        points.filter(
          (point) =>
            Number.isFinite(
              Number(
                point.latitude,
              ),
            ) &&
            Number.isFinite(
              Number(
                point.longitude,
              ),
            ),
        ),
      [points],
    );

  const mapCenter =
    useMemo(() => {
      if (
        !validPoints.length
      ) {
        return [
          -23.6995,
          -46.6741,
        ];
      }

      const latitude =
        validPoints.reduce(
          (sum, point) =>
            sum +
            Number(
              point.latitude,
            ),
          0,
        ) /
        validPoints.length;

      const longitude =
        validPoints.reduce(
          (sum, point) =>
            sum +
            Number(
              point.longitude,
            ),
          0,
        ) /
        validPoints.length;

      return [
        latitude,
        longitude,
      ];
    }, [
      validPoints,
    ]);

  const latestFinishedOccurrences =
    occurrences
      .filter(
        (item) =>
          item.finalizada,
      )
      .slice(0, 5);

  const openOccurrences =
    occurrences.filter(
      (item) =>
        !item.finalizada,
    );

  const latestFinishedJustifications =
    justifications
      .filter(
        (item) =>
          item.finalizada,
      )
      .slice(0, 5);

  const openJustifications =
    justifications.filter(
      (item) =>
        !item.finalizada,
    );

  // ==========================================================
  // NAVEGAÇÃO ENTRE RONDAS
  // ==========================================================

  const goPreviousRound = () => {
    if (
      data?.filtro
        ?.podeAnterior
    ) {
      setWindowOffset(
        (current) =>
          current + 1,
      );
    }
  };

  const goNextRound = () => {
    if (
      data?.filtro
        ?.podeProxima
    ) {
      setWindowOffset(
        (current) =>
          Math.max(
            current - 1,
            0,
          ),
      );
    }
  };

  const goNow = () => {
    setWindowOffset(0);
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    !data
  ) {
    return (
      <div className="emae-loading-screen">
        <div className="emae-loading-logo">
          <MdShield />
        </div>

        <div className="emae-loading-spinner" />

        <h2>
          Central Operacional EMAE
        </h2>

        <p>
          Conectando ao GPSVISTA...
        </p>
      </div>
    );
  }

  const indicators =
    data?.indicadores || {};

  const filter =
    data?.filtro || {};

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="emae-page">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="emae-header">
        <div className="emae-brand">
          <div className="emae-brand-icon">
            <MdShield />
          </div>

          <div>
            <div className="emae-brand-line">
              <span className="emae-brand-client">
                EMAE
              </span>

              <span className="emae-brand-divider">
                /
              </span>

              <span className="emae-brand-unit">
                SABARÁ
              </span>
            </div>

            <span className="emae-brand-subtitle">
              Central de Monitoramento Operacional
            </span>
          </div>
        </div>

        <div className="emae-header-status">
          <div
            className={`emae-live ${
              filter.atual
                ? ""
                : "historical"
            }`}
          >
            <span className="emae-live-dot" />

            <span>
              {filter.atual
                ? "MONITORAMENTO AO VIVO"
                : "MODO HISTÓRICO"}
            </span>
          </div>

          <div className="emae-header-update">
            {filter.atual ? (
              <>
                <MdRefresh className="emae-refresh-icon" />

                Atualização automática · 5s
              </>
            ) : (
              <>
                <MdHistory />

                Consulta histórica
              </>
            )}
          </div>

          <div className="emae-header-time">
            {lastFetch
              ? lastFetch.toLocaleTimeString(
                  "pt-BR",
                )
              : "--:--:--"}
          </div>
        </div>
      </header>

      <div className="emae-push-floating">
        
      </div>

      {/* ======================================================
          NOVA TELEMETRIA
      ====================================================== */}

      {newEvent &&
        filter.atual && (
          <div
            className={`emae-telemetry-alert ${
              getFeedConfig(
                newEvent.tipo,
              ).className
            }`}
          >
            <div className="emae-telemetry-wave">
              <MdSensors />
            </div>

            <div className="emae-telemetry-alert-content">
              <span className="emae-telemetry-label">
                NOVA TELEMETRIA
              </span>

              <strong>
                {
                  newEvent.titulo
                }
              </strong>

              <span>
                {cleanPointName(
                  newEvent.local,
                )}

                {newEvent.vigilante
                  ? ` · ${newEvent.vigilante}`
                  : ""}
              </span>
            </div>

            <div className="emae-telemetry-time">
              {formatTime(
                newEvent.data,
              )}
            </div>
          </div>
        )}

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="emae-main">
        {/* ====================================================
            MAPA
        ==================================================== */}

        <section className="emae-map-section">
          <MapContainer
            center={mapCenter}
            zoom={16}
            className="emae-map"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapAutoFit
              points={
                validPoints
              }
              enabled={true}
            />

            <MapFocus
              focus={
                focusPoint
              }
            />

            {validPoints.map(
              (point) => {
                const config =
                  getStatusConfig(
                    point.situacao,
                  );

                const isPulsing =
                  pulsePoints.includes(
                    normalizeText(
                      point.nome,
                    ),
                  );

                return (
                  <CircleMarker
                    key={
                      point.nome
                    }
                    center={[
                      Number(
                        point.latitude,
                      ),
                      Number(
                        point.longitude,
                      ),
                    ]}
                    radius={
                      isPulsing
                        ? 14
                        : 8
                    }
                    pathOptions={{
                      color:
                        isPulsing
                          ? "#ffffff"
                          : config.color,

                      fillColor:
                        config.color,

                      fillOpacity:
                        0.9,

                      weight:
                        isPulsing
                          ? 4
                          : 2,

                      className:
                        isPulsing
                          ? "emae-map-marker-pulse"
                          : "",
                    }}
                  >
                    <Tooltip
                      direction="top"
                      offset={[
                        0,
                        -8,
                      ]}
                      opacity={
                        0.95
                      }
                    >
                      <strong>
                        {cleanPointName(
                          point.nome,
                        )}
                      </strong>

                      <br />

                      {
                        config.label
                      }
                    </Tooltip>

                    <Popup>
                      <div className="emae-map-popup">
                        <span className="emae-map-popup-title">
                          {cleanPointName(
                            point.nome,
                          )}
                        </span>

                        <span
                          className={`emae-map-popup-status ${config.className}`}
                        >
                          {
                            config.label
                          }
                        </span>

                        {point.ultimaTarefa && (
                          <>
                            <div className="emae-popup-row">
                              <span>
                                Última atividade
                              </span>

                              <strong>
                                {formatDateTime(
                                  point
                                    .ultimaTarefa
                                    .terminoreal ||
                                    point
                                      .ultimaTarefa
                                      .disponibilizacao,
                                )}
                              </strong>
                            </div>

                            <div className="emae-popup-row">
                              <span>
                                Vigilante
                              </span>

                              <strong>
                                {point
                                  .ultimaTarefa
                                  .vigilante ||
                                  "-"}
                              </strong>
                            </div>

                            {point
                              .ultimaTarefa
                              .pdf && (
                              <a
                                href={
                                  point
                                    .ultimaTarefa
                                    .pdf
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="emae-popup-link"
                              >
                                <MdDescription />

                                Abrir relatório
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              },
            )}
          </MapContainer>

          {/* MAPA - CABEÇALHO */}

          <div className="emae-map-title">
            <div>
              <MdLocationOn />

              <div>
                <strong>
                  Telemetria de Ronda
                </strong>

                <span>
                  {
                    validPoints.length
                  }{" "}
                  pontos monitorados
                </span>
              </div>
            </div>

            <span className="emae-map-live">
              {filter.atual ? (
                <>
                  <MdSensors />
                  GPSVISTA LIVE
                </>
              ) : (
                <>
                  <MdHistory />
                  HISTÓRICO
                </>
              )}
            </span>
          </div>

          {/* LEGENDA */}

          <div className="emae-map-legend">
            <div>
              <span className="legend-dot green" />
              Realizada
            </div>

            <div>
              <span className="legend-dot yellow" />
              Pendente
            </div>

            <div>
              <span className="legend-dot red" />
              Não realizada
            </div>

            <div>
              <span className="legend-dot gray" />
              Sem atividade
            </div>
          </div>

          {/* FEED */}

          <div className="emae-map-feed">
            <div className="emae-map-feed-header">
              <div>
                <MdSensors />

                TELEMETRIA
              </div>

              <span>
                {filter.atual
                  ? "tempo real"
                  : "ronda selecionada"}
              </span>
            </div>

            <div className="emae-map-feed-list">
              {feed
                .slice(0, 7)
                .map(
                  (event) => {
                    const config =
                      getFeedConfig(
                        event.tipo,
                      );

                    return (
                      <button
                        key={
                          event.id
                        }
                        type="button"
                        className={`emae-map-feed-item ${config.className}`}
                        onClick={() => {
                          if (
                            Number.isFinite(
                              Number(
                                event.latitude,
                              ),
                            ) &&
                            Number.isFinite(
                              Number(
                                event.longitude,
                              ),
                            )
                          ) {
                            setFocusPoint(
                              {
                                latitude:
                                  event.latitude,

                                longitude:
                                  event.longitude,

                                id:
                                  event.id,
                              },
                            );
                          }
                        }}
                      >
                        <div className="emae-feed-icon">
                          {
                            config.icon
                          }
                        </div>

                        <div className="emae-feed-info">
                          <strong>
                            {cleanPointName(
                              event.local,
                            )}
                          </strong>

                          <span>
                            {event.vigilante ||
                              config.label}
                          </span>
                        </div>

                        <time>
                          {formatTime(
                            event.data,
                          )}
                        </time>
                      </button>
                    );
                  },
                )}
            </div>
          </div>
        </section>

        {/* ====================================================
            SIDEBAR
        ==================================================== */}

        <aside className="emae-sidebar">
          {/* ==================================================
              RONDA / FILTRO
          ================================================== */}

          <section className="emae-panel emae-operation-panel">
            <div className="emae-panel-header">
              <div>
                <span className="emae-section-kicker">
                  OPERAÇÃO
                </span>

                <h2>
                  Status da Ronda
                </h2>
              </div>

              <MdMyLocation />
            </div>

            {/* NAVEGADOR DE RONDAS */}

            <div className="emae-round-navigation">
              <button
                type="button"
                className="emae-round-arrow"
                disabled={
                  !filter.podeAnterior
                }
                onClick={
                  goPreviousRound
                }
                title="Ronda anterior"
              >
                <MdChevronLeft />
              </button>

              <div className="emae-round-selected">
                <span
                  className={`emae-round-mode ${
                    filter.atual
                      ? "live"
                      : "history"
                  }`}
                >
                  {filter.atual
                    ? "RONDA ATUAL"
                    : "HISTÓRICO"}
                </span>

                <strong>
                  {filter.nome ||
                    "Ronda"}
                </strong>

                <small>
                  {formatWindowRange(
                    filter.inicio,
                    filter.fim,
                  )}
                </small>
              </div>

              <button
                type="button"
                className="emae-round-arrow"
                disabled={
                  !filter.podeProxima
                }
                onClick={
                  goNextRound
                }
                title="Próxima ronda"
              >
                <MdChevronRight />
              </button>
            </div>

            {!filter.atual && (
              <button
                type="button"
                className="emae-now-button"
                onClick={
                  goNow
                }
              >
                <MdSensors />

                VOLTAR PARA A RONDA ATUAL
              </button>
            )}

            {/* PROGRESSO */}

            <div className="emae-progress-header">
              <div>
                <strong>
                  {indicators.percentualExecucao ??
                    0}
                  %
                </strong>

                <span>
                  execução da ronda selecionada
                </span>
              </div>

              <span>
                {indicators.realizadas ??
                  0}{" "}
                /{" "}
                {indicators.total ??
                  0}
              </span>
            </div>

            <div className="emae-progress">
              <div
                className="emae-progress-fill"
                style={{
                  width: `${Math.min(
                    Math.max(
                      Number(
                        indicators.percentualExecucao ||
                          0,
                      ),
                      0,
                    ),
                    100,
                  )}%`,
                }}
              />
            </div>

            <div className="emae-kpi-grid">
              <div className="emae-kpi-card success">
                <MdCheckCircle />

                <div>
                  <strong>
                    {indicators.realizadas ??
                      0}
                  </strong>

                  <span>
                    Realizadas
                  </span>
                </div>
              </div>

              <div className="emae-kpi-card warning">
                <MdSchedule />

                <div>
                  <strong>
                    {indicators.pendentes ??
                      0}
                  </strong>

                  <span>
                    Pendentes
                  </span>
                </div>
              </div>

              <div className="emae-kpi-card danger">
                <MdWarning />

                <div>
                  <strong>
                    {indicators.atrasadas ??
                      0}
                  </strong>

                  <span>
                    Atrasadas
                  </span>
                </div>
              </div>

              <div className="emae-kpi-card critical">
                <MdError />

                <div>
                  <strong>
                    {indicators.naoRealizadas ??
                      0}
                  </strong>

                  <span>
                    Não realizadas
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              ÚLTIMA ATIVIDADE
          ================================================== */}

          <section className="emae-panel emae-last-activity">
            <div className="emae-panel-header compact">
              <div>
                <span className="emae-section-kicker">
                  ÚLTIMA ATIVIDADE
                </span>
              </div>

              <MdAccessTime />
            </div>

            {data?.ultimaAtividade ? (
              <>
                <strong className="emae-last-location">
                  {cleanPointName(
                    data
                      .ultimaAtividade
                      .local,
                  )}
                </strong>

                <div className="emae-last-meta">
                  <span>
                    {data
                      .ultimaAtividade
                      .vigilante ||
                      "Sistema"}
                  </span>

                  <time>
                    {formatTime(
                      data
                        .ultimaAtividade
                        .data,
                    )}
                  </time>
                </div>
              </>
            ) : (
              <span className="emae-empty">
                Nenhuma atividade na ronda.
              </span>
            )}
          </section>

          {/* ==================================================
              OCORRÊNCIAS
          ================================================== */}

          <section className="emae-panel emae-event-panel occurrence">
            <div className="emae-panel-header">
              <div>
                <span className="emae-section-kicker">
                  SEGURANÇA
                </span>

                <h2>
                  Ocorrências
                </h2>
              </div>

              <div className="emae-panel-count danger">
                {
                  latestFinishedOccurrences.length
                }
              </div>
            </div>

            {openOccurrences.length >
              0 && (
              <div className="emae-open-request">
                <MdSchedule />

                <div>
                  <strong>
                    {
                      openOccurrences.length
                    }{" "}
                    registro(s) aberto(s)
                  </strong>

                  <span>
                    aguardando conclusão
                  </span>
                </div>
              </div>
            )}

            <div className="emae-small-list">
              {latestFinishedOccurrences.length >
              0 ? (
                latestFinishedOccurrences.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="emae-small-list-item"
                    >
                      <div>
                        <strong>
                          {cleanPointName(
                            item.estruturadescricao ||
                              item.local ||
                              "Ocorrência",
                          )}
                        </strong>

                        <span>
                          {formatDateTime(
                            item.terminoreal,
                          )}
                        </span>
                      </div>

                      {item.pdf && (
                        <a
                          href={
                            item.pdf
                          }
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir relatório"
                        >
                          <MdOpenInNew />
                        </a>
                      )}
                    </div>
                  ),
                )
              ) : (
                <div className="emae-no-event">
                  <MdCheckCircle />

                  <span>
                    Nenhuma ocorrência concluída nas últimas 24h
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* ==================================================
              JUSTIFICATIVAS
          ================================================== */}

          <section className="emae-panel emae-event-panel justification">
            <div className="emae-panel-header">
              <div>
                <span className="emae-section-kicker">
                  CONTROLE
                </span>

                <h2>
                  Justificativas
                </h2>
              </div>

              <div className="emae-panel-count warning">
                {
                  latestFinishedJustifications.length
                }
              </div>
            </div>

            {openJustifications.length >
              0 && (
              <div className="emae-open-request">
                <MdSchedule />

                <div>
                  <strong>
                    {
                      openJustifications.length
                    }{" "}
                    solicitações abertas
                  </strong>

                  <span>
                    disponível para preenchimento
                  </span>
                </div>
              </div>
            )}

            <div className="emae-small-list">
              {latestFinishedJustifications.length >
              0 ? (
                latestFinishedJustifications.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="emae-small-list-item"
                    >
                      <div>
                        <strong>
                          {cleanPointName(
                            item.estruturadescricao ||
                              item.local ||
                              "Justificativa",
                          )}
                        </strong>

                        <span>
                          {formatDateTime(
                            item.terminoreal,
                          )}
                        </span>
                      </div>

                      {item.pdf && (
                        <a
                          href={
                            item.pdf
                          }
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir relatório"
                        >
                          <MdOpenInNew />
                        </a>
                      )}
                    </div>
                  ),
                )
              ) : (
                <div className="emae-no-event">
                  <MdCheckCircle />

                  <span>
                    Nenhuma justificativa concluída nas últimas 24h
                  </span>
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="emae-footer">
        <div>
          <span className="emae-footer-dot" />

          {filter.atual
            ? "Conexão GPSVISTA ativa"
            : "Visualizando histórico"}
        </div>

        <div>
          CR 92296 · SABARÁ
        </div>

        <div>
          {filter.nome ||
            "Ronda"}{" "}
          ·{" "}
          {formatWindowRange(
            filter.inicio,
            filter.fim,
          )}
        </div>
      </footer>

      <div className="emae-push-fixed">
        <EmaePushButton />
      </div>

      {error && (
        <div className="emae-connection-error">
          <MdWarning />

          {error}
        </div>
      )}
    </div>
  );
}






