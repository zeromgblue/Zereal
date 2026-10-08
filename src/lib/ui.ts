import { useEffect, useRef } from "react";

export const spring = { type: "spring", stiffness: 380, damping: 34 } as const;
export const softSpring = { type: "spring", stiffness: 260, damping: 28 } as const;

export function timeAgo(ms: number) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 45) return "เมื่อกี้";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)} นาที`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} วัน`;
  return new Date(ms).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

/* Overlays register here so the phone's back button closes the top one
   instead of leaving the app. */
const layers: Array<() => void> = [];
let ignorePops = 0;
let listening = false;

function onPop() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  layers.pop()?.();
}

function syncScrollLock() {
  document.body.style.overflow = layers.length ? "hidden" : "";
}

export function useBackLayer(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    if (!listening) {
      window.addEventListener("popstate", onPop);
      listening = true;
    }
    const entry = () => closeRef.current();
    layers.push(entry);
    history.pushState({ zerealLayer: layers.length }, "");
    syncScrollLock();
    return () => {
      const i = layers.indexOf(entry);
      if (i >= 0) {
        // closed from the UI, so drop the history entry we added
        layers.splice(i, 1);
        ignorePops++;
        history.back();
      }
      syncScrollLock();
    };
  }, [open]);
}
