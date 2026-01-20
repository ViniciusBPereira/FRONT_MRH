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
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      "➡️ API REQUEST:",
      config.method?.toUpperCase(),
      `${config.baseURL}${config.url}`,
      token ? "🔐 com token" : "⚠️ sem token"
    );

    return config;
  },
  (error) => Promise.reject(error)
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
        error.response.data
      );
    } else {
      console.error("🔥 API NETWORK ERROR:", error.message);
    }

    return Promise.reject(error);
  }
);
