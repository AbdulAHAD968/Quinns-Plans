"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Loader2, WifiOff, RotateCcw, Check } from "lucide-react";

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
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, meta }),
  }).catch(() => {});
}

export default function AssessmentFlow({ guide, questions }) {
  const [answers, setAnswers] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const autoAdvanceTimer = useRef(null);
  const storageKey = `quinn_assessment_${guide.slug}`;

  // 1. Restore state from localStorage on initial mount (resilient to refresh)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers && typeof parsed.answers === "object") {
          setAnswers(parsed.answers);
          setIsRestored(true);
        }
        if (typeof parsed.stepIndex === "number" && parsed.stepIndex >= 0) {
          setStepIndex(parsed.stepIndex);
        }
        if (parsed.email) {
          setEmail(parsed.email);
        }
      }
    } catch (e) {
      console.warn("Could not read saved assessment from storage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  // 2. Persist state to localStorage on every change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          stepIndex,
          email,
          updatedAt: Date.now(),
        })
      );
    } catch (e) {
      // Storage quota or private mode restriction
    }
  }, [answers, stepIndex, email, isHydrated, storageKey]);

  // 3. Monitor online/offline network connectivity
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    function handleOnline() {
      setIsOffline(false);
      setError("");
    }
    function handleOffline() {
      setIsOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const visibleQuestions = useMemo(
    () => questions.filter((q) => isQuestionVisible(q, answers)),
    [questions, answers]
  );

  // Clamp stepIndex if dynamic condition visibility changed
  useEffect(() => {
    if (visibleQuestions.length > 0 && stepIndex > visibleQuestions.length) {
      setStepIndex(visibleQuestions.length);
    }
  }, [visibleQuestions.length, stepIndex]);

  const current = visibleQuestions[stepIndex];
  const isLastStep = stepIndex === visibleQuestions.length - 1;
  const isReviewStep = stepIndex === visibleQuestions.length;

  useEffect(() => {
    if (!started) {
      track("assessment_start", { guideSlug: guide.slug });
      setStarted(true);
    }
  }, [started, guide.slug]);

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance(customAnswers = answers) {
    if (!current) return true;
    if (!current.required) return true;
    const value = customAnswers[current.key];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  }

  function goNext(customAnswers = answers) {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (!canAdvance(customAnswers)) {
      setError("Please answer this question before continuing.");
      return;
    }
    setError("");
    track("assessment_step", { step: stepIndex + 1, guideSlug: guide.slug });
    setStepIndex((i) => Math.min(i + 1, visibleQuestions.length));
  }

  function goBack() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setError("");
    setStepIndex((i) => Math.max(0, i - 1));
  }

  // Auto-advance for single select / scale choices
  function handleSelectOption(key, value) {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    setError("");

    // Small micro-delay (260ms) gives the user tactile visual confirmation of their selection
    autoAdvanceTimer.current = setTimeout(() => {
      goNext(updated);
    }, 260);
  }

  function handleReset() {
    if (window.confirm("Do you want to clear your answers and start over?")) {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      setAnswers({});
      setStepIndex(0);
      setError("");
      setIsRestored(false);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }

  async function handleCheckout() {
    if (isOffline || !navigator.onLine) {
      setError("You appear to be offline. Your answers are safely saved. Please reconnect to proceed with payment.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      track("assessment_complete", { guideSlug: guide.slug });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: guide.slug, answers, customerEmail: email }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong while initiating checkout.");
        setSubmitting(false);
        return;
      }

      // Cleanup saved assessment upon redirecting to Stripe checkout
      try {
        localStorage.removeItem(storageKey);
      } catch {}

      window.location.href = data.url;
    } catch (err) {
      if (err.name === "AbortError") {
        setError("The connection timed out. Your answers are saved locally. Please try again.");
      } else {
        setError("Connection issue. Your answers are safely saved. Please check your connection and try again.");
      }
      setSubmitting(false);
    }
  }

  const progressPct = Math.round(
    (Math.min(stepIndex, visibleQuestions.length) / (visibleQuestions.length || 1)) * 100
  );

  return (
    <section style={{ padding: "140px 24px 96px", backgroundColor: "var(--color-canvas)", minHeight: "75vh" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Offline notification banner */}
        {isOffline && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              backgroundColor: "rgba(201, 154, 46, 0.12)",
              border: "1px solid var(--color-warning)",
              borderRadius: 10,
              marginBottom: 20,
              color: "var(--color-ink)",
              fontSize: 13.5,
            }}
          >
            <WifiOff size={18} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
            <span>
              <strong>You're currently offline.</strong> All your answers are saved locally and will not be lost.
            </span>
          </div>
        )}

        {/* Progress & Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ height: 5, backgroundColor: "var(--color-hairline)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                backgroundColor: "var(--color-primary)",
                transition: "width 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0, fontWeight: 500 }}>
              {isReviewStep ? "Review & checkout" : `Question ${stepIndex + 1} of ${visibleQuestions.length}`}
            </p>

            {isRestored && Object.keys(answers).length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                title="Clear saved answers and start fresh"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "transparent",
                  border: "none",
                  color: "var(--color-muted)",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                <RotateCcw size={12} /> Start over
              </button>
            )}
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              border: "1px solid var(--color-error)",
              borderRadius: 10,
              color: "var(--color-error)",
              fontSize: 14,
              backgroundColor: "rgba(184,74,61,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{error}</span>
            {isReviewStep && (
              <button
                type="button"
                onClick={handleCheckout}
                style={{
                  backgroundColor: "var(--color-error)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12.5,
                  cursor: "pointer",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Question View */}
        {!isReviewStep && current && (
          <div className="fade-up" key={current.key}>
            <h2
              style={{
                fontSize: "clamp(22px, 3.5vw, 26px)",
                fontWeight: 500,
                color: "var(--color-ink)",
                marginBottom: 24,
                letterSpacing: "-0.4px",
                lineHeight: 1.35,
              }}
            >
              {current.label}
            </h2>

            <QuestionInput
              question={current}
              value={answers[current.key]}
              onChange={(v) => setAnswer(current.key, v)}
              onOptionSelect={(v) => handleSelectOption(current.key, v)}
              onEnterPress={() => goNext()}
            />

            <div style={{ display: "flex", gap: 12, marginTop: 36, alignItems: "center" }}>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "12px 20px",
                    borderRadius: 10,
                    border: "1px solid var(--color-hairline)",
                    backgroundColor: "transparent",
                    color: "var(--color-muted)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <ArrowLeft size={15} /> Back
                </button>
              )}

              {/* For multi_select, number, and text questions, show explicit continue button */}
              {(current.type === "multi_select" || current.type === "number" || !["single_select", "scale"].includes(current.type)) && (
                <button
                  type="button"
                  onClick={() => goNext()}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    color: "#fff",
                    padding: "13px 24px",
                    borderRadius: 10,
                    border: "none",
                    fontSize: 14.5,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {isLastStep ? "Review" : "Continue"} <ArrowRight size={15} />
                </button>
              )}

              {/* For single_select and scale, show small helper indicator */}
              {(current.type === "single_select" || current.type === "scale") && (
                <span style={{ fontSize: 12.5, color: "var(--color-muted)", marginLeft: "auto" }}>
                  Select an option to advance &rarr;
                </span>
              )}
            </div>
          </div>
        )}

        {/* Review & Checkout View */}
        {isReviewStep && (
          <div className="fade-up">
            <h2
              style={{
                fontSize: "clamp(24px, 3.5vw, 28px)",
                fontWeight: 500,
                color: "var(--color-ink)",
                marginBottom: 12,
                letterSpacing: "-0.4px",
              }}
            >
              You're all set
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-muted)", marginBottom: 28 }}>
              We'll generate your custom <strong style={{ color: "var(--color-ink)" }}>{guide.title}</strong> using your answers once payment is confirmed.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13.5, fontWeight: 500, color: "var(--color-body)", marginBottom: 8 }}>
                Email address (to receive your generated plan)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--color-hairline)",
                  fontSize: 15,
                  backgroundColor: "var(--color-surface-card)",
                  color: "var(--color-ink)",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 0",
                borderTop: "1px solid var(--color-hairline)",
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 14.5, color: "var(--color-muted)" }}>Total</span>
              <span style={{ fontSize: 26, fontWeight: 600, color: "var(--color-ink)" }}>
                ${(guide.priceCents / 100).toFixed(2)}
              </span>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={goBack}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "13px 20px",
                  borderRadius: 10,
                  border: "1px solid var(--color-hairline)",
                  backgroundColor: "transparent",
                  color: "var(--color-muted)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={submitting || !email}
                className="btn-primary"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "#fff",
                  padding: "13px 24px",
                  borderRadius: 10,
                  border: "none",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: submitting || !email ? "default" : "pointer",
                  opacity: !email ? 0.6 : 1,
                }}
              >
                {submitting ? <Loader2 size={16} className="spin" /> : null}
                {submitting ? "Redirecting to Payment..." : "Continue to Payment"}
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

