import { useState } from "react";
import "./rondascorplogin.css";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function RondasCorpLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const res = await api.post("/rondas/login", {
        email,
        senha,
      });

      const { token } = res.data;

      // 🔐 Salva token exclusivo da Rondas Corp
      localStorage.setItem("rondasCorpToken", token);

      // 🔁 Redireciona para a tela de rondas
      navigate("/rondas");
    } catch (err) {
      setErro(err.response?.data?.error || "Falha ao realizar login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rondas-login-wrapper">
      <div className="rondas-login-card">
        <header>
          <h1>Projetos & Qualidade</h1>
          <span>Acesso restrito</span>
        </header>

        <form onSubmit={handleLogin}>
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {erro && <div className="error">{erro}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <footer>
          <span>© Projetos Qualidade</span>
        </footer>
      </div>
    </div>
  );
}
