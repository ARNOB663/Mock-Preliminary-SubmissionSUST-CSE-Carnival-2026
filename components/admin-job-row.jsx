"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminJobRow({ job }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [err, setErr] = useState(null);

  async function call(path, body) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      router.refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={`/jobs/${job.slug}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium hover:underline truncate block"
          >
            {job.title}
          </a>
          <div className="text-sm text-zinc-500 mt-0.5 truncate">
            {job.companyId?.name || "—"}
            {" · "}
            <a href={`mailto:${job.employerId?.email}`} className="hover:underline">
              {job.employerId?.email}
            </a>
            {" · "}
            {job.jobType.replace("_", " ")}
            {job.location ? ` · ${job.location}` : ""}
          </div>
          {job.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.skills.slice(0, 6).map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {job.rejectionReason && (
            <div className="mt-2 text-xs rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-2 text-red-800 dark:text-red-200">
              Reason: {job.rejectionReason}
            </div>
          )}
          {err && (
            <div className="mt-2 text-xs rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-2 text-red-800 dark:text-red-200">
              {err}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {job.status === "pending_review" && (
            <>
              <button
                onClick={() => call(`/api/admin/jobs/${job._id}/approve`)}
                disabled={busy}
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => setShowReject((v) => !v)}
                disabled={busy}
                className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                {showReject ? "Cancel" : "Reject"}
              </button>
            </>
          )}
        </div>
      </div>

      {showReject && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (5-500 chars)"
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm"
            maxLength={500}
          />
          <button
            onClick={() => call(`/api/admin/jobs/${job._id}/reject`, { reason })}
            disabled={busy || reason.length < 5}
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
          >
            Send rejection
          </button>
        </div>
      )}
    </li>
  );
}