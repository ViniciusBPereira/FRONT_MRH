import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import "./contrato.css";

/* ============================================================
   RADAR 360 | CONTRATOS

   A página gerencia o cadastro e consulta de contratos.
   As visitas são consultadas somente para exibir sua quantidade.

   Campos novos esperados na API /contracts:
   - monitoring_status
   - status_observation
============================================================ */

const CONTRACT_STATUSES = ["Em acompanhamento", "Standby", "Encerrado"];

const emptyForm = () => ({
  contract: "",
  business_partner: "",
  client: "",
  unit: "",
  leadership_responsible: "",
  headcount: "",
  monitoring_status: "Em acompanhamento",
  status_observation: "",
});

const text = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

function firstFilled(...values) {
  for (const value of values) {
    if (text(value)) return text(value);
  }
  return "";
}

const normalized = (value) =>
  text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");

function getArrayResponse(response, keys = []) {
  const data = response?.data;
  if (Array.isArray(data)) return data;

  for (const candidate of [
    data?.data,
    data?.rows,
    data?.items,
    ...keys.map((key) => data?.[key]),
    data?.data?.rows,
    data?.data?.items,
  ]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function getCR(item) {
  return firstFilled(
    item?.cr,
    item?.contract,
    item?.contract_number,
    item?.contractNumber,
    item?.code,
    item?.contract_data?.cr,
    item?.contract_data?.contract,
    item?.contractData?.cr,
    item?.contractData?.contract,
  );
}

function getBP(item) {
  return firstFilled(
    item?.business_partner,
    item?.bp,
    item?.businessPartner,
    item?.contract_data?.business_partner,
    item?.contractData?.business_partner,
  );
}

function getContractStatus(item) {
  const raw = firstFilled(
    item?.monitoring_status,
    item?.operational_status,
    item?.contract_status,
    item?.tracking_status,
    item?.status,
  );
  const status = normalized(raw);

  if (status === "standby" || status === "stand by") return "Standby";
  if (status === "encerrado" || status === "encerrada") return "Encerrado";
  return "Em acompanhamento";
}

function getContractNote(item) {
  return firstFilled(
    item?.status_observation,
    item?.status_notes,
    item?.status_note,
    item?.contract_observation,
    item?.observation,
    item?.observations,
    item?.observacao,
    item?.notes,
  );
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

/**
 * Calcula o total de VISITAS por contrato.
 * Prioriza contract_id (UUID); usa CR + BP somente como alternativa.
 * Quando existem CRs repetidos, não atribui uma visita sem identificação
 * inequívoca a mais de um contrato.
 */
function calculateVisitCounts(contracts, visits) {
  const byId = new Map();
  const byCR = new Map();
  const sets = new Map();

  contracts.forEach((contract) => {
    const id = text(contract?.id);
    if (!id) return;

    byId.set(id, contract);
    sets.set(id, new Set());
    const key = normalized(getCR(contract));
    if (!key) return;

    if (!byCR.has(key)) byCR.set(key, []);
    byCR.get(key).push(contract);
  });

  visits.forEach((visit, index) => {
    const rawId = firstFilled(
      visit?.contract_id,
      visit?.contractId,
      visit?.contract_data?.id,
      visit?.contractData?.id,
    );
    let match = byId.get(rawId);

    if (!match) {
      // Alguns endpoints retornam apenas o código do contrato (CR).
      const crKey = normalized(getCR(visit) || rawId);
      const candidates = byCR.get(crKey) || [];
      const bp = normalized(getBP(visit));

      if (bp) {
        const sameBP = candidates.filter((contract) => normalized(getBP(contract)) === bp);
        if (sameBP.length === 1) match = sameBP[0];
      } else if (candidates.length === 1) {
        match = candidates[0];
      }
    }

    if (!match) return;

    const contractId = text(match.id);
    const visitKey = firstFilled(visit?.id, visit?.visit_id, visit?.visitId) || `row-${index}`;
    sets.get(contractId)?.add(visitKey);
  });

  return new Map([...sets].map(([id, ids]) => [id, ids.size]));
}

export default function Contrato({ onReload, contratoSelecionado = "" }) {
  const [contracts, setContracts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [visitsError, setVisitsError] = useState("");
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState(contratoSelecionado || "");
  const [notice, setNotice] = useState(null);

  const authConfig = useCallback(() => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  }), []);

  /** Consultas independentes: falha em /visits não impede o cadastro. */
  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingContracts(true);
      setLoadingVisits(true);
    }
    setPageError("");
    setVisitsError("");

    const [contractsResult, visitsResult] = await Promise.allSettled([
      api.get("/contracts", authConfig()),
      api.get("/visits", authConfig()),
    ]);

    let latestContracts = null;
    if (contractsResult.status === "fulfilled") {
      latestContracts = getArrayResponse(contractsResult.value, ["contracts"]);
      setContracts(latestContracts);
    } else {
      console.error("[CONTRATO] Erro ao carregar contratos:", contractsResult.reason);
      setPageError(getErrorMessage(contractsResult.reason, "Erro ao carregar contratos."));
    }

    if (visitsResult.status === "fulfilled") {
      setVisits(getArrayResponse(visitsResult.value, ["visits"]));
    } else {
      console.error("[CONTRATO] Erro ao carregar visitas:", visitsResult.reason);
      setVisitsError("Não foi possível consultar as visitas. Os quantitativos estão indisponíveis.");
    }

    setLoadingContracts(false);
    setLoadingVisits(false);
    return latestContracts;
  }, [authConfig]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData({ silent: true }), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    setSearch(contratoSelecionado || "");
  }, [contratoSelecionado]);

  const visitCounts = useMemo(
    () => calculateVisitCounts(contracts, visits),
    [contracts, visits],
  );

  const filteredContracts = useMemo(() => {
    const term = normalized(search);
    return contracts
      .filter((contract) =>
        !term || [
          getCR(contract),
          getBP(contract),
          contract?.client,
          contract?.unit,
          contract?.leadership_responsible,
          getContractStatus(contract),
        ].some((value) => normalized(value).includes(term)),
      )
      .sort((a, b) => getCR(a).localeCompare(getCR(b), "pt-BR"));
  }, [contracts, search]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function clearForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function handleEdit(contract) {
    setEditingId(contract.id);
    setForm({
      contract: getCR(contract),
      business_partner: getBP(contract),
      client: contract.client ?? "",
      unit: contract.unit ?? "",
      leadership_responsible: firstFilled(
        contract.leadership_responsible,
        contract.leadership_name,
      ),
      headcount: contract.headcount === null || contract.headcount === undefined
        ? "" : String(contract.headcount),
      monitoring_status: getContractStatus(contract),
      status_observation: getContractNote(contract),
    });
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.contract.trim() || !form.business_partner.trim()) {
      setNotice({ type: "error", text: "Contrato e Business Partner são obrigatórios." });
      return;
    }

    if (form.headcount !== "" && (!Number.isInteger(Number(form.headcount)) || Number(form.headcount) < 0)) {
      setNotice({ type: "error", text: "Efetivo deve ser um número inteiro maior ou igual a zero." });
      return;
    }

    setSaving(true);
    setNotice(null);

    const editing = editingId !== null && editingId !== undefined;
    const payload = {
      contract: form.contract.trim(),
      business_partner: form.business_partner.trim(),
      client: form.client.trim() || null,
      unit: form.unit.trim() || null,
      leadership_responsible: form.leadership_responsible.trim() || null,
      headcount: form.headcount === "" ? null : Number(form.headcount),
      // O novo contrato sempre entra em acompanhamento.
      monitoring_status: editing ? form.monitoring_status : "Em acompanhamento",
      status_observation: form.status_observation.trim(),
    };

    try {
      if (editing) {
        await api.put(`/contracts/${editingId}`, payload, authConfig());
      } else {
        await api.post("/contracts", payload, authConfig());
      }

      const latestContracts = await loadData({ silent: true });
      if (onReload) {
        try {
          await onReload();
        } catch (reloadError) {
          console.warn("[CONTRATO] Atualização do painel indisponível:", reloadError);
        }
      }

      clearForm();

      const saved = latestContracts?.find((item) =>
        editing
          ? String(item.id) === String(editingId)
          : normalized(getCR(item)) === normalized(payload.contract) &&
            normalized(getBP(item)) === normalized(payload.business_partner),
      );

      // Evita anunciar que o status foi salvo quando a API ignora os novos campos.
      const backendStatus = firstFilled(
        saved?.monitoring_status,
        saved?.operational_status,
        saved?.contract_status,
        saved?.tracking_status,
        saved?.status,
      );
      const statusConfirmed = saved && backendStatus && getContractStatus(saved) === payload.monitoring_status;
      const noteConfirmed = !payload.status_observation || getContractNote(saved) === payload.status_observation;

      setNotice(statusConfirmed && noteConfirmed
        ? { type: "success", text: editing ? "Contrato atualizado com sucesso." : "Contrato cadastrado com sucesso." }
        : { type: "warning", text: "O cadastro foi enviado, mas não foi possível confirmar a persistência do status e da observação. Verifique se a API /contracts já grava e retorna monitoring_status e status_observation." });
    } catch (error) {
      console.error("[CONTRATO] Erro ao salvar:", error);
      setNotice({
        type: "error",
        text: getErrorMessage(error, editing ? "Erro ao atualizar contrato." : "Erro ao cadastrar contrato."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contract) {
    if (!window.confirm(`Deseja realmente excluir o contrato "${getCR(contract)}"?`)) return;

    setSaving(true);
    setNotice(null);
    try {
      await api.delete(`/contracts/${contract.id}`, authConfig());
      if (editingId === contract.id) clearForm();
      await loadData({ silent: true });
      if (onReload) {
        try {
          await onReload();
        } catch (reloadError) {
          console.warn("[CONTRATO] Atualização do painel indisponível:", reloadError);
        }
      }
      setNotice({ type: "success", text: "Contrato excluído com sucesso." });
    } catch (error) {
      console.error("[CONTRATO] Erro ao excluir:", error);
      setNotice({
        type: "error",
        text: getErrorMessage(error, "Não foi possível excluir o contrato. Verifique se existem visitas vinculadas."),
      });
    } finally {
      setSaving(false);
    }
  }

  const hasEditing = editingId !== null && editingId !== undefined;

  return (
    <div className="contrato-page">
      {/* CADASTRO / EDIÇÃO */}
      <section className="contrato-card" aria-labelledby="contrato-form-title">
        <header className="contrato-header">
          <span className="contrato-eyebrow">RADAR 360 • CADASTRO</span>
          <h2 id="contrato-form-title">{hasEditing ? "Editar contrato" : "Cadastro de contrato"}</h2>
          <p>{hasEditing
            ? "Atualize os dados, a situação e a observação do contrato."
            : "Cadastre um contrato para iniciar o acompanhamento. O status inicial é Em acompanhamento."}</p>
        </header>

        <form className="contrato-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="contract">Contrato / CR <span className="contrato-required">*</span></label>
              <input id="contract" name="contract" type="text" required
                placeholder="Digite o contrato" value={form.contract} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="business_partner">Business Partner <span className="contrato-required">*</span></label>
              <input id="business_partner" name="business_partner" type="text" required
                placeholder="Digite o Business Partner" value={form.business_partner} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="client">Cliente</label>
              <input id="client" name="client" type="text" placeholder="Nome do cliente"
                value={form.client} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="unit">Unidade</label>
              <input id="unit" name="unit" type="text" placeholder="Unidade do contrato"
                value={form.unit} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="leadership_responsible">Liderança responsável</label>
              <input id="leadership_responsible" name="leadership_responsible" type="text"
                placeholder="Nome do responsável" value={form.leadership_responsible} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="headcount">Efetivo</label>
              <input id="headcount" name="headcount" type="number" min="0" step="1"
                placeholder="Quantidade de colaboradores" value={form.headcount} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="monitoring_status">Status do contrato</label>
              <select id="monitoring_status" name="monitoring_status" value={form.monitoring_status}
                onChange={handleChange} disabled={!hasEditing || saving}>
                {CONTRACT_STATUSES.map((status) => (
                  <option value={status} key={status}>{status}</option>
                ))}
              </select>
              <small className="contrato-field-hint">{hasEditing
                ? "Altere a situação conforme o estágio de atuação do BP."
                : "Após cadastrar, edite o contrato para alterar o status."}</small>
            </div>

            <div className="form-group form-group--full">
              <label htmlFor="status_observation">Observação / motivo do status</label>
              <textarea id="status_observation" name="status_observation" rows={2} maxLength={500}
                placeholder="Ex.: Acompanhamento pausado em razão de revisão contratual ou BID."
                value={form.status_observation} onChange={handleChange} />
              <small className="contrato-field-hint">Este texto também aparece na Visão Geral ao selecionar o contrato.</small>
            </div>
          </div>

          <div className="contrato-buttons">
            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Salvando..." : hasEditing ? "Salvar alterações" : "Cadastrar contrato"}
            </button>
            <button type="button" onClick={() => { clearForm(); setNotice(null); }} disabled={saving}>
              {hasEditing ? "Cancelar edição" : "Limpar"}
            </button>
          </div>
        </form>

        {notice && (
          <div className={`contrato-notice contrato-notice--${notice.type}`} role="status">
            {notice.text}
          </div>
        )}
      </section>

      {/* CONSULTA / MANUTENÇÃO */}
      <section className="contrato-card contrato-list-card" aria-labelledby="contrato-list-title">
        <div className="contrato-header contrato-list-header">
          <div>
            <span className="contrato-eyebrow">CONSULTA</span>
            <h2 id="contrato-list-title">Contratos cadastrados</h2>
            <p>Consulte a quantidade de visitas, o status e os dados cadastrais de cada contrato.</p>
          </div>
          <span className="contrato-count">{filteredContracts.length} de {contracts.length} contratos</span>
        </div>

        <div className="contrato-toolbar">
          <label htmlFor="contrato-search" className="contrato-search-label">Buscar contrato</label>
          <div className="contrato-search-row">
            <input id="contrato-search" type="search" value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="CR, cliente, BP, unidade ou status" />
            <button type="button" onClick={() => loadData()} disabled={loadingContracts || saving}>
              {loadingContracts ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>

        {pageError && <p className="contrato-error" role="alert">{pageError}</p>}
        {visitsError && <p className="contrato-warning" role="status">{visitsError}</p>}

        {loadingContracts && contracts.length === 0 ? (
          <div className="contrato-empty">Carregando contratos...</div>
        ) : filteredContracts.length === 0 ? (
          <div className="contrato-empty">{contracts.length === 0
            ? "Nenhum contrato cadastrado."
            : "Nenhum contrato encontrado para essa busca."}</div>
        ) : (
          <div className="contrato-table-wrapper">
            <table className="contrato-table">
              <thead>
                <tr>
                  <th>Contrato / CR</th>
                  <th>Business Partner</th>
                  <th>Cliente / Unidade</th>
                  <th>Liderança</th>
                  <th>Efetivo</th>
                  <th>Visitas</th>
                  <th>Status</th>
                  <th>Observação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => {
                  const status = getContractStatus(contract);
                  const statusClass = status === "Encerrado" ? "closed" : status === "Standby" ? "paused" : "active";
                  const note = getContractNote(contract);
                  const count = visitCounts.get(String(contract.id)) ?? 0;

                  return (
                    <tr key={contract.id ?? `${getCR(contract)}:${getBP(contract)}`}>
                      <td><strong className="contrato-cr">{getCR(contract) || "—"}</strong></td>
                      <td>{getBP(contract) || "—"}</td>
                      <td>
                        <div className="contrato-client-cell">
                          <span>{contract.client || "—"}</span>
                          {contract.unit && <small>{contract.unit}</small>}
                        </div>
                      </td>
                      <td>{firstFilled(contract.leadership_responsible, contract.leadership_name) || "—"}</td>
                      <td>{contract.headcount ?? "—"}</td>
                      <td className="contrato-visits-count" title="Quantidade de visitas registradas para este contrato">
                        {loadingVisits || visitsError ? "—" : count}
                      </td>
                      <td>
                        <span className={`contrato-status-badge contrato-status-badge--${statusClass}`}>
                          {status}
                        </span>
                      </td>
                      <td className="contrato-note-cell">
                        <span title={note} className="contrato-note-preview">{note || "—"}</span>
                      </td>
                      <td>
                        <div className="contract-actions">
                          <button type="button" className="edit-button" onClick={() => handleEdit(contract)} disabled={saving}>
                            Editar
                          </button>
                          <button type="button" className="delete-button" onClick={() => handleDelete(contract)} disabled={saving}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="contrato-table-footnote">
          O total de visitas é calculado pelos registros de Nova Visita. Os indicadores mensais
          permanecem na aba Acompanhamento.
        </p>
      </section>
    </div>
  );
}
