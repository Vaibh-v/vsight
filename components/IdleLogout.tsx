import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function IdleLogout({ minutes = 60 }: { minutes?: number }) {
  useEffect(() => {
    const ms = minutes * 60 * 1000;
    let timer: any;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => signOut({ callbackUrl: "/" }), ms);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes]);

  return null;
}
