"use client";

import { Heart } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { getMedia } from "@/lib/db";
import type { Media, Post } from "@/lib/types";
import { softSpring } from "@/lib/ui";

/** Main photo with the second camera as a small tappable inset and the logo as credit. */
export default function DualPhoto({
  post,
  onDoubleTap,
  onMedia,
}: {
  post: Post;
  onDoubleTap?: () => void;
  onMedia?: (media: Media) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [media, setMedia] = useState<Media | null>(null);
  const [swapped, setSwapped] = useState(false);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "700px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let alive = true;
    getMedia(post.id)
      .then((m) => {
        if (!alive) return;
        setMedia(m);
        onMedia?.(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, post.id]);

  const main = media ? (swapped ? media.inset : media.main) : null;
  const inset = media ? (swapped ? media.main : media.inset) : null;

  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      setBurst((n) => n + 1);
      onDoubleTap?.();
    } else {
      lastTap.current = now;
    }
  };

  return (
    <div
      ref={boxRef}
      onClick={tap}
      className="relative aspect-[3/4] w-full overflow-hidden rounded-[26px] bg-card"
    >
      {post.thumb && (
        <img src={post.thumb} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover blur-md" />
      )}
      <AnimatePresence initial={false}>
        {main && (
          <motion.img
            key={main}
            src={main}
            alt={post.caption}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
        )}
      </AnimatePresence>

      {inset && (
        <motion.button
          type="button"
          aria-label="สลับรูป"
          onClick={(e) => {
            e.stopPropagation();
            setSwapped((s) => !s);
          }}
          whileTap={{ scale: 0.94 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={softSpring}
          className="absolute left-3 top-3 aspect-[3/4] w-[29%] overflow-hidden rounded-[18px] border-2 border-bg shadow-lg shadow-black/30"
        >
          <AnimatePresence initial={false}>
            <motion.img
              key={inset}
              src={inset}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
        </motion.button>
      )}

      <img
        src="/logo-small.png"
        alt="Zereal"
        className="logo-shadow pointer-events-none absolute bottom-3 left-1/2 w-[92px] -translate-x-1/2 opacity-90"
      />

      <AnimatePresence>
        {burst > 0 && (
          <motion.div
            key={burst}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1.05] }}
            transition={{ duration: 0.8, times: [0, 0.25, 0.7, 1] }}
            onAnimationComplete={() => setBurst(0)}
          >
            <Heart size={92} className="fill-blush text-blush drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
