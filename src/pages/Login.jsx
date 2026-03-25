import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../lib/authContext";
import { api } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/stcet/auth/login", form);
      login(response.data);
      navigate("/");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.error || "Unable to login right now."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stcet-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="stcet-panel stcet-hero rounded-[36px] p-8 lg:p-12">
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <img
                src="https://d270a3f3iqnh9i.cloudfront.net/assets/bca-logo.jpg"
                alt="Bengal Coding Academy"
                className="stcet-logo-ring h-16 w-16 rounded-2xl object-cover"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-stcet-gold">
                  STCET x BCA
                </p>
                <p className="mt-2 text-sm text-white/55">
                  Professional college assessment portal
                </p>
              </div>
            </div>

            <h1 className="mt-8 max-w-2xl text-5xl font-semibold leading-tight text-white">
              Timed tests, coding submissions, and review-ready exam tracking in
              one BCA-branded workspace.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/68">
              Built for STCET operations with a focused student experience,
              clean navigation, and a backend that stays inside your existing
              Bengal Coding Academy system.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                "Open and closed tests separated clearly",
                "MCQ auto-scoring with coding review support",
                "Screenshot uploads and timed submission flow",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] stcet-soft-panel p-4 text-sm text-white/78"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="stcet-panel rounded-[36px] p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-stcet-cyan">
            Student Login
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            Enter the STCET exam portal
          </h2>
          <p className="mt-3 text-white/62">
            Use your Bengal Coding Academy credentials to access assigned tests.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-sm text-white/68">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="stcet-input px-5 py-4"
                placeholder="student@example.com"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-white/68">Password</span>
              <input
                type="password"
                required
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="stcet-input px-5 py-4"
                placeholder="Your password"
              />
            </label>

            {error ? (
              <div className="rounded-[22px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="stcet-button-primary w-full rounded-[22px] px-5 py-4 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login to STCET"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
