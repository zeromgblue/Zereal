"use client";

import { Download, Globe, Lock, RotateCcw, SendHorizontal, SwitchCamera, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPost } from "@/lib/db";
import { canvasToJpeg, composeShare, coverCanvas, makeThumb, saveBlob } from "@/lib/image";
import type { Visibility } from "@/lib/types";
import { softSpring, spring } from "@/lib/ui";
import { useApp } from "./ctx";

type Facing = "environment" | "user";
type Phase = "live" | "second" | "preview";

interface Side {
  blob: Blob;
  url: string;
  thumb: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Camera({ onClose, onSent }: { onClose: () => void; onSent: (visibility: Visibility) => void }) {
  const { me, toast } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const seq = useRef(0);
  const sent = useRef(false);

  const [facing, setFacing] = useState<Facing>("environment");
  const [liveFacing, setLiveFacing] = useState<Facing>("environment");
  const [phase, setPhase] = useState<Phase>("live");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [frozen, setFrozen] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [sides, setSides] = useState<[Side, Side] | null>(null);
  const [swapped, setSwapped] = useState(false);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [saving, setSaving] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (f: Facing) => {
      const id = ++seq.current;
      stop();
      setReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: f }, width: { ideal: 1920 }, height: { ideal: 1440 } },
      });
      const video = videoRef.current;
      if (id !== seq.current || !video) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("superseded");
      }
      streamRef.current = stream;
      setLiveFacing(f);
      video.srcObject = stream;
      await video.play();
      if (id !== seq.current) throw new Error("superseded");
      setReady(true);
    },
    [stop]
  );

  useEffect(() => {
    if (phase !== "live") return;
    start(facing).catch((e: Error) => {
      if (e.message !== "superseded") setError(true);
    });
  }, [phase, facing, start]);

  useEffect(
    () => () => {
      seq.current++;
      stop();
    },
    [stop]
  );

  // photos that were never sent don't need to stay in memory
  const sidesRef = useRef(sides);
  useEffect(() => {
    sidesRef.current = sides;
  }, [sides]);
  useEffect(
    () => () => {
      if (!sent.current) sidesRef.current?.forEach((s) => URL.revokeObjectURL(s.url));
    },
    []
  );

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !ready || phase !== "live") return;
    const first = coverCanvas(video, 1080, 1440, liveFacing === "user");
    setFlash((n) => n + 1);
    setFrozen(first.toDataURL("image/jpeg", 0.7));
    setPhase("second");

    const other: Facing = facing === "environment" ? "user" : "environment";
    let second: HTMLCanvasElement;
    try {
      await start(other);
      await wait(900); // let the second camera settle its exposure
      second = coverCanvas(video, 720, 960, other === "user");
    } catch (e) {
      if ((e as Error).message === "superseded") return;
      second = coverCanvas(first, 720, 960);
    }
    setFlash((n) => n + 1);
    seq.current++;
    stop();

    const [a, b] = await Promise.all([canvasToJpeg(first, 600_000), canvasToJpeg(second, 300_000)]);
    setSides([
      { blob: a, url: URL.createObjectURL(a), thumb: makeThumb(first) },
      { blob: b, url: URL.createObjectURL(b), thumb: makeThumb(second) },
    ]);
    setSwapped(false);
    setPhase("preview");
  };

  const retake = () => {
    sides?.forEach((s) => URL.revokeObjectURL(s.url));
    setSides(null);
    setFrozen(null);
    setError(false);
    setPhase("live");
  };

  const main = sides?.[swapped ? 1 : 0];
  const inset = sides?.[swapped ? 0 : 1];

  const send = () => {
    if (!main || !inset || sent.current) return;
    sent.current = true;
    createPost({
      uid: me.uid,
      caption: caption.trim().slice(0, 150),
      visibility,
      main: main.blob,
      inset: inset.blob,
      thumb: main.thumb,
      urls: { main: main.url, inset: inset.url },
    }).catch(() => toast("ส่งรูปไม่สำเร็จ ลองใหม่อีกครั้ง"));
    toast(visibility === "private" ? "โพสต์แบบส่วนตัวแล้ว" : "โพสต์แล้ว");
    onSent(visibility);
  };

  const save = async () => {
    if (!main || !inset || saving) return;
    setSaving(true);
    try {
      await saveBlob(await composeShare(main.url, inset.url), `zereal-${Date.now()}.jpg`);
      toast("บันทึกรูปแล้ว");
    } catch {
      toast("บันทึกรูปไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-bg"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={spring}
    >
      <div className="pt-safe flex shrink-0 items-center justify-between px-4 pb-2">
        <button
          type="button"
          aria-label="ปิด"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-ink"
        >
          <X size={20} />
        </button>
        <img src="/logo-small.png" alt="Zereal" className="h-7" />
        {phase === "preview" ? (
          <button
            type="button"
            onClick={retake}
            className="flex h-10 items-center gap-1.5 rounded-full bg-white/5 px-3.5 text-sm text-ink"
          >
            <RotateCcw size={16} />
            ถ่ายใหม่
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <div
          // sized from the viewport height so the 3:4 frame and the controls always fit together
          style={{ width: "min(100%, calc((100dvh - 300px) * 0.75))" }}
          className="relative aspect-[3/4] overflow-hidden rounded-[28px] bg-card"
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              phase === "live" && ready ? "opacity-100" : "opacity-0"
            } ${liveFacing === "user" ? "-scale-x-100" : ""}`}
          />

          {phase === "second" && frozen && (
            <>
              <img src={frozen} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-x-0 bottom-6 flex justify-center"
              >
                <span className="rounded-full bg-bg/80 px-4 py-2 text-sm text-ink">กำลังถ่ายอีกด้าน อย่าเพิ่งขยับนะ</span>
              </motion.div>
            </>
          )}

          {phase === "preview" && main && inset && (
            <>
              <AnimatePresence initial={false}>
                <motion.img
                  key={main.url}
                  src={main.url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>
              <motion.button
                type="button"
                aria-label="สลับรูป"
                onClick={() => setSwapped((s) => !s)}
                whileTap={{ scale: 0.94 }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={softSpring}
                className="absolute left-3 top-3 aspect-[3/4] w-[29%] overflow-hidden rounded-[18px] border-2 border-bg shadow-lg shadow-black/30"
              >
                <img key={inset.url} src={inset.url} alt="" className="h-full w-full object-cover" />
              </motion.button>
              <img
                src="/logo-small.png"
                alt=""
                className="logo-shadow pointer-events-none absolute bottom-3 left-1/2 w-[92px] -translate-x-1/2 opacity-90"
              />
            </>
          )}

          {phase === "live" && !ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-sky" />
            </div>
          )}

          {error && phase === "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-[15px] text-ink">เปิดกล้องไม่ได้</p>
              <p className="text-sm text-mute">อนุญาตให้เว็บนี้ใช้กล้องในการตั้งค่าเบราว์เซอร์ แล้วลองใหม่อีกครั้ง</p>
              <button
                type="button"
                onClick={() => {
                  setError(false);
                  start(facing).catch((e: Error) => e.message !== "superseded" && setError(true));
                }}
                className="mt-1 rounded-full bg-sky px-5 py-2.5 text-sm text-bg"
              >
                ลองใหม่
              </button>
            </div>
          )}

          <AnimatePresence>
            {flash > 0 && (
              <motion.div
                key={flash}
                className="pointer-events-none absolute inset-0 bg-white"
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                onAnimationComplete={() => setFlash(0)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="pb-safe shrink-0 px-4 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "preview" ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={softSpring}
              className="space-y-3"
            >
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={150}
                placeholder="เขียนแคปชั่น..."
                className="h-12 w-full rounded-2xl bg-card px-4 text-ink placeholder:text-mute"
              />
              <div className="relative flex rounded-2xl bg-card p-1">
                {(
                  [
                    ["public", "สาธารณะ", Globe],
                    ["private", "ส่วนตัว", Lock],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVisibility(value)}
                    className={`relative flex h-10 flex-1 items-center justify-center gap-2 text-sm transition-colors ${
                      visibility === value ? "text-bg" : "text-mute"
                    }`}
                  >
                    {visibility === value && (
                      <motion.span layoutId="visibility-pill" transition={spring} className="absolute inset-0 rounded-xl bg-sky" />
                    )}
                    <Icon size={16} className="relative" strokeWidth={2} />
                    <span className="relative font-normal">{label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <motion.button
                  type="button"
                  aria-label="บันทึกรูป"
                  onClick={save}
                  whileTap={{ scale: 0.92 }}
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-card text-ink ${saving ? "opacity-40" : ""}`}
                >
                  <Download size={21} />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={send}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-sky text-[17px] font-medium tracking-[0.18em] text-bg"
                >
                  SEND
                  <SendHorizontal size={19} strokeWidth={2.2} />
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="live"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-[104px] items-center justify-center gap-10"
            >
              <div className="w-12" />
              <motion.button
                type="button"
                aria-label="ถ่ายรูป"
                onClick={shoot}
                disabled={!ready || phase !== "live"}
                whileTap={{ scale: 0.9 }}
                transition={spring}
                className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-ink/90 disabled:opacity-40"
              >
                <span className="h-[60px] w-[60px] rounded-full bg-ink" />
              </motion.button>
              <motion.button
                type="button"
                aria-label="สลับกล้อง"
                onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                disabled={phase !== "live"}
                whileTap={{ scale: 0.88, rotate: 180 }}
                transition={spring}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-ink disabled:opacity-40"
              >
                <SwitchCamera size={21} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
