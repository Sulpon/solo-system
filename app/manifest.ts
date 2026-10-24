import type { MetadataRoute } from "next";

// The Android install manifest.
//
// A route rather than a static file so the name, colours and start URL
// stay in one typed place next to the rest of the app's metadata.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas",
    short_name: "Atlas",
    description: "Your personal operating system.",
    // Opens on the dashboard, not on whatever page was last shared.
    start_url: "/",
    scope: "/",
    // standalone is what removes the browser chrome once installed -
    // the difference between a bookmark and something that reads as an
    // app on the home screen.
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#04060f",
    theme_color: "#04060f",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icons/atlas-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/atlas-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Maskable lets Android crop to its own shape without clipping the
      // mark, which is why these are drawn with a wide safe margin.
      { src: "/icons/atlas-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/atlas-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", short_name: "Today", url: "/planning" },
      { name: "Capture a note", short_name: "Capture", url: "/notes" },
      { name: "Quests", short_name: "Quests", url: "/quests" },
    ],
  };
}
