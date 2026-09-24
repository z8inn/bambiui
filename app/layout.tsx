import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bambi UI",
  description: "Bambi UI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr">
      <body>
        <div className="root">{children}</div>
      </body>
    </html>
  );
}
