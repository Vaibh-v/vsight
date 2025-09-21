import Link from "next/link";
import Connect from "@/components/Connect";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">VSight</h1>
      <p className="text-gray-700">
        Connect Google Analytics 4 and Google Search Console to generate insights and track organic performance.
      </p>
      <Connect />
      <div className="space-x-3">
        <Link className="underline" href="/privacy">Privacy</Link>
        <Link className="underline" href="/terms">Terms</Link>
      </div>
    </main>
  );
}
