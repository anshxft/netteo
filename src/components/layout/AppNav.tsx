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
  Users,
} from 'lucide-react';
import { ObligationIcon, CycleIcon, SnapshotIcon } from '../icons/netteo';
import { ThemeToggle } from '../common/ThemeToggle';

interface SubItem {
  title: string;
  desc: string;
  href: string;
  action?: 'new-payment' | 'create-group' | 'export-csv';
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
        href: '/obligations?action=new-payment',
        action: 'new-payment',
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
        title: 'Create Group',
        desc: 'Set up a new collective or partner group.',
        href: '/groups?action=create-group',
        action: 'create-group',
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
        href: '/audit?action=export-csv',
        action: 'export-csv',
      },
    ],
  },
];

export function AppNav() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pinnedDropdown, setPinnedDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        clearTimer();
        setPinnedDropdown(null);
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
        clearTimer();
        setPinnedDropdown(null);
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearTimer();
  }, []);

  const handleMouseEnter = (id: string) => {
    clearTimer();
    if (!pinnedDropdown) {
      setOpenDropdown(id);
    }
  };

  const handleMouseLeave = () => {
    clearTimer();
    if (pinnedDropdown) return;

    leaveTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 250);
  };

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    clearTimer();
    if (pinnedDropdown === id) {
      setPinnedDropdown(null);
      setOpenDropdown(null);
    } else {
      setPinnedDropdown(id);
      setOpenDropdown(id);
    }
  };

  const handleItemClick = (item: SubItem) => {
    clearTimer();
    setPinnedDropdown(null);
    setOpenDropdown(null);
    setMobileMenuOpen(false);

    if (typeof window !== 'undefined' && item.action) {
      if (item.action === 'new-payment') {
        window.dispatchEvent(new CustomEvent('netteo_open_record_payment'));
      } else if (item.action === 'create-group') {
        window.dispatchEvent(new CustomEvent('netteo_open_create_group'));
      } else if (item.action === 'export-csv') {
        window.dispatchEvent(new CustomEvent('netteo_trigger_export_csv'));
      }
    }
  };

  return (
    <div ref={navRef} style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
      {/* Desktop Navigation */}
      <nav className={styles.nav} aria-label="Primary Netteo Navigation">
        {NAV_CATEGORIES.map((cat) => {
          const isOpen = openDropdown === cat.id || pinnedDropdown === cat.id;
          const isCategoryActive =
            pathname.startsWith(`/${cat.id}`) ||
            (cat.id === 'obligations' && pathname === '/obligations');

          return (
            <div
              key={cat.id}
              className={styles.navItemContainer}
              onMouseEnter={() => handleMouseEnter(cat.id)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className={`${styles.navButton} ${isOpen || isCategoryActive ? styles.navButtonActive : ''}`}
                onClick={(e) => toggleDropdown(cat.id, e)}
                aria-expanded={isOpen}
                aria-haspopup="true"
              >
                <span>{cat.label}</span>
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
                  <Icon icon={ChevronDown} size="sm" />
                </span>
              </button>

              {isOpen && (
                <div
                  className={styles.dropdown}
                  role="menu"
                  aria-label={`${cat.label} menu`}
                  onMouseEnter={() => handleMouseEnter(cat.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  {cat.items.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => handleItemClick(item)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <ThemeToggle size="sm" />
              <Link href="/obligations" onClick={() => setMobileMenuOpen(false)} style={{ flex: 1, textDecoration: 'none' }}>
                <Button
                  variant="primary"
                  style={{ width: '100%' }}
                  icon={<Icon icon={ArrowRight} size="sm" color="#FFFFFF" />}
                  iconPosition="right"
                  enableLift
                  enableArrowSlide
                >
                  Open Desk
                </Button>
              </Link>
            </div>
          </div>

          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.id} className={styles.mobileCategory}>
              <div className={styles.mobileCategoryTitle}>{cat.label}</div>
              {cat.items.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={styles.mobileItem}
                  onClick={() => handleItemClick(item)}
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
