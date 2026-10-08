"use client";

import { Camera } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { subscribeFeed } from "@/lib/db";
import type { Post } from "@/lib/types";
import { softSpring } from "@/lib/ui";
import PostCard from "./PostCard";

const PAGE = 8;

export default function Feed({ onShoot }: { onShoot: () => void }) {
  const [count, setCount] = useState(PAGE);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeFeed(
        count,
        (p) => {
          setPosts(p);
          setFailed(false);
        },
        () => setFailed(true)
      ),
    [count]
  );

  const hasMore = posts !== null && posts.length >= count;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setCount((c) => c + PAGE);
      },
      { rootMargin: "500px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, count]);

  if (failed && !posts) {
    return <p className="px-8 pt-24 text-center text-sm text-mute">โหลดฟีดไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วเปิดใหม่อีกครั้ง</p>;
  }

  if (!posts) {
    return (
      <div className="space-y-7 px-4">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="mb-2.5 flex items-center gap-2.5 px-1">
              <div className="skeleton h-9 w-9 rounded-full" />
              <div className="skeleton h-3.5 w-24 rounded-full" />
            </div>
            <div className="skeleton aspect-[3/4] w-full rounded-[26px]" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={softSpring}
        className="flex flex-col items-center px-8 pt-24 text-center"
      >
        <img src="/logo-small.png" alt="" className="floaty w-44 opacity-90" />
        <p className="mt-8 text-lg font-normal text-ink">ยังไม่มีรูปเลย</p>
        <p className="mt-1 text-sm text-mute">มาเป็นคนแรกที่แชร์ช่วงเวลาของวันนี้กัน</p>
        <motion.button
          type="button"
          onClick={onShoot}
          whileTap={{ scale: 0.95 }}
          className="mt-7 flex items-center gap-2 rounded-full bg-sky px-6 py-3 text-[15px] font-normal text-bg"
        >
          <Camera size={18} strokeWidth={2} />
          ถ่ายรูปแรก
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-7">
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          layout="position"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...softSpring, delay: i < 3 ? i * 0.05 : 0 }}
        >
          <PostCard post={post} />
        </motion.div>
      ))}
      <div ref={sentinel} className="h-4" />
    </div>
  );
}
