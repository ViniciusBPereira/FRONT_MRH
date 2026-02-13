import { useState } from "react";
import Sidebar from "./sidebar";
import { SidebarContext } from "./sidebarcontext";
import "./layout.css";

export default function Layout({ children }) {
  const [minimized, setMinimized] = useState(false);

  return (
    <SidebarContext.Provider value={{ minimized, setMinimized }}>
      <div className="layout-container">
  <Sidebar
    minimized={minimized}
    setMinimized={setMinimized}
  />
  <main className="layout-content">{children}</main>
</div>

    </SidebarContext.Provider>
  );
}
