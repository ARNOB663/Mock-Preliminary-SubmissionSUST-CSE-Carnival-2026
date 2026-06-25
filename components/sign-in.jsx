"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function SignInForm() {
  const [mode, setMode] = useState("password"); // "password" | "magic-link"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("Failed to start Google sign-in.");
      setLoading(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    if (res?.ok) {
      window.location.href = res.url || "/dashboard";
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      if (res?.error) {
        setError(res.error);
      } else {
        setEmailSent(true);
      }
    } catch {
      setError("Failed to send magic link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Welcome back. Use Google, email + password, or get a magic link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button
          onClick={handleGoogle}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          <span className="font-semibold">G</span>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">or</span>
          </div>
        </div>

        {mode === "password" ? (
          <form onSubmit={handlePassword} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setMode("magic-link")}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
                >
                  Use magic link instead
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        ) : emailSent ? (
          <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-3 text-sm text-green-800 dark:text-green-200">
            Check your inbox. We sent a magic link to <strong>{email}</strong>.
            <button
              type="button"
              onClick={() => { setMode("password"); setEmailSent(false); }}
              className="block mt-2 text-xs underline"
            >
              Back to password
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email">Email</Label>
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
                >
                  Use password instead
                </button>
              </div>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email}>
              Send magic link
            </Button>
          </form>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}