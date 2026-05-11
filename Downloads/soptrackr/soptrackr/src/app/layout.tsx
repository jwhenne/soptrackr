import type { Metadata } from 'next'
import { Inter, Lexend } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://soptrackr.com';

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
  robots: { index: false, follow: false },
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
        </body>
      </html>
    </ClerkProvider>
  )
}
