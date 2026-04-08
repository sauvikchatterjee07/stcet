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
    try {
      const response = await api.get("/me");
      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch {
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
    setUser(payload.user);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
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
