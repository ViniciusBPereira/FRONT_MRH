import React from "react";
import "../indicadores/indicadores.css";
import { useSidebar } from "../../components/sidebarcontext";

export default function Inicio() {
  const minimized = useSidebar?.()?.minimized ?? false;

  return (
    <div className={`inicio-wrapper ${minimized ? "sidebar-minimized" : ""}`}>
      <div className="inicio-container">
        {/* HEADER */}
        <div className="inicio-header">
          <h2>Indicadores</h2>
        </div>

        {/* BI */}
        <div className="bi-wrapper">
          <iframe
            title="Power BI - Visão Geral"
            src="https://app.powerbi.com/view?r=eyJrIjoiYmIwNDc3ZGEtOWQ5My00ZWMyLTk3MWEtNmMxOWQxMWMzZmIxIiwidCI6IjQyODUyNWQ5LTIzYmQtNGY4Yy1hZmEyLTU2MDBmNDAxZjMyNiJ9"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
