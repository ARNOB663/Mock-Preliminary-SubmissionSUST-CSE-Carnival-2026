import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import Company from "@/lib/models/Company";

export const metadata = { title: "Companies — TechHire" };
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  let items = [];
  try {
    await connectDB();
    items = await Company.find({})
      .sort({ verified: -1, createdAt: -1 })
      .limit(100)
      .lean();
  } catch {}

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">TechHire</Link>
          <Link href="/jobs" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">
            Browse jobs →
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Companies hiring</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Verified employers with active roles on TechHire.
        </p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center text-zinc-500">
            No companies listed yet.
          </div>
        ) : (
          <ul className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => (
              <li key={c._id}>
                <Link
                  href={`/companies/${c.slug}`}
                  className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.verified && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        Verified
                      </span>
                    )}
                  </div>
                  {c.industry && <div className="text-sm text-zinc-500 mt-1">{c.industry}</div>}
                  {c.location && <div className="text-xs text-zinc-400 mt-1">{c.location} · {c.size}</div>}
                  {c.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 line-clamp-3">{c.description}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}