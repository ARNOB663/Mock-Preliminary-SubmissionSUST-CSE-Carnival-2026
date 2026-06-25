"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminCompanyRow({ company }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setVerified(verified) {
    setBusy(true);
    try {
      await fetch(`/api/companies/${company.slug}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verified, docs: [] }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <a
          href={`/companies/${company.slug}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium hover:underline"
        >
          {company.name}
        </a>
        <div className="text-sm text-zinc-500 mt-0.5">
          {company.industry || "—"} · {company.size} · {company.location || "—"}
        </div>
        <div className="text-sm text-zinc-500 mt-1">
          Owner: {company.ownerId?.name || "—"} ({company.ownerId?.email})
        </div>
        {company.verified && (
          <span className="inline-flex items-center mt-2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 text-xs">
            Verified
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {company.verified ? (
          <button
            onClick={() => setVerified(false)}
            disabled={busy}
            className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Revoke
          </button>
        ) : (
          <button
            onClick={() => setVerified(true)}
            disabled={busy}
            className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            Verify
          </button>
        )}
      </div>
    </li>
  );
}