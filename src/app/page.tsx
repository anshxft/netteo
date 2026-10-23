'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import styles from './page.module.css';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ExternalLink,
  Coins,
  Repeat,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Scale,
  Clock,
  Layers,
} from 'lucide-react';
import { ObligationIcon, NettingIcon, CycleIcon } from '@/components/icons/netteo';
import { useToast } from '@/components/ui/Toast/ToastContext';

interface PersonaParticipant {
  name: string;
  role: string;
  inboundGross: number;
  outboundGross: number;
  netPosition: number;
  grossNote: string;
  netNote: string;
}

interface ClearingScenario {
  id: string;
  label: string;
  grossVolume: number;
  netCapitalRequired: number;
  savedPercent: number;
  grossTxCount: number;
  netTxCount: number;
  participants: PersonaParticipant[];
}

const CLEARING_SCENARIOS: Record<string, ClearingScenario> = {
  pod: {
    id: 'pod',
    label: 'Developer Pod',
    grossVolume: 31500,
    netCapitalRequired: 10500,
    savedPercent: 66.7,
    grossTxCount: 3,
    netTxCount: 1,
    participants: [
      {
        name: 'Alice',
        role: 'Engineering Lead',
        inboundGross: 4500,
        outboundGross: 15000,
        netPosition: -10500,
        grossNote: 'Owes Bob $15,000 for backend contracts; owed $4,500 by Charlie for RPC nodes',
        netNote: 'Deposits $10,500.00 MUSD. Reciprocal $4,500 loop is automatically canceled.',
      },
      {
        name: 'Bob',
        role: 'Security Auditor',
        inboundGross: 15000,
        outboundGross: 12000,
        netPosition: 3000,
        grossNote: 'Owed $15,000 by Alice; owes Charlie $12,000 for formal proof verification',
        netNote: 'Receives $3,000.00 MUSD payout directly. Zero deposit required.',
      },
      {
        name: 'Charlie',
        role: 'Protocol Architect',
        inboundGross: 12000,
        outboundGross: 4500,
        netPosition: 7500,
        grossNote: 'Owed $12,000 by Bob; owes Alice $4,500 for devnet infrastructure',
        netNote: 'Receives $7,500.00 MUSD payout atomically upon Mezo settlement.',
      },
    ],
  },
  dao: {
    id: 'dao',
    label: 'Cross-DAO Guilds',
    grossVolume: 235000,
    netCapitalRequired: 35000,
    savedPercent: 85.1,
    grossTxCount: 3,
    netTxCount: 1,
    participants: [
      {
        name: 'DevDAO',
        role: 'Builder Guild',
        inboundGross: 100000,
        outboundGross: 135000,
        netPosition: -35000,
        grossNote: 'Owes Tooling Council $135k; owed $100k by Ops Guild for grant co-funding',
        netNote: 'Deposits $35,000.00 MUSD net deficit. $100k mutual claims are cancelled.',
      },
      {
        name: 'GuildOps',
        role: 'Operations Council',
        inboundGross: 65000,
        outboundGross: 100000,
        netPosition: -35000,
        grossNote: 'Owes DevDAO $100k; owed $65k by Tooling for shared auditor retainers',
        netNote: 'Offsets obligations; funds remaining balance atomically.',
      },
      {
        name: 'ToolingCouncil',
        role: 'Infrastructure Core',
        inboundGross: 135000,
        outboundGross: 65000,
        netPosition: 70000,
        grossNote: 'Owed $135k by DevDAO; owes GuildOps $65k for relayer nodes',
        netNote: 'Receives $70,000.00 MUSD net payout in one single atomic transaction.',
      },
    ],
  },
  otc: {
    id: 'otc',
    label: 'OTC Liquidity Desks',
    grossVolume: 930000,
    netCapitalRequired: 80000,
    savedPercent: 91.4,
    grossTxCount: 3,
    netTxCount: 1,
    participants: [
      {
        name: 'AlphaDesk',
        role: 'Primary Market Maker',
        inboundGross: 450000,
        outboundGross: 530000,
        netPosition: -80000,
        grossNote: 'Owes DeltaFlow $530k; owed $450k by MezoPool from multi-block arbitrage',
        netNote: 'Transfers only $80,000.00 MUSD to settle all bilateral obligations.',
      },
      {
        name: 'DeltaFlow',
        role: 'Institutional Flow',
        inboundGross: 530000,
        outboundGross: 480000,
        netPosition: 50000,
        grossNote: 'Owed $530k by Alpha; owes MezoPool $480k in cross-venue swaps',
        netNote: 'Receives $50,000.00 MUSD net payout. Risk eliminated instantly.',
      },
      {
        name: 'MezoPool',
        role: 'AMM Vault Reserve',
        inboundGross: 480000,
        outboundGross: 450000,
        netPosition: 30000,
        grossNote: 'Owed $480k by Delta; owes AlphaDesk $450k for liquidity replenishment',
        netNote: 'Receives $30,000.00 MUSD net payout directly into Mezo treasury.',
      },
    ],
  },
};

