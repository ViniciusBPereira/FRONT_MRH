import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiArrowRight, FiCheck, FiCheckCircle, FiClock, FiDownload, FiEdit2,
  FiFileText, FiFilter, FiInfo, FiMaximize2, FiMessageCircle,
  FiPlus, FiRefreshCw, FiSearch, FiSettings, FiTrash2,
  FiUploadCloud, FiUserCheck, FiUsers, FiX,
} from 'react-icons/fi';
import './npsmonitor.css';

// Mantém a rota pública que já existe no backend.
const API_BASE = (import.meta.env.VITE_API_BASE || 'https://api-info.xyz/api').replace(/\/+$/, '');
const API_URL = `${API_BASE}/melhorias`;
const POLL_MS = 12000;
const freshState = () => ({ guests: [], managers: [], eventTitle: 'Evento Grupo GPS' });
const newGuest = () => ({ name: '', group: 'interno', detail: '', clientGroup: '', managerId: '' });
const newManager = () => ({ name: '', phone: '', verified: false });
const normalize = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const num = (v) => String(v ?? '').replace(/\D/g, '');
const toPhone = (v) => { const n = num(v); return [10, 11].includes(n.length) ? `55${n}` : n; };
const hhmm = (v) => v ? new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
const dateTime = (v) => v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const initials = (v) => { const words = String(v || '?').trim().split(/\s+/); return (words[0][0] + (words.length > 1 ? words.at(-1)[0] : '')).toUpperCase(); };
const matches = (g, term, managers) => normalize([g.name, g.detail, g.clientGroup, managers[g.managerId]?.name].join(' ')).includes(normalize(term));

