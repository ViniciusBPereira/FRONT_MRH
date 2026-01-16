import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaChartLine,
  FaUserCheck,
  FaCalendarCheck,
  FaUsers,
  FaSignOutAlt,
  FaBars,
} from "react-icons/fa";
import { HiClipboardDocument } from "react-icons/hi2";

import "./sidebar.css";

export default function Sidebar({ minimized, setMinimized }) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  }

  const menuItems = [
    /* ================= INDICADORES ================= */
    { path: "/indicadores", label: "Indicadores", icon: <FaChartLine /> },

    /* ================= MRHs ================= */
    { path: "/mrhs", label: "MRHs", icon: <FaUserCheck /> },

    /* ================= DOCUMENTAÇÃO ================= */
    {
      path: "/documentacao",
      label: "Documentação",
      icon: <HiClipboardDocument />,
    },

    /* ================= AGENDAMENTO ================= */
    {
      path: "/agendamento", // ✅ URL corrigida
      label: "Agendamento",
      icon: <FaCalendarCheck />,
    },

    /* ================= CANDIDATOS ================= */
    { path: "/candidatos", label: "Candidatos", icon: <FaUsers /> },
  ];

  return (
    <aside className={`sidebar ${minimized ? "minimized" : ""}`}>
      {/* BOTÃO MINIMIZAR */}
      <button className="toggle-btn" onClick={() => setMinimized(!minimized)}>
        <FaBars size={20} />
      </button>

      {/* MENU */}
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${
              location.pathname === item.path ? "active" : ""
            }`}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* SAIR */}
      <button className="logout-btn" onClick={handleLogout}>
        <FaSignOutAlt size={16} />
        <span className="label">Sair</span>
      </button>
    </aside>
  );
}
