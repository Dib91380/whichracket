import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://whichracket.com"),

  title: "WhichRacket — Find the perfect tennis racket for your game",

  description:
    "Smart tennis racket and string recommendation tool. Answer a few questions about your level and playing style to find the perfect racket and string setup.",

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },

  keywords: [
    "tennis racket recommendation",
    "which tennis racket should I use",
    "tennis racket selector",
    "tennis gear recommendation",
    "raquette tennis recommandation",
    "whichracket",
  ],

  openGraph: {
    title: "WhichRacket — Tennis Racket Recommendation Tool",
    description:
      "Find the perfect tennis racket and string setup based on your level, playing style and preferences.",
    url: "https://whichracket.com",
    siteName: "WhichRacket",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "WhichRacket tennis recommendation tool",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "WhichRacket — Tennis Racket Recommendation Tool",
    description:
      "Find the perfect tennis racket and string setup based on your level and playing style.",
    images: ["/preview.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        <Analytics />
        <SpeedInsights />

        {/* Schema.org structured data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "WhichRacket",
              url: "https://whichracket.com",
              applicationCategory: "SportsApplication",
              operatingSystem: "All",
              description:
                "Smart tennis racket and string recommendation tool based on your level and playing style.",
              creator: {
                "@type": "Person",
                name: "Nicolas Dib",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}