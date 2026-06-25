"use client";

import { useEffect, useState } from "react";

/**
 * QueueStorm Triage — landing & live demo page.
 *
 * Replaces the template landing page for the warmup submission. Lets a
 * grader or teammate paste a customer message and immediately see the
 * structured triage response. Also surfaces the live health of the
 * /api/health endpoint.
 */

const SAMPLE_TICKETS = [
  {
    label: "Wrong transfer",
    icon: "↩",
    payload: {
      ticket_id: "T-001",
      channel: "app",
      locale: "en",
      message:
        "I sent 5000 taka to a wrong number this morning, please help me get it back",
    },
  },
  {
    label: "Payment failed",
    icon: "⏚",
    payload: {
      ticket_id: "T-002",
      channel: "app",
      locale: "en",
      message: "Payment failed but balance deducted",
    },
  },
  {
    label: "Phishing",
    icon: "⚑",
    payload: {
      ticket_id: "T-003",
      channel: "call_center",
      locale: "en",
      message: "Someone called asking my OTP, is that bKash?",
    },
  },
  {
    label: "Refund",
    icon: "↺",
    payload: {
      ticket_id: "T-004",
      channel: "app",
      locale: "en",
      message: "Please refund my last transaction, I changed my mind",
    },
  },
  {
    label: "Other",
    icon: "·",
    payload: {
      ticket_id: "T-005",
      channel: "app",
      locale: "en",
      message: "App crashed when I opened it",
    },
  },
  {
    label: "Bangla",
    icon: "অ",
    payload: {
      ticket_id: "T-BN",
      channel: "app",
      locale: "bn",
      message: "আমি ভুল নম্বরে ৫০০০ টাকা পাঠিয়ে দিয়েছি",
    },
  },
];

const CAPABILITIES = [
  {
    key: "wrong_transfer",
    name: "Wrong transfer",
    description: "Money sent to the wrong recipient",
    route: "Dispute resolution",
    accent: "blue",
  },
  {
    key: "payment_failed",
    name: "Payment failed",
    description: "Transaction failed, balance may be deducted",
    route: "Payments ops",
    accent: "violet",
  },
  {
    key: "refund_request",
    name: "Refund request",
    description: "Customer asking for a refund",
    route: "Customer support",
    accent: "emerald",
  },
  {
    key: "phishing_or_social_engineering",
    name: "Phishing",
    description: "Suspicious OTP / PIN / card asks",
    route: "Fraud risk · critical",
    accent: "red",
  },
  {
    key: "other",
    name: "Other",
    description: "Anything not covered above",
    route: "Customer support",
    accent: "zinc",
  },
];

