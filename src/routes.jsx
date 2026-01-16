import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ===================== PÁGINAS ===================== */
import Login from "./pages/login/login";
import Mrhs from "./pages/mrhs/mrhs";
import MRHsDocumentacao from "./pages/mrhsdocumentacao/mrhsdocumentacao";
import MRHsAgendamento from "./pages/mrhsagendamento/mrhsagendamento"; // ✅ NOVO
import Indicadores from "./pages/indicadores/indicadores";
import CandidatosMRH from "./pages/candidatos/candidatosMRH";
import CandidatosCadastrados from "./pages/cadidatosregistrados/candidatoscadastrados";

/* ===================== LAYOUT ===================== */
import Layout from "./components/layout";

/* ===================== ROTA PROTEGIDA ===================== */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* ===================== ROTAS ===================== */
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= LOGIN ================= */}
        <Route path="/" element={<Login />} />

        {/* ================= INDICADORES ================= */}
        <Route
          path="/indicadores"
          element={
            <ProtectedRoute>
              <Layout>
                <Indicadores />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= MRHs EM ABERTO ================= */}
        <Route
          path="/mrhs"
          element={
            <ProtectedRoute>
              <Layout>
                <Mrhs />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= DOCUMENTAÇÃO ================= */}
        <Route
          path="/documentacao"
          element={
            <ProtectedRoute>
              <Layout>
                <MRHsDocumentacao />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= AGENDAMENTO ================= */}
        <Route
          path="/agendamento"
          element={
            <ProtectedRoute>
              <Layout>
                <MRHsAgendamento />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= BANCO DE CANDIDATOS ================= */}
        <Route
          path="/candidatos"
          element={
            <ProtectedRoute>
              <Layout>
                <CandidatosCadastrados />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= CANDIDATOS DA MRH ================= */}
        <Route
          path="/mrhs/:mrhId/candidatos"
          element={
            <ProtectedRoute>
              <Layout>
                <CandidatosMRH />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
