import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090807',
};

export const metadata: Metadata = {
  title: 'Kaliyuga: The Bleeding Crown — Mobile Edition',
  description: 'Vedic 2.5D Isometric Action Roguelike optimized for Mobile with touch virtual joystick and responsive action combat controls.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kaliyuga',
  },
  openGraph: {
    title: 'Kaliyuga: The Bleeding Crown — Mobile Edition',
    description: 'Vedic 2.5D Isometric Action Roguelike optimized for Mobile with touch virtual joystick and responsive action combat controls.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kaliyuga: The Bleeding Crown — Mobile Edition',
    description: 'Vedic 2.5D Isometric Action Roguelike optimized for Mobile with touch virtual joystick and responsive action combat controls.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[#090807] text-[#F5EDE0] font-sans antialiased overflow-hidden select-none"
      >
        {children}
      </body>
    </html>
  );
}
