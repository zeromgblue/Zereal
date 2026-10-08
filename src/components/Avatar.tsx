"use client";

import type { UserProfile } from "@/lib/types";

const TINTS = ["#9dc1ff", "#ffb3c4", "#b9e6c9", "#f6d99a", "#cdb9ff", "#a5e3e8"];

export default function Avatar({
  user,
  size = 36,
  className = "",
}: {
  user: Pick<UserProfile, "uid" | "name" | "photo"> | undefined;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (user?.photo) {
    return (
      <img
        src={user.photo}
        alt=""
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  const seed = user?.uid ?? "?";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return (
    <div
      style={{ ...style, background: TINTS[hash % TINTS.length], fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-medium text-bg ${className}`}
    >
      {(user?.name ?? "?").trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}
