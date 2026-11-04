import { useCallback, useEffect, useRef, useState } from "react";
import "./npsmonitor.css";

/* =========================================================
   CONFIGURAÇÃO — EDITE AQUI
   ========================================================= */
const EVENT_NAME = "Semana da Qualidade";
const EVENT_START = "2026-11-09T10:00"; // início do evento (contagem regressiva). Use null para mostrar "A definir"
// Endpoint que recebe as melhorias (POST JSON). Use "" para apenas simular o envio.
const SUBMIT_URL = "/api/melhorias";

const ROOM = "Teams";
const QUALIDADE = "Yasmin / Amanda";
const PROJETOS = "Enzo / Ana";

// date: "AAAA-MM-DD" · time: "HH:MM" (ou null se o horário ainda não foi definido) · dur: duração em minutos
// speaker: nome do palestrante (ou null para não mostrar palestrante)
// Com "time" preenchido, o botão "Salvar na agenda" aparece automaticamente.
const TALKS = [
  {
    date: "2026-11-09",
    time: "15:00",
    dur: 60,
    tag: "Abertura",
    speaker: "Thamires",
    room: ROOM,
    title: "Abertura da Semana da Qualidade",
    desc: "Abertura oficial da Semana da Qualidade, com a apresentação da programação e do propósito do evento.",
  },
  {
    date: "2026-11-10",
    time: "15:00",
    dur: 60,
    tag: "Qualidade",
    speaker: QUALIDADE,
    room: ROOM,
    title: "Por que o Cliente deve ser o foco quando o assunto é qualidade?",
    desc: "Uma conversa sobre por que o cliente precisa estar no centro das decisões de qualidade e como isso aparece no dia a dia da GPS.",
  },
  {
    date: "2026-11-11",
    time: "15:00",
    dur: 60,
    tag: "Projetos",
    speaker: PROJETOS,
    room: ROOM,
    title: "Apresentação GPSVISTA",
    desc: "Apresentação do GPSVISTA e de como ele pode apoiar o trabalho das áreas no dia a dia.",
  },
  {
    date: "2026-11-12",
    time: "15:00",
    dur: 60,
    tag: "Qualidade",
    speaker: QUALIDADE,
    room: ROOM,
    title: "Todo desempenho tem um termômetro você está olhando para ele?",
    desc: "Um olhar sobre o que o contrato já informa a respeito da influência do score e por que acompanhar esse indicador faz diferença na qualidade.",
  },
  {
    date: "2026-11-13",
    time: "15:00",
    dur: 60,
    tag: "Projetos",
    speaker: PROJETOS,
    room: ROOM,
    title: "Melhoria em processos com a tecnologia",
    desc: "Como a tecnologia pode apoiar a melhoria dos processos, deixando as rotinas mais ágeis e com menos retrabalho.",
  },
];

const AREAS = [
  "Comercial",
  "Financeiro",
  "Operações",
  "RH",
  "TI",
  "Logística",
  "Outras",
];

const PHRASES = [
  "Em 400 metros, vire à direita na melhoria contínua.",
  "Você chegou ao seu destino: processos melhores.",
  "Rota calculada: menos retrabalho, mais resultado.",
  "Atenção: radar de ideias à frente!",
];

const NAV = [
  { id: "qs-home", label: "Início" },
  { id: "qs-rota", label: "Rota" },
  { id: "qs-melhorias", label: "Melhorias" },
];

const LV = { 1: "Baixo", 2: "Médio", 3: "Alto" };
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* =========================================================
   UTILIDADES
   ========================================================= */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (n) => String(n).padStart(2, "0");
const initials = (s) =>
  String(s)
    .split("/")
    .map((x) => x.trim()[0] || "")
    .join("") || "?";

