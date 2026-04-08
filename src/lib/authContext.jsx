import { createContext, useContext, useEffect, useState } from "react";

import { api, onLogout, setInitialCheckComplete } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children, navigate }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  async function checkAuth() {
    console.log("[STCET Auth] checkAuth start", {
      path: window.location.pathname,
    });

    try {
      const response = await api.get("/me");
      console.log("[STCET Auth] checkAuth success", response.data);
      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("[STCET Auth] checkAuth failed", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      setUser(null);
    } finally {
      setLoading(false);
      setInitialCheckComplete();
      onLogout((message) => {
        setUser(null);
        navigate("/login");
        if (message) {
          alert(message);
        }
      });
    }
  }

  function login(payload) {
    console.log("[STCET Auth] login state update", payload);
    setUser(payload.user);
  }

  async function logout() {
    try {
      console.log("[STCET Auth] logout start");
      await api.post("/auth/logout");
    } catch (error) {
      console.error("[STCET Auth] logout failed", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      // ignore logout errors
    }

    setUser(null);
    navigate("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
