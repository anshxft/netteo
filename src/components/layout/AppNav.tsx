'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppNav.module.css';
import { Icon } from '../icons/Icon';
import { ObligationIcon, CycleIcon, SnapshotIcon } from '../icons/netteo';
import { Users } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/obligations', label: 'Obligations', icon: ObligationIcon },
  { href: '/cycles', label: 'Settlement Cycles', icon: CycleIcon },
  { href: '/audit', label: 'Audit Ledger', icon: SnapshotIcon },
];

/**
 * Primary navigation component adhering to design-addendum.md §14:
 * - Landmark <nav> with accessible aria-label="Main Navigation"
 * - aria-current="page" on the active link
 * - Slim wine indicator on active item
 */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main Navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`.trim()}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon icon={item.icon} size="sm" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
