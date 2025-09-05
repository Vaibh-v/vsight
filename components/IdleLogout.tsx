import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

export default function IdleLogout({ minutes = 30 }: { minutes?: number }) {
  const timer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => signOut(), minutes * 60 * 1000);
    };
    ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((e) =>
      window.addEventListener(e, reset, { passive: true })
    );
    reset();
    return () => {
      ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((e) =>
        window.removeEventListener(e, reset)
      );
      if (timer.current) clearTimeout(timer.current);
    };
  }, [minutes]);
  return null;
}
