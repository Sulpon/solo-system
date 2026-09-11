// Completes what `next build` (with `output: "standalone"` in
// next.config.ts) leaves for the deployer to do: Next.js's standalone
// output intentionally does not include `public/` or `.next/static/` -
// see https://nextjs.org/docs/app/api-reference/config/next-config-js/output
// This copies both into `.next/standalone/`, exactly as Next.js's own
// deployment docs describe, so the bundled server the Tauri desktop shell
// spawns (src-tauri/src/lib.rs) can actually serve the app's static
// assets. Used as `tauri.conf.json`'s `beforeBuildCommand` - not something
// `next dev`/the ordinary browser workflow ever runs.
import { cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const standaloneDir = join(rootDir, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  console.error("[prepare-desktop-build] .next/standalone was not created - is next.config.ts's output still set to \"standalone\"?");
  process.exit(1);
}

const copies = [
  [join(rootDir, "public"), join(standaloneDir, "public")],
  [join(rootDir, ".next", "static"), join(standaloneDir, ".next", "static")],
];

for (const [source, destination] of copies) {
  if (!existsSync(source)) {
    continue;
  }

  cpSync(source, destination, { recursive: true });
  console.log(`[prepare-desktop-build] copied ${source} -> ${destination}`);
}
