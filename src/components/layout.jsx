import { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./sidebar";
import { SidebarContext } from "./sidebarcontext";
import "./layout.css";

export default function Layout({ children }) {
  const [minimized, setMinimized] = useState(false);
  const location = useLocation();
  const hideSidebar = location.pathname === "/rondas";
  return (
    <SidebarContext.Provider value={{ minimized, setMinimized }}>
      <div
        className="layout-container"
        style={{
          "--sidebar-width": minimized ? "60px" : "260px",
          "--content-width": minimized
            ? "calc(100vw - 60px)"
            : "calc(100vw - 260px)",
        }}
      >
        {!hideSidebar && (
          <Sidebar
            minimized={minimized}
            setMinimized={setMinimized}
            className="sidebar"
          />
        )}

        <main className="layout-content">{children}</main>
      </div>
    </SidebarContext.Provider>
  );
}
