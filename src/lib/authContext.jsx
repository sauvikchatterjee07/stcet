import { createContext, useContext, useEffect, useRef, useState } from "react";

import { api, onLogout, setInitialCheckComplete } from "./api";
import { realtime, RealtimeEvents } from "./realtime";
import { useRealtimeEvent } from "./useRealtime";

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
      onLogout(endSession);
    }
  }

  // A revoked session can be reported by the socket and by several requests at once.
  const userRef = useRef(user);
  userRef.current = user;

  function endSession(message) {
    if (!userRef.current) return;
    userRef.current = null;
    setUser(null);
    navigate("/login");
    if (message) {
      alert(message);
    }
  }

  useEffect(() => {
    if (!user?.id) return undefined;
    realtime.connect();
    return () => realtime.disconnect();
  }, [user?.id]);

  useRealtimeEvent(RealtimeEvents.USER_UPDATED, (profile) => {
    setUser((current) =>
      current && current.id === profile.id
        ? { ...current, name: profile.name, email: profile.email, role: profile.role }
        : current
    );
  });

  useRealtimeEvent(RealtimeEvents.SESSION_ENDED, ({ reason } = {}) => {
    // The server already rejects this cookie; clearing it stops it being sent at all.
    api.post("/auth/logout").catch(() => {});
    endSession(
      reason === "deactivated"
        ? "Your account has been deactivated. Please contact Bengal Coding Academy support."
        : "Your account is no longer available."
    );
  });

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
