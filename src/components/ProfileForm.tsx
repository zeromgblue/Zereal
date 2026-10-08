"use client";

import { Camera } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { fileToAvatar } from "@/lib/image";
import type { UserProfile } from "@/lib/types";
import Avatar from "./Avatar";

export interface ProfileValues {
  name: string;
  bio: string;
  photo: string | null;
}

/** Name, bio and avatar fields, shared by first-time setup and profile editing. */
export default function ProfileForm({
  uid,
  initial,
  submitLabel,
  showBio,
  onSubmit,
}: {
  uid: string;
  initial?: UserProfile;
  submitLabel: string;
  showBio: boolean;
  onSubmit: (values: ProfileValues) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const valid = name.trim().length > 0;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setFailed(false);
        try {
          await onSubmit({ name: name.trim().slice(0, 24), bio: bio.trim().slice(0, 80), photo });
        } catch {
          setFailed(true);
        } finally {
          setBusy(false);
        }
      }}
      className="flex w-full flex-col items-center"
    >
      <motion.button
        type="button"
        aria-label="เลือกรูปโปรไฟล์"
        onClick={() => fileRef.current?.click()}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <Avatar user={{ uid, name: name || "Z", photo }} size={96} />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-card bg-sky text-bg">
          <Camera size={15} strokeWidth={2.2} />
        </span>
      </motion.button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) setPhoto(await fileToAvatar(file).catch(() => photo));
        }}
      />

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={24}
        placeholder="ชื่อของคุณ"
        className="mt-6 h-13 w-full rounded-2xl bg-raise px-4 py-3.5 text-center text-ink placeholder:text-mute"
      />
      {showBio && (
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={80}
          placeholder="แนะนำตัวสั้นๆ (ไม่ใส่ก็ได้)"
          className="mt-3 w-full rounded-2xl bg-raise px-4 py-3.5 text-center text-ink placeholder:text-mute"
        />
      )}
      {failed && <p className="mt-3 text-sm text-blush">บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        disabled={!valid || busy}
        className="mt-5 h-13 w-full rounded-2xl bg-sky py-3.5 text-[16px] font-normal text-bg transition-opacity disabled:opacity-40"
      >
        {busy ? "กำลังบันทึก..." : submitLabel}
      </motion.button>
    </form>
  );
}
