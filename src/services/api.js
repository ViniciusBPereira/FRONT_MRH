import axios from "axios";

if (!import.meta.env.VITE_API_BASE) {
  console.error("❌ VITE_API_BASE não definido!");
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 15000,
});

/* ================= REQUEST INTERCEPTOR ================= */
api.interceptors.request.use(
  (config) => {
    // 🔍 Detecta se é chamada da Rondas Corp
    const isRondas = config.url?.startsWith("/rondas");

    // 🔐 Seleciona o token correto
    const token = isRondas
      ? localStorage.getItem("rondasCorpToken")
      : localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    console.log(
      "➡️ API REQUEST:",
      config.method?.toUpperCase(),
      `${config.baseURL}${config.url}`,
      token ? "🔐 com token" : "⚠️ sem token",
    );

    return config;
  },
  (error) => Promise.reject(error),
);

/* ================= RESPONSE INTERCEPTOR ================= */
api.interceptors.response.use(
  (response) => {
    console.log("⬅️ API RESPONSE:", response.status, response.config.url);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(
        "❌ API ERROR:",
        error.response.status,
        `${error.response.config?.baseURL}${error.response.config?.url}`,
        error.response.data,
      );

      // 🚪 Se token da Rondas expirar, força logout apenas da Rondas
      if (
        error.response.status === 401 &&
        error.response.config?.url?.startsWith("/rondas")
      ) {
        localStorage.removeItem("rondasCorpToken");
        window.location.href = "/rondas/login";
      }
    } else {
      console.error("🔥 API NETWORK ERROR:", error.message);
    }

    return Promise.reject(error);
  },
);
