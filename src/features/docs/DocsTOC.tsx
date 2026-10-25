'use client';

import React, { useEffect, useState } from 'react';
import styles from './DocsTOC.module.css';
import type { DocSubsection } from './docsData';
import { AlignLeft } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

interface DocsTOCProps {
  subsections: DocSubsection[];
}

export function DocsTOC({ subsections }: DocsTOCProps) {
  const [activeSubId, setActiveSubId] = useState<string>('');

  useEffect(() => {
    if (!subsections || subsections.length === 0) return;

    setActiveSubId(subsections[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSubId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    subsections.forEach((sub) => {
      const el = document.getElementById(sub.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [subsections]);

  if (!subsections || subsections.length === 0) {
    return null;
  }

  const handleScrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveSubId(id);
    }
  };

  return (
    <aside className={styles.tocWrapper} aria-label="On this page navigation">
      <div className={styles.tocHeader}>
        <Icon icon={AlignLeft} size="sm" />
        <span>ON THIS PAGE</span>
      </div>
      <ul className={styles.tocList}>
        {subsections.map((sub) => {
          const isActive = sub.id === activeSubId;
          return (
            <li key={sub.id}>
              <a
                href={`#${sub.id}`}
                onClick={(e) => handleScrollTo(sub.id, e)}
                className={`${styles.tocLink} ${isActive ? styles.tocLinkActive : ''}`}
              >
                {sub.title}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
