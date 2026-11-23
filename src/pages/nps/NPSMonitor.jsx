import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity, FiArrowLeft, FiArrowRight, FiCheck, FiCheckCircle,
  FiClock, FiDownload, FiEdit2, FiFilter, FiInfo, FiLoader,
  FiMessageCircle, FiPlus, FiSearch, FiSettings, FiShield,
  FiTrash2, FiUserCheck, FiUsers, FiX, FiRefreshCcw,
} from 'react-icons/fi';
import './npsmonitor.css';

// Mesma base de API do projeto anterior. Em produção, ajuste VITE_API_BASE no Vite.
const API_BASE = (import.meta.env.VITE_API_BASE || 'https://api-info.xyz/api').replace(/\/+$/, '');
const API_URL = `${API_BASE}/checkin`;
const POLL_MS = 12000;
const dateTime = iso => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle:'short',timeStyle:'short' }) : '—';
const timeOnly = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '—';
const digits = value => String(value || '').replace(/\D/g, '');
const asNumber = value => { let n = digits(value); return [10, 11].includes(n.length) ? '55' + n : n; };
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const initial = name => String(name || '?').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).filter(Boolean).filter((_,i,a)=>i===0||i===a.length-1).join('').slice(0,2).toUpperCase();
const emptyGuest = () => ({ name:'', group:'interno', detail:'', clientGroup:'', managerId:'' });
const emptyManager = () => ({ name:'', phone:'', verified:false });
const getToken = () => localStorage.getItem('token') || localStorage.getItem('authToken') || '';

async function request(url, opts = {}) {
  const token = getToken();
  const response = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.body ? { 'Content-Type':'application/json' } : {}),
      ...(token ? { Authorization:`Bearer ${token}` } : {}),
      ...opts.headers,
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.sucesso) {
    throw new Error(payload?.mensagem || (response.status === 401 ? 'Faça login para acessar a lista.' : `Falha na API (HTTP ${response.status}).`));
  }
  return payload.data;
}

function Background() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, raf = 0, particles = [];
    const pointer = {x:-999,y:-999};
    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = Array.from({ length: Math.min(68, Math.round(width * height / 24500)) }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - .5) * .16, vy: (Math.random() - .5) * .16,
        r: Math.random() * 1.2 + .5,
      }));
    };
    const move = e => { pointer.x = e.clientX; pointer.y = e.clientY; };
    const draw = () => {
      ctx.clearRect(0,0,width,height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = 'rgba(41,239,168,.67)'; ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) for (let j = i+1; j < particles.length; j++) {
        const a = particles[i], b = particles[j], d = Math.hypot(a.x-b.x,a.y-b.y);
        if (d < 118) {
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
          ctx.strokeStyle = `rgba(0,208,235,${.13*(1-d/118)})`;ctx.stroke();
        }
      }
      if (pointer.x >= 0) {
        const g = ctx.createRadialGradient(pointer.x,pointer.y,5,pointer.x,pointer.y,155);
        g.addColorStop(0,'rgba(23,242,178,.045)');g.addColorStop(1,'rgba(23,242,178,0)');
        ctx.fillStyle=g;ctx.fillRect(pointer.x-155,pointer.y-155,310,310);
      }
      raf = requestAnimationFrame(draw);
    };
    window.addEventListener('resize',resize);
    window.addEventListener('pointermove',move,{passive:true});
    resize();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) draw();
    else { draw(); cancelAnimationFrame(raf); }
    return () => {
      window.removeEventListener('resize',resize);
      window.removeEventListener('pointermove',move);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={ref} className="gpsc-stars" aria-hidden="true" />;
}

