import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../lib/authContext";

const navLinkClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-stcet-gold text-stcet-black"
      : "text-white/70 hover:bg-white/8"
  }`;

export default function AppShell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="stcet-shell min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-black/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" className="flex items-center gap-4">
            <img
              src="https://d270a3f3iqnh9i.cloudfront.net/assets/bca-logo.jpg"
              alt="Bengal Coding Academy"
              className="stcet-logo-ring h-14 w-14 rounded-2xl object-cover"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
                Bengal Coding Academy
              </p>
              <h1 className="text-2xl font-semibold text-white">
                STCET Exam Portal
              </h1>
              <p className="text-sm text-white/50">
                Secure assessment workspace for college testing
              </p>
            </div>
          </Link>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <nav className="flex flex-wrap gap-2">
              <NavLink to="/" end className={navLinkClass}>
                Dashboard
              </NavLink>
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full stcet-chip px-4 py-2 text-sm md:block">
                {user?.name || user?.email}
              </div>
              <button
                onClick={logout}
                className="rounded-full stcet-button-secondary px-4 py-2 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
