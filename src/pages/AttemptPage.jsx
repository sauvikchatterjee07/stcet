import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../lib/api";

function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function AttemptPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const autoSubmitRef = useRef(false);
  const answersRef = useRef({});
  const submittingRef = useRef(false);
  const [attempt, setAttempt] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingByQuestion, setUploadingByQuestion] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [rankInfo, setRankInfo] = useState(null);
  const [rankLoading, setRankLoading] = useState(false);

  useEffect(() => {
    loadAttempt();
  }, [attemptId]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") {
      return undefined;
    }

    const timer = setInterval(() => {
      const startedAt = new Date(attempt.startedAt).getTime();
      const endsAt = startedAt + attempt.test.durationMinutes * 60 * 1000;
      const secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(secondsLeft);
      if (secondsLeft <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        handleSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt]);

  async function loadAttempt() {
    const response = await api.get(`/attempts/${attemptId}`);
    autoSubmitRef.current = false;
    setAttempt(response.data);
    if (response.data.status === "IN_PROGRESS") {
      const startedAt = new Date(response.data.startedAt).getTime();
      const endsAt = startedAt + response.data.test.durationMinutes * 60 * 1000;
      setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }

    const initialAnswers = {};
    response.data.answers.forEach((answer) => {
      initialAnswers[answer.questionId] = {
        selectedOption: answer.selectedOption || "",
        codeAnswer: answer.codeAnswer || "",
        submittedLanguage:
          answer.submittedLanguage || answer.question.codingLanguage || "",
        screenshotUrls: answer.screenshotUrls || [],
      };
    });
    setAnswers(initialAnswers);
    setRankInfo(null);
  }

  const currentQuestion = attempt?.test.questions[currentIndex];

  function updateAnswer(questionId, patch) {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        selectedOption: current[questionId]?.selectedOption || "",
        codeAnswer: current[questionId]?.codeAnswer || "",
        submittedLanguage:
          current[questionId]?.submittedLanguage ||
          attempt?.test.questions.find((question) => question.id === questionId)
            ?.codingLanguage ||
          "",
        screenshotUrls: current[questionId]?.screenshotUrls || [],
        ...patch,
      },
    }));
  }

  async function uploadScreenshots(question, fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) {
      return;
    }

    const existing = answers[question.id]?.screenshotUrls || [];
    if (existing.length + files.length > question.maxScreenshots) {
      alert(`You can upload at most ${question.maxScreenshots} screenshots.`);
      return;
    }

    setUploadingByQuestion((current) => ({ ...current, [question.id]: true }));

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const presign = await api.post("/uploads/presign", {
          fileName: file.name,
          fileType: file.type,
        });

        const formData = new FormData();
        Object.entries(presign.data.post.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
        formData.append("file", file);

        await fetch(presign.data.post.url, {
          method: "POST",
          body: formData,
        });

        uploadedUrls.push(presign.data.publicUrl);
      }

      updateAnswer(question.id, {
        screenshotUrls: [...existing, ...uploadedUrls],
      });
    } catch (error) {
      alert(error.response?.data?.error || "Failed to upload screenshot.");
    } finally {
      setUploadingByQuestion((current) => ({ ...current, [question.id]: false }));
    }
  }

  async function handleSubmit() {
    if (!attempt || submittingRef.current) {
      return;
    }

    try {
      setSubmitting(true);
      submittingRef.current = true;
      const currentAnswers = answersRef.current;
      const payload = {
        answers: attempt.test.questions.map((question) => ({
          questionId: question.id,
          selectedOption:
            currentAnswers[question.id]?.selectedOption || undefined,
          codeAnswer: currentAnswers[question.id]?.codeAnswer || undefined,
          submittedLanguage:
            currentAnswers[question.id]?.submittedLanguage || undefined,
          screenshotUrls: currentAnswers[question.id]?.screenshotUrls || [],
        })),
      };

      const response = await api.post(
        `/tests/${attempt.test.id}/submit`,
        payload
      );
      setSecondsLeft(0);
      setAttempt(response.data);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to submit test.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  async function handleLoadRank() {
    if (!attempt?.resultVisible) {
      return;
    }

    try {
      setRankLoading(true);
      const response = await api.get(`/tests/${attempt.test.id}/rank`);
      setRankInfo(response.data);
    } catch (error) {
      alert(error.response?.data?.error || "Unable to load rank right now.");
    } finally {
      setRankLoading(false);
    }
  }

  if (!attempt) {
    return (
      <div className="stcet-panel rounded-[28px] p-8 text-white">
        Loading attempt...
      </div>
    );
  }

  if (attempt.status === "SUBMITTED") {
    return (
      <div className="stcet-page">
        <section className="stcet-panel stcet-hero rounded-[36px] p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
            Submission Status
          </p>
          <h2 className="mt-4 text-4xl font-semibold text-white">
            {attempt.test.title}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="stcet-chip rounded-[24px] p-4">
              <p className="text-sm text-white/58">Submission</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                Received
              </p>
            </div>
            <div className="stcet-chip stcet-chip-cyan rounded-[24px] p-4">
              <p className="text-sm text-white/58">Review Status</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {attempt.reviewStatus}
              </p>
            </div>
            <div className="stcet-chip rounded-[24px] p-4">
              <p className="text-sm text-white/58">Result Publication</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {attempt.resultVisible ? "Published" : "Pending"}
              </p>
            </div>
          </div>

          <p className="mt-6 text-white/66">
            Submitted on {formatDate(attempt.submittedAt)}.
            {attempt.resultVisible
              ? " Your result has been published."
              : attempt.reviewStatus === "PENDING_REVIEW"
              ? " Coding answers are under review. Results will appear after admin review and publication."
              : " Your submission is complete. Results will appear once the admin publishes them."}
          </p>

          {attempt.resultVisible ? (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="stcet-chip rounded-[24px] p-4">
                  <p className="text-sm text-white/58">Final Score</p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {attempt.totalScore}/{attempt.totalMarks}
                  </p>
                </div>
                <div className="stcet-chip rounded-[24px] p-4">
                  <p className="text-sm text-white/58">Percentage</p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {attempt.percentage?.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/tests/${attempt.test.id}/result`)}
                  className="rounded-[22px] bg-white px-5 py-3 font-semibold text-black transition-transform hover:-translate-y-0.5"
                >
                  View Full Result
                </button>
                <button
                  onClick={handleLoadRank}
                  disabled={rankLoading}
                  className="stcet-button-primary rounded-[22px] px-5 py-3 disabled:opacity-60"
                >
                  {rankLoading ? "Loading Rank..." : "See My Rank"}
                </button>
              </div>

              {rankInfo ? (
                <div className="mt-6 rounded-[24px] stcet-soft-panel p-5">
                  <p className="text-xs uppercase tracking-[0.35em] text-stcet-cyan">
                    Rank
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    #{rankInfo.rank}
                  </p>
                  <p className="mt-2 text-white/68">
                    Among {rankInfo.totalParticipants} students who attempted this
                    test.
                  </p>
                </div>
              ) : null}

              {attempt.generalFeedback ? (
                <div className="mt-6 rounded-[24px] stcet-soft-panel p-5">
                  <p className="text-xs uppercase tracking-[0.35em] text-stcet-cyan">
                    Teacher Feedback
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-white/72">
                    {attempt.generalFeedback}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <section className="space-y-4">
          {attempt.answers.map((answer, index) => (
            <article
              key={answer.id}
              className="stcet-panel rounded-[28px] p-6 space-y-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stcet-gold">
                    Question {index + 1}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    {answer.question.prompt}
                  </h3>
                </div>
                <div className="stcet-chip rounded-full px-4 py-2 text-sm">
                  {attempt.resultVisible && answer.finalAwardedMarks !== null
                    ? `${answer.finalAwardedMarks}/${answer.question.marks} marks`
                    : `${answer.question.marks} marks`}
                </div>
              </div>

              {answer.question.type === "MCQ" ? (
                <div className="rounded-[22px] stcet-soft-panel px-4 py-4 text-white/74">
                  Selected answer: {answer.selectedOption || "Not answered"}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[22px] stcet-soft-panel px-4 py-4 text-sm text-white/68">
                    Language: {answer.submittedLanguage || "Not provided"}
                  </div>
                  <pre className="stcet-code overflow-x-auto rounded-[24px] border border-white/8 bg-[#121212] p-4 text-sm text-white">
                    <code>{answer.codeAnswer || "No code submitted"}</code>
                  </pre>
                  {answer.screenshotUrls?.length ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      {answer.screenshotUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-[24px] border border-white/8"
                        >
                          <img
                            src={url}
                            alt="Submitted screenshot"
                            className="h-44 w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {answer.reviewerNotes ? (
                    <div className="rounded-[22px] stcet-soft-panel px-4 py-4 text-white/74">
                      Reviewer note: {answer.reviewerNotes}
                    </div>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </section>

        <button
          onClick={() => navigate(`/tests/${attempt.test.id}`)}
          className="stcet-button-secondary rounded-[22px] px-5 py-3"
        >
          Back to Test
        </button>
      </div>
    );
  }

  return (
    <div className="stcet-page">
      <section className="stcet-panel rounded-[32px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
              Attempt In Progress
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              {attempt.test.title}
            </h2>
            <p className="mt-3 text-white/64">
              Started on {formatDate(attempt.startedAt)} · {attempt.test.durationMinutes} minutes
            </p>
          </div>

          <div className="rounded-[28px] bg-gradient-to-br from-stcet-gold to-[#ffc94f] px-6 py-4 text-center text-stcet-black">
            <p className="text-xs uppercase tracking-[0.3em] text-black/60">
              Time Left
            </p>
            <p className="mt-2 text-4xl font-semibold">{formatClock(secondsLeft)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="stcet-panel rounded-[28px] p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-stcet-gold">
            Navigator
          </p>
          <div className="mt-4 grid grid-cols-4 gap-3 xl:grid-cols-2">
            {attempt.test.questions.map((question, index) => {
              const isAnswered =
                question.type === "MCQ"
                  ? Boolean(answers[question.id]?.selectedOption)
                  : Boolean(
                      answers[question.id]?.codeAnswer ||
                        answers[question.id]?.screenshotUrls?.length
                    );

              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`rounded-[20px] px-3 py-3 text-sm transition-colors ${
                    currentIndex === index
                      ? "bg-stcet-gold text-stcet-black"
                      : isAnswered
                      ? "bg-stcet-cyan/14 text-white"
                      : "bg-white/5 text-white/60"
                  }`}
                >
                  Q{index + 1}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="stcet-panel rounded-[32px] p-6">
          {currentQuestion ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-stcet-gold">
                    Question {currentIndex + 1}
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold text-white">
                    {currentQuestion.prompt}
                  </h3>
                  {currentQuestion.description ? (
                    <p className="mt-4 whitespace-pre-wrap text-white/68">
                      {currentQuestion.description}
                    </p>
                  ) : null}
                </div>
                <div className="stcet-chip rounded-full px-4 py-2 text-sm">
                  {currentQuestion.marks} marks
                </div>
              </div>

              {currentQuestion.type === "MCQ" ? (
                <div className="grid gap-3">
                  {(currentQuestion.options || []).map((option) => {
                    const checked =
                      answers[currentQuestion.id]?.selectedOption === option;

                    return (
                      <button
                        key={option}
                        onClick={() =>
                          updateAnswer(currentQuestion.id, {
                            selectedOption: option,
                          })
                        }
                        className={`rounded-[24px] border px-5 py-4 text-left transition-colors ${
                          checked
                            ? "border-stcet-gold bg-stcet-gold text-stcet-black"
                            : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-5">
                  {currentQuestion.referenceScreenshotUrls?.length ? (
                    <div className="rounded-[24px] stcet-soft-panel p-5">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-white">
                            Reference Screenshots
                          </p>
                          <p className="text-sm text-white/62">
                            Use these admin-provided screenshots as the visual reference for this task.
                          </p>
                        </div>
                        <div className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/55">
                          {(currentQuestion.referenceScreenshotUrls || []).length} reference
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        {currentQuestion.referenceScreenshotUrls.map((url) => (
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
                              className="h-48 w-full object-contain bg-[#0d0d0d]"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm text-white/66">Language</span>
                      <input
                        value={
                          answers[currentQuestion.id]?.submittedLanguage ||
                          currentQuestion.codingLanguage ||
                          ""
                        }
                        onChange={(event) =>
                          updateAnswer(currentQuestion.id, {
                            submittedLanguage: event.target.value,
                          })
                        }
                        className="stcet-input px-5 py-4"
                      />
                    </label>

                    <div className="rounded-[24px] stcet-soft-panel px-5 py-4 text-sm text-white/66">
                      You can upload up to {currentQuestion.maxScreenshots} screenshots
                      for this question.
                    </div>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm text-white/66">Code Answer</span>
                    <textarea
                      value={answers[currentQuestion.id]?.codeAnswer || ""}
                      onChange={(event) =>
                        updateAnswer(currentQuestion.id, {
                          codeAnswer: event.target.value,
                        })
                      }
                      className="stcet-input stcet-code min-h-80 rounded-[24px] border-white/8 bg-[#111111] px-5 py-4 text-sm"
                      placeholder="Paste your HTML / CSS / JavaScript or other code here."
                    />
                  </label>

                  <div className="rounded-[24px] stcet-soft-panel p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-white">Screenshots</p>
                        <p className="text-sm text-white/62">
                          Upload work-in-progress or final output screenshots.
                        </p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center rounded-[22px] stcet-button-secondary px-4 py-3 text-sm">
                        {uploadingByQuestion[currentQuestion.id]
                          ? "Uploading..."
                          : "Upload Images"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) =>
                            uploadScreenshots(currentQuestion, event.target.files)
                          }
                        />
                      </label>
                    </div>

                    {(answers[currentQuestion.id]?.screenshotUrls || []).length ? (
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        {answers[currentQuestion.id].screenshotUrls.map((url) => (
                          <div
                            key={url}
                            className="overflow-hidden rounded-[24px] border border-white/8 bg-black/20"
                          >
                            <img
                              src={url}
                              alt="Uploaded screenshot"
                              className="h-40 w-full object-cover"
                            />
                            <button
                              onClick={() =>
                                updateAnswer(currentQuestion.id, {
                                  screenshotUrls: answers[
                                    currentQuestion.id
                                  ].screenshotUrls.filter((item) => item !== url),
                                })
                              }
                              className="w-full border-t border-white/8 px-3 py-2 text-sm text-stcet-gold"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-3 border-t border-white/8 pt-4">
                <button
                  onClick={() =>
                    setCurrentIndex((current) => Math.max(0, current - 1))
                  }
                  disabled={currentIndex === 0}
                  className="stcet-button-secondary rounded-[22px] px-5 py-3 disabled:opacity-40"
                >
                  Previous
                </button>

                <div className="flex flex-wrap gap-3">
                  {currentIndex < attempt.test.questions.length - 1 ? (
                    <button
                      onClick={() =>
                        setCurrentIndex((current) =>
                          Math.min(attempt.test.questions.length - 1, current + 1)
                        )
                      }
                      className="stcet-button-secondary rounded-[22px] px-5 py-3"
                    >
                      Next Question
                    </button>
                  ) : null}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="stcet-button-primary rounded-[22px] px-5 py-3 disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit Test"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
