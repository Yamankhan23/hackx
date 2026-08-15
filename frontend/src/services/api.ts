import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

if (!baseURL) {
  // Vite bakes VITE_* vars in at build time — if this is missing, every
  // request below silently resolves relative to the frontend's own origin
  // instead of the API, which shows up as confusing 404s with no obvious
  // cause. Fail loud here instead.
  console.error(
    "VITE_API_URL is not set — API requests will resolve against the wrong origin. Check your build environment."
  );
}

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Any 401 on an admin call means the session is gone (never logged in,
// or the token expired) — clear it and send the user back to login instead
// of letting every admin page re-implement this check.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url ?? "");

    if (status === 401 && url.startsWith("/admin/")) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_name");
      localStorage.removeItem("admin_email");

      if (typeof window !== "undefined" && window.location.pathname !== "/admin/login") {
        window.location.assign("/admin/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
