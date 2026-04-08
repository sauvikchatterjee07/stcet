import axios from "axios";

const rawApiBase =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:4000/api/stcet";

const API_BASE = rawApiBase.replace(/\/+$/, "");

console.log("[STCET API] baseURL:", API_BASE);

let logoutHandler = null;
let isInitialCheck = true;

export function onLogout(handler) {
  logoutHandler = handler;
}

export function setInitialCheckComplete() {
  isInitialCheck = false;
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const finalUrl = `${config.baseURL || ""}${config.url || ""}`;
  console.log("[STCET API] request", {
    method: config.method,
    url: config.url,
    finalUrl,
    withCredentials: config.withCredentials,
  });
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log("[STCET API] response", {
      status: response.status,
      url: response.config?.url,
      finalUrl: `${response.config?.baseURL || ""}${response.config?.url || ""}`,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    console.error("[STCET API] response error", {
      status: error.response?.status,
      url: error.config?.url,
      finalUrl: `${error.config?.baseURL || ""}${error.config?.url || ""}`,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401 && !isInitialCheck) {
      if (window.location.pathname !== "/login" && logoutHandler) {
        logoutHandler("Your session expired. Please login again.");
      }
    }

    return Promise.reject(error);
  }
);
