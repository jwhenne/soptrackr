'use client';

import Link from 'next/link';
import { useState } from 'react';

const nav = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center" aria-label="SOPTrackr home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.svg" alt="SOPTrackr" className="h-9 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
            >
              Book a demo
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 flex gap-2 px-3">
              <Link
                href="/sign-in"
                className="flex-1 text-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/demo"
                className="flex-1 text-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold"
                onClick={() => setOpen(false)}
              >
                Book a demo
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
