'use client';

import React, { useState } from 'react';
import styles from './NettingGraph.module.css';
import { NettingResult, ObligationInput } from '../netting';
import { formatBaseUnitsToDisplay } from '@/features/obligations/store';
import { Icon } from '@/components/icons/Icon';
import { NettingIcon, ObligationIcon, NetPositionIcon } from '@/components/icons/netteo';

export interface NettingGraphProps {
  nettingResult: NettingResult;
  includedObligations: ObligationInput[];
}

interface NodeCoordinate {
  address: string;
  label: string;
  x: number;
  y: number;
}

export function NettingGraph({ nettingResult, includedObligations }: NettingGraphProps) {
  const [viewMode, setViewMode] = useState<'net' | 'gross'>('net');

  // Collect distinct participants
  const participants = Object.keys(nettingResult.positions).sort();
  const participantCount = participants.length;

  // Geometry: circular distribution inside 640x260 SVG
  const width = 640;
  const height = 260;
  const cx = width / 2;
  const cy = height / 2;
  const radiusX = 220;
  const radiusY = 85;

  const nodeMap = new Map<string, NodeCoordinate>();
  participants.forEach((addr, i) => {
    const angle = (i / Math.max(participantCount, 1)) * 2 * Math.PI - Math.PI / 2;
    const x = cx + radiusX * Math.cos(angle);
    const y = cy + radiusY * Math.sin(angle);
    const label = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    nodeMap.set(addr, { address: addr, label, x, y });
  });

  // Calculate efficiency metrics
  const grossTotal = nettingResult.grossObligationTotal;
  const netTotal = nettingResult.netFundingRequirement;
  const capitalSaved = grossTotal > netTotal ? grossTotal - netTotal : 0n;

  return (
    <div className={styles.container}>
      <div className={styles.graphHeader}>
        <div className={styles.titleArea}>
          <h2>Signature Netting Transition</h2>
          <p className={styles.subtitle}>
            {viewMode === 'gross'
              ? `Displaying ${includedObligations.length} gross bilateral obligations before reconciliation.`
              : `Collapsed into ${nettingResult.allocations.length} net settlement transfers (${nettingResult.debtors.length} debtors &bull; ${nettingResult.creditors.length} creditors).`}
          </p>
        </div>

        {/* User-Triggered View Toggle (Codex Part 1) */}
        <div className={styles.viewToggle} role="group" aria-label="Netting graph view mode">
          <button
            type="button"
            className={`${styles.toggleBtn} ${viewMode === 'gross' ? styles.toggleBtnActive : ''}`}
            onClick={() => setViewMode('gross')}
            aria-pressed={viewMode === 'gross'}
          >
            <Icon icon={ObligationIcon} size="sm" />
            <span>Gross Claims ({includedObligations.length})</span>
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${viewMode === 'net' ? styles.toggleBtnActive : ''}`}
            onClick={() => setViewMode('net')}
            aria-pressed={viewMode === 'net'}
          >
            <Icon icon={NettingIcon} size="sm" />
            <span>Net Settlement ({nettingResult.allocations.length})</span>
          </button>
        </div>
      </div>

      {/* Interactive SVG Stage */}
      <svg
        className={styles.svgStage}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Netting obligation vector diagram"
      >
        <defs>
          {/* Arrowhead marker for directed claims */}
          <marker
            id="arrow-gross"
            viewBox="0 0 10 10"
            refX="20"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--color-muted)" />
          </marker>

          <marker
            id="arrow-net"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0.5 L 9 5 L 0 9.5 z" fill="var(--color-wine)" />
          </marker>
        </defs>

        {/* --- Vectors: Gross Claims View --- */}
        {viewMode === 'gross' &&
          includedObligations.map((ob, idx) => {
            const from = nodeMap.get(ob.debtor);
            const to = nodeMap.get(ob.creditor);
            if (!from || !to) return null;

            // Curved quadratic Bezier control point
            const midX = (from.x + to.x) / 2 + (idx % 2 === 0 ? 20 : -20);
            const midY = (from.y + to.y) / 2 + (idx % 2 === 0 ? -25 : 25);

            return (
              <g key={ob.id}>
                <path
                  d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                  fill="none"
                  stroke="var(--color-muted)"
                  strokeWidth="1.75"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrow-gross)"
                  className={styles.vectorLine}
                />
              </g>
            );
          })}

        {/* --- Vectors: Net Settlement View --- */}
        {viewMode === 'net' &&
          nettingResult.allocations.map((alloc, idx) => {
            const from = nodeMap.get(alloc.from);
            const to = nodeMap.get(alloc.to);
            if (!from || !to) return null;

            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            return (
              <g key={`${alloc.from}-${alloc.to}-${idx}`}>
                <path
                  d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                  fill="none"
                  stroke="var(--color-wine)"
                  strokeWidth="2.5"
                  markerEnd="url(#arrow-net)"
                  className={styles.vectorLine}
                />
                {/* Legible amount pill along transfer line */}
                <rect
                  x={midX - 32}
                  y={midY - 10}
                  width="64"
                  height="20"
                  rx="4"
                  fill="var(--color-surface)"
                  stroke="var(--color-border)"
                  strokeWidth="1"
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="var(--color-ink)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatBaseUnitsToDisplay(alloc.amount).split(' ')[0]}
                </text>
              </g>
            );
          })}

        {/* --- Participant Nodes --- */}
        {participants.map((addr) => {
          const coord = nodeMap.get(addr);
          if (!coord) return null;
          const pos = nettingResult.positions[addr];
          const isDebtor = pos.netPosition < 0n;
          const isCreditor = pos.netPosition > 0n;

          const strokeColor = isDebtor
            ? 'var(--color-wine)'
            : isCreditor
            ? 'var(--color-success)'
            : 'var(--color-muted)';

          return (
            <g key={addr} transform={`translate(${coord.x}, ${coord.y})`}>
              <circle
                r="16"
                fill="var(--color-surface)"
                stroke={strokeColor}
                strokeWidth="2"
                className={styles.nodeCircle}
              />
              <text
                textAnchor="middle"
                dy="4"
                fontSize="11"
                fontWeight="700"
                fill="var(--color-ink)"
              >
                {addr.slice(2, 4).toUpperCase()}
              </text>
              {/* Node Address Label */}
              <text
                textAnchor="middle"
                dy="28"
                fontSize="11"
                fontWeight="500"
                fill="var(--color-ink-secondary)"
                className={styles.addressCode}
              >
                {coord.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Comparison Ledger Table (design-addendum.md §8) */}
      <div className={styles.comparisonContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
            Position Reconciliation Table
          </h3>
          {capitalSaved > 0n && (
            <span style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: 600 }}>
              &bull; Capital Efficiency: {formatBaseUnitsToDisplay(capitalSaved)} saved in netting
            </span>
          )}
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.compTable} aria-label="Gross obligations versus net positions comparison">
            <thead>
              <tr>
                <th scope="col">Participant</th>
                <th scope="col" style={{ textAlign: 'right' }}>Gross Payable</th>
                <th scope="col" style={{ textAlign: 'right' }}>Gross Receivable</th>
                <th scope="col" style={{ textAlign: 'right' }}>Net Settlement Balance</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((addr) => {
                const pos = nettingResult.positions[addr];
                const isDebtor = pos.netPosition < 0n;
                const isCreditor = pos.netPosition > 0n;
                const isZero = pos.netPosition === 0n;

                return (
                  <tr key={addr}>
                    <td>
                      <span className={styles.addressCode}>{addr}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatBaseUnitsToDisplay(pos.grossPayable)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatBaseUnitsToDisplay(pos.grossReceivable)}
                    </td>
                    <td
                      style={{ textAlign: 'right' }}
                      className={
                        isDebtor
                          ? styles.positionDebit
                          : isCreditor
                          ? styles.positionCredit
                          : styles.positionZero
                      }
                    >
                      {isDebtor && '-'}
                      {isCreditor && '+'}
                      {formatBaseUnitsToDisplay(
                        pos.netPosition < 0n ? -pos.netPosition : pos.netPosition
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <NetPositionIcon
                          type={isDebtor ? 'debit' : isCreditor ? 'credit' : 'zero'}
                          size={16}
                          strokeWidth={1.75}
                          style={{
                            color: isDebtor
                              ? 'var(--color-wine)'
                              : isCreditor
                              ? 'var(--color-success)'
                              : 'var(--color-muted)',
                          }}
                        />
                        <span style={{ fontWeight: 500 }}>
                          {isDebtor ? 'Net Debtor (Pays)' : isCreditor ? 'Net Creditor (Receives)' : 'Balanced (Zero)'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
