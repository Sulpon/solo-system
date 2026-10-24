import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "./_pwa/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Was still the create-next-app default. This is the name Android
  // shows under the home-screen icon, so it is not cosmetic.
  title: "Atlas",
  description: "Your personal operating system.",
  applicationName: "Atlas",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Atlas", statusBarStyle: "black-translucent" },
  icons: { icon: "/favicon.ico", apple: "/icons/atlas-180.png" },
};

export const viewport: Viewport = {
  // viewportFit: cover lets the app paint under the Android gesture bar
  // and notch; globals.css already reserves safe-area padding where it
  // matters.
  themeColor: "#04060f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
