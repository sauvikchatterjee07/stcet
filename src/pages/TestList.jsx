import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../lib/api";

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function TestCard({ test }) {
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
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
            {test.bucket === "open" ? "Open Test" : "Closed Test"}
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">
            {test.title}
          </h3>
          <p className="mt-3 max-w-3xl text-white/64">
            {test.description || "No description added."}
          </p>
        </div>

        <div className="grid gap-3 text-sm text-white/70 lg:min-w-72">
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

      {test.latestAttempt ? (
        <div className="mt-5 rounded-[24px] stcet-soft-panel px-4 py-3 text-sm text-white/72">
          Submission: {test.latestAttempt.reviewStatus}
          {test.latestAttempt.submittedAt
            ? ` · Submitted ${formatDate(test.latestAttempt.submittedAt)}`
            : " · In progress"}
          {test.latestAttempt.submittedAt
            ? test.latestAttempt.resultVisible && test.resultsPublishedAt
              ? ` · Results published ${formatDate(test.resultsPublishedAt)}`
              : " · Result not published yet"
            : ""}
        </div>
      ) : test.bucket === "closed" ? (
        <div className="mt-5 rounded-[24px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/58">
          Locked. This closed test can only be opened by students who attempted it.
        </div>
      ) : null}
    </Wrapper>
  );
}

export default function TestList({ bucket: bucketProp }) {
  const params = useParams();
  const bucket = bucketProp || params.bucket || "open";
  const [tests, setTests] = useState([]);

  useEffect(() => {
    api
      .get(`/tests?bucket=${bucket === "closed" ? "closed" : "open"}`)
      .then((response) => setTests(response.data));
  }, [bucket]);

  const title = bucket === "closed" ? "Closed Tests" : "Open Tests";
  const description =
    bucket === "closed"
      ? "Review previous assessments and submission states."
      : "These are the tests currently available to start.";

  return (
    <div className="stcet-page">
      <section className="stcet-panel stcet-hero rounded-[32px] p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
          {bucket === "closed" ? "Archive" : "Live Window"}
        </p>
        <h2 className="mt-4 text-4xl font-semibold text-white">{title}</h2>
        <p className="mt-4 text-white/66">{description}</p>
      </section>

      <section className="grid gap-5">
        {tests.length === 0 ? (
          <div className="stcet-panel rounded-[28px] p-8 text-white/55">
            No tests found here yet.
          </div>
        ) : (
          tests.map((test) => <TestCard key={test.id} test={test} />)
        )}
      </section>
    </div>
  );
}
