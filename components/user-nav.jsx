"use client";

/**
 * UserNav — stub. The warmup triage service has no signed-in dashboard.
 * Only included so the pre-existing template dashboard layout still compiles.
 */
export function UserNav({ user }) {
  return (
    <div className="text-sm text-gray-500">
      {user?.name ? `Signed in as ${user.name}` : "Not signed in"}
    </div>
  );
}