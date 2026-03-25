import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import AppShell from "./components/AppShell";
import { AuthProvider, useAuth } from "./lib/authContext";
import AttemptPage from "./pages/AttemptPage";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ResultPage from "./pages/ResultPage";
import TestDetail from "./pages/TestDetail";
import TestList from "./pages/TestList";

function Protected({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="stcet-shell flex min-h-screen items-center justify-center">
        <div className="stcet-panel rounded-[28px] px-8 py-6 text-lg text-white">
          Loading STCET portal...
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const navigate = useNavigate();

  return (
    <AuthProvider navigate={navigate}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <Protected>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tests/open" element={<TestList bucket="open" />} />
                  <Route path="/tests/closed" element={<TestList bucket="closed" />} />
                  <Route path="/tests/:testId/result" element={<ResultPage />} />
                  <Route path="/tests/:testId" element={<TestDetail />} />
                  <Route path="/attempts/:attemptId" element={<AttemptPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            </Protected>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
