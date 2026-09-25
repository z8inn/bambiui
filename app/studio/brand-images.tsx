import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brandColor, brandSvgDataUri } from "./brand";
import { defaultSystem } from "./tokens";

/*
 * Build-time renderers for the app icons and social images. Every raster asset
 * is drawn from the same logo artwork in brand.ts, so they stay in sync with
 * the header mark and app/icon.svg.
 */

const surface = "#fffaf6";
const ink = "#29292d";
const inkMuted = "#77776f";

/** Square app icon: the mark centered on an opaque surface. */
export function appIconResponse(
  size: number,
  { safeZone = false }: { safeZone?: boolean } = {},
) {
  // Maskable icons may be cropped to a circle, so keep the mark inside 60%.
  const markSize = Math.round(size * (safeZone ? 0.56 : 0.72));
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: surface,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img. */}
        <img src={brandSvgDataUri()} width={markSize} height={markSize} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}

async function font(file: string) {
  return readFile(join(process.cwd(), "app/studio/fonts", file));
}

const swatches = [
  defaultSystem.themes.light.global.primary,
  defaultSystem.themes.light.global.success,
  defaultSystem.themes.light.global.warning,
  defaultSystem.themes.light.global.danger,
  defaultSystem.themes.light.global.info,
];

export const socialImageSize = { width: 1200, height: 630 };
export const socialImageAlt =
  "bambiui — create your own design system with live Base UI components.";

/** 1200 × 630 Open Graph / Twitter card. */
export async function socialImageResponse() {
  const [regular, semibold] = await Promise.all([
    font("Geist-Regular.ttf"),
    font("Geist-SemiBold.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "72px 80px",
          background: surface,
          backgroundImage: "radial-gradient(#eadfd6 1.4px, transparent 1.4px)",
          backgroundSize: "28px 28px",
          fontFamily: "Geist",
          color: ink,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img. */}
            <img src={brandSvgDataUri()} width={64} height={64} alt="" />
            <div style={{ display: "flex", fontSize: 44, fontWeight: 600, letterSpacing: -1.5 }}>
              bambi<span style={{ color: "#a4a49b", fontWeight: 400 }}>ui</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 72,
              maxWidth: 620,
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -2.5,
            }}
          >
            Create your own design system.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              maxWidth: 560,
              fontSize: 26,
              lineHeight: 1.45,
              color: inkMuted,
            }}
          >
            Shape global and component tokens with a live Base UI preview.
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
            {swatches.map((color) => (
              <div
                key={color}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: color,
                  border: "3px solid #ffffff",
                  boxShadow: "0 0 0 1px #e9e9e5",
                }}
              />
            ))}
            <div style={{ display: "flex", marginLeft: 12, fontSize: 22, color: inkMuted }}>
              Local-first · Export CSS & JSON
            </div>
          </div>
        </div>

        {/* Component sample, drawn with the default tokens. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignSelf: "center",
            width: 360,
            gap: 22,
            padding: 32,
            border: "1px solid #e9e9e5",
            borderRadius: 20,
            background: "#ffffff",
            boxShadow: "0 24px 60px #27272a14",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 600 }}>
              Workspace name
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 16px",
                border: "1px solid #e4e4e7",
                borderRadius: 10,
                fontSize: 20,
              }}
            >
              Acme Studio
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: 46,
                height: 26,
                padding: 3,
                borderRadius: 999,
                background: brandColor,
                justifyContent: "flex-end",
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: 999, background: "#ffffff" }} />
            </div>
            <div style={{ display: "flex", fontSize: 19 }}>Email notifications</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 8,
                background: "#e6f1ea",
                color: "#1a5c36",
                fontSize: 16,
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: 999, background: "#1a7f45" }} />
              Live
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 20px",
                borderRadius: 10,
                background: brandColor,
                color: "#ffffff",
                fontSize: 19,
                fontWeight: 600,
              }}
            >
              Save changes
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...socialImageSize,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
