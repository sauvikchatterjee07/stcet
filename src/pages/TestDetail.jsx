import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../lib/api";

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function TestDetail() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.get(`/stcet/tests/${testId}`).then((response) => setTest(response.data));
  }, [testId]);

  async function handleStart() {
    try {
      setStarting(true);
      const response = await api.post(`/stcet/tests/${testId}/start`);
      navigate(`/attempts/${response.data.id}`);
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.attemptId) {
        navigate(`/attempts/${error.response.data.attemptId}`);
        return;
      }
      alert(error.response?.data?.error || "Unable to start the test.");
    } finally {
      setStarting(false);
    }
  }

  if (!test) {
    return (
      <div className="stcet-panel rounded-[28px] p-8 text-white">
        Loading test details...
      </div>
    );
  }

  const latestAttempt = test.latestAttempt;
  const canStart = test.bucket === "open" && !latestAttempt;
  const hasPublishedResult =
    Boolean(latestAttempt?.submittedAt) && Boolean(latestAttempt?.resultVisible);
  const actionLabel = latestAttempt
    ? hasPublishedResult
      ? "View Submission"
      : latestAttempt.submittedAt
      ? "View Submission"
      : "Continue Attempt"
    : canStart
    ? "Start Test"
    : "Test Closed";

  const actionHandler = latestAttempt?.id
    ? () => navigate(`/attempts/${latestAttempt.id}`)
    : canStart
    ? handleStart
    : undefined;

  return (
    <div className="stcet-page">
      <section className="stcet-panel stcet-hero rounded-[36px] p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
              {test.bucket === "closed" ? "Closed Exam" : "Exam Brief"}
            </p>
            <h2 className="mt-4 text-4xl font-semibold text-white">{test.title}</h2>
            <p className="mt-4 max-w-3xl text-lg text-white/66">
              {test.description || "No extra description was added for this test."}
            </p>
          </div>

          <div className="grid gap-3 lg:min-w-80">
            {[
              `${test.durationMinutes} minutes`,
              `${test.totalMarks} total marks`,
              `Starts: ${formatDate(test.startsAt)}`,
              `Ends: ${formatDate(test.endsAt)}`,
            ].map((item) => (
              <div key={item} className="stcet-chip rounded-full px-4 py-3 text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>

        {test.instructions ? (
          <div className="mt-8 rounded-[28px] stcet-soft-panel p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-stcet-cyan">
              Instructions
            </p>
            <p className="mt-3 whitespace-pre-wrap text-white/72">
              {test.instructions}
            </p>
          </div>
        ) : null}

        {latestAttempt ? (
          <div
            className={`mt-8 rounded-[30px] border p-5 text-sm ${
              hasPublishedResult
                ? "border-emerald-400/25 bg-emerald-400/10 shadow-[0_18px_50px_rgba(16,185,129,0.12)]"
                : "border-white/8 bg-white/5"
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p
                  className={`text-xs uppercase tracking-[0.35em] ${
                    hasPublishedResult ? "text-emerald-300" : "text-stcet-cyan"
                  }`}
                >
                  {hasPublishedResult ? "Result Published" : "Submission Status"}
                </p>
                <p className="mt-3 text-base text-white/80">
                  {latestAttempt.submittedAt
                    ? `Submitted ${formatDate(latestAttempt.submittedAt)}`
                    : "Attempt in progress"}
                </p>
                <p className="mt-2 text-white/60">
                  {hasPublishedResult
                    ? `Reviewed and published on ${formatDate(test.resultsPublishedAt)}`
                    : latestAttempt.submittedAt
                    ? "Your result will appear here once the admin publishes it."
                    : `Current review state: ${latestAttempt.reviewStatus}`}
                </p>
              </div>

              {hasPublishedResult ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full border border-emerald-400/25 bg-black/20 px-4 py-2 text-sm font-medium text-white">
                    {latestAttempt.totalScore}/{latestAttempt.totalMarks} marks
                  </div>
                  <button
                    onClick={() => navigate(`/tests/${test.id}/result`)}
                    className="rounded-[20px] bg-white px-5 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
                  >
                    View Result
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {hasPublishedResult ? (
            <button
              onClick={() => navigate(`/tests/${test.id}/result`)}
              className="rounded-[22px] bg-emerald-400 px-5 py-3 font-semibold text-black transition-transform hover:-translate-y-0.5"
            >
              View Result
            </button>
          ) : null}
          <button
            onClick={actionHandler}
            disabled={starting || !actionHandler}
            className="stcet-button-primary rounded-[22px] px-5 py-3 disabled:opacity-60"
          >
            {starting ? "Preparing..." : actionLabel}
          </button>
        </div>
      </section>

      <section className="stcet-panel rounded-[32px] p-6">
        <h3 className="text-2xl font-semibold text-white">Question Blueprint</h3>
        <div className="mt-5 space-y-4">
          {test.questions.map((question, index) => (
            <article
              key={question.id}
              className="rounded-[24px] stcet-soft-panel p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stcet-gold">
                    Question {index + 1}
                  </p>
                  <h4 className="mt-2 text-xl font-semibold text-white">
                    {question.prompt}
                  </h4>
                  {question.description ? (
                    <p className="mt-3 text-white/64">{question.description}</p>
                  ) : null}
                  {question.type === "CODING" &&
                  question.referenceScreenshotUrls?.length ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      {question.referenceScreenshotUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-[22px] border border-white/8 bg-black/20"
                        >
                          <img
                            src={url}
                            alt="Reference screenshot"
                            className="h-44 w-full object-contain bg-[#0d0d0d]"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-2 text-sm text-white/70">
                  <div className="stcet-chip rounded-full px-4 py-2">
                    {question.type}
                  </div>
                  <div className="stcet-chip rounded-full px-4 py-2">
                    {question.marks} marks
                  </div>
                  {question.type === "CODING" ? (
                    <div className="stcet-chip stcet-chip-cyan rounded-full px-4 py-2">
                      {question.codingLanguage}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
