import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiActivity, FiArrowRight, FiCheck, FiCheckCircle, FiClock,
  FiDownload, FiEdit2, FiFilter, FiInfo, FiMessageCircle,
  FiPlus, FiRefreshCw, FiSearch, FiSettings, FiTrash2,
  FiUserCheck, FiUsers, FiX, FiMaximize2, FiCalendar,
} from "react-icons/fi";
import "./npsmonitor.css";

/* =============================================================
   GRUPO GPS · CHECK-IN EXPERIENCE
   Integração com o backend EXISTENTE:
     POST /api/melhorias  { acao: "listar" | ..., ...dados }
   Endpoint público (sem token JWT); NÃO usa localStorage para salvar.
   A persistência fica no data/presencas-evento.json do backend.
   ============================================================= */
const API_BASE = (import.meta.env.VITE_API_BASE || "https://api-info.xyz/api").replace(/\/+$/, "");
const API_URL = `${API_BASE}/melhorias`;
const POLL_MS = 12000;

const normal = (v = "") => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
const digits = (v = "") => String(v ?? "").replace(/\D/g, "");
const phoneBR = (v) => { const n = digits(v); return [10, 11].includes(n.length) ? `55${n}` : n; };
const clock = (d) => d ? new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
const fullDate = (d) => d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
const initials = (s = "") => { const w = s.trim().split(/\s+/).filter(Boolean); return ((w[0]?.[0] || "?") + (w.length > 1 ? w.at(-1)?.[0] || "" : "")).toUpperCase(); };
const avatarTone = (name) => [...String(name)].reduce((n, c) => n + c.charCodeAt(0), 0) % 6;
const emptyGuest = () => ({ name: "", group: "interno", detail: "", clientGroup: "", managerId: "" });
const emptyManager = () => ({ name: "", phone: "", verified: false });

async function api(acao, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao, ...payload }),
    cache: "no-store",
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || json?.sucesso !== true) {
    throw new Error(json?.mensagem || `Erro HTTP ${response.status} ao acessar a lista de presença.`);
  }
  return json.data;
}

function Starfield() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let stars = [], w = 0, h = 0, raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.floor(w * ratio); cv.height = Math.floor(h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Posições estáveis, para não piscar durante os renders do React.
      let seed = 6142026;
      const rnd = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
      stars = Array.from({ length: Math.min(77, Math.max(33, Math.round(w * h / 18500))) }, () => ({
        x: rnd() * w, y: rnd() * h, r: .45 + rnd() * .9, phase: rnd() * 6.28,
      }));
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      const dots = stars.map(s => ({ x: s.x + Math.sin(t * .00008 + s.phase) * 5, y: s.y + Math.cos(t * .00007 + s.phase) * 4, r: s.r }));
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i]; let links = 0;
        for (let j = i + 1; j < dots.length && links < 3; j++) {
          const b = dots[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 122) {
            ctx.strokeStyle = `rgba(0,207,191,${(1 - d / 122) * .16})`;
            ctx.lineWidth = .65; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); links++;
          }
        }
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = i % 4 === 0 ? "rgba(0,218,212,.75)" : "rgba(20,202,152,.65)"; ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    resize(); draw(0);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas className="gpsx-stars" ref={canvasRef} aria-hidden="true" />;
}

function Modal({ eyebrow, title, children, close, size = "normal" }) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);
  return <div className="gpsx-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <section className={`gpsx-dialog ${size === "wide" ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="gpsx-dialog-header"><div><small>{eyebrow}</small><h2>{title}</h2></div>
        <button className="gpsx-icon-button" onClick={close} type="button" aria-label="Fechar"><FiX /></button></header>
      <div className="gpsx-dialog-body">{children}</div>
    </section>
  </div>;
}

