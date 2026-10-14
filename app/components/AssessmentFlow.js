"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

function isQuestionVisible(question, answers) {
  if (!question.conditionalOn?.questionKey) return true;
  const { questionKey, operator, value } = question.conditionalOn;
  const dependsOnValue = answers[questionKey];
  if (operator === "equals") return dependsOnValue === value;
  if (operator === "not_equals") return dependsOnValue !== value;
  if (operator === "in") return Array.isArray(value) && value.includes(dependsOnValue);
  return true;
}

function track(type, meta) {
  fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, meta }) }).catch(() => {});
}

export default function AssessmentFlow({ guide, questions }) {
  const [answers, setAnswers] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  const visibleQuestions = useMemo(() => questions.filter((q) => isQuestionVisible(q, answers)), [questions, answers]);
  const current = visibleQuestions[stepIndex];
  const isLastStep = stepIndex === visibleQuestions.length - 1;
  const isReviewStep = stepIndex === visibleQuestions.length;

  useEffect(() => {
    if (!started) { track("assessment_start", { guideSlug: guide.slug }); setStarted(true); }
  }, [started, guide.slug]);

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance() {
    if (!current) return true;
    if (!current.required) return true;
    const value = answers[current.key];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  }

  function goNext() {
    if (!canAdvance()) { setError("Please answer this question before continuing."); return; }
    setError("");
    track("assessment_step", { step: stepIndex + 1, guideSlug: guide.slug });
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    setError("");
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function handleCheckout() {
    setSubmitting(true);
    setError("");
    try {
      track("assessment_complete", { guideSlug: guide.slug });
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: guide.slug, answers, customerEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); setSubmitting(false); return; }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const progressPct = Math.round((Math.min(stepIndex, visibleQuestions.length) / visibleQuestions.length) * 100);

  return (
    <section style={{ padding: "140px 24px 96px", backgroundColor: "var(--color-canvas)", minHeight: "70vh" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ height: 4, backgroundColor: "var(--color-hairline)", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${progressPct}%`, backgroundColor: "var(--color-primary)", transition: "width 0.3s ease" }} />
          </div>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>
            {isReviewStep ? "Review & checkout" : `Question ${stepIndex + 1} of ${visibleQuestions.length}`}
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", border: "1px solid var(--color-error)", borderRadius: 10, color: "var(--color-error)", fontSize: 14, backgroundColor: "rgba(184,74,61,0.06)" }}>
            {error}
          </div>
        )}

        {!isReviewStep && current && (
          <div className="fade-up" key={current.key}>
            <h2 style={{ fontSize: 24, fontWeight: 500, color: "var(--color-ink)", marginBottom: 24, letterSpacing: "-0.3px" }}>
              {current.label}
            </h2>

            <QuestionInput question={current} value={answers[current.key]} onChange={(v) => setAnswer(current.key, v)} />

            <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
              {stepIndex > 0 && (
                <button
                  onClick={goBack}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 20px", borderRadius: 10, border: "1px solid var(--color-hairline)", backgroundColor: "transparent", color: "var(--color-muted)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              <button
                onClick={goNext}
                className="btn-primary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff", padding: "12px 24px", borderRadius: 10, border: "none", fontSize: 14.5, fontWeight: 500, cursor: "pointer" }}
              >
                {isLastStep ? "Review" : "Continue"} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {isReviewStep && (
          <div className="fade-up">
            <h2 style={{ fontSize: 24, fontWeight: 500, color: "var(--color-ink)", marginBottom: 12, letterSpacing: "-0.3px" }}>
              You're all set
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--color-muted)", marginBottom: 24 }}>
              We'll generate <strong style={{ color: "var(--color-ink)" }}>{guide.title}</strong> using your answers once payment is confirmed.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-body)", marginBottom: 8 }}>
                Email (for your download link)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--color-hairline)", fontSize: 15, backgroundColor: "var(--color-surface-card)" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderTop: "1px solid var(--color-hairline)", marginBottom: 24 }}>
              <span style={{ fontSize: 14, color: "var(--color-muted)" }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 600, color: "var(--color-ink)" }}>${(guide.priceCents / 100).toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={goBack}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 20px", borderRadius: 10, border: "1px solid var(--color-hairline)", backgroundColor: "transparent", color: "var(--color-muted)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                onClick={handleCheckout}
                disabled={submitting || !email}
                className="btn-primary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff", padding: "12px 24px", borderRadius: 10, border: "none", fontSize: 14.5, fontWeight: 500, cursor: submitting ? "default" : "pointer" }}
              >
                {submitting ? <Loader2 size={16} className="spin" /> : null}
                {submitting ? "Redirecting..." : "Continue to Payment"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}

function QuestionInput({ question, value, onChange }) {
  if (question.type === "single_select") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`option-pill ${value === opt.value ? "option-pill--selected" : ""}`}
            style={{
              textAlign: "left",
              padding: "14px 18px",
              borderRadius: 10,
              border: "1px solid var(--color-hairline)",
              backgroundColor: value === opt.value ? undefined : "var(--color-surface-card)",
              color: value === opt.value ? undefined : "var(--color-ink)",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "multi_select") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(isSelected ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])}
              className={`option-pill ${isSelected ? "option-pill--selected" : ""}`}
              style={{
                textAlign: "left",
                padding: "14px 18px",
                borderRadius: 10,
                border: "1px solid var(--color-hairline)",
                backgroundColor: isSelected ? undefined : "var(--color-surface-card)",
                color: isSelected ? undefined : "var(--color-ink)",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "scale") {
    return (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {question.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`option-pill ${value === opt.value ? "option-pill--selected" : ""}`}
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              border: "1px solid var(--color-hairline)",
              backgroundColor: value === opt.value ? undefined : "var(--color-surface-card)",
              color: value === opt.value ? undefined : "var(--color-ink)",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        style={{ width: "100%", padding: "14px 18px", borderRadius: 10, border: "1px solid var(--color-hairline)", fontSize: 16, backgroundColor: "var(--color-surface-card)" }}
      />
    );
  }

  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      style={{ width: "100%", padding: "14px 18px", borderRadius: 10, border: "1px solid var(--color-hairline)", fontSize: 16, backgroundColor: "var(--color-surface-card)", resize: "vertical" }}
    />
  );
}
