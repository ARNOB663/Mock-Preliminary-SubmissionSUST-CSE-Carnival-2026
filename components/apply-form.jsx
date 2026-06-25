"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTabSwitchDetector, TabSwitchWarning } from "@/components/tab-switch-detector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ApplyForm({ jobId, jobTitle }) {
  const router = useRouter();
  const detector = useTabSwitchDetector();
  const [coverLetter, setCoverLetter] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    detector.disarm();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId,
          coverLetter,
          expectedSalary: expectedSalary ? parseInt(expectedSalary, 10) : null,
          availableFrom: availableFrom || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to apply");
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/applications"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <div className="text-emerald-600 dark:text-emerald-400 text-lg font-medium">
            Application sent
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            Redirecting you to your applications…
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      onFocus={() => detector.arm()}
      className="space-y-4"
    >
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="block text-sm font-medium mb-1">Cover letter</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              placeholder={`Why are you a good fit for ${jobTitle}?`}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Expected salary (BDT/month, optional)</label>
              <input
                type="number"
                min="0"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
                placeholder="60000"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Available from</label>
              <input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <TabSwitchWarning count={detector.switchCount} lastAt={detector.lastSwitchAt} />

          {error && (
            <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Submit application"}
          </Button>
          <p className="text-xs text-zinc-500 text-center">
            Your profile + resume will be attached automatically.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}