function GuestForm({ source, managers, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...emptyGuest(), ...source, managerId: source?.managerId || "" }));
  const [bulk, setBulk] = useState(false);
  const [names, setNames] = useState("");
  const patch = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = e => {
    e.preventDefault();
    if (bulk) onSubmit({ bulk: true, names: names.split(/\r?\n/).map(s => s.trim()).filter(Boolean), group: form.group, detail: form.detail, clientGroup: form.group === "cliente" ? form.detail : "", managerId: form.managerId });
    else onSubmit({ ...form, clientGroup: form.group === "cliente" ? form.detail : "" });
  };
  return <form className="gpsx-form" onSubmit={submit}>
    {!source && <div className="gpsx-form-switch"><button type="button" className={!bulk ? "active" : ""} onClick={() => setBulk(false)}>Um participante</button><button type="button" className={bulk ? "active" : ""} onClick={() => setBulk(true)}>Cadastro em lote</button></div>}
    {bulk ? <label>Nomes (um por linha)<textarea rows={7} required value={names} onChange={e => setNames(e.target.value)} placeholder={"Ana Silva\nCarlos Ferreira\nMaria Oliveira"} /></label>
      : <label>Nome completo<input autoFocus required minLength={2} maxLength={180} value={form.name} onChange={e => patch("name", e.target.value)} placeholder="Nome do convidado" /></label>}
    <div className="gpsx-form-columns">
      <label>Categoria<select value={form.group} onChange={e => patch("group", e.target.value)}><option value="interno">Interno</option><option value="cliente">Cliente</option></select></label>
      <label>{form.group === "cliente" ? "Empresa / cliente" : "Cargo / área"}<input maxLength={160} value={form.detail} onChange={e => patch("detail", e.target.value)} placeholder={form.group === "cliente" ? "Nome da empresa" : "Área ou cargo"} /></label>
    </div>
    {form.group === "cliente" && <label>Gerente responsável<select value={form.managerId || ""} onChange={e => patch("managerId", e.target.value)}><option value="">Sem gerente vinculado</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
    <div className="gpsx-dialog-actions"><button className="gpsx-button outline" type="button" onClick={onCancel}>Cancelar</button><button className="gpsx-button primary" type="submit" disabled={busy}><FiCheck />{busy ? "Salvando..." : source ? "Salvar alterações" : bulk ? "Adicionar lista" : "Adicionar convidado"}</button></div>
  </form>;
}

function ManagerForm({ source, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...emptyManager(), ...source }));
  return <form className="gpsx-form" onSubmit={e => { e.preventDefault(); onSubmit({ ...form, phone: phoneBR(form.phone) }); }}>
    <label>Nome do gerente<input autoFocus required maxLength={90} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
    <label>WhatsApp com DDD<input inputMode="tel" value={form.phone} placeholder="5511999999999" onChange={e => setForm({ ...form, phone: e.target.value, verified: false })} /></label>
    <label className="gpsx-check-label"><input type="checkbox" checked={!!form.verified} onChange={e => setForm({ ...form, verified: e.target.checked })} /> Conferi pessoalmente este número</label>
    <p className="gpsx-field-hint">O sistema apenas prepara a mensagem. O envio precisa ser confirmado manualmente no WhatsApp.</p>
    <div className="gpsx-dialog-actions"><button className="gpsx-button outline" type="button" onClick={onCancel}>Cancelar</button><button disabled={busy} className="gpsx-button primary" type="submit"><FiCheck />{busy ? "Salvando..." : "Salvar gerente"}</button></div>
  </form>;
}

