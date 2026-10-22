'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import obStyles from '@/features/obligations/components/ObligationsView.module.css';
import { getCycleById, VERIFIED_MEZO_CYCLE } from '@/features/settlement-cycles/store';
import { syncCyclesFromSupabase } from '@/lib/db/syncService';
import { SettlementCycle } from '@/features/settlement-cycles/types';
import { loadObligations, formatBaseUnitsToDisplay } from '@/features/obligations/store';
import { Obligation } from '@/features/obligations/types';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { SnapshotIcon } from '@/components/icons/netteo';
import { ArrowLeft, Download, ShieldCheck, CheckCircle, ExternalLink } from 'lucide-react';
import { CONTRACT_ADDRESSES } from '@/lib/chain/config';

export interface AuditStatementViewProps {
  cycleId?: string;
}

const EXPLORER_BASE = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.test.mezo.org';

export function AuditStatementView({ cycleId }: AuditStatementViewProps) {
  const { mode } = useWorkspace();
  const [cycle, setCycle] = useState<SettlementCycle | null>(null);
  const [includedObligations, setIncludedObligations] = useState<Obligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    if (cycleId) {
      const found = getCycleById(cycleId, mode);
      if (found) {
        setCycle(found);
        const allObs = loadObligations(mode);
        setIncludedObligations(allObs.filter((o) => found.includedObligationIds.includes(o.id)));
        setIsLoading(false);
      } else if (mode === 'live') {
        if (cycleId.toLowerCase() === VERIFIED_MEZO_CYCLE.id.toLowerCase()) {
          setCycle(VERIFIED_MEZO_CYCLE);
          const allObs = loadObligations('live');
          setIncludedObligations(allObs.filter((o) => VERIFIED_MEZO_CYCLE.includedObligationIds.includes(o.id)));
          setIsLoading(false);
        } else {
          syncCyclesFromSupabase()
            .then((remote) => {
              if (isCancelled) return;
              const remoteFound = remote?.find((c) => c.id.toLowerCase() === cycleId.toLowerCase());
              if (remoteFound) {
                setCycle(remoteFound);
                const allObs = loadObligations('live');
                setIncludedObligations(allObs.filter((o) => remoteFound.includedObligationIds.includes(o.id)));
              }
            })
            .finally(() => {
              if (!isCancelled) setIsLoading(false);
            });
        }
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [cycleId, mode]);

  const handleExportCSV = () => {
    if (!cycle) return;

    const rows: string[] = [];
    rows.push('--- NETTEO SETTLEMENT AUDIT STATEMENT ---');
    rows.push(`Cycle ID,${cycle.id}`);
    rows.push(`Cycle Number,${cycle.cycleNumber}`);
    rows.push(`Status,${cycle.state}`);
    rows.push(`Snapshot Commitment Hash,${cycle.snapshotCommitment}`);
    rows.push(`Algorithm Version,${cycle.algorithmVersion}`);
    rows.push(`Settlement Currency,${cycle.tokenSymbol || 'MUSD'}`);
    rows.push(`Settlement Token Address,${cycle.tokenAddress || CONTRACT_ADDRESSES.musd}`);
    rows.push(`Settlement Contract Address,${CONTRACT_ADDRESSES.settlementKernel}`);
    rows.push(`Network,Mezo Testnet (Chain ID 31611)`);
    rows.push(`Gross Obligation Total (Base Units),${cycle.grossObligationTotal.toString()}`);
    rows.push(`Gross Obligation Total (Formatted),${formatBaseUnitsToDisplay(cycle.grossObligationTotal, cycle.tokenSymbol || 'MUSD')}`);
    rows.push(`Net Funding Requirement (Base Units),${cycle.netDebtTotal.toString()}`);
    rows.push(`Net Funding Requirement (Formatted),${formatBaseUnitsToDisplay(cycle.netDebtTotal, cycle.tokenSymbol || 'MUSD')}`);
    rows.push(`Total Funded (Base Units),${cycle.totalFunded.toString()}`);
    rows.push(`Total Distributed (Base Units),${cycle.totalDistributed.toString()}`);
    rows.push(`Total Refunded (Base Units),${cycle.totalRefunded.toString()}`);
    rows.push(`Created At,${cycle.createdAt}`);
    if (cycle.completedAt) rows.push(`Completed At,${cycle.completedAt}`);
    if (cycle.txCreationHash) rows.push(`Creation Tx Hash,${cycle.txCreationHash},${EXPLORER_BASE}/tx/${cycle.txCreationHash}`);
    if (cycle.txDepositHash) rows.push(`Deposit Tx Hash,${cycle.txDepositHash},${EXPLORER_BASE}/tx/${cycle.txDepositHash}`);
    if (cycle.txSettlementHash) rows.push(`Settlement Tx Hash,${cycle.txSettlementHash},${EXPLORER_BASE}/tx/${cycle.txSettlementHash}`);
    rows.push('');
    rows.push('--- INCLUDED GROSS OBLIGATIONS ---');
    rows.push('Obligation ID,Debtor,Creditor,Amount (Base Units),Amount (Formatted),Reference Label,Status');

    for (const ob of includedObligations) {
      rows.push(
        `"${ob.id}","${ob.debtorAddress}","${ob.creditorAddress}","${ob.amount.toString()}","${ob.amountDisplay}","${ob.referenceLabel.replace(/"/g, '""')}","${ob.status}"`
      );
    }

    rows.push('');
    rows.push('--- RECONCILED NET POSITIONS ---');
    rows.push('Participant Address,Gross Payable (Base Units),Gross Receivable (Base Units),Net Position (Base Units),Role');

    for (const [addr, pos] of Object.entries(cycle.nettingResult.positions)) {
      const role = pos.netPosition < 0n ? 'Debtor' : pos.netPosition > 0n ? 'Creditor' : 'Zero';
      rows.push(
        `"${addr}","${pos.grossPayable.toString()}","${pos.grossReceivable.toString()}","${pos.netPosition.toString()}","${role}"`
      );
    }

    rows.push('');
    rows.push('--- NET SETTLEMENT TRANSFERS ---');
    rows.push('From (Debtor),To (Creditor),Amount (Base Units),Amount (Formatted)');

    for (const alloc of cycle.nettingResult.allocations) {
      rows.push(
        `"${alloc.from}","${alloc.to}","${alloc.amount.toString()}","${formatBaseUnitsToDisplay(alloc.amount)}"`
      );
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Netteo-Settlement-Statement-${cycle.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div style={{ padding: 'var(--space-2xl) 0', color: 'var(--color-muted)' }}>Loading audit statement...</div>;
  }

  if (!cycle) {
    return (
      <div className={obStyles.emptyState}>
        <Icon icon={SnapshotIcon} size="lg" color="var(--color-wine)" />
        <h2 className={obStyles.emptyStateTitle}>No Cycle Audit Selected</h2>
        <p className={obStyles.emptyStateDesc}>
          Select a settlement cycle from the cycle registry to view its auditable cryptographic statement.
        </p>
        <Link href="/cycles" style={{ textDecoration: 'none' }}>
          <Button variant="primary">Browse Settlement Cycles</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back button and page title */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <Link
          href={`/cycles/${cycle.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            color: 'var(--color-muted)',
            textDecoration: 'none',
          }}
        >
          <Icon icon={ArrowLeft} size="sm" />
          <span>Back to Cycle #{cycle.cycleNumber}</span>
        </Link>
      </div>

      <div className={obStyles.pageHeader}>
        <div className={obStyles.titleArea}>
          <h1>Settlement Audit Statement</h1>
          <p className={obStyles.subtitle}>
            Cryptographically committed audit ledger linking gross obligations to net settlement payout records on Mezo.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<Icon icon={Download} size="sm" />}
          onClick={handleExportCSV}
        >
          Export CSV Statement
        </Button>
      </div>

      {/* Snapshot Commitment Proof Box */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
          <Icon icon={ShieldCheck} size="md" color="var(--color-wine)" />
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
            Snapshot Commitment & On-Chain Trust Boundary
          </h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: '0 0 var(--space-md) 0', lineHeight: 1.5 }}>
          <strong>Trust Boundary:</strong> The <code>SettlementKernel</code> smart contract enforces atomic zero-sum solvency on-chain (requiring 100% net debtor deposits before creditor distribution). The snapshot commitment below is immutably stored on-chain as a cryptographic anchor (keccak256 binding chain ID, token, sorted obligations, and net positions) allowing independent auditors to verify that the executed cycle matches the agreed off-chain obligations.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Cycle Identifier</div>
            <code style={{ fontSize: '13px', color: 'var(--color-ink)' }}>{cycle.id}</code>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Snapshot Commitment Hash (Keccak256)</div>
            <code style={{ fontSize: '12px', color: 'var(--color-wine)' }}>{cycle.snapshotCommitment}</code>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Settlement Contract (Mezo 31611)</div>
            <a
              href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESSES.settlementKernel}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: 'var(--color-ink)', textDecoration: 'underline' }}
            >
              {CONTRACT_ADDRESSES.settlementKernel.slice(0, 10)}...{CONTRACT_ADDRESSES.settlementKernel.slice(-8)}
              <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
            </a>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>On-Chain Solvency Invariant</div>
            <span style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: 600 }}>&Sigma; net positions = 0 (Enforced)</span>
          </div>
        </div>

        {(cycle.txCreationHash || cycle.txDepositHash || cycle.txSettlementHash) && (
          <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap', fontSize: '12px' }}>
            {cycle.txCreationHash && (
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Creation Tx: </span>
                <a
                  href={`${EXPLORER_BASE}/tx/${cycle.txCreationHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-wine)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {cycle.txCreationHash.slice(0, 10)}...{cycle.txCreationHash.slice(-8)}
                  <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '3px', verticalAlign: 'middle' }} />
                </a>
              </div>
            )}
            {cycle.txDepositHash && (
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Deposit Tx: </span>
                <a
                  href={`${EXPLORER_BASE}/tx/${cycle.txDepositHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-wine)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {cycle.txDepositHash.slice(0, 10)}...{cycle.txDepositHash.slice(-8)}
                  <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '3px', verticalAlign: 'middle' }} />
                </a>
              </div>
            )}
            {cycle.txSettlementHash && (
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Settlement Tx: </span>
                <a
                  href={`${EXPLORER_BASE}/tx/${cycle.txSettlementHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-wine)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {cycle.txSettlementHash.slice(0, 10)}...{cycle.txSettlementHash.slice(-8)}
                  <Icon icon={ExternalLink} size="sm" style={{ marginLeft: '3px', verticalAlign: 'middle' }} />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 1: Included Gross Obligations */}
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 'var(--space-sm)' }}>
        1. Frozen Gross Obligation Snapshot ({includedObligations.length} claims)
      </h3>
      <div className={obStyles.ledgerContainer} style={{ marginBottom: 'var(--space-2xl)' }}>
        <table className={obStyles.ledgerTable} aria-label="Frozen obligations table">
          <thead>
            <tr>
              <th scope="col">Obligation ID</th>
              <th scope="col">Debtor</th>
              <th scope="col">Creditor</th>
              <th scope="col">Reference</th>
              <th scope="col" style={{ textAlign: 'right' }}>Amount</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {includedObligations.map((ob) => (
              <tr key={ob.id}>
                <td><span className={obStyles.addressCode}>{ob.id}</span></td>
                <td><span className={obStyles.addressCode}>{ob.debtorAddress.slice(0, 6)}...{ob.debtorAddress.slice(-4)}</span></td>
                <td><span className={obStyles.addressCode}>{ob.creditorAddress.slice(0, 6)}...{ob.creditorAddress.slice(-4)}</span></td>
                <td><div className={obStyles.labelCell}>{ob.referenceLabel}</div></td>
                <td style={{ textAlign: 'right' }}><span className={obStyles.amountCell}>{ob.amountDisplay}</span></td>
                <td><span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 500 }}>{ob.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section 2: Reconciled Net Payout Transfers */}
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 'var(--space-sm)' }}>
        2. Atomic Net Transfers Executed ({cycle.nettingResult.allocations.length} transfers)
      </h3>
      <div className={obStyles.ledgerContainer}>
        <table className={obStyles.ledgerTable} aria-label="Net transfers executed table">
          <thead>
            <tr>
              <th scope="col">From (Net Debtor)</th>
              <th scope="col">To (Net Creditor)</th>
              <th scope="col" style={{ textAlign: 'right' }}>Settlement Amount</th>
              <th scope="col">Settlement Status</th>
            </tr>
          </thead>
          <tbody>
            {cycle.nettingResult.allocations.map((alloc, idx) => (
              <tr key={idx}>
                <td><span className={obStyles.addressCode}>{alloc.from}</span></td>
                <td><span className={obStyles.addressCode}>{alloc.to}</span></td>
                <td style={{ textAlign: 'right' }}><span className={obStyles.amountCell}>{formatBaseUnitsToDisplay(alloc.amount, cycle.tokenSymbol || 'MUSD')}</span></td>
                <td>
                  <span style={{ fontSize: '12px', color: cycle.state === 'Completed' ? 'var(--color-success)' : 'var(--color-sand-hover)', fontWeight: 600 }}>
                    {cycle.state === 'Completed' ? 'Transferred (Atomic)' : 'Pending Funding'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
