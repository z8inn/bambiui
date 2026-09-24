import { appIconResponse } from "../studio/brand-images";

// Web app manifest icon, prerendered at build time.
export const dynamic = "force-static";

export function GET() {
  return appIconResponse(512);
}