export default function NPSMonitor() {
  const [data, setData] = useState({ eventTitle: "Evento Grupo GPS", guests: [], managers: [] });
  const [loaded, setLoaded] = useState(false);
  const [navActive, setNavActive] = useState("inicio");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [quickGroup, setQuickGroup] = useState("todos");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [group, setGroup] = useState("todos");
  const [sort, setSort] = useState("pending");
  const [dialog, setDialog] = useState(null);
  const [success, setSuccess] = useState(null);
  const [spot, setSpot] = useState(false);
  const [spotQuery, setSpotQuery] = useState("");
  const [toast, setToast] = useState("");
  const [eventName, setEventName] = useState("");
  const searchRef = useRef(null);
  const spotRef = useRef(null);
  const timerRef = useRef(null);
  const notify = useCallback(s => { setToast(s); clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setToast(""), 4500); }, []);

  const reload = useCallback(async (silent = false) => {
    if (busyRef.current) return;
    try { const current = await api("listar"); setData(current); setError(""); }
    catch (e) { setError(e.message || "Não foi possível carregar os registros do servidor."); }
    finally { if (!silent) setLoaded(true); }
  }, []);

  useEffect(() => {
    document.body.classList.add("hide-sidebar");
    reload();
    const poll = setInterval(() => reload(true), POLL_MS);
    return () => { document.body.classList.remove("hide-sidebar"); clearInterval(poll); clearTimeout(timerRef.current); };
  }, [reload]);

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); if (!dialog && !success) { setSpot(false); searchRef.current?.focus(); searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }
      }
      if (e.key === "Escape" && spot) setSpot(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, success, spot]);

  const guests = data.guests || [];
  const managers = data.managers || [];
  const byManager = useMemo(() => Object.fromEntries(managers.map(m => [m.id, m])), [managers]);
  const arrived = guests.filter(g => !!g.arrivedAt).length;
  const pending = guests.length - arrived;
  const pct = guests.length ? Math.round(arrived * 100 / guests.length) : 0;
  const matches = useCallback((g, term) => normal([g.name, g.detail, g.clientGroup, byManager[g.managerId]?.name].join(" ")).includes(normal(term)), [byManager]);
  const quick = useMemo(() => guests.filter(g => (quickGroup === "todos" || g.group === quickGroup) && matches(g, quickQuery)).sort((a, b) => Number(!!a.arrivedAt) - Number(!!b.arrivedAt) || a.name.localeCompare(b.name, "pt-BR")), [guests, quickGroup, quickQuery, matches]);
  const visible = useMemo(() => guests.filter(g => matches(g, query)).filter(g => group === "todos" || g.group === group).filter(g => status === "todos" || (status === "presentes" ? !!g.arrivedAt : !g.arrivedAt)).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : sort === "recent" ? (Date.parse(b.arrivedAt) || 0) - (Date.parse(a.arrivedAt) || 0) : Number(!!a.arrivedAt) - Number(!!b.arrivedAt) || a.name.localeCompare(b.name, "pt-BR")), [guests, query, group, status, sort, matches]);
  const recent = useMemo(() => guests.filter(g => g.arrivedAt).sort((a, b) => Date.parse(b.arrivedAt) - Date.parse(a.arrivedAt)).slice(0, 5), [guests]);
  const spotResults = useMemo(() => guests.filter(g => matches(g, spotQuery)).sort((a, b) => Number(!!a.arrivedAt) - Number(!!b.arrivedAt) || a.name.localeCompare(b.name, "pt-BR")).slice(0, 8), [guests, spotQuery, matches]);

  // O backend é a fonte única: não mostramos sucesso antes de confirmar o POST.
  const act = useCallback(async (acao, payload) => {
    if (busyRef.current) return null;
    busyRef.current = true; setBusy(true);
    try {
      const result = await api(acao, payload);
      try { const fresh = await api("listar"); setData(fresh); setError(""); }
      catch (e) { setError(`Alteração salva, mas a atualização da tela falhou: ${e.message}`); }
      return result;
    } catch (e) { notify(e.message || "Falha ao salvar no servidor."); return null; }
    finally { busyRef.current = false; setBusy(false); }
  }, [notify]);

  const closeDialog = useCallback(() => setDialog(null), []);
  const scrollTop = () => { setNavActive("inicio"); document.getElementById("gpsx-checkin")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const scrollList = () => { setNavActive("lista"); document.getElementById("gpsx-lista")?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  async function checkIn(g) {
    if (g.arrivedAt) {
      setDialog({ kind: "confirm", title: "Desfazer presença?", text: `A entrada de ${g.name} foi registrada às ${fullDate(g.arrivedAt)}. Isso não cancela mensagens já enviadas no WhatsApp.`, confirmLabel: "Desfazer check-in", danger: true, onConfirm: async () => {
        const result = await act("definirPresenca", { id: g.id, presente: false });
        if (result) { setDialog(null); notify("Presença desfeita e horário removido."); }
      } });
      return;
    }
    const result = await act("definirPresenca", { id: g.id, presente: true });
    if (result) { setSuccess({ ...g, ...result }); notify("Chegada registrada com sucesso."); }
  }

  async function saveGuest(input) {
    const editing = dialog?.source;
    const acao = input.bulk ? "adicionarConvidadosLote" : editing ? "editarConvidado" : "adicionarConvidado";
    const result = await act(acao, editing ? { ...input, id: editing.id } : input);
    if (result) { setDialog(null); notify(input.bulk ? `${result.added} convidado(s) adicionado(s).` : editing ? "Convidado atualizado." : "Convidado adicionado."); }
  }
  function deleteGuest(g) {
    setDialog({ kind: "confirm", title: "Excluir convidado?", text: `${g.name} será removido da lista${g.arrivedAt ? ", inclusive seu check-in" : ""}. A operação não pode ser desfeita pela interface.`, confirmLabel: "Excluir convidado", danger: true, onConfirm: async () => {
      if (await act("excluirConvidado", { id: g.id })) { setDialog(null); notify("Convidado excluído."); }
    } });
  }
  async function saveManager(form) {
    const src = dialog?.source;
    const result = await act(src ? "editarGerente" : "adicionarGerente", src ? { ...form, id: src.id } : form);
    if (result) { setDialog({ kind: "managers" }); notify("Gerente salvo."); }
  }
  function deleteManager(m) {
    setDialog({ kind: "confirm", title: "Excluir gerente?", text: `Excluir ${m.name}? Não será permitido enquanto houver clientes vinculados.`, confirmLabel: "Excluir gerente", danger: true, onCancel: () => setDialog({ kind: "managers" }), onConfirm: async () => {
      if (await act("excluirGerente", { id: m.id })) { setDialog({ kind: "managers" }); notify("Gerente excluído."); }
    } });
  }
  async function updateEvent(e) {
    e.preventDefault();
    const result = await act("editarEvento", { eventTitle: eventName });
    if (result) { setDialog(null); notify("Nome do evento atualizado."); }
  }
  function whatsapp(g) {
    const m = byManager[g.managerId];
    if (!g.arrivedAt) return notify("Confirme a presença antes de notificar o gerente.");
    if (!m?.verified || !/^\d{12,15}$/.test(phoneBR(m.phone))) return notify("Configure e valide o telefone do gerente antes de notificar.");
    const msg = `📍 *${data.eventTitle || "Evento Grupo GPS"}*\n\nOlá, ${m.name}!\n\n✅ O(a) cliente *${g.name}* chegou ao evento.\n🏢 Empresa: ${g.clientGroup || g.detail || "Não informada"}\n🕒 Chegada: ${fullDate(g.arrivedAt)}\n\n_Recepção · Grupo GPS_`;
    const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const link = mobile ? `https://wa.me/${phoneBR(m.phone)}?text=${encodeURIComponent(msg)}` : `https://web.whatsapp.com/send?phone=${phoneBR(m.phone)}&text=${encodeURIComponent(msg)}`;
    // Aciona a nova aba no próprio clique. O usuário finaliza o envio no WhatsApp.
    const a = document.createElement("a"); a.href = link; a.target = "_blank"; a.rel = "noopener noreferrer"; document.body.appendChild(a); a.click(); a.remove();
    api("registrarWhatsappAberto", { id: g.id }).catch(() => {});
    setSuccess(null); notify("Conversa preparada: confira e clique em Enviar no WhatsApp.");
  }
  function downloadCsv() {
    const lines = [["Nome", "Categoria", "Empresa/Cargo", "Gerente", "WhatsApp Gerente", "Presença", "Chegada"]];
    guests.forEach(g => { const m = byManager[g.managerId]; lines.push([g.name, g.group === "cliente" ? "Cliente" : "Interno", g.clientGroup || g.detail || "", m?.name || "", m?.phone || "", g.arrivedAt ? "Presente" : "Pendente", fullDate(g.arrivedAt)]); });
    const esc = s => { const v = String(s ?? ""); const safe = /^[=+@\-\t\r]/.test(v) ? `'${v}` : v; return `"${safe.replace(/"/g, '""')}"`; };
    const csv = "\ufeff" + lines.map(row => row.map(esc).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "lista-presenca-grupo-gps.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function openSettings() { setEventName(data.eventTitle || "Evento Grupo GPS"); setDialog({ kind: "settings" }); }

  const avatar = g => <div className={`gpsx-avatar tone-${avatarTone(g.name)}`}>{initials(g.name)}{g.arrivedAt && <span className="gpsx-avatar-check"><FiCheck /></span>}</div>;
  const canWa = g => { const m = byManager[g.managerId]; return g.group === "cliente" && !!g.arrivedAt && !!m?.verified && /^\d{12,15}$/.test(phoneBR(m.phone)); };

  return <div className="gpsx-app">
    <Starfield />
    <div className="gpsx-shell">
      <header className="gpsx-header">
        <nav className="gpsx-nav-pill" aria-label="Navegação do evento">
          <button type="button" className={navActive === "inicio" ? "active" : ""} onClick={scrollTop}>Início</button>
          <button type="button" className={navActive === "lista" ? "active" : ""} onClick={scrollList}>Lista</button>
          <button type="button" onClick={() => { setNavActive("gerentes"); setDialog({ kind: "managers" }); }} className={navActive === "gerentes" ? "active" : ""}>Gerentes</button>
        </nav>
        <div className="gpsx-header-tools">
          <button title="Adicionar nome" aria-label="Adicionar nome" type="button" onClick={() => setDialog({ kind: "guest", source: null })}><FiPlus /></button>
          <button title="Exportar CSV" aria-label="Exportar CSV" type="button" onClick={downloadCsv}><FiDownload /></button>
          <button title="Configurações" aria-label="Configurações" type="button" onClick={openSettings}><FiSettings /></button>
        </div>
      </header>

      <main className="gpsx-main">
        {error && <div className="gpsx-alert" role="alert"><FiInfo /><span><b>Sincronização:</b> {error}</span><button onClick={() => reload()} type="button">Tentar novamente</button></div>}
        {!loaded && <div className="gpsx-loading">Carregando convidados do servidor...</div>}

        <section id="gpsx-checkin" className="gpsx-quick-card" aria-label="Check-in expresso">
          <div className="gpsx-quick-head"><span className="gpsx-quick-mark">✦</span><div><small>RECEPÇÃO DO EVENTO</small><h1>Check-in de convidados</h1></div><span className="gpsx-live"><i /> ATIVO</span></div>
          <div className="gpsx-quick-body">
            <label htmlFor="gpsx-quick-input">NOME DO CONVIDADO</label>
            <div className="gpsx-quick-search"><FiSearch /><input id="gpsx-quick-input" type="search" ref={searchRef} autoComplete="off" value={quickQuery} onChange={e => setQuickQuery(e.target.value)} placeholder="Digite um nome para começar..." /><kbd>Ctrl K</kbd></div>
            <div className="gpsx-quick-filter"><span>FILTRAR POR</span><div role="group" aria-label="Tipo de participante">{[["todos", "Todos"], ["cliente", "Clientes"], ["interno", "Internos"]].map(([v, label]) => <button key={v} type="button" className={quickGroup === v ? "selected" : ""} onClick={() => setQuickGroup(v)} aria-pressed={quickGroup === v}>{label}</button>)}</div></div>
            <div className="gpsx-results-head"><span>{quickQuery ? "RESULTADOS DA BUSCA" : "PRÓXIMAS CHEGADAS"}</span><span>{quick.length} ENCONTRADOS</span></div>
            <div className="gpsx-quick-results">{quick.slice(0, 5).map(g => <article className="gpsx-quick-guest" key={g.id}>
              {avatar(g)}<div className="gpsx-person"><strong title={g.name}>{g.name}</strong><small>{g.clientGroup || g.detail || (g.group === "cliente" ? "Cliente externo" : "Grupo GPS")} · {g.group === "cliente" ? "Cliente" : "Interno"}</small></div>
              <button className={`gpsx-quick-confirm ${g.arrivedAt ? "done" : ""}`} disabled={busy} onClick={() => checkIn(g)} type="button">{g.arrivedAt ? "✓ Desfazer" : "Confirmar ↗"}</button>
            </article>)}{!quick.length && <div className="gpsx-empty">Nenhum convidado encontrado. Utilize “Adicionar nome” para cadastrá-lo.</div>}</div>
          </div>
          <div className="gpsx-quick-foot"><span><i /> {arrived} presentes · {pending} aguardando</span><div className="gpsx-quick-foot-actions"><button type="button" onClick={() => setDialog({ kind: "guest", source: null })}>+ Adicionar nome</button><button type="button" onClick={() => { setSpot(true); setSpotQuery(""); setTimeout(() => spotRef.current?.focus(), 100); }}>Modo foco ↗</button></div></div>
        </section>

        <section className="gpsx-stats" aria-label="Indicadores">
          <button type="button" onClick={() => { setStatus("todos"); scrollList(); }}><span className="gpsx-stat-icon blue"><FiUsers /></span><span><strong>{guests.length}</strong><small>Convidados previstos</small></span></button>
          <button type="button" onClick={() => { setStatus("presentes"); scrollList(); }}><span className="gpsx-stat-icon green"><FiUserCheck /></span><span><strong>{arrived}</strong><small>Já fizeram check-in</small></span></button>
          <button type="button" onClick={() => { setStatus("pendentes"); scrollList(); }}><span className="gpsx-stat-icon gold"><FiClock /></span><span><strong>{pending}</strong><small>Aguardando chegada</small></span></button>
        </section>

        <div className="gpsx-workspace" id="gpsx-lista">
          <section className="gpsx-roster">
            <div className="gpsx-roster-head"><div><small>ACOMPANHAMENTO COMPLETO</small><h2>Todos os convidados</h2></div><span className="gpsx-count">{visible.length} pessoas</span></div>
            <div className="gpsx-roster-controls">
              <div className="gpsx-roster-search"><FiSearch /><input type="search" placeholder="Busque por nome, empresa ou cargo..." value={query} onChange={e => setQuery(e.target.value)} /></div>
              <select aria-label="Ordenação" value={sort} onChange={e => setSort(e.target.value)}><option value="pending">Pendentes primeiro</option><option value="name">Nome A–Z</option><option value="recent">Últimas chegadas</option></select>
            </div>
            <div className="gpsx-filterbar"><div className="gpsx-segments">{[["todos", "Todos", guests.length], ["pendentes", "Aguardando", pending], ["presentes", "Presentes", arrived]].map(([v, label, count]) => <button key={v} className={status === v ? "active" : ""} onClick={() => setStatus(v)} type="button">{label} <span>{count}</span></button>)}</div><div className="gpsx-group-tabs">{[["todos", "Todos"], ["cliente", "Clientes"], ["interno", "Internos"]].map(([v, label]) => <button key={v} type="button" className={group === v ? "active" : ""} onClick={() => setGroup(v)}>{label}</button>)}</div></div>
            <div className="gpsx-list-columns"><span>CONVIDADO</span><span>CATEGORIA</span><span>CHECK-IN / AÇÕES</span></div>
            <div className="gpsx-list-body">{visible.map(g => <article key={g.id} className={`gpsx-guest-row ${g.arrivedAt ? "arrived" : ""}`}>
              {avatar(g)}
              <div className="gpsx-guest-main"><strong>{g.name}</strong><p>{g.clientGroup || g.detail || "Grupo GPS"}</p>{g.group === "cliente" && <small>Gerente: <button type="button" onClick={() => setDialog({ kind: "guest", source: g })}>{byManager[g.managerId]?.name || "Vincular gerente"}</button></small>}</div>
              <div className="gpsx-category"><span className={g.group === "cliente" ? "client" : ""}>{g.group === "cliente" ? "Cliente" : "Interno"}</span></div>
              <div className="gpsx-row-actions"><button type="button" className={`gpsx-check-button ${g.arrivedAt ? "done" : ""}`} disabled={busy} onClick={() => checkIn(g)}>{g.arrivedAt ? <><FiRefreshCw /> Desfazer</> : <><FiCheck /> Confirmar</>}</button>
                {g.arrivedAt && <small>Às {clock(g.arrivedAt)}</small>}
                {canWa(g) && <button type="button" className="gpsx-wa" onClick={() => whatsapp(g)}><FiMessageCircle /> Enviar WhatsApp</button>}
                <div className="gpsx-edit-actions"><button type="button" onClick={() => setDialog({ kind: "guest", source: g })} title="Editar convidado" aria-label={`Editar ${g.name}`}><FiEdit2 /></button><button type="button" onClick={() => deleteGuest(g)} title="Excluir convidado" aria-label={`Excluir ${g.name}`}><FiTrash2 /></button></div>
              </div>
            </article>)}{!visible.length && <div className="gpsx-empty">Nenhum participante encontrado para esses filtros.</div>}</div>
            <footer className="gpsx-roster-footer"><span>Mostrando {visible.length} de {guests.length} convidados</span><button type="button" className="gpsx-link" onClick={() => setDialog({ kind: "guest", source: null })}><FiPlus /> Adicionar nome</button></footer>
          </section>

          <aside className="gpsx-activity"><div className="gpsx-activity-head"><div><small>RECEPÇÃO EM TEMPO REAL</small><h2>Últimas chegadas</h2></div><span><i /> LIVE</span></div>
            <div className="gpsx-activity-list">{recent.length ? recent.map(g => <div className="gpsx-activity-item" key={g.id}>{avatar(g)}<div><strong>{g.name}</strong><small>{g.group === "cliente" ? "Cliente" : "Interno"} · Presença confirmada</small></div><time>{clock(g.arrivedAt)}</time></div>) : <div className="gpsx-side-empty"><FiClock /><strong>Nenhum check-in ainda</strong><p>As primeiras chegadas aparecerão aqui automaticamente.</p></div>}</div>
            <div className="gpsx-side-note"><FiMaximize2 /><strong>Recepção sem distrações</strong><p>Ative o modo foco para localizar convidados com mais agilidade.</p><button type="button" onClick={() => { setSpot(true); setSpotQuery(""); setTimeout(() => spotRef.current?.focus(), 100); }}>Abrir modo foco <FiArrowRight /></button></div>
          </aside>
        </div>
        <footer className="gpsx-page-foot"><span>Grupo GPS · Lista de presença</span><span>Sincronização com o servidor a cada 12 segundos</span></footer>
      </main>
      <button className="gpsx-floating-add" type="button" onClick={() => setDialog({ kind: "guest", source: null })}><FiPlus /><span>Adicionar nome</span></button>
    </div>

    {dialog?.kind === "guest" && <Modal eyebrow="GESTÃO DE CONVIDADOS" title={dialog.source ? "Editar participante" : "Adicionar participantes"} close={closeDialog}><GuestForm key={dialog.source?.id || "new"} source={dialog.source} managers={managers} busy={busy} onSubmit={saveGuest} onCancel={closeDialog} /></Modal>}
    {dialog?.kind === "managers" && <Modal eyebrow="VÍNCULOS COM CLIENTES" title="Gerentes responsáveis" close={closeDialog} size="wide"><div className="gpsx-manager-list">{managers.map(m => <article key={m.id} className="gpsx-manager"><div className="gpsx-manager-avatar"><FiUsers /></div><div className="gpsx-manager-info"><strong>{m.name}</strong><span>{m.phone || "Telefone não cadastrado"}</span><small>{m.verified ? "✓ Número conferido" : "Número pendente de validação"} · {guests.filter(g => g.managerId === m.id).length} cliente(s)</small></div><div className="gpsx-manager-buttons"><button aria-label={`Editar ${m.name}`} title="Editar gerente" type="button" onClick={() => setDialog({ kind: "manager-form", source: m })}><FiEdit2 /></button><button aria-label={`Excluir ${m.name}`} title="Excluir gerente" type="button" onClick={() => deleteManager(m)}><FiTrash2 /></button></div></article>)}{!managers.length && <div className="gpsx-empty">Nenhum gerente cadastrado.</div>}</div><div className="gpsx-dialog-actions"><button type="button" className="gpsx-button primary" onClick={() => setDialog({ kind: "manager-form", source: null })}><FiPlus /> Novo gerente</button></div></Modal>}
    {dialog?.kind === "manager-form" && <Modal eyebrow="CONTATO DO GERENTE" title={dialog.source ? "Editar gerente" : "Cadastrar gerente"} close={() => setDialog({ kind: "managers" })}><ManagerForm source={dialog.source} onSubmit={saveManager} onCancel={() => setDialog({ kind: "managers" })} busy={busy} /></Modal>}
    {dialog?.kind === "confirm" && <Modal eyebrow="CONFIRMAÇÃO NECESSÁRIA" title={dialog.title} close={dialog.onCancel || closeDialog}><p className="gpsx-confirm-message">{dialog.text}</p><div className="gpsx-dialog-actions"><button type="button" className="gpsx-button outline" onClick={dialog.onCancel || closeDialog}>Cancelar</button><button type="button" disabled={busy} className={`gpsx-button ${dialog.danger ? "danger" : "primary"}`} onClick={dialog.onConfirm}>{busy ? "Salvando..." : dialog.confirmLabel}</button></div></Modal>}
    {dialog?.kind === "settings" && <Modal eyebrow="PREFERÊNCIAS" title="Configurações do evento" close={closeDialog}><form className="gpsx-form" onSubmit={updateEvent}><label>Nome do evento<input maxLength={90} value={eventName} onChange={e => setEventName(e.target.value)} required /></label><div className="gpsx-dialog-actions"><button disabled={busy} className="gpsx-button primary" type="submit"><FiCheck /> Salvar título</button></div></form><hr className="gpsx-divider" /><div className="gpsx-dialog-actions"><button type="button" className="gpsx-button outline" onClick={downloadCsv}><FiDownload /> Exportar CSV</button><button type="button" className="gpsx-button outline" onClick={() => setDialog({ kind: "managers" })}><FiSettings /> Gerenciar telefones</button></div></Modal>}

    {success && <div className="gpsx-success-overlay" role="dialog" aria-modal="true" aria-label="Chegada confirmada"><div className="gpsx-success-card"><button type="button" className="gpsx-success-x" onClick={() => setSuccess(null)} aria-label="Fechar"><FiX /></button><div className="gpsx-success-check"><FiCheck /></div><small>CHECK-IN REALIZADO</small><h2>{success.name}</h2><p>{success.clientGroup || success.detail || "Seja bem-vindo(a)!"}</p><time><FiClock /> Chegada às {clock(success.arrivedAt)}</time><div className="gpsx-success-actions">{success.group === "cliente" && canWa(success) && <button type="button" className="gpsx-button primary" onClick={() => whatsapp(success)}><FiMessageCircle /> Enviar pelo WhatsApp</button>}<button type="button" className="gpsx-button outline" onClick={() => { setSuccess(null); setQuickQuery(""); searchRef.current?.focus(); }}>Próximo convidado <FiArrowRight /></button></div><p className="gpsx-success-note">Presença salva no servidor. O WhatsApp é enviado manualmente pelo recepcionista.</p></div></div>}

    {spot && <div className="gpsx-spotlight" role="dialog" aria-modal="true" aria-label="Modo foco"><div className="gpsx-spot-top"><span>GRUPO GPS · RECEPÇÃO</span><button type="button" onClick={() => setSpot(false)}>Fechar <FiX /></button></div><div className="gpsx-spot-body"><small>CHECK-IN EXPRESSO</small><h2>Localize um convidado.</h2><div className="gpsx-spot-search"><FiSearch /><input ref={spotRef} autoFocus type="search" value={spotQuery} onChange={e => setSpotQuery(e.target.value)} placeholder="Nome, empresa ou gerente..." /></div><p>{spotResults.length} resultados nesta pesquisa</p><div className="gpsx-spot-results">{spotResults.map(g => <article key={g.id}>{avatar(g)}<div className="gpsx-person"><strong>{g.name}</strong><small>{g.clientGroup || g.detail || "Grupo GPS"}</small></div><button disabled={busy || !!g.arrivedAt} onClick={() => checkIn(g)} type="button">{g.arrivedAt ? "✓ Presente" : "Confirmar"}</button></article>)}{!spotResults.length && <div className="gpsx-empty">Nenhum nome encontrado.</div>}</div></div><footer>Pressione Esc para voltar à lista de presença.</footer></div>}

    {toast && <div className="gpsx-toast" role="status"><FiCheckCircle /><span>{toast}</span><button type="button" aria-label="Fechar mensagem" onClick={() => setToast("")}><FiX /></button></div>}
  </div>;
}
