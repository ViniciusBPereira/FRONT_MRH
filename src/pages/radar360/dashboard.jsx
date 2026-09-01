import React from "react";
import "./dashboard.css";

/* ============================================================
   LINK DO BI
============================================================ */

const BI_URL = "https://app.powerbi.com/view?r=eyJrIjoiMWJkNTQ3NjMtYTM3OC00NTExLWE0YzMtZjhmZmQ3ZTdiNDEwIiwidCI6IjQyODUyNWQ5LTIzYmQtNGY4Yy1hZmEyLTU2MDBmNDAxZjMyNiJ9";

/* ============================================================
   COMPONENTE
============================================================ */

export default function Dashboard() {
  return (
    <div className="bi-page">

      <div className="bi-header">

        <div>
          <span className="bi-eyebrow">
            RADAR 360
          </span>

          <h2>Dashboard</h2>

          <p>
            Indicadores e análises através do BI.
          </p>
        </div>

        <a
          href={BI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bi-open-button"
        >
          Abrir BI
        </a>

      </div>

      <div className="bi-container">

        <iframe
          src={BI_URL}
          title="Dashboard BI"
          className="bi-iframe"
          allowFullScreen
        />

      </div>

    </div>
  );
}