function Modal({ title, eyebrow, children, onClose, wide }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown',onKey);
    return () => window.removeEventListener('keydown',onKey);
  },[onClose]);
  return (
    <div className="gpsc-shade" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`gpsc-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="gpsc-modal-head"><div><small>{eyebrow}</small><h2>{title}</h2></div><button className="gpsc-iconbtn" onClick={onClose} type="button" aria-label="Fechar"><FiX/></button></div>
        <div className="gpsc-modal-content">{children}</div>
      </div>
    </div>
  );
}

function GuestForm({ source, managers, onSave, onClose, busy }) {
  const [value,setValue] = useState(() => ({...emptyGuest(),...source,managerId:source?.managerId || ''}));
  const [bulk,setBulk] = useState(false);
  const [many,setMany] = useState('');
  function patch(field,val) { setValue(prev => ({...prev,[field]:val,...(field === 'detail' && prev.group === 'cliente' ? {clientGroup:val} : {})})); }
  return (
    <form onSubmit={e => {
      e.preventDefault();
      if (bulk) onSave({bulk:true,names:many.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),group:value.group,detail:value.detail,managerId:value.managerId});
      else onSave(value);
    }}>
      {!source && <div className="gpsc-mode"><button type="button" className={!bulk?'on':''} onClick={()=>setBulk(false)}>Um convidado</button><button type="button" className={bulk?'on':''} onClick={()=>setBulk(true)}>Lista em lote</button></div>}
      {!bulk ? <label>Nome completo<input autoFocus required minLength={2} maxLength={180} placeholder="Nome do participante" value={value.name} onChange={e=>patch('name',e.target.value)} /></label> : <label>Um nome por linha<textarea required rows={7} placeholder={'Maria Souza\nAna Ribeiro\nPedro Alves'} value={many} onChange={e=>setMany(e.target.value)} /></label>}
      <div className="gpsc-two"><label>Categoria<select value={value.group} onChange={e=>patch('group',e.target.value)}><option value="interno">Interno</option><option value="cliente">Cliente</option></select></label><label>{value.group === 'cliente' ? 'Empresa / Cliente' : 'Cargo / Área'}<input maxLength={180} value={value.detail} onChange={e=>patch('detail',e.target.value)} placeholder={value.group==='cliente'?'Nome da empresa':'Área ou cargo'} /></label></div>
      {value.group === 'cliente' && <label>Gerente responsável<select value={value.managerId} onChange={e=>patch('managerId',e.target.value)}><option value="">Sem gerente vinculado</option>{managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
      <div className="gpsc-dialog-actions"><button className="gpsc-btn outline" type="button" onClick={onClose}>Cancelar</button><button className="gpsc-btn primary" disabled={busy} type="submit"><FiCheck/> {busy?'Salvando...':source?'Salvar alterações':bulk?'Adicionar nomes':'Adicionar convidado'}</button></div>
    </form>
  );
}

function ManagerForm({ source, onSave, onClose, busy }) {
  const [value,setValue] = useState(()=>({...emptyManager(),...source}));
  const originalPhone = source?.phone || '';
  const phoneChanged = Boolean(source && asNumber(value.phone) !== asNumber(originalPhone));
  return <form onSubmit={e => { e.preventDefault(); onSave(value); }}>
    <label>Nome do gerente<input required maxLength={90} autoFocus value={value.name} onChange={e=>setValue({...value,name:e.target.value})} /></label>
    <label>WhatsApp (país + DDD + número)<input placeholder="5511999999999" inputMode="tel" value={value.phone} onChange={e=>setValue({...value,phone:e.target.value,verified:false})} /></label>
    <label className="gpsc-checklabel"><input type="checkbox" checked={Boolean(value.verified)} onChange={e=>setValue({...value,verified:e.target.checked})}/> Conferi pessoalmente o número acima</label>
    {phoneChanged && <p className="gpsc-hint">O telefone foi alterado. Confira o novo número antes de marcar a validação.</p>}
    <div className="gpsc-dialog-actions"><button type="button" className="gpsc-btn outline" onClick={onClose}>Cancelar</button><button type="submit" className="gpsc-btn primary" disabled={busy}><FiCheck/> {busy?'Salvando...':'Salvar gerente'}</button></div>
  </form>;
}

export default function CheckinEvento() {
  const [data,setData] = useState({guests:[],managers:[],eventTitle:'Evento Grupo GPS'});
  const [loaded,setLoaded] = useState(false);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const busyRef = useRef(false);
  const [view,setView] = useState('recepcao');
  const [query,setQuery] = useState('');
  const [status,setStatus] = useState('todos');
  const [group,setGroup] = useState('todos');
  const [sort,setSort] = useState('pendentes');
  const [dialog,setDialog] = useState(null);
  const [success,setSuccess] = useState(null);
  const [toast,setToast] = useState('');
  const toastTimer = useRef(null);
  const searchRef = useRef(null);
  const notify = useCallback(message => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(''),4400);
  },[]);

  const reload = useCallback(async (silent=false) => {
    if (busyRef.current) return;
    try {
      const result=await request(API_URL);
      setData(result);
      setError('');setLoaded(true);
    } catch (err) {
      setError(err.message || 'Não foi possível conectar ao servidor.');
      if (!silent) setLoaded(true);
    }
  },[]);
  useEffect(()=>{
    document.body.classList.add('hide-sidebar');
    reload();
    const id=setInterval(()=>reload(true),POLL_MS);
    return ()=>{document.body.classList.remove('hide-sidebar');clearInterval(id);clearTimeout(toastTimer.current);};
  },[reload]);
  useEffect(()=>{
    const fn=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setView('recepcao');setTimeout(()=>searchRef.current?.focus(),40);}};
    window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);
  },[]);

  const guests=data.guests||[];
  const managers=data.managers||[];
  const managersById=useMemo(()=>Object.fromEntries(managers.map(m=>[m.id,m])),[managers]);
  const present=guests.filter(g=>Boolean(g.arrivedAt)).length;
  const pending=guests.length-present;
  const percent=guests.length?Math.round(present/guests.length*100):0;
  const recent=useMemo(()=>guests.filter(g=>g.arrivedAt).sort((a,b)=>Date.parse(b.arrivedAt)-Date.parse(a.arrivedAt)).slice(0,6),[guests]);
  const found=useMemo(()=>guests.filter(g => normalize([g.name,g.detail,g.clientGroup,managersById[g.managerId]?.name].join(' ')).includes(normalize(query)))
    .filter(g => status==='todos'||(status==='presentes'?Boolean(g.arrivedAt):!g.arrivedAt))
    .filter(g => group==='todos'||g.group===group)
    .sort((a,b)=>sort==='az'?a.name.localeCompare(b.name,'pt-BR'):sort==='recent'?(Date.parse(b.arrivedAt)||0)-(Date.parse(a.arrivedAt)||0):Number(Boolean(a.arrivedAt))-Number(Boolean(b.arrivedAt))||a.name.localeCompare(b.name,'pt-BR')),
    [guests,managersById,query,status,group,sort]);

  const mutate = useCallback(async (endpoint,method,body) => {
    if (busyRef.current) return null;
    busyRef.current=true;setBusy(true);
    try {
      const payload=await request(API_URL+endpoint, {method, ...(body!==undefined?{body:JSON.stringify(body)}:{})});
      const fresh=await request(API_URL);
      setData(fresh);setError('');
      return payload;
    } catch (err) { notify(err.message || 'Não foi possível salvar.'); return null; }
    finally {busyRef.current=false;setBusy(false);}
  },[notify]);

  async function checkIn(g) {
    if (g.arrivedAt) {
      setDialog({type:'confirm',title:'Desfazer presença?',message:`A presença de ${g.name} foi registrada às ${dateTime(g.arrivedAt)}. Isso não desfaz uma mensagem já enviada pelo WhatsApp.`,action:'Desfazer check-in',onConfirm:async()=>{
        const r=await mutate(`/convidados/${encodeURIComponent(g.id)}/presenca`,'PATCH',{presente:false});
        if(r){setDialog(null);notify('Presença desfeita com sucesso.');}
      }});return;
    }
    const r=await mutate(`/convidados/${encodeURIComponent(g.id)}/presenca`,'PATCH',{presente:true});
    if(r){setSuccess({...g,arrivedAt:r.arrivedAt});notify('Chegada registrada com sucesso.');}
  }
  async function saveGuest(input) {
    const source=dialog?.source;
    const path=input.bulk?'/convidados/lote':source?`/convidados/${encodeURIComponent(source.id)}`:'/convidados';
    const r=await mutate(path,source?'PATCH':'POST',input);
    if(r){setDialog(null);notify(input.bulk?`${r.added} nome(s) incluído(s) na lista.`:'Convidado salvo com sucesso.');}
  }
  function deleteGuest(g) {
    setDialog({type:'confirm',title:'Remover convidado?',message:`${g.name} será excluído da lista de presença${g.arrivedAt?' e seu check-in será removido':''}. Esta ação não pode ser desfeita pela interface.`,action:'Excluir convidado',danger:true,onConfirm:async()=>{
      const r=await mutate(`/convidados/${encodeURIComponent(g.id)}`,'DELETE');
      if(r){setDialog(null);notify('Convidado removido.');}
    }});
  }
  async function saveManager(input) {
    const source=dialog?.source;
    const r=await mutate(source?`/gerentes/${encodeURIComponent(source.id)}`:'/gerentes',source?'PATCH':'POST',{...input,phone:asNumber(input.phone)});
    if(r){setDialog(null);notify('Gerente salvo com sucesso.');}
  }
  function deleteManager(m) {
    setDialog({type:'confirm',title:'Excluir gerente?',message:`Remover ${m.name}? Não será permitido se houver clientes vinculados.`,action:'Remover gerente',danger:true,onConfirm:async()=>{
      const r=await mutate(`/gerentes/${encodeURIComponent(m.id)}`,'DELETE');
      if(r){setDialog(null);notify('Gerente removido.');}
    }});
  }
  async function sendWhatsApp(g) {
    const manager=managersById[g.managerId];
    if(!g.arrivedAt){notify('Confirme a chegada antes de notificar o gerente.');return;}
    if(!manager?.verified||!/^\d{12,15}$/.test(manager?.phone||'')){
      notify('Vincule e valide o telefone do gerente antes de abrir o WhatsApp.');return;
    }
    const msg=`GRUPO GPS | CHECK-IN\n\nOlá, ${manager.name}!\n\nO cliente ${g.name}, da empresa ${g.clientGroup||g.detail||'não informada'}, chegou ao evento ${data.eventTitle||'Grupo GPS'} às ${timeOnly(g.arrivedAt)}.\n\nRecepção Grupo GPS.`;
    const isMobile=/iPhone|Android|iPad/i.test(navigator.userAgent);
    const target=isMobile?`https://wa.me/${digits(manager.phone)}?text=${encodeURIComponent(msg)}`:`https://web.whatsapp.com/send?phone=${digits(manager.phone)}&text=${encodeURIComponent(msg)}`;
    // Abertura acontece diretamente no clique (não aguarda fetch, evitando bloqueador de popups).
    window.open(target,'_blank','noopener,noreferrer');
    const result=await mutate(`/convidados/${encodeURIComponent(g.id)}/whatsapp-aberto`,'POST',{});
    if(result) notify('Conversa preparada. Clique em Enviar no WhatsApp.');
    setSuccess(null);
  }
  function exportCSV() {
    const columns=[['Nome','Categoria','Empresa/Cargo','Gerente','WhatsApp Gerente','Presença','Horário']];
    for(const g of guests){const m=managersById[g.managerId];columns.push([g.name,g.group==='cliente'?'Cliente':'Interno',g.clientGroup||g.detail||'',m?.name||'',m?.phone||'',g.arrivedAt?'Presente':'Pendente',g.arrivedAt?dateTime(g.arrivedAt):'']);}
    const csv='\ufeff'+columns.map(row=>row.map(cell=>{const value=String(cell??''); const safe=/^[=+@-]/.test(value)?"'"+value:value;return '"'+safe.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='presencas-grupo-gps.csv';a.click();URL.revokeObjectURL(url);
  }

  function guestCard(g,compact=false) {
    const manager=managersById[g.managerId];
    const canWhatsApp=g.group==='cliente'&&g.arrivedAt&&manager?.verified&&/^\d{12,15}$/.test(manager.phone||'');
    return <article className={`gpsc-person ${g.arrivedAt?'is-present':''} ${compact?'compact':''}`} key={g.id}>
      <div className="gpsc-avatar">{initial(g.name)}{g.arrivedAt&&<i><FiCheck/></i>}</div>
      <div className="gpsc-person-body">
        <strong>{g.name}</strong>
        <span>{g.clientGroup||g.detail||'Grupo GPS'} <b className="gpsc-mid">·</b> {g.group==='cliente'?'Cliente':'Interno'}</span>
        {g.group==='cliente'&&manager&&<small>Gerente: {manager.name} {!manager.verified?'· telefone pendente':''}</small>}
      </div>
      <div className="gpsc-person-actions">
        {g.arrivedAt&&<span className="gpsc-time"><FiClock/> {timeOnly(g.arrivedAt)}</span>}
        <button type="button" className={`gpsc-btn ${g.arrivedAt?'muted':'primary'} gpsc-checkin-btn`} disabled={busy} onClick={()=>checkIn(g)}>{g.arrivedAt?<><FiRefreshCcw/> Desfazer</>:<><FiCheck/> Confirmar</>}</button>
        {canWhatsApp&&<button type="button" className="gpsc-quickwa" onClick={()=>sendWhatsApp(g)} title="Abrir WhatsApp com a mensagem preparada"><FiMessageCircle/> WhatsApp</button>}
        {!compact&&<div className="gpsc-more-actions"><button type="button" aria-label={`Editar ${g.name}`} title="Editar convidado" onClick={()=>setDialog({type:'guest',source:g})}><FiEdit2/></button><button type="button" aria-label={`Excluir ${g.name}`} title="Remover convidado" onClick={()=>deleteGuest(g)}><FiTrash2/></button></div>}
      </div>
    </article>;
  }

  return <div className="gps-checkin">
    <Background/>
    <div className="gpsc-wrap">
      <nav className="gpsc-nav" aria-label="Navegação da lista de presença">
        <button className={view==='recepcao'?'on':''} onClick={()=>setView('recepcao')}>Recepção</button>
        <button className={view==='lista'?'on':''} onClick={()=>setView('lista')}>Lista completa</button>
        <button className={view==='gerentes'?'on':''} onClick={()=>setView('gerentes')}>Gerentes</button>
      </nav>

      <header className="gpsc-heading">
        <div className="gpsc-identity"><div className="gpsc-led"/><span>GRUPO GPS · EVENTO</span></div>
        <div className="gpsc-heading-row"><div><h1>Lista de <em>presença.</em></h1><p>{data.eventTitle||'Evento Grupo GPS'} · Controle de entrada em tempo real</p></div><div className="gpsc-heading-buttons"><button type="button" className="gpsc-btn outline" onClick={()=>reload()}><FiRefreshCcw/> Atualizar</button><button type="button" className="gpsc-btn primary" onClick={()=>setDialog({type:'guest',source:null})}><FiPlus/> Adicionar nome</button></div></div>
      </header>

      {error&&<div className="gpsc-alert"><FiInfo/><span><b>Não foi possível sincronizar:</b> {error} As alterações não serão salvas até restabelecer a conexão.</span><button onClick={()=>reload()}>Tentar novamente</button></div>}
      {!loaded&&<div className="gpsc-loading"><FiLoader/> Carregando lista do servidor...</div>}

      <div className="gpsc-metrics">
        <div className="gpsc-metric"><span><FiUsers/> Convidados</span><strong>{guests.length}</strong><small>na lista</small></div>
        <div className="gpsc-metric"><span><FiUserCheck/> Presentes</span><strong>{present}</strong><small>check-ins registrados</small></div>
        <div className="gpsc-metric"><span><FiClock/> Pendentes</span><strong>{pending}</strong><small>aguardando chegada</small></div>
        <div className="gpsc-metric progress"><span><FiActivity/> Presença</span><strong>{percent}%</strong><div className="gpsc-track"><div style={{width:`${percent}%`}}/></div></div>
      </div>

      {view==='recepcao'&&<div className="gpsc-main-grid">
        <section className="gpsc-panel gpsc-frontdesk">
          <div className="gpsc-panel-title"><div><small>CHECK-IN EXPRESSO</small><h2>Localizar participante</h2></div><span className="gpsc-mini-chip"><FiSearch/> Ctrl + K</span></div>
          <div className="gpsc-search"><FiSearch/><input autoFocus ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquise por nome, empresa ou gerente..." aria-label="Buscar convidado" /></div>
          <div className="gpsc-frontdesk-results">{found.slice(0,7).map(g=>guestCard(g,true))}{!found.length&&<p className="gpsc-empty">Nenhum participante encontrado. Você pode adicioná-lo à lista.</p>}</div>
          <div className="gpsc-frontdesk-foot"><span>{found.length} resultado(s) encontrados</span><button onClick={()=>setView('lista')} type="button">Abrir lista completa <FiArrowRight/></button></div>
        </section>
        <aside className="gpsc-panel gpsc-activity"><div className="gpsc-panel-title"><div><small>ATUALIZAÇÃO EM TEMPO REAL</small><h2>Últimas chegadas</h2></div><span className="gpsc-live"><i/> Ativo</span></div>
          {recent.length?recent.map(g=><div className="gpsc-activity-item" key={g.id}><div className="gpsc-activity-symbol"><FiCheck/></div><div><strong>{g.name}</strong><span>{g.group==='cliente'?'Cliente':'Interno'} · {timeOnly(g.arrivedAt)}</span></div></div>):<div className="gpsc-empty">As chegadas confirmadas aparecerão aqui.</div>}
          <div className="gpsc-side-note"><FiShield/><p>As presenças são gravadas no servidor. Nenhuma mensagem é enviada automaticamente pelo WhatsApp.</p></div>
        </aside>
      </div>}

      {view==='lista'&&<section className="gpsc-panel gpsc-all">
        <div className="gpsc-panel-title"><div><small>CONTROLE DE PARTICIPANTES</small><h2>Todos os convidados <span className="gpsc-mini-chip">{found.length}</span></h2></div><button className="gpsc-btn outline" onClick={exportCSV}><FiDownload/> Exportar CSV</button></div>
        <div className="gpsc-list-tools"><div className="gpsc-search"><FiSearch/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar participante..."/></div><select value={group} onChange={e=>setGroup(e.target.value)} aria-label="Filtrar categoria"><option value="todos">Todos os tipos</option><option value="cliente">Clientes</option><option value="interno">Internos</option></select><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Ordenação"><option value="pendentes">Pendentes primeiro</option><option value="az">Nome A–Z</option><option value="recent">Últimas chegadas</option></select></div>
        <div className="gpsc-tabs">{[['todos','Todos'],['pendentes','Aguardando'],['presentes','Presentes']].map(([key,label])=><button type="button" onClick={()=>setStatus(key)} className={status===key?'on':''} key={key}>{label}</button>)}</div>
        <div className="gpsc-guests-list">{found.map(g=>guestCard(g))}{!found.length&&<p className="gpsc-empty">Nenhum participante para esse filtro.</p>}</div>
      </section>}

      {view==='gerentes'&&<section className="gpsc-panel gpsc-all"><div className="gpsc-panel-title"><div><small>VÍNCULOS DOS CLIENTES</small><h2>Gerentes responsáveis</h2></div><button className="gpsc-btn primary" type="button" onClick={()=>setDialog({type:'manager',source:null})}><FiPlus/> Novo gerente</button></div>
        <div className="gpsc-managers">{managers.map(m=><article className="gpsc-manager-card" key={m.id}><div className="gpsc-avatar"><FiUsers/></div><div><strong>{m.name}</strong><span>{m.phone||'Sem telefone cadastrado'}</span><small>{m.verified?'Número conferido':'Telefone ainda não validado'} · {guests.filter(g=>g.managerId===m.id).length} cliente(s)</small></div><div className="gpsc-manager-buttons"><button type="button" aria-label="Editar gerente" onClick={()=>setDialog({type:'manager',source:m})}><FiEdit2/></button><button type="button" aria-label="Excluir gerente" onClick={()=>deleteManager(m)}><FiTrash2/></button></div></article>)}</div>
      </section>}

      <footer className="gpsc-footer"><span>Grupo GPS · Lista de presença</span><span>Sincronização a cada 12 segundos · JSON no servidor</span></footer>
    </div>

    {dialog?.type==='guest'&&<Modal title={dialog.source?'Editar participante':'Adicionar participantes'} eyebrow="GESTÃO DE CONVIDADOS" onClose={()=>setDialog(null)}><GuestForm key={dialog.source?.id||'new'} source={dialog.source} managers={managers} busy={busy} onSave={saveGuest} onClose={()=>setDialog(null)}/></Modal>}
    {dialog?.type==='manager'&&<Modal title={dialog.source?'Editar gerente':'Cadastrar gerente'} eyebrow="RESPONSÁVEL PELO CLIENTE" onClose={()=>setDialog(null)}><ManagerForm key={dialog.source?.id||'new'} source={dialog.source} onSave={saveManager} busy={busy} onClose={()=>setDialog(null)}/></Modal>}
    {dialog?.type==='confirm'&&<Modal title={dialog.title} eyebrow="CONFIRMAÇÃO NECESSÁRIA" onClose={()=>setDialog(null)}><p className="gpsc-confirm-text">{dialog.message}</p><div className="gpsc-dialog-actions"><button className="gpsc-btn outline" onClick={()=>setDialog(null)}>Cancelar</button><button disabled={busy} className={`gpsc-btn ${dialog.danger?'danger':'primary'}`} onClick={dialog.onConfirm}>{busy?'Salvando...':dialog.action}</button></div></Modal>}
    {success&&<Modal title="Chegada confirmada!" eyebrow="CHECK-IN REALIZADO" onClose={()=>setSuccess(null)}><div className="gpsc-success"><div className="gpsc-success-icon"><FiCheck/></div><strong>{success.name}</strong><p>Entrada registrada às {timeOnly(success.arrivedAt)}</p>{success.group==='cliente'&&managersById[success.managerId]?.verified&&<button type="button" className="gpsc-btn primary" onClick={()=>sendWhatsApp(success)}><FiMessageCircle/> Enviar pelo WhatsApp</button>}<button type="button" className="gpsc-btn outline" onClick={()=>{setSuccess(null);searchRef.current?.focus();}}>Próximo convidado <FiArrowRight/></button></div></Modal>}
    {toast&&<div className="gpsc-toast" role="status"><FiCheckCircle/>{toast}<button type="button" aria-label="Fechar notificação" onClick={()=>setToast('')}><FiX/></button></div>}
  </div>;
}
