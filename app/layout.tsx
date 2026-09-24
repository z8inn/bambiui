import type { Metadata, Viewport } from "next";
import { brandColor } from "./studio/brand";
import "./globals.css";

const title = "bambiui";
const description =
  "Create your own design system. Customize global and component tokens with a live Base UI preview.";

// Social images need absolute URLs. Set NEXT_PUBLIC_SITE_URL to the production
// domain; Cloudflare Pages builds fall back to the deployment URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.CF_PAGES_URL ??
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: title,
  openGraph: {
    type: "website",
    siteName: title,
    title,
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: brandColor,
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
