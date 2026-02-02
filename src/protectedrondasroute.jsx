import { Navigate } from "react-router-dom";

/**
 * Proteção exclusiva da aplicação Rondas Corp
 * - Usa token próprio (rondasCorpToken)
 * - Não interfere na aplicação principal
 */
export default function ProtectedRondasRoute({ children }) {
  const rondasToken = localStorage.getItem("rondasCorpToken");

  // 🔒 Não autenticado → redireciona para login da Rondas
  if (!rondasToken) {
    return <Navigate to="/rondas/login" replace />;
  }

  // ✅ Autenticado
  return children;
}