const SEVERITY_STYLES = {
  low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const DEPARTMENT_STYLES = {
  customer_support: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  dispute_resolution: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  payments_ops: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  fraud_risk: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const CASE_TYPE_LABELS = {
  wrong_transfer: "Wrong transfer",
  payment_failed: "Payment failed",
  refund_request: "Refund request",
  phishing_or_social_engineering: "Phishing / social engineering",
  other: "Other",
};

const ACCENT_RING = {
  blue: "ring-blue-500/30",
  violet: "ring-violet-500/30",
  emerald: "ring-emerald-500/30",
  red: "ring-red-500/30",
  zinc: "ring-zinc-500/30",
};

const ACCENT_TEXT = {
  blue: "text-blue-600 dark:text-blue-300",
  violet: "text-violet-600 dark:text-violet-300",
  emerald: "text-emerald-600 dark:text-emerald-300",
  red: "text-red-600 dark:text-red-300",
  zinc: "text-zinc-600 dark:text-zinc-300",
};

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

function LivePill({ status }) {
  const map = {
    ok: { dot: "bg-emerald-500", label: "Service live", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" },
    err: { dot: "bg-red-500", label: "Service unreachable", cls: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200" },
    pending: { dot: "bg-zinc-400 animate-pulse", label: "Checking…", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
  };
  const v = map[status] || map.pending;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${v.cls}`}
    >
      <span className={`h-2 w-2 rounded-full ${v.dot}`} />
      {v.label}
    </span>
  );
}

export default function TriageLandingPage() {
  const [ticketId, setTicketId] = useState("T-001");
  const [channel, setChannel] = useState("app");
  const [locale, setLocale] = useState("en");
  const [message, setMessage] = useState(
    "I sent 5000 taka to a wrong number this morning, please help me get it back"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [health, setHealth] = useState("pending");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!cancelled) setHealth(res.ok ? "ok" : "err");
      } catch {
        if (!cancelled) setHealth("err");
      }
    }
    check();
    const id = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function classify() {
    setLoading(true);
    setError(null);
    setResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/sort-ticket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticket_id: ticketId.trim(),
          channel,
          locale,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      setLatencyMs(Math.round(performance.now() - t0));
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function loadSample(idx) {
    const s = SAMPLE_TICKETS[idx];
    setTicketId(s.payload.ticket_id);
    setChannel(s.payload.channel || "app");
    setLocale(s.payload.locale || "en");
    setMessage(s.payload.message);
    setResult(null);
    setError(null);
  }

  const severityClass = result ? SEVERITY_STYLES[result.severity] : null;
  const departmentClass = result ? DEPARTMENT_STYLES[result.department] : null;
  const confidencePct = result ? Math.round(result.confidence * 100) : null;

  return (
    <div className="relative min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden"
      >
        <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-blue-400/30 via-violet-400/20 to-transparent blur-3xl" />
        <div className="absolute -top-20 right-0 h-[420px] w-[420px] rounded-full bg-gradient-to-bl from-emerald-400/25 via-cyan-400/15 to-transparent blur-3xl" />
        <div className="absolute top-40 left-1/3 h-[320px] w-[320px] rounded-full bg-gradient-to-tr from-amber-300/15 via-rose-300/15 to-transparent blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur bg-white/60 dark:bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-zinc-50 dark:to-zinc-300 flex items-center justify-center">
              <span className="text-white dark:text-zinc-900 font-bold text-sm">Q</span>
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">QueueStorm Triage</div>
              <div className="text-[11px] text-zinc-500">SUST CSE Carnival 2026 · Codex Hackathon</div>
            </div>
          </div>
          <LivePill status={health} />
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto max-w-6xl px-6 pt-16 pb-24 space-y-20">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Mock preliminary · live deployment
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tighter leading-[1.05]">
            Read every ticket.{" "}
            <span className="bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-500 dark:from-zinc-50 dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
              Triage in milliseconds.
            </span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            A rules-based classifier for a fintech support inbox. Paste a customer
            message and the service decides the case type, severity, owning team,
            and writes a one-sentence summary an agent can read in two seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#demo"
              className="inline-flex items-center rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Try the live demo
            </a>
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-sm font-medium hover:bg-white dark:hover:bg-zinc-900 transition-colors"
            >
              GET /api/health →
            </a>
          </div>
        </section>

        {/* Stats strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { k: "< 30 s", v: "Response time" },
            { k: "5", v: "Case types" },
            { k: "EN · BN", v: "Languages" },
            { k: "0", v: "External API calls" },
          ].map((s) => (
            <div
              key={s.v}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 backdrop-blur p-5"
            >
              <div className="text-2xl font-semibold tracking-tight">{s.k}</div>
              <div className="mt-1 text-xs text-zinc-500 uppercase tracking-wide">
                {s.v}
              </div>
            </div>
          ))}
        </section>

        {/* Interactive demo */}
        <section id="demo" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Live demo</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Calls <code className="text-xs bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5">POST /api/sort-ticket</code> and renders the response.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                classify();
              }}
              className="lg:col-span-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Customer message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-y"
                  placeholder="Paste a customer complaint here..."
                  required
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SAMPLE_TICKETS.map((s, i) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => loadSample(i)}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                    >
                      <span className="text-zinc-400">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Ticket ID
                  </label>
                  <input
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  >
                    <option value="app">app</option>
                    <option value="sms">sms</option>
                    <option value="call_center">call_center</option>
                    <option value="merchant_portal">merchant_portal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Locale
                  </label>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  >
                    <option value="en">en</option>
                    <option value="bn">bn</option>
                    <option value="mixed">mixed</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !message.trim() || !ticketId.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900 animate-spin" />
                    Classifying…
                  </>
                ) : (
                  <>Classify ticket →</>
                )}
              </button>
            </form>

            {/* Result */}
            <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 min-h-[320px] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Response
                </div>
                {latencyMs != null && (
                  <div className="text-[11px] text-zinc-400 font-mono">
                    {latencyMs} ms
                  </div>
                )}
              </div>

              {!result && !error && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                  <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                    <span className="text-zinc-400 text-lg">⌕</span>
                  </div>
                  <div className="text-sm text-zinc-500">
                    Submit a ticket to see the triage decision.
                  </div>
                </div>
              )}

              {error && (
                <div className="flex-1 flex items-center">
                  <div className="w-full rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-200">
                    {error}
                  </div>
                </div>
              )}

              {result && (
                <div className="flex-1 space-y-4 mt-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
                      {CASE_TYPE_LABELS[result.case_type] || result.case_type}
                    </Badge>
                    <Badge className={severityClass}>{result.severity}</Badge>
                    <Badge className={departmentClass}>
                      {result.department}
                    </Badge>
                    {result.human_review_required && (
                      <Badge className="bg-red-600 text-white">
                        ⚑ Human review
                      </Badge>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5">
                      Agent summary
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {result.agent_summary}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5">
                      <span>Confidence</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-mono">
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-500"
                        style={{ width: `${confidencePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">What it detects</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Five case types, routed to the team best equipped to handle them.
              Phishing is always flagged for human review.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {CAPABILITIES.map((c) => (
              <div
                key={c.key}
                className={`relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 ring-1 ring-inset ${ACCENT_RING[c.accent]} hover:shadow-sm transition-shadow`}
              >
                <div className={`text-lg ${ACCENT_TEXT[c.accent]}`}>●</div>
                <div className="mt-2 font-medium text-sm">{c.name}</div>
                <div className="mt-1 text-xs text-zinc-500 leading-relaxed">
                  {c.description}
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] uppercase tracking-wide text-zinc-500">
                  → {c.route}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <div>
            QueueStorm Triage · SUST CSE Carnival 2026 · Mock preliminary
          </div>
          <div className="flex items-center gap-4">
            <span>Rules-based classifier</span>
            <span>·</span>
            <span>No LLM</span>
            <span>·</span>
            <span>No secrets required</span>
          </div>
        </div>
      </footer>
    </div>
  );
}