import { useSession, signIn, signOut } from "next-auth/react";

export default function TopNavUser() {
  const { data: session, status } = useSession();
  if (status === "loading") return <div className="text-sm text-gray-500">…</div>;
  if (!session)
    return (
      <button
        onClick={() => signIn("google")}
        className="text-sm border rounded px-3 py-1 hover:bg-gray-50"
      >
        Sign in
      </button>
    );
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700">{session.user?.email}</span>
      <button onClick={() => signOut()} className="text-sm border rounded px-3 py-1 hover:bg-gray-50">
        Sign out
      </button>
    </div>
  );
}
