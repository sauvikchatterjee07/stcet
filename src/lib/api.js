import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isInitialCheck) {
      if (window.location.pathname !== "/login" && logoutHandler) {
        logoutHandler("Your session expired. Please login again.");
      }
    }

    return Promise.reject(error);
  }
);
