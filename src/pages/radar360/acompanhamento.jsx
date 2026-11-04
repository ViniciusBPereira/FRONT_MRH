import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import "./acompanhamento.css";

/* ============================================================
   RADAR 360 — ACOMPANHAMENTO MENSAL
   A evolução gráfica dos indicadores é exibida na Visão Geral.
============================================================ */

const EMPTY_TRACKING = [];

const INITIAL_FORM = {
  contract_id: "",
  reference_month: "",
  turnover: "",
  absenteeism: "",
  he_inefficiency: "",
  replacement_days: "",
  notes: "",
};

const INDICATORS = [
  { name: "turnover", label: "Turnover (%)", suffix: "%", placeholder: "Ex.: 3,5" },
  { name: "absenteeism", label: "Absenteísmo (%)", suffix: "%", placeholder: "Ex.: 2,7" },
  {
    name: "he_inefficiency",
    label: "H.E. Ineficiência (R$)",
    suffix: "R$",
    placeholder: "Ex.: 1.500,50",
  },
  {
    name: "replacement_days",
    label: "Tempo médio de reposição (dias)",
    suffix: "dias",
    placeholder: "Ex.: 12,5",
  },
];

function authConfig() {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

function extractArray(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  for (const value of [data?.tracking, data?.contracts, data?.data, data?.rows, data?.items]) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function codeOf(contract) {
  return String(
    contract?.contract ?? contract?.contract_number ?? contract?.code ??
    contract?.contract_code ?? contract?.number ?? "",
  ).trim();
}

function contractLabel(contract) {
  if (!contract) return "Contrato não localizado";
  return [
    codeOf(contract) || String(contract.id ?? ""),
    contract.client ?? contract.client_name,
    contract.unit ?? contract.unit_name,
  ].filter(Boolean).join(" — ");
}

function monthOf(value) {
  if (!value) return "";
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function formatMonth(value) {
  const valueMonth = monthOf(value);
  if (!valueMonth) return "—";
  const [year, month] = valueMonth.split("-");
  return `${month}/${year}`;
}

// Converte 2,5 / 1.250,50 / 2.5 em número; vazio continua null.
function parseBrazilianNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  let text = String(value).trim().replace(/\s/g, "");
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formNumber(value) {
  return value === null || value === undefined ? "" : String(value).replace(".", ",");
}

function numberDisplay(value, style = "decimal") {
  const number = parseBrazilianNumber(value);
  if (number === null || !Number.isFinite(number)) return "—";
  if (style === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency", currency: "BRL", minimumFractionDigits: 2,
    }).format(number);
  }
  const formatted = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(number);
  if (style === "percent") return `${formatted}%`;
  if (style === "days") return `${formatted} dias`;
  return formatted;
}

function normalizeItem(item) {
  if (!item) return null;
  return {
    ...item,
    id: item.id ?? item.tracking_id ?? null,
    contract_id: item.contract_id ?? item.tracking_contract_id ?? item.contractId ?? item.contract?.id ?? null,
    reference_month: monthOf(item.reference_month ?? item.referenceMonth),
    turnover: item.turnover ?? null,
    absenteeism: item.absenteeism ?? null,
    he_inefficiency: item.he_inefficiency ?? null,
    replacement_days: item.replacement_days ?? null,
    notes: item.notes ?? "",
  };
}

export default function Tracking({
  tracking = EMPTY_TRACKING,
  contratoSelecionado = "",
  onReload,
}) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [trackingData, setTrackingData] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [contractError, setContractError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [search, setSearch] = useState("");

  // Cadastro de contratos usado tanto na seleção quanto para resolver o CR global.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingContracts(true);
        const response = await api.get("/contracts", authConfig());
        if (active) setContracts(extractArray(response));
      } catch (error) {
        console.error("[ACOMPANHAMENTO] Contratos:", error);
        if (active) setContractError(error.response?.data?.message || "Não foi possível carregar os contratos.");
      } finally {
        if (active) setLoadingContracts(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // A Visão Geral passa o código do contrato (CR), não necessariamente seu UUID.
  const externalId = useMemo(() => {
    if (!contratoSelecionado) return "";
    const value = String(contratoSelecionado).trim();
    const match = contracts.find((contract) =>
      String(contract.id ?? "") === value || codeOf(contract) === value,
    );
    return match ? String(match.id) : "";
  }, [contracts, contratoSelecionado]);

  useEffect(() => {
    if (!externalId) return;
    setEditingId(null);
    setForm((current) =>
      current.contract_id === externalId ? current : { ...INITIAL_FORM, contract_id: externalId },
    );
    setFeedback("");
  }, [externalId]);

  const selectedContractId = String(form.contract_id ?? "");
  const selectedContract = useMemo(() =>
    contracts.find((item) => String(item.id) === selectedContractId) || null,
  [contracts, selectedContractId]);

  const refreshHistory = useCallback(() => setRefreshVersion((value) => value + 1), []);

  // A consulta primária é a rota já utilizada no módulo anterior.
  // Se a rota específica não existir, tenta a listagem geral e filtra pelo contrato.
  useEffect(() => {
    let active = true;
    if (!selectedContractId) {
      setTrackingData([]);
      setHistoryError("");
      setLoadingTracking(false);
      return () => { active = false; };
    }

    (async () => {
      setLoadingTracking(true);
      setHistoryError("");
      try {
        let response;
        let scoped = true;
        try {
          response = await api.get(`/tracking/contract/${encodeURIComponent(selectedContractId)}`, authConfig());
        } catch (error) {
          if (![404, 405].includes(error?.response?.status)) throw error;
          scoped = false;
          response = await api.get("/tracking", authConfig());
        }
        const rows = extractArray(response).map(normalizeItem).filter(Boolean);
        const filtered = rows.filter((row) => {
          if (!row.contract_id) return scoped; // Endpoint específico já limita ao contrato.
          return String(row.contract_id) === selectedContractId;
        });
        if (active) setTrackingData(filtered);
      } catch (error) {
        console.error("[ACOMPANHAMENTO] Histórico:", error);
        if (active) {
          // Os dados recebidos do componente pai são usados como fallback.
          const fallback = (Array.isArray(tracking) ? tracking : [])
            .map(normalizeItem)
            .filter((item) => item && String(item.contract_id) === selectedContractId);
          setTrackingData(fallback);
          setHistoryError(
            fallback.length ? "Exibindo dados da última atualização. Não foi possível consultar o histórico agora." :
            (error?.response?.data?.message || "Não foi possível consultar o histórico do contrato."),
          );
        }
      } finally {
        if (active) setLoadingTracking(false);
      }
    })();
    return () => { active = false; };
  }, [selectedContractId, refreshVersion, tracking]);

  const history = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return trackingData
      .filter((item) => !query ||
        formatMonth(item.reference_month).toLowerCase().includes(query) ||
        item.reference_month.includes(query) ||
        String(item.notes || "").toLocaleLowerCase("pt-BR").includes(query),
      )
      .sort((a, b) => b.reference_month.localeCompare(a.reference_month));
  }, [trackingData, search]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFeedback("");
  }

  function changeContract(event) {
    const id = event.target.value;
    setForm({ ...INITIAL_FORM, contract_id: id });
    setEditingId(null);
    setSearch("");
    setFeedback("");
  }

  function clearForm() {
    setForm({ ...INITIAL_FORM, contract_id: selectedContractId });
    setEditingId(null);
    setFeedback("");
  }

  function handleEdit(item) {
    if (item.id == null) return;
    setEditingId(item.id);
    setForm({
      contract_id: selectedContractId,
      reference_month: monthOf(item.reference_month),
      turnover: formNumber(item.turnover),
      absenteeism: formNumber(item.absenteeism),
      he_inefficiency: formNumber(item.he_inefficiency),
      replacement_days: formNumber(item.replacement_days),
      notes: item.notes ?? "",
    });
    setFeedback("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.contract_id || !form.reference_month) {
      setFeedback("Selecione um contrato e informe o mês de referência.");
      return;
    }

    const payload = {
      contract_id: form.contract_id,
      reference_month: form.reference_month,
      notes: form.notes.trim(),
    };

    for (const indicator of INDICATORS) {
      const parsed = parseBrazilianNumber(form[indicator.name]);
      if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 ||
        ((indicator.name === "turnover" || indicator.name === "absenteeism") && parsed > 100))) {
        setFeedback(`Confira o valor informado para ${indicator.label}.`);
        return;
      }
      payload[indicator.name] = parsed;
    }

    try {
      setSaving(true);
      setFeedback("");
      if (editingId !== null) {
        await api.put(`/tracking/${editingId}`, payload, authConfig());
      } else {
        await api.post("/tracking", payload, authConfig());
      }
      const message = editingId !== null ? "Acompanhamento atualizado com sucesso." : "Acompanhamento cadastrado com sucesso.";
      clearForm();
      setFeedback(message);
      refreshHistory();
      if (onReload) {
        try { await onReload(); } catch (reloadError) { console.error("[ACOMPANHAMENTO] Atualização geral:", reloadError); }
      }
    } catch (error) {
      console.error("[ACOMPANHAMENTO] Salvamento:", error);
      setFeedback(error?.response?.data?.message || "Não foi possível salvar o acompanhamento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (item.id == null) return;
    if (!window.confirm(`Deseja excluir o acompanhamento de ${formatMonth(item.reference_month)}?`)) return;
    try {
      setSaving(true);
      setFeedback("");
      await api.delete(`/tracking/${item.id}`, authConfig());
      if (String(editingId) === String(item.id)) clearForm();
      setFeedback("Acompanhamento excluído com sucesso.");
      refreshHistory();
      if (onReload) {
        try { await onReload(); } catch (reloadError) { console.error("[ACOMPANHAMENTO] Atualização geral:", reloadError); }
      }
    } catch (error) {
      console.error("[ACOMPANHAMENTO] Exclusão:", error);
      setFeedback(error?.response?.data?.message || "Não foi possível excluir o acompanhamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tracking-page">
      <form className="tracking-card tracking-form" onSubmit={handleSubmit}>
        <div className="tracking-card-header">
          <div>
            <span className="tracking-eyebrow">ACOMPANHAMENTO MENSAL</span>
            <h2>{editingId !== null ? "Editar acompanhamento" : "Novo acompanhamento"}</h2>
            <small>Registre os quatro indicadores operacionais do contrato. Os gráficos de evolução estão na Visão Geral.</small>
          </div>
        </div>

        {contractError && <div className="tracking-notice tracking-notice-error" role="alert">{contractError}</div>}

        <div className="tracking-fields">
          <label className="full">
            Contrato <span className="tracking-required">*</span>
            <select name="contract_id" value={form.contract_id} onChange={changeContract}
              disabled={saving || loadingContracts || editingId !== null} required>
              <option value="">{loadingContracts ? "Carregando contratos..." : "Selecione um contrato"}</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={String(contract.id)}>{contractLabel(contract)}</option>
              ))}
            </select>
          </label>

          <label>
            Mês de referência <span className="tracking-required">*</span>
            <input type="month" name="reference_month" value={form.reference_month}
              onChange={handleChange} disabled={saving} required />
          </label>
          <div className="tracking-month-help">Os valores registrados serão utilizados nos gráficos mensais da Visão Geral.</div>

          {INDICATORS.map((indicator) => (
            <label key={indicator.name}>
              {indicator.label}
              <input type="text" inputMode="decimal" autoComplete="off"
                name={indicator.name} value={form[indicator.name]} onChange={handleChange}
                placeholder={indicator.placeholder} disabled={saving} />
            </label>
          ))}

          <label className="full">
            Observações
            <textarea name="notes" rows={4} value={form.notes} onChange={handleChange}
              placeholder="Registre avanços, riscos, decisões e acontecimentos relevantes do mês."
              disabled={saving} />
          </label>
        </div>

        {selectedContract && (
          <div className="tracking-selected-contract">
            <span>Contrato em acompanhamento</span>
            <strong>{contractLabel(selectedContract)}</strong>
          </div>
        )}

        {feedback && (
          <div className={`tracking-notice ${/sucesso/i.test(feedback) ? "tracking-notice-success" : "tracking-notice-error"}`} role="status">
            {feedback}
          </div>
        )}

        <div className="tracking-actions">
          <button type="button" className="secondary" onClick={clearForm} disabled={saving}>
            {editingId !== null ? "Cancelar edição" : "Limpar"}
          </button>
          <button type="submit" className="primary" disabled={saving || loadingContracts || !form.contract_id}>
            {saving ? "Salvando..." : editingId !== null ? "Atualizar acompanhamento" : "Salvar acompanhamento"}
          </button>
        </div>
      </form>

      <section className="tracking-table-card" aria-label="Histórico de acompanhamentos">
        <div className="tracking-card-header tracking-history-header">
          <div>
            <span className="tracking-eyebrow">HISTÓRICO</span>
            <h2>Histórico de acompanhamentos</h2>
            <small>Consulte, edite ou exclua os registros mensais do contrato selecionado.</small>
          </div>
          <span className="tracking-count">{trackingData.length} registro{trackingData.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="tracking-history-toolbar">
          <div className="tracking-history-selected">
            {selectedContract ? contractLabel(selectedContract) : "Selecione um contrato no formulário"}
          </div>
          <input type="search" aria-label="Buscar no histórico" placeholder="Buscar mês ou observação..."
            value={search} onChange={(event) => setSearch(event.target.value)} disabled={!selectedContractId} />
        </div>

        {historyError && <div className="tracking-notice tracking-notice-error" role="alert">{historyError}</div>}

        <div className="tracking-table-wrapper">
          <table className="tracking-table-simple">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Turnover</th>
                <th>Absenteísmo</th>
                <th>H.E. Ineficiência</th>
                <th>Tempo médio de reposição</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(!selectedContractId || loadingTracking || history.length === 0) ? (
                <tr><td colSpan={7} className="tracking-empty">
                  {!selectedContractId ? "Selecione um contrato para consultar o histórico." :
                    loadingTracking ? "Carregando acompanhamentos..." :
                    trackingData.length && search ? "Nenhum registro corresponde à pesquisa." :
                    "Nenhum acompanhamento registrado para este contrato."}
                </td></tr>
              ) : history.map((item, index) => (
                <tr key={item.id ?? `${item.reference_month}-${index}`}>
                  <td className="tracking-month-cell">{formatMonth(item.reference_month)}</td>
                  <td>{numberDisplay(item.turnover, "percent")}</td>
                  <td>{numberDisplay(item.absenteeism, "percent")}</td>
                  <td>{numberDisplay(item.he_inefficiency, "currency")}</td>
                  <td>{numberDisplay(item.replacement_days, "days")}</td>
                  <td className="tracking-notes-cell" title={item.notes || ""}>{item.notes || "—"}</td>
                  <td>
                    <div className="tracking-row-actions">
                      <button type="button" onClick={() => handleEdit(item)} disabled={saving || item.id == null}>Editar</button>
                      <button type="button" className="delete-button" onClick={() => handleDelete(item)} disabled={saving || item.id == null}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
