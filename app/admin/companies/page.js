import { connectDB } from "@/lib/mongodb";
import Company from "@/lib/models/Company";
import AdminCompanyRow from "@/components/admin-company-row";

export const metadata = { title: "Admin companies — TechHire" };
export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage({ searchParams }) {
  await connectDB();
  const v = searchParams?.verified;

  const filter = {};
  if (v === "true") filter.verified = true;
  if (v === "false") filter.verified = false;

  const items = await Company.find(filter)
    .sort({ verified: -1, createdAt: -1 })
    .populate("ownerId", "name email")
    .limit(200)
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Verification queue</p>
      </div>

      <nav className="flex items-center gap-1 text-sm">
        <a
          href="/admin/companies"
          className={`px-3 py-1.5 rounded-md ${
            !v ? "bg-zinc-100 dark:bg-zinc-800 font-medium" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          All
        </a>
        <a
          href="/admin/companies?verified=false"
          className={`px-3 py-1.5 rounded-md ${
            v === "false" ? "bg-zinc-100 dark:bg-zinc-800 font-medium" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          Pending verification
        </a>
        <a
          href="/admin/companies?verified=true"
          className={`px-3 py-1.5 rounded-md ${
            v === "true" ? "bg-zinc-100 dark:bg-zinc-800 font-medium" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          Verified
        </a>
      </nav>

      {items.length === 0 ? (
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-500">
          No companies.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <AdminCompanyRow key={c._id} company={JSON.parse(JSON.stringify(c))} />
          ))}
        </ul>
      )}
    </div>
  );
}