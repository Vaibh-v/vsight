import { useSession, signIn } from "next-auth/react";
import LocationsCard from "@/components/GBP/LocationsCard";

export default function GBPPage() {
  const { status } = useSession();
  if (status !== "authenticated") {
    return (
      <div className="p-6">
        <div className="mb-3">Sign in to view GBP locations.</div>
        <button className="px-3 py-2 rounded bg-black text-white" onClick={() => signIn("google")}>Sign in</button>
      </div>
    );
  }
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Google Business Profile</h1>
      <LocationsCard />
    </div>
  );
}
