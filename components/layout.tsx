import React from "react";
import RightRailAI from "./RightRailAI";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <main className="pr-0 xl:pr-[380px]">{children}</main>
      <RightRailAI />
      <footer className="mt-16 border-t py-6 text-center text-xs text-neutral-500">
        <a href="/terms" className="hover:underline">Terms</a> · <a href="/privacy" className="hover:underline">Privacy</a>
      </footer>
    </div>
  );
}
