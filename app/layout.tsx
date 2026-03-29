import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anime Slide Generator",
  description: "AIがあなたのプレゼンをアニメ風に変換",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
