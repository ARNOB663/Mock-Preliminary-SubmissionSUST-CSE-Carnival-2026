"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function EmailTestForm() {
  const [form, setForm] = useState({ to: "", subject: "Hello from Hackathon Template", body: "This is a test email sent from the Hackathon Template. 🚀" });
  const [status, setStatus] = useState({ kind: "idle" });

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setStatus({ kind: "success", id: data.id });
    } catch (err) {
      setStatus({ kind: "error", message: err.message });
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              placeholder="recipient@example.com"
              value={form.to}
              onChange={set("to")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={set("subject")}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={form.body}
              onChange={set("body")}
              required
              maxLength={5000}
              rows={6}
            />
          </div>
          <Button type="submit" disabled={status.kind === "loading"}>
            {status.kind === "loading" ? "Sending…" : "Send email"}
          </Button>
        </form>

        {status.kind === "success" && (
          <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-3 text-sm text-green-800 dark:text-green-200">
            Sent! Message ID: <code className="font-mono text-xs">{status.id ?? "(none)"}</code>
          </div>
        )}
        {status.kind === "error" && (
          <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200">
            {status.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}