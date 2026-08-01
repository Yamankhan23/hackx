import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (config.url?.startsWith("/api/")) {
    const apiBase = baseURL?.endsWith("/api");

    if (apiBase) {
      config.url = config.url.replace(/^\/api/, "");
    }
  }

  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
