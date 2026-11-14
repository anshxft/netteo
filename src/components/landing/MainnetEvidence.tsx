import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { MEZO_MAINNET_EXPLORER_URL } from '@/lib/chain/config';
import styles from './MainnetEvidence.module.css';

// Every value below was read back from Mezo Mainnet (chain 31612). Source of record: DEPLOYMENTS.md.
interface Cycle {
  id: string;
  label: string;
  kernel: string;
  gross: string;
  netFunded: string;
  payouts: string[];
  txs: { name: string; hash: string }[];
}

const CYCLES: Cycle[] = [
  {
    id: 'v2',
    label: 'Current contracts (v2)',
    kernel: '0x427Ff00c792252cC364Cb3240Dc26E6e7872340e',
    gross: '0.80',
    netFunded: '0.32',
    payouts: ['+0.08', '+0.24'],
    txs: [
      { name: 'createCycle', hash: '0xdaceb9e491895ea5eb09caeb7c537f7d87b4318803c53cb1ee2ee47da122955e' },
      { name: 'deposit', hash: '0x0340fd70a4e04fcf6d3b0787e5f8726cc99176b45e5f412610213bc8d3b457ce' },
      { name: 'executeSettlement', hash: '0x9795326bd5fb24acd1fbbb869027bbdad231be58e9be98ab85d89226f3971f45' },
    ],
  },
  {
    id: 'v1',
    label: 'First cycle (v1, superseded)',
    kernel: '0x42A249Bc6850E25D70d3331647a98b8dDe0b80F7',
    gross: '1.00',
    netFunded: '0.40',
    payouts: ['+0.10', '+0.30'],
    txs: [
      { name: 'createCycle', hash: '0xe2f2fb78315deb75edb117e84a401a51a057ed0b6c6d990c7f20a8688e2f7dce' },
      { name: 'deposit', hash: '0x902a4912efc9fd508886f7ff767b294468312ed99fcaadc49dc597cc1a4a35b1' },
      { name: 'executeSettlement', hash: '0x4093d636a434ae210740be916a0c10e927b40e6de9b8f1b24bdc7b7f159c3c2f' },
    ],
  },
];

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
          Two three-party cycles, three claims each, settled as one deposit and two payouts. Open any transaction to check it yourself.
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

      <p className={styles.disclosure}>
        Small amounts on purpose, run with wallets controlled by the team. The contracts have not been independently audited.
      </p>
    </section>
  );
}
