import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WatchMe",
  description: "A privacy-first personal status dashboard."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="petal-field" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} className={`petal petal-${index}`} />
          ))}
        </div>
        <main className="page-shell">
          {children}
        </main>
      </body>
    </html>
  );
}
