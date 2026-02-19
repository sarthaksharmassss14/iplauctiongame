import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IPL Super Auction 2026",
  description: "Real-time multiplayer IPL auction game. Build your dream team!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
