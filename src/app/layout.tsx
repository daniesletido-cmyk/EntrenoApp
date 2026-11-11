import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "./globals.css";
import AppShell from "@/components/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { AppLockGuard } from "@/components/auth/app-lock-guard";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "EntrenoApp — Rendimiento & Salud",
  description: "Registro de entrenamiento y nutrición de alto rendimiento · Diseñada por Daniel Espinosa",
  manifest: "/manifest.json?v=7",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EntrenoApp",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=7", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=7", sizes: "16x16", type: "image/png" },
      { url: "/icon.svg?v=7", type: "image/svg+xml" },
      { url: "/icon-192.png?v=7", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=7", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=7",
    apple: [
      { url: "/apple-touch-icon.png?v=7", sizes: "180x180", type: "image/png" },
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-touch-icon-precomposed.png?v=7",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=7" sizes="any" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('entrenoapp_theme');
                  var theme = saved || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                  else document.documentElement.classList.remove('dark');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ToastProvider>
          <AppLockGuard>
            <AppShell>{children}</AppShell>
          </AppLockGuard>
        </ToastProvider>
      </body>
    </html>
  );
}