function whenText(t) {
  if (!t.date) return "A definir";
  const d = new Date(t.date + "T" + (t.time || "00:00"));
  const day = `${WD[d.getDay()]} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  if (!t.time) return `${day} · horário a definir`;
  const e = new Date(d.getTime() + (t.dur || 60) * 6e4);
  return `${day} · ${pad(d.getHours())}:${pad(d.getMinutes())}–${pad(e.getHours())}:${pad(e.getMinutes())}`;
}

function downloadIcs(t, i) {
  const s = new Date(t.date + "T" + t.time);
  const e = new Date(s.getTime() + (t.dur || 60) * 6e4);
  const f = (d) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const txt = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GrupoGPS//Semana da Qualidade//PT",
    "BEGIN:VEVENT",
    `UID:gps-qualidade-${i}@grupogps`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(s)}`,
    `DTEND:${f(e)}`,
    `SUMMARY:${EVENT_NAME}: ${t.title}`,
    `LOCATION:${t.room}`,
    `DESCRIPTION:${t.desc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([txt], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `palestra-${i + 1}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function launchConfetti(cv, x, y) {
  if (!cv) return;
  const ctx = cv.getContext("2d");
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  const cols = ["#2dff9a", "#00d4ff", "#ffb020", "#ff4d8d", "#9b7bff"];
  const ps = Array.from({ length: 130 }, () => ({
    x,
    y,
    vx: (Math.random() - 0.5) * 16,
    vy: Math.random() * -16 - 3,
    s: Math.random() * 8 + 4,
    c: cols[(Math.random() * 5) | 0],
    r: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    life: 1,
  }));
  (function f() {
    if (!cv.isConnected) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = false;
    ps.forEach((p) => {
      p.vy += 0.45;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      p.life -= 0.008;
      if (p.life > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
    });
    if (alive) requestAnimationFrame(f);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  })();
}

/* =========================================================
   HERO: título animado, typewriter, contagem regressiva
   ========================================================= */
function Title() {
  const words = EVENT_NAME.split(" ");
  let i = 0;
  return (
    <h1>
      {words.map((w, wi) => {
        const last = wi === words.length - 1;
        return (
          <span key={wi}>
            <span
              className={last ? "grad" : undefined}
              style={{ display: "inline-block", marginRight: ".25em" }}
            >
              {[...w].map((ch, ci) => (
                <span
                  key={ci}
                  className="l"
                  style={{
                    animationDelay: `${i++ * 45}ms`,
                    ...(last
                      ? { background: "inherit", WebkitBackgroundClip: "text" }
                      : {}),
                  }}
                >
                  {ch}
                </span>
              ))}
            </span>
            {!last && <br />}
          </span>
        );
      })}
    </h1>
  );
}

function Typewriter() {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    let p = 0,
      c = 0,
      del = false,
      timer;
    const tick = () => {
      const full = PHRASES[p];
      setTyped(full.slice(0, c));
      if (!del && c < full.length) {
        c++;
        timer = setTimeout(tick, 45);
      } else if (!del) {
        del = true;
        timer = setTimeout(tick, 1800);
      } else if (c > 0) {
        c--;
        timer = setTimeout(tick, 20);
      } else {
        del = false;
        p = (p + 1) % PHRASES.length;
        timer = setTimeout(tick, 300);
      }
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return <span className="type">{typed}</span>;
}

function Countdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!EVENT_START) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!EVENT_START) {
    return (
      <div className="count">
        <div style={{ minWidth: "auto", padding: "16px 34px" }}>
          <b style={{ fontSize: "1.6rem" }}>A definir</b>
          <span>Data do evento</span>
        </div>
      </div>
    );
  }

  const d = new Date(EVENT_START).getTime() - now;
  if (d <= 0) {
    return (
      <div className="count">
        <div style={{ minWidth: "auto", padding: "16px 30px" }}>
          <b style={{ fontSize: "1.4rem", color: "var(--acc)" }}>
            🚀 A semana já começou!
          </b>
        </div>
      </div>
    );
  }

  const v = [
    ["Dias", Math.floor(d / 864e5)],
    ["Horas", Math.floor(d / 36e5) % 24],
    ["Min", Math.floor(d / 6e4) % 60],
    ["Seg", Math.floor(d / 1e3) % 60],
  ];
  return (
    <div className="count">
      {v.map(([l, n]) => (
        <div key={l}>
          <b>{pad(n)}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   ROTA / PALESTRAS
   ========================================================= */
function Talk({ t, i, showToast }) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef(null);

  const onClick = (e) => {
    if (e.target.closest("[data-ics]")) {
      downloadIcs(t, i);
      showToast("📅 Arquivo de agenda baixado!");
      return;
    }
    setOpen((o) => !o);
  };

  const onMove = (e) => {
    const card = cardRef.current;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  };

  return (
    <div className="stop reveal">
      <div
        ref={cardRef}
        className={`talk${open ? " open" : ""}`}
        onClick={onClick}
        onMouseMove={onMove}
        onMouseLeave={() => (cardRef.current.style.transform = "")}
      >
        <div className="top">
          <span className="when">{whenText(t)}</span>
          <span className="chip">{t.tag}</span>
        </div>
        <h3>{t.title}</h3>
        {t.speaker && (
          <div className="who">
            <div className="av">{initials(t.speaker)}</div>
            <div>
              <b style={{ color: "var(--fg)" }}>{t.speaker}</b>
            </div>
          </div>
        )}
        <div className="more">
          <p>{t.desc}</p>
          <p className="mono" style={{ fontSize: ".85rem" }}>
            📍 {t.room}
          </p>
          {t.date && t.time && (
            <button className="btn ghost" data-ics={i} type="button">
              📅 Salvar na agenda
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   NOVA MELHORIA
   ========================================================= */
function Seg({ value, onChange }) {
  return (
    <div className="seg">
      {[1, 2, 3].map((v) => (
        <button
          key={v}
          type="button"
          className={value === v ? "on" : undefined}
          onClick={() => onChange(v)}
        >
          {LV[v]}
        </button>
      ))}
    </div>
  );
}

function MelhoriaForm({ showToast, onConfetti }) {
  const boxRef = useRef(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [impact, setImpact] = useState(2);
  const [effort, setEffort] = useState(1);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const t = title.trim();
    const d = desc.trim();
    if (!t || !d) return;
    const data = {
      area,
      title: t,
      desc: d,
      impact: LV[impact],
      effort: LV[effort],
      name: name.trim() || "Anônimo",
    };
    setSending(true);
    try {
      if (SUBMIT_URL) {
        const r = await fetch(SUBMIT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
      } else {
        await new Promise((r) => setTimeout(r, 700)); // apenas simula o envio
      }
      const rect = boxRef.current.getBoundingClientRect();
      onConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      setSent(data);
    } catch (err) {
      showToast("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  function again() {
    setName("");
    setArea(AREAS[0]);
    setTitle("");
    setDesc("");
    setImpact(2);
    setEffort(1);
    setSent(null);
  }

  return (
    <div className="formwrap reveal" ref={boxRef}>
      {!sent ? (
        <form className="card" autoComplete="off" onSubmit={submit}>
          <h3>💡 Nova melhoria</h3>
          <label>Seu nome (opcional)</label>
          <input
            maxLength={40}
            placeholder="Anônimo é bem-vindo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label>Área</label>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <label>Título da melhoria</label>
          <input
            maxLength={80}
            required
            placeholder="Ex.: Automatizar relatório semanal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label>Descreva o problema e como Projetos ajuda</label>
          <textarea
            maxLength={400}
            required
            placeholder="O que acontece hoje? O que mudaria?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="row2">
            <div>
              <label>Impacto</label>
              <Seg value={impact} onChange={setImpact} />
            </div>
            <div>
              <label>Esforço</label>
              <Seg value={effort} onChange={setEffort} />
            </div>
          </div>
          <button className="btn send" type="submit" disabled={sending}>
            {sending ? "Enviando…" : "Enviar melhoria 🚀"}
          </button>
        </form>
      ) : (
        <div className="card done">
          <svg className="ok" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="24" />
            <path d="M14 27l8 8 16-17" />
          </svg>
          <h3>Melhoria enviada!</h3>
          <p>
            Sua sugestão foi registrada. Obrigado por ajudar a melhorar nossos
            processos!
          </p>
          <div className="sum">
            <small>
              {sent.area} · Impacto {sent.impact} · Esforço {sent.effort}
            </small>
            <b>{sent.title}</b>
          </div>
          <button className="btn ghost" type="button" onClick={again}>
            Enviar outra melhoria
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PÁGINA
   ========================================================= */
export default function NPSMonitor() {
  const scrollRef = useRef(null);
  const bgRef = useRef(null);
  const glowRef = useRef(null);
  const confettiRef = useRef(null);
  const routeRef = useRef(null);
  const fillRef = useRef(null);
  const pinRef = useRef(null);
  const toastTimer = useRef(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const [activeNav, setActiveNav] = useState(NAV[0].id);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastShow(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 3200);
  }, []);

  const goTo = (id) => {
    scrollRef.current
      ?.querySelector("#" + id)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // esconde a sidebar do sistema enquanto a página está aberta
  useEffect(() => {
    document.body.classList.add("hide-sidebar");
    return () => document.body.classList.remove("hide-sidebar");
  }, []);

  // fundo: rede de pontos interativa
  useEffect(() => {
    const cv = bgRef.current;
    const ctx = cv.getContext("2d");
    let W,
      H,
      pts = [],
      raf;
    const mouse = { x: -999, y: -999 };

    const size = () => {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
      pts = Array.from(
        { length: Math.min(90, Math.floor((W * H) / 16000)) },
        () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
        }),
      );
    };
    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      const g = glowRef.current;
      if (g) {
        g.style.left = e.clientX + "px";
        g.style.top = e.clientY + "px";
      }
    };
    window.addEventListener("resize", size);
    window.addEventListener("mousemove", onMove);
    size();

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach((p) => {
        const dx = mouse.x - p.x,
          dy = mouse.y - p.y,
          d = Math.hypot(dx, dy);
        if (d < 160) {
          p.x -= (dx / d) * 0.6;
          p.y -= (dy / d) * 0.6;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, 7);
        ctx.fillStyle = "rgba(45,255,154,.7)";
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i],
            b = pts[j],
            d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) {
            ctx.strokeStyle = `rgba(0,212,255,${0.18 * (1 - d / 130)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      pts.forEach((p) => {
        const d = Math.hypot(mouse.x - p.x, mouse.y - p.y);
        if (d < 180) {
          ctx.strokeStyle = `rgba(45,255,154,${0.5 * (1 - d / 180)})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // scroll: pin viajante, nav ativa e animação de entrada (reveal)
  useEffect(() => {
    const sc = scrollRef.current;
    const route = routeRef.current;
    const fill = fillRef.current;
    const pin = pinRef.current;

    const upd = () => {
      const r = route.getBoundingClientRect();
      const p = clamp((window.innerHeight * 0.55 - r.top) / r.height, 0, 1);
      const h = p * r.height;
      fill.style.height = h + "px";
      pin.style.top = h + "px";
      route.querySelectorAll(".stop").forEach((s) => {
        const sr = s.getBoundingClientRect();
        s.classList.toggle("passed", sr.top + 34 < window.innerHeight * 0.55);
      });

      let cur = NAV[0].id;
      NAV.forEach(({ id }) => {
        const el = sc.querySelector("#" + id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4)
          cur = id;
      });
      setActiveNav(cur);
    };

    sc.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();

    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("show");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    sc.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    return () => {
      sc.removeEventListener("scroll", upd);
      window.removeEventListener("resize", upd);
      io.disconnect();
    };
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  return (
    <div className="nps-scope" ref={scrollRef}>
      <canvas className="qs-bg" ref={bgRef} />
      <div className="qs-glow" ref={glowRef} />
      <canvas className="qs-confetti" ref={confettiRef} />
      <div className={`toast${toastShow ? " show" : ""}`}>{toastMsg}</div>

      <nav>
        {NAV.map(({ id, label }) => (
          <a
            key={id}
            href={"#" + id}
            className={activeNav === id ? "on" : undefined}
            onClick={(e) => {
              e.preventDefault();
              goTo(id);
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      <header className="hero" id="qs-home">
        <div>
          <div className="radar">
            <i></i>
            <i></i>
            <i></i>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"
                fill="#2dff9a"
              />
              <circle cx="12" cy="10" r="2.8" fill="#06080f" />
            </svg>
          </div>
          <span className="tag">GrupoGPS · Evento interno</span>
          <Title />
          <p className="sub">
            Recalculando a rota rumo à excelência. <Typewriter />
          </p>
          <Countdown />
          <a
            href="#qs-rota"
            className="btn"
            onClick={(e) => {
              e.preventDefault();
              goTo("qs-rota");
            }}
          >
            Iniciar navegação ➜
          </a>
          <div className="scroll">↓ ROLE PARA VIAJAR</div>
        </div>
      </header>

      <main>
        <section id="qs-rota">
          <div className="head reveal">
            <div className="eyebrow">// 01 · ROTA DA QUALIDADE</div>
            <h2>
              5 paradas. <span style={{ color: "var(--acc2)" }}>1 destino.</span>
            </h2>
            <p className="lead">
              Acompanhe a programação da Semana da Qualidade, palestra por
              palestra.
            </p>
          </div>
          <div className="route" ref={routeRef}>
            <div className="track"></div>
            <div className="fill" ref={fillRef}></div>
            <svg className="pin" ref={pinRef} viewBox="0 0 24 24">
              <path
                d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"
                fill="#2dff9a"
              />
              <circle cx="12" cy="10" r="2.8" fill="#06080f" />
            </svg>
            <div>
              {TALKS.map((t, i) => (
                <Talk key={i} t={t} i={i} showToast={showToast} />
              ))}
            </div>
          </div>
        </section>

        <section id="qs-melhorias">
          <div className="head reveal">
            <div className="eyebrow">// 02 · MELHORIAS</div>
            <h2>
              Onde <span style={{ color: "var(--acc2)" }}>Projetos</span> pode
              ajudar?
            </h2>
            <p className="lead">
              Conte uma melhoria de processo da sua área em que o time de
              Projetos consegue apoiar.
            </p>
          </div>
          <MelhoriaForm
            showToast={showToast}
            onConfetti={(x, y) => launchConfetti(confettiRef.current, x, y)}
          />
        </section>
      </main>
    </div>
  );
}
