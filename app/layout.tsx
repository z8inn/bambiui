import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bambi UI",
  description:
    "Create your own design system. Customize global and component tokens with a live Base UI preview.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <div className="root">{children}</div>
      </body>
    </html>
  );
}
