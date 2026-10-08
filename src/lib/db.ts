import {
  Bytes,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Comment, Media, Post, UserProfile, Visibility } from "./types";

const millis = (v: unknown) =>
  v && typeof (v as { toMillis?: unknown }).toMillis === "function"
    ? (v as { toMillis: () => number }).toMillis()
    : Date.now();

function toPost(d: QueryDocumentSnapshot<DocumentData>): Post {
  const x = d.data({ serverTimestamps: "estimate" });
  return {
    id: d.id,
    uid: x.uid,
    caption: x.caption ?? "",
    visibility: x.visibility === "private" ? "private" : "public",
    thumb: x.thumb ?? "",
    likes: x.likes ?? [],
    commentCount: Math.max(0, x.commentCount ?? 0),
    createdAt: millis(x.createdAt),
  };
}

/* ---------- users ---------- */

export function subscribeUsers(cb: (users: Map<string, UserProfile>) => void) {
  return onSnapshot(query(collection(db, "users"), limit(500)), (snap) => {
    const map = new Map<string, UserProfile>();
    snap.forEach((d) => {
      const x = d.data();
      map.set(d.id, { uid: d.id, name: x.name ?? "", bio: x.bio ?? "", photo: x.photo ?? null });
    });
    cb(map);
  });
}

export function subscribeMe(uid: string, cb: (me: UserProfile | null) => void, onError: () => void) {
  return onSnapshot(
    doc(db, "users", uid),
    (d) => {
      const x = d.data();
      cb(x?.name ? { uid, name: x.name, bio: x.bio ?? "", photo: x.photo ?? null } : null);
    },
    onError
  );
}

export function saveProfile(uid: string, data: { name: string; bio: string; photo: string | null }) {
  return setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/* ---------- posts ---------- */

export function subscribeFeed(count: number, cb: (posts: Post[]) => void, onError: () => void) {
  const q = query(
    collection(db, "posts"),
    where("visibility", "==", "public"),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(toPost)),
    (e) => {
      console.error(e);
      onError();
    }
  );
}

export function subscribeUserPosts(
  uid: string,
  includePrivate: boolean,
  cb: (posts: Post[]) => void,
  onError: () => void
) {
  // Equality-only filters need no composite index, so sorting happens here instead.
  const base = collection(db, "posts");
  const q = includePrivate
    ? query(base, where("uid", "==", uid), limit(300))
    : query(base, where("uid", "==", uid), where("visibility", "==", "public"), limit(300));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(toPost).sort((a, b) => b.createdAt - a.createdAt)),
    (e) => {
      console.error(e);
      onError();
    }
  );
}

const mediaCache = new Map<string, Promise<Media>>();

const toBytes = async (blob: Blob) => Bytes.fromUint8Array(new Uint8Array(await blob.arrayBuffer()));
const toUrl = (bytes: Bytes) =>
  URL.createObjectURL(new Blob([bytes.toUint8Array() as BlobPart], { type: "image/jpeg" }));

export async function createPost(input: {
  uid: string;
  caption: string;
  visibility: Visibility;
  main: Blob;
  inset: Blob;
  thumb: string;
  urls: Media;
}) {
  const ref = doc(collection(db, "posts"));
  // The photos are already on this device, so show them without a round trip.
  mediaCache.set(ref.id, Promise.resolve(input.urls));
  const [main, inset] = await Promise.all([toBytes(input.main), toBytes(input.inset)]);
  const batch = writeBatch(db);
  batch.set(ref, {
    uid: input.uid,
    caption: input.caption,
    visibility: input.visibility,
    thumb: input.thumb,
    likes: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "media", ref.id), {
    uid: input.uid,
    visibility: input.visibility,
    main,
    inset,
  });
  await batch.commit();
}

export function getMedia(postId: string): Promise<Media> {
  let hit = mediaCache.get(postId);
  if (!hit) {
    hit = getDoc(doc(db, "media", postId)).then((d) => {
      const x = d.data();
      if (!x) throw new Error("media missing");
      return { main: toUrl(x.main), inset: toUrl(x.inset) };
    });
    hit.catch(() => mediaCache.delete(postId));
    mediaCache.set(postId, hit);
  }
  return hit;
}

export function setLike(postId: string, uid: string, liked: boolean) {
  const batch = writeBatch(db);
  batch.update(doc(db, "posts", postId), { likes: liked ? arrayUnion(uid) : arrayRemove(uid) });
  return batch.commit();
}

export function setVisibility(postId: string, visibility: Visibility) {
  const batch = writeBatch(db);
  batch.update(doc(db, "posts", postId), { visibility });
  batch.update(doc(db, "media", postId), { visibility });
  return batch.commit();
}

export function deletePost(postId: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "posts", postId));
  batch.delete(doc(db, "media", postId));
  return batch.commit();
}

/* ---------- comments ---------- */

export function subscribeComments(postId: string, cb: (comments: Comment[]) => void) {
  const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"), limit(300));
  return onSnapshot(q, (snap) =>
    cb(
      snap.docs.map((d) => {
        const x = d.data({ serverTimestamps: "estimate" });
        return { id: d.id, uid: x.uid, text: x.text ?? "", createdAt: millis(x.createdAt) };
      })
    )
  );
}

export function addComment(postId: string, uid: string, text: string) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "posts", postId, "comments")), { uid, text, createdAt: serverTimestamp() });
  batch.update(doc(db, "posts", postId), { commentCount: increment(1) });
  return batch.commit();
}

export async function removeComment(postId: string, commentId: string) {
  await deleteDoc(doc(db, "posts", postId, "comments", commentId));
  const batch = writeBatch(db);
  batch.update(doc(db, "posts", postId), { commentCount: increment(-1) });
  await batch.commit();
}
