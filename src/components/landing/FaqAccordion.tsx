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
      'Netteo itself never holds your funds. Net debtors deposit into a settlement contract (SettlementKernel) on Mezo that has no owner, admin or pause function. Funds stay in escrow until every required deposit has arrived, then anyone can trigger the payout to creditors. If the cycle is never fully funded, depositors take their own deposit back with claimRefund(). The contracts have not been independently audited.',
  },
  {
    id: '3',
    question: 'What happens if a debtor fails to deposit their net balance?',
    answer:
      'Every cycle has a funding deadline (72 hours in the app). If a debtor has not funded by then, nobody is paid out, and each depositor can call claimRefund() to take back exactly what they deposited. A cycle that is fully funded but cannot pay out (for example, a token blocks one creditor) can be refunded 3 days after the deadline.',
  },
  {
    id: '4',
    question: 'What tokens and blockchains are supported?',
    answer:
      'Netteo runs on Mezo Mainnet (Chain ID 31612) and settles in MUSD, mUSDC or mUSDT. One cycle uses one token. Transactions need BTC for gas and are final once confirmed on-chain.',
  },
  {
    id: '5',
    question: 'Are original invoices and obligations preserved after netting?',
    answer:
      'Yes. Netting changes what is paid, not what is on record. Each cycle stores a keccak256 hash of its claim set on-chain, the app checks that hash against the group\'s accepted claims before deposits open, and the receipt export lists every original claim next to that hash.',
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
          Clear answers to common
          <span className={styles.highlightPill}>questions</span>
        </h2>
        <p className={styles.subtitle}>
          What the contract does, what it does not, and what happens when something goes wrong.
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
