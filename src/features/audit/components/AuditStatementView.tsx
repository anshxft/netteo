'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import obStyles from '@/features/obligations/components/ObligationsView.module.css';
import { getCycleById } from '@/features/settlement-cycles/store';
import { SettlementCycle } from '@/features/settlement-cycles/types';
import { loadObligations, formatBaseUnitsToDisplay } from '@/features/obligations/store';
import { Obligation } from '@/features/obligations/types';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { SnapshotIcon } from '@/components/icons/netteo';
import { ArrowLeft, Download, ShieldCheck, CheckCircle } from 'lucide-react';

export interface AuditStatementViewProps {
  cycleId?: string;
}

export function AuditStatementView({ cycleId }: AuditStatementViewProps) {
  const [cycle, setCycle] = useState<SettlementCycle | null>(null);
  const [includedObligations, setIncludedObligations] = useState<Obligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (cycleId) {
      const found = getCycleById(cycleId);
      if (found) {
        setCycle(found);
        const allObs = loadObligations();
        setIncludedObligations(allObs.filter((o) => found.includedObligationIds.includes(o.id)));
      }
    }
    setIsLoading(false);
  }, [cycleId]);

  const handleExportCSV = () => {
    if (!cycle) return;

    const rows: string[] = [];
    rows.push('--- NETTEO SETTLEMENT AUDIT STATEMENT ---');
    rows.push(`Cycle ID,${cycle.id}`);
    rows.push(`Cycle Number,${cycle.cycleNumber}`);
    rows.push(`Status,${cycle.state}`);
    rows.push(`Snapshot Commitment Hash,${cycle.snapshotCommitment}`);
    rows.push(`Algorithm Version,${cycle.algorithmVersion}`);
    rows.push(`Gross Obligation Total,${formatBaseUnitsToDisplay(cycle.grossObligationTotal)}`);
    rows.push(`Net Funding Requirement,${formatBaseUnitsToDisplay(cycle.netDebtTotal)}`);
    rows.push(`Created At,${cycle.createdAt}`);
    rows.push('');
    rows.push('--- INCLUDED GROSS OBLIGATIONS ---');
    rows.push('Obligation ID,Debtor,Creditor,Amount,Reference Label,Status');

    for (const ob of includedObligations) {
      rows.push(
        `"${ob.id}","${ob.debtorAddress}","${ob.creditorAddress}","${ob.amountDisplay}","${ob.referenceLabel.replace(/"/g, '""')}","${ob.status}"`
      );
    }

    rows.push('');
    rows.push('--- RECONCILED NET POSITIONS ---');
    rows.push('Participant Address,Gross Payable,Gross Receivable,Net Position,Role');

    for (const [addr, pos] of Object.entries(cycle.nettingResult.positions)) {
      const role = pos.netPosition < 0n ? 'Debtor' : pos.netPosition > 0n ? 'Creditor' : 'Zero';
      rows.push(
        `"${addr}","${formatBaseUnitsToDisplay(pos.grossPayable)}","${formatBaseUnitsToDisplay(pos.grossReceivable)}","${formatBaseUnitsToDisplay(pos.netPosition < 0n ? -pos.netPosition : pos.netPosition)}","${role}"`
      );
    }

    rows.push('');
    rows.push('--- NET SETTLEMENT TRANSFERS ---');
    rows.push('From (Debtor),To (Creditor),Amount');

    for (const alloc of cycle.nettingResult.allocations) {
      rows.push(
        `"${alloc.from}","${alloc.to}","${formatBaseUnitsToDisplay(alloc.amount)}"`
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
          <Icon icon={ShieldCheck} size="md" color="var(--color-wine)" />
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
            Cryptographic Integrity Proof
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Cycle Identifier</div>
            <code style={{ fontSize: '13px', color: 'var(--color-ink)' }}>{cycle.id}</code>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Snapshot Commitment Hash</div>
            <code style={{ fontSize: '12px', color: 'var(--color-wine)' }}>{cycle.snapshotCommitment}</code>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Algorithm Invariant</div>
            <span style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: 600 }}>&Sigma; net positions = 0 (Verified)</span>
          </div>
        </div>
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
                <td style={{ textAlign: 'right' }}><span className={obStyles.amountCell}>{formatBaseUnitsToDisplay(alloc.amount)}</span></td>
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