export default function LandingPage() {
  const { toast } = useToast();
  const [activeScenarioId, setActiveScenarioId] = useState<string>('pod');
  const [clearingMode, setClearingMode] = useState<'gross' | 'net'>('net');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedContract, setCopiedContract] = useState<string | null>(null);

  const scenario = CLEARING_SCENARIOS[activeScenarioId] || CLEARING_SCENARIOS.pod;

  const handleCopy = (address: string, name: string) => {
    navigator.clipboard.writeText(address);
    setCopiedContract(address);
    toast.success('Contract Address Copied', `${name} copied to clipboard`);
    setTimeout(() => setCopiedContract(null), 2000);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const formatUsd = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const contracts = [
    {
      name: 'Settlement Kernel Contract',
      address: '0x3c5Efa1E7fb42ec5351d132bcAce83C8C4dbc3D5',
      desc: 'Canonical multilateral netting and atomic distribution kernel deployed on Mezo Testnet.',
    },
    {
      name: 'Canonical MUSD Token',
      address: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
      desc: 'Official settlement asset on Mezo Testnet utilized for atomic debt satisfaction.',
    },
  ];

  const faqs = [
    {
      question: 'How does Netteo prevent default risk between participants?',
      answer:
        'Netteo enforces an on-chain Collect-then-Distribute invariant. When a settlement cycle is frozen, all net debtors must deposit their net obligation into the Settlement Kernel. Creditors are only paid after 100% of required funds are held. If any participant defaults before the deadline, the 72-hour automated refund timeout allows depositors to withdraw their funds safely.',
    },
    {
      question: 'What is the difference between Gross claims and Net settlement?',
      answer:
        'In traditional gross settlement, every counterparty must independently fund and transmit 100% of their bilateral debts, locking up massive working capital. Netteo calculates the net mathematical position of each participant across the entire counterparty group, canceling out mutual offsetting loops so only the net discrepancy is transferred.',
    },
    {
      question: 'Why is MUSD the canonical settlement asset on Mezo?',
      answer:
        'MUSD is the native Bitcoin-backed stablecoin of the Mezo economic layer. By settling obligations in MUSD, counterparties eliminate currency volatility risk while benefiting from the security and speed of the Mezo network.',
    },
    {
      question: 'Are obligations stored on-chain or off-chain?',
      answer:
        'Obligations are cryptographically authorized by counterparties using EIP-712 structured signatures. They are aggregated off-chain in real time, and committed on-chain to the SettlementKernel upon cycle execution, keeping gas overhead minimal while guaranteeing cryptographic non-repudiation.',
    },
  ];

  return (
    <AppLayout>
      <div className={styles.pageWrapper}>
        <div className={styles.pageContainer}>
          {/* ==========================================================================
              1. HERO SECTION
              ========================================================================== */}
          <section className={styles.heroSection}>
            <div className={styles.kickerBadge}>
              <span className={styles.kickerDot} />
              <span>Autonomous Multilateral Netting &bull; Mezo Testnet</span>
            </div>

            <h1 className={styles.heroHeadline}>
              Many mutual debts. <br />
              <span className={styles.wineAccent}>One net settlement</span> in MUSD.
            </h1>

            <p className={styles.heroSubtitle}>
              Netteo mathematically collapses reciprocal obligations across counterparty networks into minimal net balances, settling atomically on Mezo without locking idle capital.
            </p>

            <div className={styles.heroActions}>
              <Link href="/obligations" style={{ textDecoration: 'none' }}>
                <Button
                  variant="primary"
                  enableArrowSlide
                  icon={<Icon icon={ArrowRight} size="sm" />}
                  iconPosition="right"
                >
                  Open Payments
                </Button>
              </Link>
              <Link href="/cycles" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" icon={<Icon icon={CycleIcon} size="sm" />}>
                  Explore Settlements
                </Button>
              </Link>
            </div>

            <div className={styles.heroGuarantee}>
              <span className={styles.guaranteeItem}>
                <Icon icon={ShieldCheck} size="sm" color="var(--color-success)" />
                Non-custodial kernel
              </span>
              <span>&bull;</span>
              <span className={styles.guaranteeItem}>
                <Icon icon={Lock} size="sm" color="var(--color-ink)" />
                Collect-then-distribute
              </span>
              <span>&bull;</span>
              <span className={styles.guaranteeItem}>
                <Icon icon={Clock} size="sm" color="var(--color-wine)" />
                72h automated refund guarantee
              </span>
            </div>
          </section>

          {/* ==========================================================================
              2. SIGNATURE NETTING MOMENT (Interactive Simulation)
              ========================================================================== */}
          <section className={styles.simulatorSection} aria-label="Interactive Netting Simulator">
            <div className={styles.simulatorHeader}>
              <div className={styles.simulatorTitleGroup}>
                <h2 className={styles.simulatorTitle}>Interactive Clearinghouse Simulator</h2>
                <span className={styles.simulatorSubtitle}>
                  Select a live counterparty scenario to witness multilateral debt collapse in real time.
                </span>
              </div>

              <div className={styles.personaTabs} role="tablist">
                {Object.values(CLEARING_SCENARIOS).map((s) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={activeScenarioId === s.id}
                    className={`${styles.personaTab} ${activeScenarioId === s.id ? styles.personaTabActive : ''}`}
                    onClick={() => setActiveScenarioId(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Switcher Bar */}
            <div className={styles.modeToggleBar}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  Clearing Resolution:
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-muted)', marginLeft: '8px' }}>
                  {clearingMode === 'gross'
                    ? 'Bilateral fragmented transfers (liquidity locked)'
                    : 'Netteo atomic zero-sum netting (liquidity conserved)'}
                </span>
              </div>

              <div className={styles.modeToggleButtons}>
                <button
                  type="button"
                  className={`${styles.modeButton} ${clearingMode === 'gross' ? styles.modeButtonGrossActive : styles.modeButtonGross}`}
                  onClick={() => setClearingMode('gross')}
                >
                  Gross Claims Mode
                </button>
                <button
                  type="button"
                  className={`${styles.modeButton} ${clearingMode === 'net' ? styles.modeButtonNetActive : styles.modeButtonNet}`}
                  onClick={() => setClearingMode('net')}
                >
                  Net Settlement Mode
                </button>
              </div>
            </div>

            {/* Key Metrics Display */}
            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>Total Gross Obligations</span>
                <span className={styles.metricValue}>{formatUsd(scenario.grossVolume)}</span>
                <span className={styles.metricHint}>
                  {scenario.grossTxCount} separate bilateral transactions
                </span>
              </div>

              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>Net Capital Required</span>
                <span className={`${styles.metricValue} ${styles.metricAccentValue}`}>
                  {clearingMode === 'net' ? formatUsd(scenario.netCapitalRequired) : formatUsd(scenario.grossVolume)}
                </span>
                <span className={styles.metricHint}>
                  {clearingMode === 'net' ? '1 atomic Mezo settlement' : 'Full capital locked in flight'}
                </span>
              </div>

              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>Capital Conserved</span>
                <span className={`${styles.metricValue} ${styles.metricSavingsValue}`}>
                  {clearingMode === 'net' ? `${scenario.savedPercent}% Saved` : '0% (Standard Bilateral)'}
                </span>
                <span className={styles.metricHint}>
                  {clearingMode === 'net'
                    ? `${formatUsd(scenario.grossVolume - scenario.netCapitalRequired)} freed instantly`
                    : 'Requires 100% upfront liquidity'}
                </span>
              </div>
            </div>

            {/* Progress Conservation Bar */}
            {clearingMode === 'net' && (
              <div className={styles.conservationCard}>
                <div className={styles.conservationHeader}>
                  <span style={{ color: 'var(--color-ink)' }}>Net Liquidity Efficiency</span>
                  <span style={{ color: 'var(--color-success)' }}>{scenario.savedPercent}% Conserved</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${scenario.savedPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Participant Breakdown Table */}
            <div className={styles.participantTableContainer}>
              <table className={styles.participantTable}>
                <thead>
                  <tr>
                    <th>Counterparty</th>
                    <th>Inbound Gross</th>
                    <th>Outbound Gross</th>
                    <th>Net Balance</th>
                    <th>Execution Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.participants.map((p) => (
                    <tr key={p.name}>
                      <td>
                        <div className={styles.participantName}>{p.name}</div>
                        <div className={styles.participantRole}>{p.role}</div>
                      </td>
                      <td className={styles.numberCell}>{formatUsd(p.inboundGross)}</td>
                      <td className={styles.numberCell}>{formatUsd(p.outboundGross)}</td>
                      <td className={styles.numberCell}>
                        {clearingMode === 'net' ? (
                          <span
                            className={p.netPosition < 0 ? styles.debtorText : styles.creditorText}
                          >
                            {p.netPosition < 0
                              ? `-${formatUsd(Math.abs(p.netPosition))}`
                              : `+${formatUsd(p.netPosition)}`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-muted)' }}>Bilateral</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-ink-secondary)', maxWidth: '320px' }}>
                        {clearingMode === 'net' ? p.netNote : p.grossNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ==========================================================================
              3. FOUR CORE INSTITUTIONAL ANSWERS (Codex Part 9)
              ========================================================================== */}
          <section className={styles.answersSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionKicker}>Protocol Architecture</span>
              <h2 className={styles.sectionTitle}>Four Pillars of Autonomous Clearing</h2>
            </div>

            <div className={styles.answersGrid}>
              <div className={styles.answerCard}>
                <div className={styles.answerIconBox}>
                  <Icon icon={ObligationIcon} size="md" color="var(--color-wine)" />
                </div>
                <span className={styles.answerQuestion}>What It Is</span>
                <h3 className={styles.answerHeadline}>Multilateral Debt Netting</h3>
                <p className={styles.answerBody}>
                  An institutional clearinghouse protocol that replaces fragmented bilateral payments with a mathematically optimal zero-sum settlement engine.
                </p>
              </div>

              <div className={styles.answerCard}>
                <div className={styles.answerIconBox}>
                  <Icon icon={Layers} size="md" color="var(--color-wine)" />
                </div>
                <span className={styles.answerQuestion}>Who It Is For</span>
                <h3 className={styles.answerHeadline}>Treasuries & Guilds</h3>
                <p className={styles.answerBody}>
                  Built for DAO coalitions, developer pods, OTC market desks, and service supply chains with recurring inter-entity payment obligations.
                </p>
              </div>

              <div className={styles.answerCard}>
                <div className={styles.answerIconBox}>
                  <Icon icon={TrendingUp} size="md" color="var(--color-wine)" />
                </div>
                <span className={styles.answerQuestion}>Why It Matters</span>
                <h3 className={styles.answerHeadline}>Up to 90% Capital Savings</h3>
                <p className={styles.answerBody}>
                  Offsets circular claims automatically, eliminating liquidity lockups and preventing counterparty credit gridlock without extra collateral.
                </p>
              </div>

              <div className={styles.answerCard}>
                <div className={styles.answerIconBox}>
                  <Icon icon={NettingIcon} size="md" color="var(--color-wine)" />
                </div>
                <span className={styles.answerQuestion}>How It Works</span>
                <h3 className={styles.answerHeadline}>Atomic MUSD Settlement</h3>
                <p className={styles.answerBody}>
                  Obligations are snapshot in deterministic cycles. Net debtors deposit MUSD; the Settlement Kernel atomically distributes funds to net creditors.
                </p>
              </div>
            </div>
          </section>

          {/* ==========================================================================
              4. PROTOCOL PHASES BREAKDOWN
              ========================================================================== */}
          <section className={styles.phasesSection}>
            <div className={styles.sectionHeader} style={{ marginBottom: 'var(--space-2xl)' }}>
              <span className={styles.sectionKicker}>Lifecycle</span>
              <h2 className={styles.sectionTitle}>Deterministic 4-Phase Settlement</h2>
            </div>

            <div className={styles.phaseGrid}>
              <div className={styles.phaseCard}>
                <span className={styles.phaseStep}>Phase 01</span>
                <h3 className={styles.phaseName}>Obligation Registration</h3>
                <p className={styles.phaseDesc}>
                  Counterparties submit claims authorized via EIP-712 structured cryptographic signatures.
                </p>
                <code className={styles.phaseSignature}>registerObligation()</code>
              </div>

              <div className={styles.phaseCard}>
                <span className={styles.phaseStep}>Phase 02</span>
                <h3 className={styles.phaseName}>Cycle Snapshot</h3>
                <p className={styles.phaseDesc}>
                  Ledger state locks. The zero-sum netting algorithm computes each counterparty's net balance.
                </p>
                <code className={styles.phaseSignature}>freezeCycle()</code>
              </div>

              <div className={styles.phaseCard}>
                <span className={styles.phaseStep}>Phase 03</span>
                <h3 className={styles.phaseName}>Net Debt Funding</h3>
                <p className={styles.phaseDesc}>
                  Net debtors deposit their net MUSD balance into the kernel. Reciprocal debts are canceled.
                </p>
                <code className={styles.phaseSignature}>depositNetDebt()</code>
              </div>

              <div className={styles.phaseCard}>
                <span className={styles.phaseStep}>Phase 04</span>
                <h3 className={styles.phaseName}>Atomic Distribution</h3>
                <p className={styles.phaseDesc}>
                  Once 100% funded, the kernel pays net creditors and issues verifiable audit statements.
                </p>
                <code className={styles.phaseSignature}>distributeAndClose()</code>
              </div>
            </div>
          </section>

          {/* ==========================================================================
              5. VERIFIED MEZO TESTNET REGISTRY
              ========================================================================== */}
          <section className={styles.registrySection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionKicker}>On-Chain Invariants</span>
              <h2 className={styles.sectionTitle}>Verified Smart Contract Registry</h2>
            </div>

            <div className={styles.registryGrid}>
              {contracts.map((c) => (
                <div key={c.address} className={styles.registryCard}>
                  <div className={styles.registryHeader}>
                    <span className={styles.registryLabel}>{c.name}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        backgroundColor: 'var(--color-sand)',
                        borderRadius: 'var(--radius-xs)',
                        fontWeight: 600,
                      }}
                    >
                      Mezo 31611
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-ink-secondary)', lineHeight: 1.5 }}>
                    {c.desc}
                  </p>
                  <div className={styles.addressBox}>
                    <span className={styles.addressText}>
                      {c.address.slice(0, 10)}...{c.address.slice(-8)}
                    </span>
                    <Button
                      variant="secondary"
                      style={{ minHeight: '32px', padding: '0 10px', fontSize: '12px' }}
                      icon={<Icon icon={copiedContract === c.address ? Check : Copy} size="sm" />}
                      onClick={() => handleCopy(c.address, c.name)}
                    >
                      {copiedContract === c.address ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ==========================================================================
              6. FAQ ACCORDION
              ========================================================================== */}
          <section className={styles.faqSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionKicker}>Guidance</span>
              <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
            </div>

            <div>
              {faqs.map((faq, index) => (
                <div key={faq.question} className={styles.accordionItem}>
                  <button
                    type="button"
                    aria-expanded={openFaq === index}
                    className={styles.accordionTrigger}
                    onClick={() => toggleFaq(index)}
                  >
                    <span>{faq.question}</span>
                    <Icon icon={openFaq === index ? ChevronUp : ChevronDown} size="sm" />
                  </button>
                  {openFaq === index && (
                    <div className={styles.accordionContent}>
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ==========================================================================
              7. CALL TO ACTION BANNER
              ========================================================================== */}
          <section className={styles.ctaBanner}>
            <h2 className={styles.ctaHeadline}>Ready to eliminate bilateral payment gridlock?</h2>
            <p className={styles.ctaSubtitle}>
              Connect your Mezo wallet, propose mutual obligations with your counterparties, and execute atomic net settlements in MUSD.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/obligations" style={{ textDecoration: 'none' }}>
                <Button variant="sandSolid" icon={<Icon icon={ArrowRight} size="sm" />} iconPosition="right">
                  Open Payments
                </Button>
              </Link>
              <Link href="/cycles" style={{ textDecoration: 'none' }}>
                <Button
                  variant="wineOutline"
                  style={{ borderColor: 'var(--color-sand)', color: 'var(--color-sand)' }}
                >
                  View Settlements
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
