import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { MEZO_MAINNET_EXPLORER_URL } from '@/lib/chain/config';
import { SAVINGS_ROUND_TRIP, SETTLED_CYCLES } from '@/lib/chain/deployments';
import styles from './MainnetEvidence.module.css';

// All values come from src/lib/chain/deployments.ts, which deployments.test.ts verifies against Mezo Mainnet.
const CYCLES = SETTLED_CYCLES.map((c) => ({
  ...c,
  // The landing page shows the three transactions that matter; the docs list all four.
  txs: c.txs.filter((t) => t.name !== 'approve'),
}));
const SAVINGS_TXS = SAVINGS_ROUND_TRIP.txs;

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`;

export function MainnetEvidence() {
  return (
    <section id="evidence" className={styles.section} aria-labelledby="evidence-title">
      <div className={styles.header}>
        <span className={styles.eyebrow}>On-chain evidence</span>
        <h2 id="evidence-title" className={styles.title}>
          Real MUSD settled on Mezo Mainnet
        </h2>
        <p className={styles.subtitle}>
          Two three-party cycles settled in MUSD, and a real round trip through Mezo's Savings Vault. Open any transaction to check it yourself.
        </p>
      </div>

      <div className={styles.grid}>
        {CYCLES.map((c) => (
          <article key={c.id} className={styles.card}>
            <h3 className={styles.cardTitle}>{c.label}</h3>
            <dl className={styles.facts}>
              <div>
                <dt>Gross claims</dt>
                <dd>{c.gross} MUSD</dd>
              </div>
              <div>
                <dt>Funded (net)</dt>
                <dd>{c.netFunded} MUSD</dd>
              </div>
              <div>
                <dt>Paid out</dt>
                <dd>
                  {c.payouts[0]} and {c.payouts[1]} MUSD
                </dd>
              </div>
              <div>
                <dt>Final state</dt>
                <dd>Completed, 0 MUSD left in the contract</dd>
              </div>
            </dl>
            <ul className={styles.links}>
              {c.txs.map((t) => (
                <li key={t.hash}>
                  <a href={`${MEZO_MAINNET_EXPLORER_URL}/tx/${t.hash}`} target="_blank" rel="noopener noreferrer">
                    <span>{t.name}</span>
                    <code>{short(t.hash)}</code>
                    <Icon icon={ExternalLink} size="sm" />
                    <span className={styles.srOnly}>(opens the Mezo explorer in a new tab)</span>
                  </a>
                </li>
              ))}
              <li>
                <a href={`${MEZO_MAINNET_EXPLORER_URL}/address/${c.kernel}`} target="_blank" rel="noopener noreferrer">
                  <span>Contract</span>
                  <code>{short(c.kernel)}</code>
                  <Icon icon={ExternalLink} size="sm" />
                  <span className={styles.srOnly}>(opens the Mezo explorer in a new tab)</span>
                </a>
              </li>
            </ul>
          </article>
        ))}
      </div>

      <article className={styles.wide}>
        <h3 className={styles.cardTitle}>Mezo Savings Vault, round trip with real MUSD</h3>
        <p className={styles.cardNote}>
          0.01 MUSD approved, deposited (minted exactly 0.01 sMUSD) and withdrawn (every wei returned). Netteo uses this path to fund a deposit from savings or to save a payout.
        </p>
        <ul className={styles.links}>
          {SAVINGS_TXS.map((t) => (
            <li key={t.hash}>
              <a href={`${MEZO_MAINNET_EXPLORER_URL}/tx/${t.hash}`} target="_blank" rel="noopener noreferrer">
                <span>{t.name}</span>
                <code>{short(t.hash)}</code>
                <Icon icon={ExternalLink} size="sm" />
                <span className={styles.srOnly}>(opens the Mezo explorer in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </article>

      <p className={styles.disclosure}>
        Small amounts on purpose, run with wallets controlled by the team. The contracts have not been independently audited.
      </p>
    </section>
  );
}
