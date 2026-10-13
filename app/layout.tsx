import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Cube Generator",
  description: "Map videos onto a 3D cube and export the result",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
