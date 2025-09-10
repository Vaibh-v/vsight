// pages/connections.tsx
import { useSession, signIn, signOut } from "next-auth/react";

export default function Connections() {
  const { status, data } = useSession();
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Connections</h1>

      {status === "authenticated" ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Signed in as <b>{data?.user?.email || data?.user?.name}</b>.
          </p>
          <div className="flex gap-2">
            <button onClick={() => signOut({ callbackUrl: "/" })} className="px-3 py-2 border rounded">
              Sign out
            </button>
          </div>
          <p className="text-sm text-gray-600">
            You can now open <b>Dashboard</b> or <b>Organic Tracker</b>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">You are not signed in.</p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/connections" })}
            className="px-3 py-2 border rounded"
          >
            Sign in with Google
          </button>
        </div>
      )}
    </main>
  );
}