async function api(acao, payload = {}) {
  const response = await fetch(API_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    cache: 'no-store', body: JSON.stringify({ acao, ...payload }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.sucesso) throw new Error(body?.mensagem || `Erro HTTP ${response.status}`);
  return body.data;
}

function Sky() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!ctx) return;
    let stars = [], raf = 0, w = 0, h = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * ratio; canvas.height = h * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      let seed = 7827; const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      stars = Array.from({ length: Math.min(70, Math.max(28, Math.round(w*h/24000))) }, () => ({ x: random()*w, y: random()*h, p: random()*6.28 }));
    };
    const draw = (t) => {
      ctx.clearRect(0,0,w,h);
      const dots = stars.map(s => ({x:s.x+Math.sin(t/13000+s.p)*3, y:s.y+Math.cos(t/16000+s.p)*3}));
      dots.forEach((a,i) => {
        ctx.fillStyle = 'rgba(16,244,170,.76)'; ctx.beginPath(); ctx.arc(a.x,a.y,1,0,Math.PI*2); ctx.fill();
        dots.slice(i+1).forEach(b => { const d=Math.hypot(a.x-b.x,a.y-b.y); if(d<100){ctx.strokeStyle=`rgba(7,187,195,${.13*(1-d/100)})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();} });
      });
      if (!reduced) raf=requestAnimationFrame(draw);
    };
    resize(); draw(0); window.addEventListener('resize', resize);
    return () => {cancelAnimationFrame(raf);window.removeEventListener('resize',resize);};
  }, []);
  return <canvas className="gpsr-stars" ref={ref} aria-hidden="true" />;
}

function Overlay({ title, eyebrow, children, close, large = false }) {
  useEffect(() => {
    const key = (e) => { if(e.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [close]);
  return <div className="gpsr-mask" onMouseDown={e => { if(e.target===e.currentTarget) close(); }}>
    <section className={`gpsr-modal ${large ? 'gpsr-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="gpsr-modal-head"><div><span className="gpsr-eyebrow">{eyebrow}</span><h2>{title}</h2></div><button type="button" aria-label="Fechar" className="gpsr-square" onClick={close}><FiX /></button></header>
      <div className="gpsr-modal-body">{children}</div>
    </section>
  </div>;
}

function GuestEditor({ source, managers, busy, save, close }) {
  const [g, setG] = useState(() => ({...newGuest(), ...source, managerId: source?.managerId || ''}));
  const [mode,setMode] = useState('unico'); const [names,setNames] = useState('');
  const patch=(k,v)=>setG(prev=>({...prev,[k]:v}));
  const submit = e => {
    e.preventDefault();
    if (mode === 'lote') save({ bulk:true, names:names.split(/\r?\n/).map(x=>x.trim()).filter(Boolean), group:g.group, detail:g.detail, clientGroup:g.group==='cliente'?g.detail:'', managerId:g.group==='cliente'?g.managerId:'' });
    else save({...g,clientGroup:g.group==='cliente'?g.detail:'',managerId:g.group==='cliente'?g.managerId:''});
  };
  return <form className="gpsr-form" onSubmit={submit}>
    {!source && <div className="gpsr-choice"><button type="button" className={mode==='unico'?'on':''} onClick={()=>setMode('unico')}>Uma pessoa</button><button type="button" className={mode==='lote'?'on':''} onClick={()=>setMode('lote')}>Vários nomes</button></div>}
    {mode==='unico' ? <label>Nome completo<input required autoFocus maxLength={180} minLength={2} value={g.name} onChange={e=>patch('name',e.target.value)} placeholder="Nome e sobrenome"/></label>
      : <label>Um nome por linha<textarea required rows={6} value={names} onChange={e=>setNames(e.target.value)} placeholder={'Maria Silva\nJoão Oliveira\nAna Souza'}/></label>}
    <div className="gpsr-form-cols"><label>Tipo de convidado<select value={g.group} onChange={e=>patch('group',e.target.value)}><option value="interno">Interno</option><option value="cliente">Cliente</option></select></label><label>{g.group==='cliente'?'Empresa / cliente':'Cargo / área'}<input value={g.detail} maxLength={160} onChange={e=>patch('detail',e.target.value)} placeholder="Opcional"/></label></div>
    {g.group==='cliente' && <label>Gerente responsável<select value={g.managerId} onChange={e=>patch('managerId',e.target.value)}><option value="">Não vinculado</option>{managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
    <div className="gpsr-modal-actions"><button className="gpsr-btn ghost" type="button" onClick={close}>Cancelar</button><button className="gpsr-btn primary" disabled={busy} type="submit"><FiCheck/>{busy?'Salvando...':'Salvar'}</button></div>
  </form>;
}

function ManagerEditor({ source, busy, close, save }) {
  const [g,setG]=useState(()=>({...newManager(),...source}));
  return <form className="gpsr-form" onSubmit={e=>{e.preventDefault();save({...g,phone:toPhone(g.phone)});}}>
    <label>Nome do gerente<input required autoFocus maxLength={90} value={g.name} onChange={e=>setG({...g,name:e.target.value})}/></label>
    <label>Telefone WhatsApp<input inputMode="tel" placeholder="5511999999999" value={g.phone} onChange={e=>setG({...g,phone:e.target.value,verified:false})}/></label>
    <div className="gpsr-check-option">
      <input id="gpsr-gerente-telefone-conferido" type="checkbox" checked={!!g.verified} onChange={e=>setG({...g,verified:e.target.checked})}/>
      <label htmlFor="gpsr-gerente-telefone-conferido">Conferi o telefone deste gerente</label>
    </div>
    <div className="gpsr-modal-actions gpsr-modal-actions--pair"><button className="gpsr-btn ghost" type="button" onClick={close}>Cancelar</button><button className="gpsr-btn primary" type="submit" disabled={busy}><FiCheck/> Salvar gerente</button></div>
  </form>;
}

// Importador orientado às 3 abas da lista Escala 6x1 e a planilhas genéricas.
const standard = v => normalize(v).replace(/[^a-z0-9]+/g,'');
const pick = (obj, aliases) => {
  const cols = Object.entries(obj);
  for (const key of aliases) {
    const value = cols.find(([k])=>standard(k)===standard(key))?.[1];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
};
function cleanEmployee(name) {
  // Ex.: "01I2 - 022252 - RAFAEL BAPTISTA" => "RAFAEL BAPTISTA".
  const v=String(name||'').trim();
  return /^[A-Z0-9]{2,8}\s*-\s*\d{4,}\s*-\s*/i.test(v) ? v.replace(/^[A-Z0-9]{2,8}\s*-\s*\d{4,}\s*-\s*/i,'').trim() : v;
}
function rowsToGuests(book) {
  const all = []; const seen = new Set(); let ignored = 0;
  const aliases = ['nome','nome completo','colaborador','convidado','convidados','confirmados','participante','participantes'];
  for (const sheet of book) {
    const origin = standard(sheet.name);
    for (const row of sheet.rows) {
      const name = cleanEmployee(pick(row,origin==='internos'?['COLABORADOR',...aliases]:origin==='clientes'||origin==='estacionamento'?['Confirmados','CONVIDADOS',...aliases]:aliases));
      if (name.length < 2 || /^(total|subtotal|confirmados|convidados|nome|declinaram|declinou|não comparecerá|nao comparecera)$/i.test(name)) {ignored++;continue;}
      const groupValue=pick(row,['Categoria','Tipo','Grupo','Perfil']);
      const group = origin==='internos'?'interno':(origin==='clientes'||origin==='estacionamento')?'cliente':(/cliente|externo/i.test(groupValue)?'cliente':'interno');
      const company = group==='cliente'?pick(row,['GRUPO CLIENTE','Empresa','Cliente','Organização','Organizacao','Detalhe']):'';
      const detail=group==='interno'?pick(row,['FUNCAO ATUAL','Função','Funcao','Cargo','Área','Area','Detalhe']):company;
      const managerName=group==='cliente'?pick(row,['GC','Gerente Responsável','Gerente','Responsável','Responsavel']):'';
      const managerPhone=group==='cliente'?pick(row,['Tel','Telefone GC','Telefone gerente','Whatsapp','Telefone']):'';
      const key=`${group}|${normalize(name)}`;
      if (seen.has(key)) {ignored++;continue;}
      seen.add(key);
      all.push({name,group,detail,clientGroup:company,managerName,managerPhone});
    }
  }
  return { guests: all, ignored };
}

function ImportSheet({ busy, onImport, close }) {
  const [preview,setPreview]=useState(null); const [fileName,setFileName]=useState('');
  const [error,setError]=useState(''); const [reading,setReading]=useState(false);
  const [selection,setSelection]=useState('todas');
  // Importação somente com bibliotecas já presentes no package-lock.json.
  // ExcelJS: .xlsx. CSV: parser local, sem dependências externas.
  const parseCSV = (source, delimiter) => {
    const text = source.replace(/^\uFEFF/, '');
    const rows = [];
    let line = [], part = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (quoted && text[i + 1] === '"') { part += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === delimiter && !quoted) {
        line.push(part); part = '';
      } else if ((ch === '\r' || ch === '\n') && !quoted) {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        line.push(part); part = '';
        if (line.some(v => v.trim())) rows.push(line);
        line = [];
      } else {
        part += ch;
      }
    }
    line.push(part);
    if (line.some(v => v.trim())) rows.push(line);
    if (!rows.length) return [];
    const headers = rows[0].map(s => String(s || '').trim());
    return rows.slice(1).map(values =>
      Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? '').trim()]))
    );
  };
  const csvDelimiter = (text) => {
    // Conta separadores fora de aspas apenas na primeira linha lógica.
    let quoted = false, semi = 0, comma = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (quoted && text[i+1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && (ch === '\n' || ch === '\r')) break;
      else if (!quoted && ch === ';') semi++;
      else if (!quoted && ch === ',') comma++;
    }
    return semi >= comma ? ';' : ',';
  };
  const cellText = (cell) => {
    const v = cell?.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      if (Array.isArray(v.richText)) return v.richText.map(x => x.text || '').join('').trim();
      if ('result' in v) return String(v.result ?? '').trim();
      if ('text' in v) return String(v.text ?? '').trim();
      if ('hyperlink' in v) return String(v.hyperlink ?? '').trim();
    }
    if (v instanceof Date) return v.toLocaleDateString('pt-BR');
    return String(v).trim();
  };
  const read=async(file)=>{
    if(!file) return;
    setError('');setPreview(null);setReading(true);setFileName(file.name);
    try {
      if(file.size>7*1024*1024) throw new Error('O arquivo deve ter no máximo 7 MB.');
      const ext=file.name.toLowerCase().split('.').pop();
      let sheets=[];
      if(ext==='csv') {
        const text=await file.text();
        sheets=[{name:file.name.replace(/\.csv$/i,''),rows:parseCSV(text,csvDelimiter(text))}];
      } else if(ext==='xlsx') {
        const module=await import('exceljs');
        const ExcelJS=module.default || module;
        const workbook=new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        sheets=workbook.worksheets.map(sheet=>{
          const header=sheet.getRow(1);
          const count=Math.max(sheet.columnCount,header.cellCount);
          const cols=Array.from({length:count},(_,i)=>cellText(header.getCell(i+1)));
          const rows=[];
          sheet.eachRow((row,number)=>{
            if(number===1) return;
            const entry=Object.fromEntries(cols.flatMap((name,index)=>name?[[name,cellText(row.getCell(index+1))]]:[]));
            if(Object.values(entry).some(Boolean))rows.push(entry);
          });
          return {name:sheet.name,rows};
        });
      } else if(ext==='xls') {
        throw new Error('O formato .xls antigo não é compatível com ExcelJS. Abra no Excel e salve como .xlsx ou .csv.');
      } else throw new Error('Formato inválido. Use .xlsx ou .csv.');
      if(!sheets.length) throw new Error('Nenhuma aba encontrada.');
      setPreview(sheets);setSelection('todas');
    }catch(e){setError(`Não foi possível ler a planilha: ${e.message}`);}finally{setReading(false);}
  };
  const selected=preview?.filter(s=>selection==='todas'||s.name===selection)||[];
  const parsed=useMemo(()=>rowsToGuests(selected),[preview,selection]);
  return <div className="gpsr-import">
    <div className="gpsr-import-drop"><FiUploadCloud/><strong>Selecione a planilha de convidados</strong><p>Excel .xlsx ou CSV. A importação não apaga os registros existentes.</p><label className="gpsr-btn primary" htmlFor="gpsr-file">Escolher arquivo</label><input id="gpsr-file" type="file" accept=".xlsx,.csv" onChange={e=>{read(e.target.files?.[0]);e.target.value='';}}/></div>
    {reading && <p className="gpsr-hint">Lendo planilha...</p>}
    {error && <p className="gpsr-import-error">{error}</p>}
    {preview && <>
      <div className="gpsr-import-controls"><label>Aba da planilha<select value={selection} onChange={e=>setSelection(e.target.value)}><option value="todas">Todas as abas (sem repetir nomes)</option>{preview.map(s=><option value={s.name} key={s.name}>{s.name} ({s.rows.length} linhas)</option>)}</select></label><div><strong>{parsed.guests.length}</strong><span>pessoas identificadas</span></div><div><strong>{parsed.ignored}</strong><span>linhas descartadas/repetidas</span></div></div>
      <div className="gpsr-import-preview"><div className="gpsr-preview-head"><strong>Prévia antes de salvar</strong><span>{fileName}</span></div>{parsed.guests.slice(0,10).map((g,i)=><div className="gpsr-preview-line" key={i}><span>{g.name}</span><small>{g.group==='cliente'?'Cliente':'Interno'}{g.clientGroup?` · ${g.clientGroup}`:''}{g.managerName?` · ${g.managerName}`:''}</small></div>)}{parsed.guests.length>10&&<p className="gpsr-hint">+ {parsed.guests.length-10} convidados na importação</p>}{!parsed.guests.length&&<p className="gpsr-hint">Nenhum nome reconhecido. Confira os cabeçalhos da aba.</p>}</div>
      <p className="gpsr-hint">Duplicados já existentes serão ignorados. Novos gerentes serão criados com telefone não validado. Nenhuma presença anterior será apagada.</p>
      <div className="gpsr-modal-actions"><button className="gpsr-btn ghost" type="button" onClick={close}>Cancelar</button><button type="button" disabled={busy||!parsed.guests.length||parsed.guests.length>500} className="gpsr-btn primary" onClick={()=>onImport(parsed.guests)}><FiUploadCloud/>{busy?'Importando...':`Importar ${parsed.guests.length} nomes`}</button></div>
      {parsed.guests.length>500&&<p className="gpsr-import-error">Limite de 500 pessoas por importação. Selecione uma aba de cada vez.</p>}
    </>}
  </div>;
}

export default function NPSMonitor() {
  const [data,setData]=useState(freshState);
  const [loaded,setLoaded]=useState(false), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const [view,setView]=useState('recepcao'), [query,setQuery]=useState(''), [focusQuery,setFocusQuery]=useState('');
  const [group,setGroup]=useState('todos'), [status,setStatus]=useState('todos'), [sort,setSort]=useState('pendentes');
  const [dialog,setDialog]=useState(null), [focus,setFocus]=useState(false), [success,setSuccess]=useState(null), [toast,setToast]=useState('');
  const [eventName,setEventName]=useState('');
  const busyRef=useRef(false), toastTimeout=useRef(null), searchRef=useRef(null),focusRef=useRef(null),revision=useRef(0);
  const notify=useCallback(message=>{setToast(message);clearTimeout(toastTimeout.current);toastTimeout.current=setTimeout(()=>setToast(''),4200);},[]);
  const reload=useCallback(async (quiet=false)=>{
    if(busyRef.current)return;
    const id=++revision.current;
    try{const state=await api('listar');if(id===revision.current){setData(state);setError('');}}
    catch(e){if(id===revision.current)setError(e.message||'Não foi possível conectar ao servidor.');}
    finally{if(!quiet)setLoaded(true);}
  },[]);
  useEffect(()=>{
    document.body.classList.add('hide-sidebar'); reload();
    const ticker=setInterval(()=>reload(true),POLL_MS);
    return()=>{document.body.classList.remove('hide-sidebar');clearInterval(ticker);clearTimeout(toastTimeout.current);};
  },[reload]);
  useEffect(()=>{
    const key=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();focus?focusRef.current?.focus():searchRef.current?.focus();}if(e.key==='Escape'&&focus)setFocus(false);};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[focus]);
  const guests=data.guests||[],managers=data.managers||[];
  const byManager=useMemo(()=>Object.fromEntries(managers.map(m=>[m.id,m])),[managers]);
  const present=guests.filter(g=>g.arrivedAt).length, pending=guests.length-present,percent=guests.length?Math.round(present/guests.length*100):0;
  const recent=useMemo(()=>guests.filter(g=>g.arrivedAt).slice().sort((a,b)=>Date.parse(b.arrivedAt)-Date.parse(a.arrivedAt)).slice(0,5),[guests]);
  const filtered=useMemo(()=>guests.filter(g=>matches(g,query,byManager)).filter(g=>group==='todos'||group===g.group).filter(g=>status==='todos'||(status==='presentes'?!!g.arrivedAt:!g.arrivedAt)).slice().sort((a,b)=>sort==='az'?a.name.localeCompare(b.name,'pt-BR'):sort==='recent'?(Date.parse(b.arrivedAt)||0)-(Date.parse(a.arrivedAt)||0):Number(!!a.arrivedAt)-Number(!!b.arrivedAt)||a.name.localeCompare(b.name,'pt-BR')),[guests,query,group,status,sort,byManager]);
  const focused=useMemo(()=>guests.filter(g=>matches(g,focusQuery,byManager)).slice().sort((a,b)=>Number(!!a.arrivedAt)-Number(!!b.arrivedAt)||a.name.localeCompare(b.name,'pt-BR')).slice(0,8),[guests,focusQuery,byManager]);
  const quick=filtered.slice(0,6);
  const mutate=useCallback(async (acao,payload)=>{
    if(busyRef.current)return null;
    busyRef.current=true;setBusy(true);++revision.current;
    try{
      const res=await api(acao,payload);
      try { const updated=await api('listar');setData(updated);setError(''); }
      catch(e) {setError(`Operação salva, mas a atualização falhou: ${e.message}`);} 
      return res;
    }catch(e){notify(e.message||'Falha ao salvar no servidor.');return null;}
    finally{busyRef.current=false;setBusy(false);}
  },[notify]);
  const close=()=>setDialog(null);
  async function checkin(g){
    if(g.arrivedAt){setDialog({type:'confirm',title:'Desfazer presença?',message:`Remover o registro de chegada de ${g.name}, feito às ${dateTime(g.arrivedAt)}?`,button:'Desfazer presença',danger:true,confirm:async()=>{if(await mutate('definirPresenca',{id:g.id,presente:false})){close();notify('Presença removida.');}}});return;}
    const result=await mutate('definirPresenca',{id:g.id,presente:true});if(result){setSuccess({...g,...result});notify('Check-in confirmado.');}
  }
  async function saveGuest(g){const source=dialog?.source;const result=await mutate(g.bulk?'adicionarConvidadosLote':source?'editarConvidado':'adicionarConvidado',source?{...g,id:source.id}:g);if(result){close();notify(g.bulk?`${result.added} convidados incluídos.`:'Convidado salvo com sucesso.');}}
  function removeGuest(g){setDialog({type:'confirm',title:'Excluir convidado?',message:`Remover ${g.name} da lista${g.arrivedAt?' e excluir sua presença':''}?`,button:'Excluir convidado',danger:true,confirm:async()=>{if(await mutate('excluirConvidado',{id:g.id})){close();notify('Convidado removido.');}}});}
  async function saveManager(m){const source=dialog?.source;const result=await mutate(source?'editarGerente':'adicionarGerente',source?{...m,id:source.id}:m);if(result){setDialog({type:'managers'});notify('Gerente salvo.');}}
  function removeManager(m){setDialog({type:'confirm',title:'Excluir gerente?',message:`Remover ${m.name}? Não será permitido se existirem convidados vinculados.`,button:'Excluir gerente',danger:true,confirm:async()=>{if(await mutate('excluirGerente',{id:m.id})){setDialog({type:'managers'});notify('Gerente removido.');}}});}
  async function importGuests(rows){const result=await mutate('importarConvidadosPlanilha',{guests:rows});if(result){close();notify(`${result.added} convidados importados · ${result.skipped} ignorados · ${result.managersAdded} gerentes novos.`);setView('lista');}}
  function whatsapp(g){
    const m=byManager[g.managerId];
    if(!g.arrivedAt)return notify('Confirme a presença primeiro.');
    if(!m?.verified||!/^\d{12,15}$/.test(toPhone(m.phone)))return notify('Valide o número do gerente antes de notificar.');
    const msg=`GRUPO GPS | CHECK-IN\n\nOlá, ${m.name}!\n\nO cliente ${g.name}, da empresa ${g.clientGroup||g.detail||'não informada'}, chegou ao evento ${data.eventTitle||'Grupo GPS'} às ${hhmm(g.arrivedAt)}.\n\nRecepção Grupo GPS.`;
    const phone=toPhone(m.phone), mobile=/Android|iPhone|iPad/i.test(navigator.userAgent);
    const url=mobile?`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`:`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url,'_blank','noopener,noreferrer');
    api('registrarWhatsappAberto',{id:g.id}).catch(()=>{});setSuccess(null);notify('Conversa aberta. Clique em Enviar no WhatsApp.');
  }
  function exportCSV(){
    const cols=[['Nome','Categoria','Empresa / Área','Gerente','Presença','Chegada']];
    guests.forEach(g=>cols.push([g.name,g.group==='cliente'?'Cliente':'Interno',g.clientGroup||g.detail||'',byManager[g.managerId]?.name||'',g.arrivedAt?'Presente':'Pendente',dateTime(g.arrivedAt)]));
    const esc=(v)=>{const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';};
    const url=URL.createObjectURL(new Blob(['\ufeff'+cols.map(x=>x.map(esc).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='grupo-gps-presencas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  const canWa=g=>g.group==='cliente'&&!!g.arrivedAt&&!!byManager[g.managerId]?.verified&&/^\d{12,15}$/.test(toPhone(byManager[g.managerId]?.phone));
  const avatar=(g)=><span className={`gpsr-avatar ${g.arrivedAt?'present':''}`}>{initials(g.name)}{g.arrivedAt&&<i><FiCheck/></i>}</span>;
  const row=(g,small=false)=><article key={g.id} className={`gpsr-person ${g.arrivedAt?'arrived':''} ${small?'compact':''}`}>
    {avatar(g)}
    <div className="gpsr-person-details"><strong title={g.name}>{g.name}</strong><small>{g.clientGroup||g.detail||'Grupo GPS'} · {g.group==='cliente'?'Cliente':'Interno'}</small>{g.group==='cliente'&&byManager[g.managerId]&&<small>Gerente: {byManager[g.managerId].name}</small>}</div>
    {!small&&<span className={`gpsr-type ${g.group==='cliente'?'client':''}`}>{g.group==='cliente'?'Cliente':'Interno'}</span>}
    <div className="gpsr-person-commands"><button type="button" className={`gpsr-check ${g.arrivedAt?'done':''}`} disabled={busy} onClick={()=>checkin(g)}>{g.arrivedAt?<><FiRefreshCw/> Desfazer</>:<><FiCheck/> Confirmar</>}</button>{g.arrivedAt&&<small>Às {hhmm(g.arrivedAt)}</small>}{canWa(g)&&<button type="button" className="gpsr-wa" onClick={()=>whatsapp(g)}><FiMessageCircle/> WhatsApp</button>}{!small&&<div className="gpsr-mini-actions"><button type="button" title="Editar convidado" aria-label={`Editar ${g.name}`} onClick={()=>setDialog({type:'guest',source:g})}><FiEdit2/></button><button type="button" title="Excluir convidado" aria-label={`Excluir ${g.name}`} onClick={()=>removeGuest(g)}><FiTrash2/></button></div>}</div>
  </article>;

  return <div className="gpsr-root gpsr-layout-v4"><Sky/><div className="gpsr-shell">
    <header className="gpsr-top"><div className="gpsr-brand"><i/> GRUPO GPS <span>· RECEPÇÃO</span></div><nav className="gpsr-nav" aria-label="Navegação"><button type="button" className={view==='recepcao'?'active':''} onClick={()=>setView('recepcao')}>Recepção</button><button type="button" className={view==='lista'?'active':''} onClick={()=>setView('lista')}>Lista</button><button type="button" className={view==='gerentes'?'active':''} onClick={()=>setView('gerentes')}>Gerentes</button></nav><div className="gpsr-top-actions"><button type="button" title="Atualizar" aria-label="Atualizar" onClick={()=>reload()}><FiRefreshCw/></button><button type="button" title="Configurações" aria-label="Configurações" onClick={()=>{setEventName(data.eventTitle);setDialog({type:'settings'});}}><FiSettings/></button></div></header>
    <main className="gpsr-main">
      <div className="gpsr-heading"><div><span className="gpsr-eyebrow">LISTA DE PRESENÇA</span><h1>{data.eventTitle||'Evento Grupo GPS'}</h1><p>Controle de entrada em tempo real</p></div><div className="gpsr-header-buttons"><button type="button" className="gpsr-btn ghost" onClick={()=>setDialog({type:'import'})}><FiUploadCloud/> Importar Excel</button><button type="button" className="gpsr-btn primary" onClick={()=>setDialog({type:'guest',source:null})}><FiPlus/> Adicionar nome</button></div></div>
      {error&&<div className="gpsr-alert"><FiInfo/><span><b>Falha na sincronização.</b> {error}</span><button type="button" onClick={()=>reload()}>Tentar novamente</button></div>}
      {!loaded&&<div className="gpsr-loading">Carregando convidados do servidor...</div>}
      <section className="gpsr-metrics" aria-label="Indicadores"><div><FiUsers/><span><strong>{guests.length}</strong><small>Convidados</small></span></div><div><FiUserCheck/><span><strong>{present}</strong><small>Presentes</small></span></div><div><FiClock/><span><strong>{pending}</strong><small>Pendentes</small></span></div><div className="gpsr-percent"><strong>{percent}%</strong><span>de presença</span><i><em style={{width:`${percent}%`}}/></i></div></section>
      {view==='recepcao'&&<><section className="gpsr-quick"><div className="gpsr-card-head gpsr-card-head--action"><div className="gpsr-card-title"><span className="gpsr-eyebrow">CHECK-IN EXPRESSO</span><h2>Localizar participante</h2></div><div className="gpsr-card-action"><button className="gpsr-icon-outline" type="button" onClick={()=>{setFocus(true);setFocusQuery('');setTimeout(()=>focusRef.current?.focus(),50);}} title="Modo foco"><FiMaximize2/> <span>Modo foco</span></button></div></div><div className="gpsr-card-body"><div className="gpsr-search"><FiSearch/><input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome, empresa ou gerente..."/></div><div className="gpsr-filter-inline"><span>FILTRAR</span>{[['todos','Todos'],['cliente','Clientes'],['interno','Internos']].map(([v,l])=><button type="button" key={v} className={group===v?'selected':''} onClick={()=>setGroup(v)}>{l}</button>)}</div><div className="gpsr-result-caption"><strong>RESULTADOS</strong><span>{filtered.length} encontrados</span></div><div className="gpsr-quick-results">{quick.map(g=>row(g,true))}{!quick.length&&<div className="gpsr-empty">Nenhum participante encontrado.</div>}</div></div><div className="gpsr-card-footer"><span>Busque e confirme em um toque.</span><button type="button" onClick={()=>setView('lista')}>Ver lista completa <FiArrowRight/></button></div></section></>}
      {view==='lista'&&<div className="gpsr-workspace"><section className="gpsr-roster"><div className="gpsr-card-head gpsr-card-head--action"><div className="gpsr-card-title"><span className="gpsr-eyebrow">CONVIDADOS</span><h2>Lista completa <b>{filtered.length}</b></h2></div><div className="gpsr-card-action"><button className="gpsr-icon-outline" type="button" onClick={exportCSV}><FiDownload/> <span>Exportar CSV</span></button></div></div><div className="gpsr-roster-tools"><div className="gpsr-search"><FiSearch/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar convidado..."/></div><select aria-label="Ordenar" value={sort} onChange={e=>setSort(e.target.value)}><option value="pendentes">Pendentes primeiro</option><option value="az">Nome A–Z</option><option value="recent">Últimas chegadas</option></select></div><div className="gpsr-filters"><div className="gpsr-status-tabs">{[['todos','Todos'],['pendentes','Aguardando'],['presentes','Presentes']].map(([v,l])=><button type="button" key={v} className={status===v?'selected':''} onClick={()=>setStatus(v)}>{l}</button>)}</div><div className="gpsr-group-tabs">{[['todos','Todos'],['cliente','Clientes'],['interno','Internos']].map(([v,l])=><button type="button" key={v} className={group===v?'selected':''} onClick={()=>setGroup(v)}>{l}</button>)}</div></div><div className="gpsr-table-head"><span>PARTICIPANTE</span><span>TIPO</span><span>CHECK-IN / AÇÕES</span></div><div className="gpsr-list">{filtered.map(g=>row(g))}{!filtered.length&&<div className="gpsr-empty">Não há convidados para este filtro.</div>}</div><div className="gpsr-card-footer"><span>{filtered.length} de {guests.length} convidados</span><button type="button" onClick={()=>setDialog({type:'guest',source:null})}>Adicionar nome <FiPlus/></button></div></section>
      <aside className="gpsr-activity"><div className="gpsr-card-head"><div><span className="gpsr-eyebrow">AO VIVO</span><h2>Últimas chegadas</h2></div><span className="gpsr-live"><i/> LIVE</span></div><div className="gpsr-activity-body">{recent.length?recent.map(g=><div className="gpsr-arrival" key={g.id}>{avatar(g)}<span><strong>{g.name}</strong><small>{g.group==='cliente'?'Cliente':'Interno'} · Presença confirmada</small></span><time>{hhmm(g.arrivedAt)}</time></div>):<div className="gpsr-empty">Nenhum check-in realizado ainda.</div>}</div></aside></div>}
      {view==='gerentes'&&<section className="gpsr-roster gpsr-managers-panel"><div className="gpsr-card-head gpsr-card-head--action"><div className="gpsr-card-title"><span className="gpsr-eyebrow">VÍNCULOS COM CLIENTES</span><h2>Gerentes responsáveis</h2></div><div className="gpsr-card-action"><button className="gpsr-btn primary" type="button" onClick={()=>setDialog({type:'manager',source:null})}><FiPlus/> Novo gerente</button></div></div><div className="gpsr-manager-list">{managers.map(m=><article key={m.id} className="gpsr-manager"><span className="gpsr-manager-icon"><FiUsers/></span><div><strong>{m.name}</strong><small>{m.phone||'Sem telefone'} · {m.verified?'Telefone validado':'Pendente de validação'}</small><small>{guests.filter(g=>g.managerId===m.id).length} clientes vinculados</small></div><div className="gpsr-mini-actions"><button title="Editar gerente" type="button" onClick={()=>setDialog({type:'manager',source:m})}><FiEdit2/></button><button title="Excluir gerente" type="button" onClick={()=>removeManager(m)}><FiTrash2/></button></div></article>)}{!managers.length&&<div className="gpsr-empty">Nenhum gerente cadastrado.</div>}</div></section>}
      <footer className="gpsr-page-footer"><span>Grupo GPS · Lista de presença</span><span>Sincronização a cada 12 segundos · JSON no servidor</span></footer>
    </main>
    </div>
    {dialog?.type==='guest'&&<Overlay title={dialog.source?'Editar participante':'Adicionar convidados'} eyebrow="CADASTRO" close={close}><GuestEditor key={dialog.source?.id||'new'} source={dialog.source} managers={managers} busy={busy} save={saveGuest} close={close}/></Overlay>}
    {dialog?.type==='manager'&&<Overlay title={dialog.source?'Editar gerente':'Novo gerente'} eyebrow="GERENTES" close={close}><ManagerEditor key={dialog.source?.id||'new'} source={dialog.source} save={saveManager} busy={busy} close={close}/></Overlay>}
    {dialog?.type==='import'&&<Overlay title="Importar convidados" eyebrow="PLANILHA EXCEL / CSV" large close={close}><ImportSheet busy={busy} onImport={importGuests} close={close}/></Overlay>}
    {dialog?.type==='settings'&&<Overlay title="Configurações do evento" eyebrow="PREFERÊNCIAS" close={close}><form className="gpsr-form" onSubmit={async e=>{e.preventDefault();if(await mutate('editarEvento',{eventTitle:eventName})){close();notify('Evento atualizado.');}}}><label>Nome do evento<input required maxLength={90} value={eventName} onChange={e=>setEventName(e.target.value)}/></label><div className="gpsr-modal-actions"><button type="submit" className="gpsr-btn primary" disabled={busy}>Salvar nome</button><button type="button" className="gpsr-btn ghost" onClick={exportCSV}>Exportar CSV</button></div></form></Overlay>}
    {dialog?.type==='confirm'&&<Overlay title={dialog.title} eyebrow="CONFIRMAÇÃO" close={close}><p className="gpsr-confirm-copy">{dialog.message}</p><div className="gpsr-modal-actions"><button className="gpsr-btn ghost" type="button" onClick={close}>Cancelar</button><button className={`gpsr-btn ${dialog.danger?'danger':'primary'}`} type="button" disabled={busy} onClick={dialog.confirm}>{busy?'Salvando...':dialog.button}</button></div></Overlay>}
    {success&&<div className="gpsr-success-mask" role="dialog" aria-modal="true" aria-label="Check-in confirmado"><div className="gpsr-success"><button type="button" className="gpsr-square" aria-label="Fechar" onClick={()=>setSuccess(null)}><FiX/></button><span className="gpsr-success-symbol"><FiCheck/></span><span className="gpsr-eyebrow">CHECK-IN CONFIRMADO</span><h2>{success.name}</h2><p>Chegada registrada às {hhmm(success.arrivedAt)}</p><div className="gpsr-success-buttons">{canWa(success)&&<button type="button" className="gpsr-btn primary" onClick={()=>whatsapp(success)}><FiMessageCircle/> Enviar WhatsApp</button>}<button type="button" className="gpsr-btn ghost" onClick={()=>{setSuccess(null);setQuery('');searchRef.current?.focus();}}>Próximo convidado <FiArrowRight/></button></div></div></div>}
    {focus&&<div className="gpsr-focus" role="dialog" aria-modal="true" aria-label="Check-in em tela cheia"><header className="gpsr-focus-head"><span>GRUPO GPS · RECEPÇÃO</span><button className="gpsr-btn ghost" type="button" onClick={()=>setFocus(false)}>Fechar <FiX/></button></header><div className="gpsr-focus-inner"><span className="gpsr-eyebrow">CHECK-IN EXPRESSO</span><h2>Localize um convidado.</h2><div className="gpsr-search gpsr-focus-search"><FiSearch/><input ref={focusRef} autoFocus value={focusQuery} onChange={e=>setFocusQuery(e.target.value)} placeholder="Nome, empresa ou gerente..."/></div><p>{focused.length} resultados exibidos</p><div className="gpsr-focus-results">{focused.map(g=><article key={g.id}>{avatar(g)}<div className="gpsr-person-details"><strong>{g.name}</strong><small>{g.clientGroup||g.detail||'Grupo GPS'}</small></div><button type="button" className={`gpsr-check ${g.arrivedAt?'done':''}`} onClick={()=>checkin(g)} disabled={busy}>{g.arrivedAt?'Desfazer':'Confirmar'}</button></article>)}{!focused.length&&<div className="gpsr-empty">Nenhum convidado encontrado.</div>}</div></div></div>}
    {toast&&<div className="gpsr-toast" role="status"><FiCheckCircle/><span>{toast}</span><button aria-label="Fechar aviso" type="button" onClick={()=>setToast('')}><FiX/></button></div>}
  </div>;
}
