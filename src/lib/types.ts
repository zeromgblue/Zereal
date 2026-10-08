export type Visibility = "public" | "private";

export interface UserProfile {
  uid: string;
  name: string;
  bio: string;
  photo: string | null;
}

export interface Post {
  id: string;
  uid: string;
  caption: string;
  visibility: Visibility;
  thumb: string;
  likes: string[];
  commentCount: number;
  createdAt: number;
}

export interface Comment {
  id: string;
  uid: string;
  text: string;
  createdAt: number;
}

export interface Media {
  main: string;
  inset: string;
}
