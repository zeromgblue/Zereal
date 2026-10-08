"use client";

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { Camera as CameraIcon, Home, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveProfile, subscribeMe, subscribeUsers } from "@/lib/db";
import { auth, firebaseReady } from "@/lib/firebase";
import type { Post, UserProfile } from "@/lib/types";
import { softSpring, spring, useBackLayer } from "@/lib/ui";
import Camera from "./Camera";
import CommentsSheet from "./CommentsSheet";
import Feed from "./Feed";
import Profile from "./Profile";
import ProfileForm from "./ProfileForm";
import { AppCtx, type AppContext } from "./ctx";

type Tab = "feed" | "profile";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-7 text-center">
      {children}
    </div>
  );
}

export default function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<UserProfile | null | undefined>(undefined);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [failed, setFailed] = useState(false);

  const [tab, setTab] = useState<Tab>("feed");
  const [camera, setCamera] = useState(false);
  const [viewUid, setViewUid] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);
  const [toastState, setToastState] = useState<{ id: number; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!firebaseReady) return;
    return onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else signInAnonymously(auth).catch(() => setFailed(true));
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    const offMe = subscribeMe(uid, setMe, () => setFailed(true));
    const offUsers = subscribeUsers(setUsers);
    return () => {
      offMe();
      offUsers();
    };
  }, [uid]);

  const toast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ id: Date.now(), message });
    toastTimer.current = setTimeout(() => setToastState(null), 2200);
  }, []);

  const goTab = useCallback((next: Tab) => {
    setTab((current) => {
      window.scrollTo({ top: 0, behavior: current === next ? "smooth" : "instant" });
      return next;
    });
  }, []);

  const myUid = me?.uid;
  const openUser = useCallback(
    (target: string) => {
      if (target === myUid) {
        setViewUid(null);
        goTab("profile");
      } else {
        setViewUid(target);
      }
    },
    [myUid, goTab]
  );

  useBackLayer(camera, () => setCamera(false));
  useBackLayer(viewUid !== null, () => setViewUid(null));

  const ctx = useMemo<AppContext | null>(
    () => (me ? { me, users, openUser, openComments: setCommentsFor, toast } : null),
    [me, users, openUser, toast]
  );

  if (!firebaseReady) {
    return (
      <Centered>
        <img src="/logo.png" alt="Zereal" className="w-56" />
        <p className="mt-8 text-[15px] text-ink">ยังไม่ได้เชื่อมต่อ Firebase</p>
        <p className="mt-1 text-sm text-mute">ใส่ค่า NEXT_PUBLIC_FIREBASE_* ในไฟล์ .env.local แล้วเปิดใหม่</p>
      </Centered>
    );
  }

  if (failed) {
    return (
      <Centered>
        <img src="/logo.png" alt="Zereal" className="w-56" />
        <p className="mt-8 text-[15px] text-ink">เชื่อมต่อไม่ได้</p>
        <p className="mt-1 text-sm text-mute">ลองเช็กอินเทอร์เน็ตแล้วเปิดใหม่อีกครั้ง</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="mt-6 rounded-full bg-sky px-6 py-2.5 text-sm text-bg"
        >
          ลองใหม่
        </button>
      </Centered>
    );
  }

  if (!uid || me === undefined) {
    return (
      <Centered>
        <img src="/logo.png" alt="Zereal" className="floaty w-56" />
      </Centered>
    );
  }

  if (me === null || !ctx) {
    return (
      <Centered>
        <motion.img
          src="/logo.png"
          alt="Zereal"
          className="w-60"
          initial={{ opacity: 0, y: 14, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={softSpring}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-4 text-[15px] text-mute"
        >
          ถ่ายสองกล้อง แชร์ทุกช่วงเวลากับเพื่อน
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...softSpring, delay: 0.2 }}
          className="mt-10 w-full rounded-[28px] border border-line bg-card p-6"
        >
          <ProfileForm
            uid={uid}
            showBio={false}
            submitLabel="เริ่มเลย"
            onSubmit={(values) => saveProfile(uid, values)}
          />
        </motion.div>
      </Centered>
    );
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="mx-auto min-h-dvh max-w-md">
        <header className="pt-safe sticky top-0 z-20 flex justify-center bg-bg/95 pb-2">
          <button type="button" aria-label="กลับไปบนสุด" onClick={() => goTab(tab)}>
            <img src="/logo-small.png" alt="Zereal" className="h-9" />
          </button>
        </header>

        <main className="pb-32 pt-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {tab === "feed" ? <Feed onShoot={() => setCamera(true)} /> : <Profile uid={me.uid} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-center justify-around border-t border-line bg-bg/95 px-8 pt-2">
          {(
            [
              ["feed", "ฟีด", Home],
              ["profile", "โปรไฟล์", User],
            ] as const
          ).map(([value, label, Icon], i) => (
            <button
              key={value}
              type="button"
              onClick={() => goTab(value)}
              style={{ order: i * 2 }}
              className={`relative flex h-14 w-16 flex-col items-center justify-center gap-0.5 transition-colors ${
                tab === value ? "text-sky" : "text-mute"
              }`}
            >
              <Icon size={22} strokeWidth={tab === value ? 2.1 : 1.8} />
              <span className="text-[11px]">{label}</span>
              {tab === value && (
                <motion.span
                  layoutId="tab-dot"
                  transition={spring}
                  className="absolute -top-2 h-1 w-6 rounded-full bg-sky"
                />
              )}
            </button>
          ))}
          <motion.button
            type="button"
            aria-label="ถ่ายรูป"
            onClick={() => setCamera(true)}
            whileTap={{ scale: 0.9 }}
            transition={spring}
            style={{ order: 1 }}
            className="-mt-7 flex h-16 w-16 items-center justify-center rounded-full border-4 border-bg bg-sky text-bg shadow-lg shadow-skydeep/25"
          >
            <CameraIcon size={26} strokeWidth={2} />
          </motion.button>
        </nav>

        <AnimatePresence>
          {viewUid && (
            <motion.div
              key={viewUid}
              className="fixed inset-0 z-40 mx-auto max-w-md overflow-y-auto bg-bg"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={spring}
            >
              <Profile uid={viewUid} onBack={() => setViewUid(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {camera && (
            <Camera
              onClose={() => setCamera(false)}
              onSent={(visibility) => {
                setCamera(false);
                setViewUid(null);
                // private posts never reach the feed, so show them where they land
                goTab(visibility === "private" ? "profile" : "feed");
              }}
            />
          )}
        </AnimatePresence>

        <CommentsSheet post={commentsFor} onClose={() => setCommentsFor(null)} />

        <AnimatePresence>
          {toastState && (
            <motion.div
              key={toastState.id}
              className="pointer-events-none fixed inset-x-0 bottom-28 z-[70] flex justify-center px-6"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={spring}
            >
              <span className="rounded-full border border-line bg-raise px-5 py-2.5 text-sm text-ink shadow-xl shadow-black/40">
                {toastState.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}
