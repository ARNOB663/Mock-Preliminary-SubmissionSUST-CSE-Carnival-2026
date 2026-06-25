import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import AdminUserRow from "@/components/admin-user-row";

export const metadata = { title: "Admin users — TechHire" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }) {
  await connectDB();
  const role = searchParams?.role;
  const banned = searchParams?.banned;
  const q = searchParams?.q;

  const filter = {};
  if (role && ["job_seeker", "employer", "admin"].includes(role)) filter.role = role;
  if (banned === "true") filter.banned = true;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  const items = await User.find(filter)
    .sort({ createdAt: -1 })
    .select("name email role avatar banned createdAt lastActive")
    .limit(100)
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Manage accounts and ban status</p>
      </div>

      <form className="flex flex-wrap items-center gap-2 text-sm">
        <input
          type="text"
          name="q"
          defaultValue={q || ""}
          placeholder="Name or email"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5"
        />
        <select
          name="role"
          defaultValue={role || ""}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5"
        >
          <option value="">All roles</option>
          <option value="job_seeker">Job seeker</option>
          <option value="employer">Employer</option>
          <option value="admin">Admin</option>
        </select>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="banned" value="true" defaultChecked={banned === "true"} />
          Banned only
        </label>
        <button className="rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-3 py-1.5">
          Filter
        </button>
      </form>

      {items.length === 0 ? (
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-500">
          No users match.
        </div>
      ) : (
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Joined</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <AdminUserRow key={u._id} user={JSON.parse(JSON.stringify(u))} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}