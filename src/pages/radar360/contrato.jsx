import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import "./contrato.css";

export default function Contrato({ onReload }) {
  const [loading, setLoading] = useState(false);
  const [loadingContracts, setLoadingContracts] = useState(true);

  const [contracts, setContracts] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    contract: "",
    business_partner: "",
    client: "",
    unit: "",
    leadership_responsible: "",
    headcount: "",
  });

  /* ============================================================
     CARREGAR CONTRATOS
  ============================================================ */

  async function loadContracts() {
    try {
      setLoadingContracts(true);

      const response = await api.get("/contracts");

      setContracts(
        Array.isArray(response.data)
          ? response.data
          : response.data?.data || [],
      );
    } catch (error) {
      console.error("[CONTRATO] Erro ao carregar:", error);

      alert(
        error.response?.data?.message ||
          "Erro ao carregar os contratos.",
      );
    } finally {
      setLoadingContracts(false);
    }
  }

  useEffect(() => {
    loadContracts();
  }, []);

  /* ============================================================
     ALTERAÇÃO DOS CAMPOS
  ============================================================ */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  /* ============================================================
     LIMPAR / CANCELAR EDIÇÃO
  ============================================================ */

  function clearForm() {
    setForm({
      contract: "",
      business_partner: "",
      client: "",
      unit: "",
      leadership_responsible: "",
      headcount: "",
    });

    setEditingId(null);
  }

  /* ============================================================
     EDITAR CONTRATO
  ============================================================ */

  function handleEdit(contract) {
    setEditingId(contract.id);

    setForm({
      contract: contract.contract || "",
      business_partner: contract.business_partner || "",
      client: contract.client || "",
      unit: contract.unit || "",
      leadership_responsible:
        contract.leadership_responsible || "",
      headcount:
        contract.headcount !== null &&
        contract.headcount !== undefined
          ? String(contract.headcount)
          : "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* ============================================================
     SALVAR
  ============================================================ */

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.contract.trim()) {
      alert("Informe o contrato.");
      return;
    }

    if (!form.business_partner.trim()) {
      alert("Informe o Business Partner.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        contract: form.contract.trim(),
        business_partner: form.business_partner.trim(),
        client: form.client.trim() || null,
        unit: form.unit.trim() || null,
        leadership_responsible:
          form.leadership_responsible.trim() || null,
        headcount:
          form.headcount !== ""
            ? Number(form.headcount)
            : null,
      };

      let response;

      /* ========================================================
         EDIÇÃO
      ======================================================== */

      if (editingId) {
        response = await api.put(
          `/contracts/${editingId}`,
          payload,
        );

        console.log(
          "[CONTRATO] Atualizado:",
          response.data,
        );

        alert("Contrato atualizado com sucesso.");
      }

      /* ========================================================
         NOVO
      ======================================================== */

      else {
        response = await api.post(
          "/contracts",
          payload,
        );

        console.log(
          "[CONTRATO] Criado:",
          response.data,
        );

        alert("Contrato cadastrado com sucesso.");
      }

      clearForm();

      await loadContracts();

      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error(
        "[CONTRATO] Erro:",
        error,
      );

      console.error(
        "[CONTRATO] Response:",
        error.response?.data,
      );

      alert(
        error.response?.data?.message ||
          (editingId
            ? "Erro ao atualizar contrato."
            : "Erro ao cadastrar contrato."),
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     EXCLUSÃO
  ============================================================ */

  async function handleDelete(contract) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o contrato "${contract.contract}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      await api.delete(`/contracts/${contract.id}`);

      alert("Contrato excluído com sucesso.");

      if (editingId === contract.id) {
        clearForm();
      }

      await loadContracts();

      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error(
        "[CONTRATO] Erro ao excluir:",
        error,
      );

      alert(
        error.response?.data?.message ||
          "Erro ao excluir contrato.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="contrato-page">

      {/* ======================================================
          FORMULÁRIO
      ====================================================== */}

      <div className="contrato-card">

        <div className="contrato-header">
          <span className="contrato-eyebrow">
            RADAR 360
          </span>

          <h2>
            {editingId
              ? "Editar Contrato"
              : "Cadastro de Contrato"}
          </h2>

          <p>
            {editingId
              ? "Altere as informações do contrato selecionado."
              : "Cadastre um novo contrato para utilizar no Radar 360."}
          </p>
        </div>

        <form
          className="contrato-form"
          onSubmit={handleSubmit}
        >

          <div className="form-grid">

            {/* CONTRATO */}

            <div className="form-group">
              <label>
                Contrato
              </label>

              <input
                type="text"
                name="contract"
                value={form.contract}
                onChange={handleChange}
                placeholder="Digite o contrato"
                required
              />
            </div>

            {/* BP */}

            <div className="form-group">
              <label>
                Business Partner
              </label>

              <input
                type="text"
                name="business_partner"
                value={form.business_partner}
                onChange={handleChange}
                placeholder="Digite o Business Partner"
                required
              />
            </div>

            {/* CLIENTE */}

            <div className="form-group">
              <label>
                Cliente
              </label>

              <input
                type="text"
                name="client"
                value={form.client}
                onChange={handleChange}
                placeholder="Digite o cliente"
              />
            </div>

            {/* UNIDADE */}

            <div className="form-group">
              <label>
                Unidade
              </label>

              <input
                type="text"
                name="unit"
                value={form.unit}
                onChange={handleChange}
                placeholder="Digite a unidade"
              />
            </div>

            {/* RESPONSÁVEL */}

            <div className="form-group">
              <label>
                Responsável pela liderança
              </label>

              <input
                type="text"
                name="leadership_responsible"
                value={form.leadership_responsible}
                onChange={handleChange}
                placeholder="Digite o responsável"
              />
            </div>

            {/* HEADCOUNT */}

            <div className="form-group">
              <label>
                Efetivo
              </label>

              <input
                type="number"
                min="0"
                name="headcount"
                value={form.headcount}
                onChange={handleChange}
                placeholder="Quantidade"
              />
            </div>

          </div>

          <div className="buttons">

            <button
              type="submit"
              className="primary"
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : editingId
                  ? "Salvar Alterações"
                  : "Cadastrar Contrato"}
            </button>

            <button
              type="button"
              onClick={clearForm}
              disabled={loading}
            >
              {editingId
                ? "Cancelar"
                : "Limpar"}
            </button>

          </div>

        </form>

      </div>

      {/* ======================================================
          LISTA DE CONTRATOS
      ====================================================== */}

      <div className="contrato-card contrato-list-card">

        <div className="contrato-header">
          <span className="contrato-eyebrow">
            CONTRATOS
          </span>

          <h2>
            Contratos cadastrados
          </h2>

          <p>
            Consulte e altere as informações dos contratos.
          </p>
        </div>

        {loadingContracts ? (
          <div className="contrato-empty">
            Carregando contratos...
          </div>
        ) : contracts.length === 0 ? (
          <div className="contrato-empty">
            Nenhum contrato cadastrado.
          </div>
        ) : (
          <div className="contrato-table-wrapper">

            <table className="contrato-table">

              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Business Partner</th>
                  <th>Cliente</th>
                  <th>Unidade</th>
                  <th>Responsável</th>
                  <th>Efetivo</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>

                {contracts.map((contract) => (
                  <tr key={contract.id}>

                    <td>
                      <strong>
                        {contract.contract}
                      </strong>
                    </td>

                    <td>
                      {contract.business_partner || "-"}
                    </td>

                    <td>
                      {contract.client || "-"}
                    </td>

                    <td>
                      {contract.unit || "-"}
                    </td>

                    <td>
                      {contract.leadership_responsible || "-"}
                    </td>

                    <td>
                      {contract.headcount ?? "-"}
                    </td>

                    <td>
                      <div className="contract-actions">

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            handleEdit(contract)
                          }
                          disabled={loading}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            handleDelete(contract)
                          }
                          disabled={loading}
                        >
                          Excluir
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}