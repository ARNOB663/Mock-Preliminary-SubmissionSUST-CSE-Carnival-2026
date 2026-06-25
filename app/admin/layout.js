import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin");
  }
  if (session.user.role !== "admin") {
    redirect("/dashboard?error=forbidden");
  }

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold tracking-tight">
              TechHire Admin
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <AdminLink href="/admin">Overview</AdminLink>
              <AdminLink href="/admin/jobs">Jobs</AdminLink>
              <AdminLink href="/admin/users">Users</AdminLink>
              <AdminLink href="/admin/companies">Companies</AdminLink>
            </nav>
          </div>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.user.email}
          </span>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

function AdminLink({ href, children }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      {children}
    </Link>
  );
}