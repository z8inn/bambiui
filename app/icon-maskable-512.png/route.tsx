import { appIconResponse } from "../studio/brand-images";

// Maskable manifest icon: the mark stays inside the safe zone when cropped.
export const dynamic = "force-static";

export function GET() {
  return appIconResponse(512, { safeZone: true });
}
