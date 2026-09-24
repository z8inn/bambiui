#!/usr/bin/env node
// Node 22.6+: node --experimental-strip-types scripts/generate-palette.mjs '#e8673c'
import { generatePalette } from "../app/studio/color-engine.ts";

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("Usage: node --experimental-strip-types scripts/generate-palette.mjs '#rrggbb'");
  process.exitCode = 1;
} else {
  try {
    const palette = generatePalette(args[0]);
    // Recipes are distinct from the studio's versioned design-system backups.
    console.log(JSON.stringify({ format: "bambiui.color-recipe", version: 1, ...palette }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not generate palette.");
    process.exitCode = 1;
  }
}