function QuestionInput({ question, value, onChange, onOptionSelect, onEnterPress }) {
  if (question.type === "single_select") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onOptionSelect(opt.value)}
              className={`option-pill ${isSelected ? "option-pill--selected" : ""}`}
              style={{
                textAlign: "left",
                padding: "16px 20px",
                borderRadius: 12,
                border: "1px solid",
                borderColor: isSelected ? "var(--color-ink)" : "var(--color-hairline)",
                backgroundColor: isSelected ? "var(--color-ink)" : "var(--color-surface-card)",
                color: isSelected ? "var(--color-on-dark)" : "var(--color-ink)",
                fontSize: 15.5,
                fontWeight: isSelected ? 500 : 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.15s ease",
              }}
            >
              <span>{opt.label}</span>
              {isSelected && <Check size={18} style={{ color: "var(--color-primary)" }} />}
            </button>
          );
        })}
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
              onClick={() =>
                onChange(
                  isSelected
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value]
                )
              }
              className={`option-pill ${isSelected ? "option-pill--selected" : ""}`}
              style={{
                textAlign: "left",
                padding: "16px 20px",
                borderRadius: 12,
                border: "1px solid",
                borderColor: isSelected ? "var(--color-ink)" : "var(--color-hairline)",
                backgroundColor: isSelected ? "var(--color-ink)" : "var(--color-surface-card)",
                color: isSelected ? "var(--color-on-dark)" : "var(--color-ink)",
                fontSize: 15.5,
                fontWeight: isSelected ? 500 : 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.15s ease",
              }}
            >
              <span>{opt.label}</span>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: isSelected ? "none" : "1.5px solid var(--color-hairline)",
                  backgroundColor: isSelected ? "var(--color-primary)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSelected && <Check size={14} style={{ color: "#fff" }} />}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "scale") {
    return (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {question.options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onOptionSelect(opt.value)}
              className={`option-pill ${isSelected ? "option-pill--selected" : ""}`}
              style={{
                padding: "14px 22px",
                borderRadius: 10,
                border: "1px solid",
                borderColor: isSelected ? "var(--color-ink)" : "var(--color-hairline)",
                backgroundColor: isSelected ? "var(--color-ink)" : "var(--color-surface-card)",
                color: isSelected ? "var(--color-on-dark)" : "var(--color-ink)",
                fontSize: 15,
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnterPress) onEnterPress();
        }}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        placeholder="Enter a number..."
        style={{
          width: "100%",
          padding: "14px 18px",
          borderRadius: 10,
          border: "1px solid var(--color-hairline)",
          fontSize: 16,
          backgroundColor: "var(--color-surface-card)",
          color: "var(--color-ink)",
          outline: "none",
        }}
      />
    );
  }

  return (
    <textarea
      value={value ?? ""}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && onEnterPress) {
          onEnterPress();
        }
      }}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder="Type your answer here..."
      style={{
        width: "100%",
        padding: "14px 18px",
        borderRadius: 10,
        border: "1px solid var(--color-hairline)",
        fontSize: 16,
        backgroundColor: "var(--color-surface-card)",
        color: "var(--color-ink)",
        resize: "vertical",
        outline: "none",
      }}
    />
  );
}
