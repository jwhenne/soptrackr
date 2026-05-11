'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/app/sops', label: 'SOPs' },
  { href: '/app/team', label: 'Team' },
  { href: '/app/settings', label: 'Settings' },
];

export default function AppNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="flex items-center gap-1 py-2">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? 'px-3 py-2 rounded-md text-sm font-bold text-oem-red border-b-2 border-oem-red'
                : 'px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
