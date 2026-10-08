import type { Metadata, Viewport } from "next";
import { Mitr } from "next/font/google";
import "./globals.css";

const mitr = Mitr({
  variable: "--font-mitr",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500"],
});

const description = "ถ่ายรูปสองกล้อง แชร์ชีวิตประจำวันกับเพื่อน ถ่ายได้ไม่จำกัด";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Zereal",
  description,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Zereal", statusBarStyle: "black-translucent" },
  openGraph: { title: "Zereal", description, siteName: "Zereal", type: "website", locale: "th_TH" },
  twitter: { card: "summary_large_image", title: "Zereal", description },
};

export const viewport: Viewport = {
  themeColor: "#12141c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${mitr.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
