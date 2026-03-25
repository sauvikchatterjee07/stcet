import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../lib/api";

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function getBadge(rank) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `#${rank}`;
}

function getPodiumClass(rank) {
  if (rank === 1) return "stcet-podium-first";
  if (rank === 2) return "stcet-podium-second";
  if (rank === 3) return "stcet-podium-third";
  return "";
}

export default function ResultPage() {
  const { testId } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get(`/stcet/tests/${testId}/result-summary`)
      .then((response) => setResult(response.data));
  }, [testId]);

  if (!result) {
    return (
      <div className="stcet-panel rounded-[28px] p-8 text-white">
        Loading result...
      </div>
    );
  }

  const topPerformer = result.leaderboard[0];
  const podiumEntries = result.leaderboard.slice(0, 3);

  return (
    <div className="stcet-page">
      <section className="stcet-panel stcet-result-hero rounded-[36px] p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stcet-cyan">
              Published Result
            </p>
            <h2 className="mt-4 text-4xl font-semibold text-white">
              {result.testTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-white/66">
              Results were published on {formatDate(result.resultsPublishedAt)}.
            </p>
          </div>

          <div className="rounded-[28px] border border-emerald-400/25 bg-emerald-400/10 px-6 py-5 shadow-[0_16px_40px_rgba(16,185,129,0.14)]">
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
              Result Live
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {result.myResult.score}/{result.myResult.totalMarks}
            </p>
            <p className="mt-2 text-sm text-white/66">
              {result.myResult.percentage.toFixed(1)}% scored
            </p>
          </div>
        </div>

        {topPerformer ? (
          <div className="stcet-celebration relative mt-8 overflow-hidden rounded-[32px] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(255,178,9,0.16),rgba(255,255,255,0.04)_55%,rgba(0,195,255,0.12))] p-6 shadow-[0_18px_50px_rgba(255,178,9,0.12)]">
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/90">
                  Highest Marks
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-amber-200/25 bg-black/20 px-4 py-2 text-sm font-semibold text-amber-100">
                    {getBadge(topPerformer.rank)} Rank
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/72">
                    Top Performer
                  </span>
                </div>
                <h3 className="mt-5 text-3xl font-semibold text-white">
                  {topPerformer.name}
                </h3>
                <p className="mt-2 text-white/64">
                  Led the board with the highest score in this exam.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-4">
                  <p className="text-sm text-white/58">Marks</p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {topPerformer.score}/{topPerformer.totalMarks}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-4">
                  <p className="text-sm text-white/58">Percentage</p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {topPerformer.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[28px] stcet-soft-panel p-5">
            <p className="text-sm text-white/58">Your Rank</p>
            <p className="mt-3 text-4xl font-semibold text-white">
              #{result.rank?.rank || "-"}
            </p>
            <p className="mt-2 text-white/64">
              Out of {result.rank?.totalParticipants || 0} attempted students
            </p>
          </div>

          <div className="rounded-[28px] stcet-soft-panel p-5">
            <p className="text-sm text-white/58">Submitted</p>
            <p className="mt-3 text-xl font-semibold text-white">
              {formatDate(result.myResult.submittedAt)}
            </p>
            <p className="mt-2 text-white/64">
              Review completed {result.myResult.reviewedAt
                ? formatDate(result.myResult.reviewedAt)
                : "recently"}
            </p>
          </div>

          <div className="rounded-[28px] stcet-soft-panel p-5">
            <p className="text-sm text-white/58">Performance</p>
            <p className="mt-3 text-xl font-semibold text-white">
              {result.myResult.percentage.toFixed(1)}%
            </p>
            <p className="mt-2 text-white/64">
              Total paper marks: {result.totalMarks}
            </p>
          </div>
        </div>

        {result.myResult.generalFeedback ? (
          <div className="mt-8 rounded-[28px] stcet-soft-panel p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
              Teacher Feedback
            </p>
            <p className="mt-3 whitespace-pre-wrap text-white/74">
              {result.myResult.generalFeedback}
            </p>
          </div>
        ) : null}
      </section>

      <section className="stcet-panel rounded-[32px] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
              Leaderboard
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              Top 10 Performers
            </h3>
          </div>
          <p className="text-sm text-white/54">
            Ranked by score, then earliest submission time
          </p>
        </div>

        {podiumEntries.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {podiumEntries.map((entry) => (
              <div
                key={`podium-${entry.rank}-${entry.name}`}
                className={`rounded-[28px] border p-5 ${getPodiumClass(entry.rank)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/58">
                      {entry.rank === 1
                        ? "Champion"
                        : entry.rank === 2
                        ? "Runner Up"
                        : "Third Place"}
                    </p>
                    <h4 className="mt-3 text-2xl font-semibold text-white">
                      {entry.name}
                    </h4>
                  </div>
                  <span className="rounded-full border border-white/12 bg-black/20 px-4 py-2 text-sm font-semibold text-white">
                    {getBadge(entry.rank)}
                  </span>
                </div>
                <p className="mt-6 text-3xl font-semibold text-white">
                  {entry.score}/{entry.totalMarks}
                </p>
                <p className="mt-2 text-white/62">
                  {entry.percentage.toFixed(1)}% score
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-[28px] border border-white/8">
          <div className="grid grid-cols-[88px_minmax(0,1fr)_140px] bg-white/5 px-5 py-4 text-xs uppercase tracking-[0.28em] text-white/45">
            <span>Rank</span>
            <span>Name</span>
            <span className="text-right">Marks</span>
          </div>
          <div className="divide-y divide-white/8">
            {result.leaderboard.map((entry) => (
              <div
                key={`${entry.rank}-${entry.name}`}
                className={`grid grid-cols-[88px_minmax(0,1fr)_140px] items-center px-5 py-4 ${
                  result.rank?.rank === entry.rank
                    ? "bg-stcet-cyan/10"
                    : entry.rank <= 3
                    ? "bg-white/[0.03]"
                    : "bg-transparent"
                }`}
              >
                <span
                  className={`text-lg font-semibold ${
                    entry.rank <= 3 ? "text-amber-200" : "text-white"
                  }`}
                >
                  {entry.rank <= 3 ? getBadge(entry.rank) : `#${entry.rank}`}
                </span>
                <span
                  className={`truncate ${
                    entry.rank <= 3 ? "font-semibold text-white" : "text-white/78"
                  }`}
                >
                  {entry.name}
                </span>
                <span className="text-right font-medium text-white">
                  {entry.score}/{entry.totalMarks}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          to={`/attempts/${result.myResult.attemptId}`}
          className="stcet-button-secondary rounded-[22px] px-5 py-3"
        >
          View Submission
        </Link>
        <Link
          to={`/tests/${result.testId}`}
          className="stcet-button-primary rounded-[22px] px-5 py-3"
        >
          Back to Test
        </Link>
      </div>
    </div>
  );
}
