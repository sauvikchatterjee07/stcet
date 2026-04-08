import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../lib/api";

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function TestCard({ test, activeTab }) {
  const isAccessible = test.canAccess !== false;
  const Wrapper = isAccessible ? Link : "div";
  const wrapperProps = isAccessible
    ? { to: `/tests/${test.id}` }
    : {
        role: "article",
        "aria-disabled": true,
      };

  return (
    <Wrapper
      {...wrapperProps}
      className={`stcet-panel block rounded-[28px] p-6 ${
        isAccessible
          ? "transition-transform hover:-translate-y-1"
          : "cursor-not-allowed opacity-75"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
              {activeTab === "open" ? "Open Test" : "Closed Test"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {test.title}
            </h3>
          </div>
          <p className="max-w-3xl text-white/62">
            {test.description || "No description added."}
          </p>
          {test.latestAttempt ? (
            <div className="rounded-[20px] stcet-soft-panel px-4 py-3 text-sm text-white/72">
              Submission: {test.latestAttempt.reviewStatus}
              {test.latestAttempt.submittedAt
                ? ` · Submitted ${formatDate(test.latestAttempt.submittedAt)}`
                : " · Attempt in progress"}
              {test.latestAttempt.resultVisible && test.resultsPublishedAt
                ? ` · Results published ${formatDate(test.resultsPublishedAt)}`
                : test.latestAttempt.submittedAt
                ? " · Result not published yet"
                : ""}
            </div>
          ) : activeTab === "closed" ? (
            <div className="rounded-[20px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/58">
              Locked. Only students who attempted this test can open it after closing.
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 text-sm text-white/70 lg:min-w-80">
          <div className="stcet-chip rounded-full px-4 py-2">
            {test.durationMinutes} minutes
          </div>
          <div className="stcet-chip rounded-full px-4 py-2">
            {test.totalMarks} marks
          </div>
          <div className="stcet-chip rounded-full px-4 py-2">
            Starts: {formatDate(test.startsAt)}
          </div>
          <div className="stcet-chip rounded-full px-4 py-2">
            Ends: {formatDate(test.endsAt)}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("open");
  const [summary, setSummary] = useState({ open: 0, closed: 0 });
  const [openTests, setOpenTests] = useState([]);
  const [closedTests, setClosedTests] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [summaryResponse, openResponse, closedResponse] = await Promise.all([
      api.get("/tests/dashboard"),
      api.get("/tests?bucket=open"),
      api.get("/tests?bucket=closed"),
    ]);

    setSummary(summaryResponse.data);
    setOpenTests(openResponse.data);
    setClosedTests(closedResponse.data);
  }

  const visibleTests = activeTab === "open" ? openTests : closedTests;

  return (
    <div className="stcet-page">
      <section className="flex justify-center">
        <div className="inline-flex rounded-[28px] border border-white/10 bg-white/5 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab("open")}
              className={`min-w-44 rounded-[20px] px-6 py-4 text-sm font-semibold transition-all ${
                activeTab === "open"
                  ? "bg-stcet-gold text-stcet-black shadow-[0_12px_28px_rgba(245,177,31,0.28)]"
                  : "text-white/70 hover:bg-white/5"
              }`}
            >
              <span className="block">Open Tests</span>
              <span className="mt-1 block text-xs opacity-70">
                {summary.open} available
              </span>
            </button>
            <button
              onClick={() => setActiveTab("closed")}
              className={`min-w-44 rounded-[20px] px-6 py-4 text-sm font-semibold transition-all ${
                activeTab === "closed"
                  ? "bg-stcet-cyan text-stcet-black shadow-[0_12px_28px_rgba(21,208,255,0.22)]"
                  : "text-white/70 hover:bg-white/5"
              }`}
            >
              <span className="block">Closed Tests</span>
              <span className="mt-1 block text-xs opacity-70">
                {summary.closed} archived
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        {visibleTests.length === 0 ? (
          <div className="stcet-panel rounded-[28px] p-8 text-white/55">
            {activeTab === "open"
              ? "No open tests are available right now."
              : "No closed tests are available yet."}
          </div>
        ) : (
          visibleTests.map((test) => (
            <TestCard key={test.id} test={test} activeTab={activeTab} />
          ))
        )}
      </section>
    </div>
  );
}
