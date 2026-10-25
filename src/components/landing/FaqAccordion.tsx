'use client';

import React, { useState } from 'react';
import styles from './FaqAccordion.module.css';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AccordionBasic,
} from '@/components/core/accordion';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: '1',
    question: 'What is multilateral netting and how does Netteo work?',
    answer:
      'Multilateral netting is a financial reconciliation process where multiple parties collapse reciprocal debts into single net transfers. Instead of Alice paying Bob $100, Bob paying Charlie $80, and Charlie paying Alice $20 ($200 in separate transfers), the $120 circular debt loop cancels out automatically. Alice pays net $80, Bob receives net $20, and Charlie receives net $60 ($80 total funded transfers). Netteo executes this atomically on Mezo smart contracts.',
  },
  {
    id: '2',
    question: 'Does Netteo take custody of user funds?',
    answer:
      'No. Netteo is strictly non-custodial. Net debtors deposit funds into an automated smart contract (SettlementCycle.sol) on Mezo. Funds remain in escrow until the cycle deadline or until all required debtor deposits arrive, at which point the contract atomically distributes the exact net payouts to creditors. If a cycle expires without full funding, depositors withdraw 100% of their funds directly.',
  },
  {
    id: '3',
    question: 'What happens if a debtor fails to deposit their net balance?',
    answer:
      'Every settlement cycle has a strictly enforced funding deadline (typically 24–72 hours). If any net debtor fails to fund their required net amount before expiration, the cycle automatically enters the Expired state. No creditor distributions execute, and all funded participants can immediately withdraw their deposits via the claimRefund() contract function with zero loss.',
  },
  {
    id: '4',
    question: 'What tokens and blockchains are supported?',
    answer:
      'Netteo is natively built on Mezo (Chain ID 31611) using MUSD, Mezo’s yield-backed native stablecoin. By utilizing Mezo’s high-throughput EVM execution environment, Web3 teams settle high-volume contributor claims with sub-second finality and negligible gas fees.',
  },
  {
    id: '5',
    question: 'Are original invoices and obligations preserved after netting?',
    answer:
      'Yes. Netteo does not erase the historical obligation ledger. Every settlement cycle computes a cryptographic Merkle root of all included gross obligations and records this snapshot commitment hash permanently on-chain. Counterparties can verify and export the complete bilateral claim history for tax, accounting, and compliance.',
  },
];

export function FaqAccordion() {
  const [activeTab, setActiveTab] = useState<'settlement' | 'primitives'>('settlement');

  return (
    <section id="faq" className={styles.faqSection}>
      <div className={styles.headerContainer}>
        <div className={styles.eyebrow}>
          <span>✦ Frequently Asked Questions</span>
        </div>
        <h2 className={styles.title}>
          Clear answers to institutional
          <span className={styles.highlightPill}>questions</span>
        </h2>
        <p className={styles.subtitle}>
          Everything you need to know about non-custodial clearing, smart contracts, and settlement guarantees.
        </p>
      </div>

      <div className={styles.tabContainer} role="tablist" aria-label="FAQ Categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'settlement'}
          className={`${styles.tabButton} ${activeTab === 'settlement' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('settlement')}
        >
          Protocol Clearing FAQs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'primitives'}
          className={`${styles.tabButton} ${activeTab === 'primitives' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('primitives')}
        >
          Motion Primitives Accordion
        </button>
      </div>

      {activeTab === 'settlement' ? (
        <Accordion
          type="multiple"
          defaultValue={['1']}
          className={styles.accordionList}
        >
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger>
                {item.question}
              </AccordionTrigger>
              <AccordionContent>
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className={styles.dividedContainer}>
          <AccordionBasic />
        </div>
      )}
    </section>
  );
}
