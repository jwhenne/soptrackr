import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter, Lexend } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://soptrackr.com';

// Google Analytics 4 — fires only in production builds so local dev sessions
// don't pollute the data. Site-wide via the root layout.
const GA_MEASUREMENT_ID = 'G-H76XLG858V';
const gaEnabled = process.env.NODE_ENV === 'production';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SOPTrackr — Special Order Parts Tracking for Dealerships',
    template: '%s · SOPTrackr',
  },
  description:
    'End-to-end visibility on every special order part — from PO to install. Built for automotive dealership service drives.',
  keywords: [
    'special order parts',
    'SOP tracker',
    'dealership parts management',
    'automotive service software',
    'fixed ops software',
    'parts inventory',
    'bin location',
  ],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'SOPTrackr — Special Order Parts Tracking for Dealerships',
    description:
      'Stop chasing special order parts. Track every SOP from PO to install. Built for automotive dealerships.',
    siteName: 'SOPTrackr',
    images: ['/logo-full.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOPTrackr — Special Order Parts Tracking for Dealerships',
    description:
      'Stop chasing special order parts. Track every SOP from PO to install.',
    images: ['/logo-full.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#2563eb',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      }}
    >
      <html lang="en" className={`${inter.variable} ${lexend.variable}`}>
        <body className={inter.className}>
          {children}
          {gaEnabled && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
              />
              <Script id="ga4-init" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}');
                `}
              </Script>
            </>
          )}
        </body>
      </html>
    </ClerkProvider>
  )
}
