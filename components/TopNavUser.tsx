import { useSession, signIn, signOut } from "next-auth/react";

export default function TopNavUser() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) {
    return <span className="text-sm text-gray-500">…</span>;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
        aria-label="Sign in with Google"
      >
        Sign in
      </button>
    );
  }

  const email = session.user?.email || "Signed in";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">{email}</span>
      <button
        onClick={() => signOut()}
        className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
        aria-label="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}
