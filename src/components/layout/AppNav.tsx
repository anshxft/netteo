'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppNav.module.css';
import { Icon } from '../icons/Icon';
import { Button } from '../common/Button';
import {
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  FileText,
  RefreshCw,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { ObligationIcon, NettingIcon, CycleIcon, SnapshotIcon } from '../icons/netteo';

interface SubItem {
  title: string;
  desc: string;
  href: string;
}

interface NavCategory {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: SubItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'obligations',
    label: 'Payments',
    icon: ObligationIcon,
    items: [
      {
        title: 'Payments & Debts',
        desc: 'Review what you owe, what is owed to you, and approve claims.',
        href: '/obligations',
      },
      {
        title: 'New Payment Claim',
        desc: 'Record a new payment owed by a group partner.',
        href: '/obligations',
      },
    ],
  },
  {
    id: 'cycles',
    label: 'Settlements',
    icon: CycleIcon,
    items: [
      {
        title: 'Group Settlements',
        desc: 'Track live funding and atomic MUSD payouts on Mezo.',
        href: '/cycles',
      },
      {
        title: 'Start Group Settlement',
        desc: 'Group approved payments and calculate net transfers.',
        href: '/cycles/new',
      },
    ],
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: Users,
    items: [
      {
        title: 'Partner Groups',
        desc: 'Manage your teams, DAO pods, and counterparty members.',
        href: '/groups',
      },
      {
        title: 'Add Partner',
        desc: 'Invite contributor wallets into your payment group.',
        href: '/groups',
      },
    ],
  },
  {
    id: 'audit',
    label: 'Receipts',
    icon: SnapshotIcon,
    items: [
      {
        title: 'Payment Receipts',
        desc: 'View verifiable settlement receipts and on-chain proofs.',
        href: '/audit',
      },
      {
        title: 'Export History (CSV)',
        desc: 'Download clean settlement history for your accounting.',
        href: '/audit',
      },
    ],
  },
];

export function AppNav() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDropdown = (id: string) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  return (
    <div ref={navRef} style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
      {/* Desktop Navigation */}
      <nav className={styles.nav} aria-label="Primary Netteo Navigation">
        {NAV_CATEGORIES.map((cat) => {
          const isOpen = openDropdown === cat.id;
          const isCategoryActive =
            pathname.startsWith(`/${cat.id}`) ||
            (cat.id === 'obligations' && pathname === '/obligations');

          return (
            <div
              key={cat.id}
              className={styles.navItemContainer}
              onMouseEnter={() => setOpenDropdown(cat.id)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                className={`${styles.navButton} ${isOpen || isCategoryActive ? styles.navButtonActive : ''}`}
                onClick={() => toggleDropdown(cat.id)}
                aria-expanded={isOpen}
                aria-haspopup="true"
              >
                <span>{cat.label}</span>
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
                  <Icon icon={ChevronDown} size="sm" />
                </span>
              </button>

              {isOpen && (
                <div className={styles.dropdown} role="menu" aria-label={`${cat.label} menu`}>
                  {cat.items.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => setOpenDropdown(null)}
                    >
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemDesc}>{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Mobile Hamburger Toggle */}
      <button
        type="button"
        className={styles.mobileMenuToggle}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileMenuOpen}
      >
        <Icon icon={mobileMenuOpen ? X : Menu} size="md" />
      </button>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawer} role="dialog" aria-label="Mobile Navigation Menu">
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <Link href="/obligations" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="primary"
                style={{ width: '100%' }}
                icon={<Icon icon={ArrowRight} size="sm" color="#FFFFFF" />}
                iconPosition="right"
                enableLift
                enableArrowSlide
              >
                Open Obligation Desk
              </Button>
            </Link>
          </div>

          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.id} className={styles.mobileCategory}>
              <div className={styles.mobileCategoryTitle}>{cat.label}</div>
              {cat.items.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={styles.mobileItem}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemDesc}>{item.desc}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
