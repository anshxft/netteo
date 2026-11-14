import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import styles from './MezoFunding.module.css';

/**
 * Why Netteo matters to someone who lives off Bitcoin on Mezo. Every statement here is backed by a contract call
 * in src/lib/mezo and was verified against Mezo Mainnet state (see fork.test.ts).
 */
const STEPS = [
  {
    n: '01',
    title: 'Net first',
    body: 'Cancel out what you owe each other before anyone pays. In the three-party example, $200 of claims needs only $80 deposited. Less MUSD to find means less to borrow.',
  },
  {
    n: '02',
    title: 'Fund the rest without selling Bitcoin',
    body: 'Short on MUSD? Withdraw from the MUSD Savings Vault, or borrow the missing amount against the Bitcoin already locked in your Mezo loan. Netteo shows the fee, the interest and the Bitcoin price at which the loan could be liquidated, and will not build a borrow that leaves it under 150%.',
  },
  {
    n: '03',
    title: 'Put what you receive to work',
    body: 'When a settlement pays you out, deposit the MUSD into the Savings Vault in one step. No lock-up, and the yield is variable.',
  },
];

export function MezoFunding() {
  return (
    <section id="mezo" className={styles.section} aria-labelledby="mezo-title">
      <div className={styles.header}>
        <span className={styles.eyebrow}>Built on Mezo</span>
        <h2 id="mezo-title" className={styles.title}>
          Settle with your Bitcoin, not by selling it
        </h2>
        <p className={styles.subtitle}>
          Netteo connects group settlements to Mezo&apos;s own products: MUSD, the MUSD Savings Vault and loans against Bitcoin. Everything is read live from Mezo Mainnet.
        </p>
      </div>

      <ol className={styles.grid}>
        {STEPS.map((s) => (
          <li key={s.n} className={styles.card}>
            <span className={styles.num}>{s.n}</span>
            <h3 className={styles.cardTitle}>{s.title}</h3>
            <p className={styles.body}>{s.body}</p>
          </li>
        ))}
      </ol>

      <div className={styles.cta}>
        <Link href="/funding" className={styles.button}>
          Try the Funding Check <Icon icon={ArrowRight} size="sm" color="currentColor" />
        </Link>
        <p className={styles.fine}>Read-only. Pick one of the real Bitcoin-backed loans on Mezo today, or paste any address. A new loan needs at least 1,800 MUSD of debt.</p>
      </div>
    </section>
  );
}
