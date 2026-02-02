import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ===================== PÁGINAS ===================== */
import Login from "./pages/login/login";
import Mrhs from "./pages/mrhs/mrhs";
import MRHsDocumentacao from "./pages/mrhsdocumentacao/mrhsdocumentacao";
import MRHsAgendamento from "./pages/mrhsagendamento/mrhsagendamento";
import Indicadores from "./pages/indicadores/indicadores";
import CandidatosMRH from "./pages/candidatos/candidatosMRH";
import CandidatosCadastrados from "./pages/cadidatosregistrados/candidatoscadastrados";
import RondasCorp from "./pages/rondascorp/rondascorp";
import RondasCorpLogin from "./pages/rondascorpLogin/RondasCorpLogin";

/* ===================== LAYOUT ===================== */
import Layout from "./components/layout";

/* ===================== PROTEÇÕES ===================== */
import ProtectedRondasRoute from "./routes/ProtectedRondasRoute";

/* ===================== ROTA PROTEGIDA (APP PRINCIPAL) ===================== */
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
        {/* ================= LOGIN PRINCIPAL ================= */}
        <Route path="/" element={<Login />} />

        {/* ================= RONDAS CORP LOGIN ================= */}
        <Route path="/rondas/login" element={<RondasCorpLogin />} />

        {/* ================= RONDAS CORP (PROTEGIDO) ================= */}
        <Route
          path="/rondas"
          element={
            <ProtectedRondasRoute>
              <Layout>
                <RondasCorp />
              </Layout>
            </ProtectedRondasRoute>
          }
        />

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

        {/* ================= MRHs ================= */}
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
