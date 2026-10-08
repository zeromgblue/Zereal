"use client";

import { SendHorizontal, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { addComment, removeComment, subscribeComments } from "@/lib/db";
import type { Comment, Post } from "@/lib/types";
import { softSpring, timeAgo } from "@/lib/ui";
import Avatar from "./Avatar";
import Sheet from "./Sheet";
import { useApp } from "./ctx";

function Comments({ post }: { post: Post }) {
  const { me, users, toast } = useApp();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeComments(post.id, setComments), [post.id]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments?.length]);

  const send = () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    addComment(post.id, me.uid, value.slice(0, 300)).catch(() => toast("ส่งคอมเมนต์ไม่สำเร็จ"));
  };

  return (
    <>
      <div ref={listRef} className="no-scrollbar min-h-[34dvh] flex-1 space-y-4 overflow-y-auto px-5 pb-3">
        {comments?.length === 0 && (
          <p className="pt-12 text-center text-sm text-mute">ยังไม่มีคอมเมนต์ เริ่มคุยเป็นคนแรกเลย</p>
        )}
        <AnimatePresence initial={false}>
          {comments?.map((c) => {
            const author = users.get(c.uid);
            const canDelete = c.uid === me.uid || post.uid === me.uid;
            return (
              <motion.div
                key={c.id}
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={softSpring}
                className="flex gap-3"
              >
                <Avatar user={author} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-mute">
                    <span className="mr-1.5 text-[13px] font-normal text-ink">{author?.name || "เพื่อน"}</span>
                    {timeAgo(c.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-snug text-ink/90">{c.text}</p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    aria-label="ลบคอมเมนต์"
                    onClick={() => removeComment(post.id, c.id).catch(() => toast("ลบไม่สำเร็จ"))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mute/70 active:bg-white/5"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex shrink-0 items-center gap-2 border-t border-line px-4 pt-3"
      >
        <Avatar user={me} size={32} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="เขียนคอมเมนต์..."
          className="h-11 min-w-0 flex-1 rounded-full bg-raise px-4 text-ink placeholder:text-mute"
        />
        <motion.button
          type="submit"
          aria-label="ส่ง"
          whileTap={{ scale: 0.88 }}
          disabled={!text.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky text-bg transition-opacity disabled:opacity-35"
        >
          <SendHorizontal size={19} strokeWidth={2} />
        </motion.button>
      </form>
    </>
  );
}

export default function CommentsSheet({ post, onClose }: { post: Post | null; onClose: () => void }) {
  // keep the last post around so the sheet can animate out with its content
  const [shown, setShown] = useState<Post | null>(post);
  useEffect(() => {
    if (post) setShown(post);
  }, [post]);

  return (
    <Sheet open={post !== null} onClose={onClose} title="คอมเมนต์">
      {shown && <Comments post={shown} />}
    </Sheet>
  );
}
