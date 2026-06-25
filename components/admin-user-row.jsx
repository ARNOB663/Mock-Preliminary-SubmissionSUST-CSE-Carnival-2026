"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminUserRow({ user }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleBan() {
    setBusy(true);
    try {
      await fetch(`/api/admin/users/${user._id}/ban`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ banned: !user.banned }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="px-4 py-2 font-medium">{user.name || "—"}</td>
      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{user.email}</td>
      <td className="px-4 py-2">
        <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs">
          {user.role}
        </span>
      </td>
      <td className="px-4 py-2">
        {user.banned ? (
          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 px-2 py-0.5 text-xs">
            Banned
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 text-xs">
            Active
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-zinc-500">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-2 text-right">
        <button
          onClick={toggleBan}
          disabled={busy || user.role === "admin"}
          className="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
        >
          {user.banned ? "Unban" : "Ban"}
        </button>
      </td>
    </tr>
  );
}