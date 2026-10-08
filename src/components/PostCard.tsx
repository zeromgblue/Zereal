"use client";

import { Download, Globe, Heart, Lock, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { deletePost, setLike, setVisibility } from "@/lib/db";
import { composeShare, saveBlob } from "@/lib/image";
import type { Media, Post } from "@/lib/types";
import { spring, timeAgo } from "@/lib/ui";
import Avatar from "./Avatar";
import DualPhoto from "./DualPhoto";
import { useApp } from "./ctx";

export default function PostCard({ post }: { post: Post }) {
  const { me, users, openUser, openComments, toast } = useApp();
  const author = users.get(post.uid);
  const mine = post.uid === me.uid;
  const liked = post.likes.includes(me.uid);
  const media = useRef<Media | null>(null);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const like = (next: boolean) => {
    if (next === liked) return;
    setLike(post.id, me.uid, next).catch(() => toast("กดใจไม่สำเร็จ ลองใหม่อีกครั้ง"));
  };

  const save = async () => {
    if (!media.current || saving) return;
    setSaving(true);
    try {
      const blob = await composeShare(media.current.main, media.current.inset);
      await saveBlob(blob, `zereal-${post.id}.jpg`);
      toast("บันทึกรูปแล้ว");
    } catch {
      toast("บันทึกรูปไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const closeMenu = () => {
    setMenu(false);
    setConfirmDelete(false);
  };

  return (
    <article className="px-4">
      <header className="mb-2.5 flex items-center gap-2.5 px-1">
        <button type="button" onClick={() => openUser(post.uid)} className="flex min-w-0 items-center gap-2.5">
          <Avatar user={author} size={36} />
          <div className="min-w-0 text-left">
            <p className="truncate text-[15px] font-normal leading-tight text-ink">
              {author?.name || "เพื่อน"}
            </p>
            <p className="flex items-center gap-1 text-xs text-mute">
              {timeAgo(post.createdAt)}
              {post.visibility === "private" && <Lock size={11} strokeWidth={2} />}
            </p>
          </div>
        </button>
        {mine && (
          <div className="relative ml-auto">
            <button
              type="button"
              aria-label="ตัวเลือก"
              onClick={() => (menu ? closeMenu() : setMenu(true))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-mute active:bg-white/5"
            >
              <MoreHorizontal size={20} />
            </button>
            <AnimatePresence>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={closeMenu} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={spring}
                    className="absolute right-0 top-10 z-20 w-52 origin-top-right overflow-hidden rounded-2xl border border-line bg-raise p-1.5 shadow-xl shadow-black/40"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const next = post.visibility === "public" ? "private" : "public";
                        setVisibility(post.id, next).catch(() => toast("เปลี่ยนไม่สำเร็จ"));
                        toast(next === "private" ? "ตั้งเป็นส่วนตัวแล้ว" : "ตั้งเป็นสาธารณะแล้ว");
                        closeMenu();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink active:bg-white/5"
                    >
                      {post.visibility === "public" ? <Lock size={17} /> : <Globe size={17} />}
                      {post.visibility === "public" ? "ตั้งเป็นส่วนตัว" : "ตั้งเป็นสาธารณะ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirmDelete) return setConfirmDelete(true);
                        deletePost(post.id).catch(() => toast("ลบไม่สำเร็จ"));
                        toast("ลบโพสต์แล้ว");
                        closeMenu();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-blush active:bg-white/5"
                    >
                      <Trash2 size={17} />
                      {confirmDelete ? "แตะอีกครั้งเพื่อยืนยัน" : "ลบโพสต์"}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      <DualPhoto post={post} onDoubleTap={() => like(true)} onMedia={(m) => (media.current = m)} />

      <div className="mt-2 flex items-center gap-1 px-1">
        <motion.button
          type="button"
          aria-label="ถูกใจ"
          onClick={() => like(!liked)}
          whileTap={{ scale: 0.82 }}
          transition={spring}
          className="flex h-10 items-center gap-1.5 rounded-full pl-1 pr-3"
        >
          <motion.span
            key={liked ? "on" : "off"}
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 16 }}
          >
            <Heart size={23} className={liked ? "fill-blush text-blush" : "text-ink"} strokeWidth={1.8} />
          </motion.span>
          <span className="text-sm tabular-nums text-mute">{post.likes.length || ""}</span>
        </motion.button>
        <motion.button
          type="button"
          aria-label="คอมเมนต์"
          onClick={() => openComments(post)}
          whileTap={{ scale: 0.88 }}
          transition={spring}
          className="flex h-10 items-center gap-1.5 rounded-full pl-1 pr-3"
        >
          <MessageCircle size={22} className="text-ink" strokeWidth={1.8} />
          <span className="text-sm tabular-nums text-mute">{post.commentCount || ""}</span>
        </motion.button>
        <motion.button
          type="button"
          aria-label="บันทึกรูป"
          onClick={save}
          whileTap={{ scale: 0.88 }}
          transition={spring}
          className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full ${saving ? "opacity-40" : ""}`}
        >
          <Download size={21} className="text-ink" strokeWidth={1.8} />
        </motion.button>
      </div>

      {post.caption && (
        <p className="mt-0.5 whitespace-pre-wrap break-words px-2 text-[15px] leading-relaxed text-ink/90">
          {post.caption}
        </p>
      )}
    </article>
  );
}
