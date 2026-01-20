import "./login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState({});
  const [loading, setLoading] = useState(false);

  function validarCampos() {
    const novosErros = {};

    if (!email.trim()) {
      novosErros.email = "O e-mail é obrigatório.";
    } else {
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regexEmail.test(email)) {
        novosErros.email = "Digite um e-mail válido.";
      }
    }

    if (!senha.trim()) {
      novosErros.senha = "A senha é obrigatória.";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleLogin() {
    if (!validarCampos()) return;
    setLoading(true);
    setErros({});

    try {
      const response = await api.post("/auth/login", {
        email,
        senha,
      });

      const data = response.data;

      if (data?.sucesso) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("usuario", JSON.stringify(data.usuario));
        navigate("/indicadores");
      } else {
        setErros({
          geral: data?.mensagem || "E-mail ou senha inválidos.",
        });
      }
    } catch (error) {
      if (error.response) {
        // Backend respondeu com erro (401, 403, 500, etc.)
        setErros({
          geral: error.response.data?.mensagem || "Erro ao autenticar usuário.",
        });
      } else {
        // Erro de rede / proxy / servidor fora
        setErros({
          geral: "Erro ao conectar com o servidor.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="left-bg" />

      <div className="login-box">
        <div className="login-card">
          <h2>Entre na sua conta</h2>

          {erros.geral && <p className="erro-geral">{erros.geral}</p>}

          <label>Login</label>
          <input
            type="email"
            placeholder="Digite seu login"
            value={email}
            className={erros.email ? "input-erro" : ""}
            onChange={(e) => setEmail(e.target.value)}
          />
          {erros.email && <p className="erro">{erros.email}</p>}

          <label>Senha</label>
          <input
            type="password"
            placeholder="Digite sua senha"
            value={senha}
            className={erros.senha ? "input-erro" : ""}
            onChange={(e) => setSenha(e.target.value)}
          />
          {erros.senha && <p className="erro">{erros.senha}</p>}

          <button onClick={handleLogin} disabled={loading}>
            {loading ? "Validando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
