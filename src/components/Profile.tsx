"use client";

import { ArrowLeft, Lock, Pencil, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { saveProfile, subscribeUserPosts } from "@/lib/db";
import type { Post } from "@/lib/types";
import { softSpring, spring, useBackLayer } from "@/lib/ui";
import Avatar from "./Avatar";
import PostCard from "./PostCard";
import ProfileForm from "./ProfileForm";
import Sheet from "./Sheet";
import { useApp } from "./ctx";

export default function Profile({ uid, onBack }: { uid: string; onBack?: () => void }) {
  const { me, users, toast } = useApp();
  const isMe = uid === me.uid;
  const user = isMe ? me : users.get(uid);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(
    () => subscribeUserPosts(uid, isMe, setPosts, () => setPosts([])),
    [uid, isMe]
  );

  // follows the live list, so the viewer closes by itself if the post is deleted
  const openPost = posts?.find((p) => p.id === openId) ?? null;
  useBackLayer(openPost !== null, () => setOpenId(null));

  const likes = posts?.reduce((sum, p) => sum + p.likes.length, 0) ?? 0;

  return (
    <div className="pb-8">
      {onBack && (
        <div className="pt-safe sticky top-0 z-10 flex items-center bg-bg/95 px-3 pb-2">
          <button
            type="button"
            aria-label="กลับ"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink active:bg-white/5"
          >
            <ArrowLeft size={21} />
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={softSpring}
        className="flex flex-col items-center px-6 pt-4 text-center"
      >
        <Avatar user={user} size={92} />
        <h1 className="mt-4 text-xl font-normal text-ink">{user?.name || "เพื่อน"}</h1>
        {user?.bio && <p className="mt-1 max-w-[18rem] text-sm text-mute">{user.bio}</p>}

        <div className="mt-5 flex items-center gap-8">
          <div>
            <p className="text-lg font-normal tabular-nums text-ink">{posts?.length ?? 0}</p>
            <p className="text-xs text-mute">โพสต์</p>
          </div>
          <div className="h-7 w-px bg-line" />
          <div>
            <p className="text-lg font-normal tabular-nums text-ink">{likes}</p>
            <p className="text-xs text-mute">ใจที่ได้รับ</p>
          </div>
        </div>

        {isMe && (
          <motion.button
            type="button"
            onClick={() => setEditing(true)}
            whileTap={{ scale: 0.96 }}
            className="mt-5 flex items-center gap-2 rounded-full border border-line bg-card px-5 py-2.5 text-sm text-ink"
          >
            <Pencil size={15} />
            แก้ไขโปรไฟล์
          </motion.button>
        )}
      </motion.div>

      <div className="mt-7 grid grid-cols-3 gap-1.5 px-4">
        {posts === null &&
          [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />)}
        {posts?.map((post, i) => (
          <motion.button
            key={post.id}
            type="button"
            onClick={() => setOpenId(post.id)}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ ...softSpring, delay: Math.min(i, 9) * 0.025 }}
            className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-card"
          >
            {post.thumb && <img src={post.thumb} alt="" className="h-full w-full object-cover" />}
            {post.visibility === "private" && (
              <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-bg/75 text-ink">
                <Lock size={12} strokeWidth={2.2} />
              </span>
            )}
          </motion.button>
        ))}
      </div>
      {posts?.length === 0 && (
        <p className="px-8 pt-10 text-center text-sm text-mute">
          {isMe ? "ยังไม่มีรูป กดปุ่มกล้องด้านล่างเพื่อถ่ายรูปแรก" : "ยังไม่มีรูปที่แชร์"}
        </p>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {openPost && (
              <motion.div
                className="fixed inset-0 z-[45] mx-auto max-w-md overflow-y-auto bg-bg"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={spring}
              >
                <div className="pt-safe flex justify-end px-3 pb-2">
                  <button
                    type="button"
                    aria-label="ปิด"
                    onClick={() => setOpenId(null)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-ink"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="pb-10">
                  <PostCard post={openPost} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {isMe && (
        <Sheet open={editing} onClose={() => setEditing(false)} title="แก้ไขโปรไฟล์">
          <div className="px-6 pb-4 pt-2">
            <ProfileForm
              uid={me.uid}
              initial={me}
              showBio
              submitLabel="บันทึก"
              onSubmit={async (values) => {
                await saveProfile(me.uid, values);
                setEditing(false);
                toast("บันทึกโปรไฟล์แล้ว");
              }}
            />
          </div>
        </Sheet>
      )}
    </div>
  );
}
