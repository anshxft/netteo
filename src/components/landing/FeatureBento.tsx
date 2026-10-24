'use client';

import React, { useState } from 'react';
import styles from './FeatureBento.module.css';
import { ShieldCheck, Scale, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { NettingIcon, SnapshotIcon, ObligationIcon } from '@/components/icons/netteo';

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
        grossNote: 'Owes Bob $15,000 for contracts; owed $4,500 by Charlie for RPC',
        netNote: 'Deposits $10,500.00 MUSD. Reciprocal $4,500 loop is automatically canceled.',
      },
      {
        name: 'Bob',
        role: 'Security Auditor',
        inboundGross: 15000,
        outboundGross: 12000,
        netPosition: 3000,
        grossNote: 'Owed $15,000 by Alice; owes Charlie $12,000 for formal verification',
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
        role: 'Core Engineering',
        inboundGross: 25000,
        outboundGross: 110000,
        netPosition: -85000,
        grossNote: 'Owes InfraGuild $110,000; owed $25,000 by DesignGuild for dApp frontend',
        netNote: 'Deposits $85,000.00 MUSD net. $25,000 circular debt loop removed.',
      },
      {
        name: 'InfraGuild',
        role: 'Node Operations',
        inboundGross: 110000,
        outboundGross: 60000,
        netPosition: 50000,
        grossNote: 'Owed $110,000 by DevDAO; owes DesignGuild $60,000 for dashboard UI',
        netNote: 'Receives $50,000.00 MUSD payout directly.',
      },
      {
        name: 'DesignGuild',
        role: 'Brand & UX Pod',
        inboundGross: 60000,
        outboundGross: 25000,
        netPosition: 35000,
        grossNote: 'Owed $60,000 by InfraGuild; owes DevDAO $25,000 for contract integration',
        netNote: 'Receives $35,000.00 MUSD payout directly.',
      },
    ],
  },
  collective: {
    id: 'collective',
    label: 'Service Collective',
    grossVolume: 82000,
    netCapitalRequired: 24000,
    savedPercent: 70.7,
    grossTxCount: 3,
    netTxCount: 1,
    participants: [
      {
        name: 'Frontend Studio',
        role: 'Web3 Interfaces',
        inboundGross: 8000,
        outboundGross: 38000,
        netPosition: -30000,
        grossNote: 'Owes SmartContract Studio $38,000; owed $8,000 by QA Collective',
        netNote: 'Deposits $30,000.00 MUSD net. Eliminates $8,000 redundant transfer.',
      },
      {
        name: 'SmartContract Studio',
        role: 'EVM Solidity',
        inboundGross: 38000,
        outboundGross: 26000,
        netPosition: 12000,
        grossNote: 'Owed $38,000 by Frontend; owes QA Collective $26,000 for fuzz testing',
        netNote: 'Receives $12,000.00 MUSD payout directly.',
      },
      {
        name: 'QA Collective',
        role: 'Audit & Testnet',
        inboundGross: 26000,
        outboundGross: 8000,
        netPosition: 18000,
        grossNote: 'Owed $26,000 by SmartContract; owes Frontend $8,000 for test harnesses',
        netNote: 'Receives $18,000.00 MUSD payout directly.',
      },
    ],
  },
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function FeatureBento() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('pod');
  const [clearingMode, setClearingMode] = useState<'gross' | 'net'>('net');

  const scenario = CLEARING_SCENARIOS[activeScenarioId] || CLEARING_SCENARIOS.pod;

  return (
    <section id="simulator" className={styles.bentoSection}>
      <div className={styles.headerContainer}>
        <div className={styles.eyebrow}>
          <span>✦ Liquidity Efficiency Benchmark</span>
        </div>
        <h2 className={styles.title}>
          Save up to 85% upfront liquidity with
          <span className={styles.highlightPill}>Atomic Netting</span>
        </h2>
        <p className={styles.subtitle}>
          Compare standard fragmented transfers against Netteo multilateral clearing across real Web3 team scenarios.
        </p>
      </div>

      <div className={styles.bentoGrid}>
        {/* Large Featured Card: Interactive Simulator */}
        <div className={styles.largeCard}>
          <div className={styles.simHeader}>
            <div className={styles.simTitleGroup}>
              <h3 className={styles.simTitle}>Interactive Clearing Simulator</h3>
              <p className={styles.simDesc}>
                Select a scenario and toggle clearing resolution to inspect capital savings.
              </p>
            </div>

            {/* Scenario Tabs */}
            <div className={styles.scenarioTabs} role="tablist">
              {Object.values(CLEARING_SCENARIOS).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={activeScenarioId === s.id}
                  className={`${styles.scenarioTab} ${activeScenarioId === s.id ? styles.scenarioTabActive : ''}`}
                  onClick={() => setActiveScenarioId(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Bar */}
          <div className={styles.modeBar}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                Clearing Resolution:
              </span>
              <span style={{ fontSize: '13px', color: 'var(--color-muted)', marginLeft: '8px' }}>
                {clearingMode === 'gross'
                  ? 'Bilateral fragmented transfers (liquidity locked in flight)'
                  : 'Netteo atomic zero-sum netting (liquidity conserved)'}
              </span>
            </div>

            <div className={styles.modeButtons}>
              <button
                type="button"
                className={`${styles.modeBtn} ${clearingMode === 'gross' ? styles.modeBtnGrossActive : ''}`}
                onClick={() => setClearingMode('gross')}
              >
                Gross Claims Mode
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${clearingMode === 'net' ? styles.modeBtnNetActive : ''}`}
                onClick={() => setClearingMode('net')}
              >
                Net Settlement Mode
              </button>
            </div>
          </div>

          {/* Live Metrics Grid */}
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total Gross Obligations</span>
              <span className={styles.metricValue}>{formatUsd(scenario.grossVolume)}</span>
              <span className={styles.metricHint}>{scenario.grossTxCount} separate bilateral invoices</span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Net Capital Required</span>
              <span className={styles.metricValue} style={{ color: 'var(--color-wine)' }}>
                {clearingMode === 'net' ? formatUsd(scenario.netCapitalRequired) : formatUsd(scenario.grossVolume)}
              </span>
              <span className={styles.metricHint}>
                {clearingMode === 'net' ? '1 atomic Mezo settlement' : 'Full capital locked in transit'}
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Capital Conserved</span>
              <span className={`${styles.metricValue} ${styles.metricSavedValue}`}>
                {clearingMode === 'net' ? `${scenario.savedPercent}% Saved` : '0% (Standard Bilateral)'}
              </span>
              <span className={styles.metricHint}>
                {clearingMode === 'net'
                  ? `${formatUsd(scenario.grossVolume - scenario.netCapitalRequired)} freed instantly`
                  : 'Requires 100% upfront liquidity'}
              </span>
            </div>
          </div>

          {/* Savings Progress Bar */}
          {clearingMode === 'net' && (
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="Liquidity Efficiency Gauge"
              aria-valuenow={scenario.savedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${scenario.savedPercent}% capital conserved`}
            >
              <div className={styles.progressFill} style={{ width: `${scenario.savedPercent}%` }} />
            </div>
          )}

          {/* Counterparty Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Inbound Gross</th>
                  <th>Outbound Gross</th>
                  <th>Net Balance</th>
                  <th>Execution Detail</th>
                </tr>
              </thead>
              <tbody>
                {scenario.participants.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{p.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>{p.role}</div>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatUsd(p.inboundGross)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatUsd(p.outboundGross)}</td>
                    <td>
                      {clearingMode === 'net' ? (
                        <span className={p.netPosition < 0 ? styles.debtorText : styles.creditorText}>
                          {p.netPosition < 0 ? `-${formatUsd(Math.abs(p.netPosition))}` : `+${formatUsd(p.netPosition)}`}
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
        </div>

        {/* 3 Smaller Companion Bento Cards */}
        <div id="architecture" className={styles.smallCardsRow}>
          <div className={styles.smallCard}>
            <div className={styles.cardIconPill}>
              <ShieldCheck size={20} />
            </div>
            <h4 className={styles.cardHeading}>Debtor Authorization</h4>
            <p className={styles.cardText}>
              Every obligation requires an explicit cryptographic EIP-712 debtor acknowledgement signature
              before being eligible for netting. No unilateral unauthorized charges.
            </p>
          </div>

          <div className={styles.smallCard}>
            <div className={styles.cardIconPill}>
              <Icon icon={NettingIcon} size="md" />
            </div>
            <h4 className={styles.cardHeading}>Zero-Sum Invariant</h4>
            <p className={styles.cardText}>
              The mathematical netting solver enforces that total net debits strictly equal total net
              credits (Σ Net = 0). Verified by Solidity invariants on Mezo.
            </p>
          </div>

          <div className={styles.smallCard}>
            <div className={styles.cardIconPill}>
              <Icon icon={SnapshotIcon} size="md" />
            </div>
            <h4 className={styles.cardHeading}>Permanent Merkle Proofs</h4>
            <p className={styles.cardText}>
              Gross invoices and counterparty claims are never erased. Every settlement anchors an immutable
              Merkle root hash on-chain for exportable accounting and compliance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
