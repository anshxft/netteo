'use client';

import React, { useState } from 'react';
import type { Address } from 'viem';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { TransactionStatus, type TransactionLifecycleState } from '@/components/common/TransactionStatus';
import { formatBaseUnitsToDisplay } from '@/features/obligations/store';
import { ONE, nettingBenefit, planBorrow, type BorrowPlan, type ProtocolParams } from '@/lib/mezo/borrow';
import { MEZO_LINKS } from '@/lib/mezo/protocol';
import { useMezoActions, useMezoFunding, type MezoTxState } from '@/lib/mezo/useMezoFunding';
import styles from './FundingSources.module.css';

const money = (v: bigint) => formatBaseUnitsToDisplay(v, 'MUSD');
const pct = (ratio: bigint) => `${(Number((ratio * 10000n) / ONE) / 100).toFixed(1)}%`;
const usd = (v: bigint) => `$${Number(v / ONE).toLocaleString()}`;

function txToLifecycle(tx: MezoTxState): { state: TransactionLifecycleState; hash?: string; message?: string; title: string } | null {
  switch (tx.status) {
    case 'wallet':
      return { state: 'awaiting_signature', title: `${tx.label}: confirm in your wallet` };
    case 'confirming':
      return { state: 'pending', hash: tx.hash, title: `${tx.label}: confirming on Mezo` };
    case 'success':
      return { state: 'confirmed', hash: tx.hash, title: `${tx.label}: confirmed` };
    case 'error':
      return { state: 'reverted', message: tx.message, title: `${tx.label}: not completed` };
    default:
      return null;
  }
}

function TxStatus({ tx, onDismiss }: { tx: MezoTxState; onDismiss: () => void }) {
  const life = txToLifecycle(tx);
  if (!life) return null;
  return (
    <TransactionStatus
      state={life.state}
      hash={life.hash}
      errorMessage={life.message}
      title={life.title}
      onDismiss={life.state === 'confirmed' || life.state === 'reverted' ? onDismiss : undefined}
    />
  );
}

export interface FundingSourcesPanelProps {
  owner: Address;
  /** MUSD still missing from the wallet for the deposit, in base units. */
  shortfall: bigint;
  disabled?: boolean;
  /** Called after any confirmed transaction so the parent can refresh the wallet balance. */
  onFunded: () => void;
}

/**
 * Three ways to cover a short deposit without selling Bitcoin, all through Mezo's own contracts:
 * the MUSD Savings Vault, and a loan against BTC. Every figure is read from Mezo Mainnet.
 */
export function FundingSourcesPanel({ owner, shortfall, disabled, onFunded }: FundingSourcesPanelProps) {
  const funding = useMezoFunding(owner);
  const actions = useMezoActions(owner, onFunded);
  const [reviewing, setReviewing] = useState(false);
  const inFlight = actions.tx.status === 'wallet' || actions.tx.status === 'confirming';
  const locked = disabled || inFlight;

  const { params, trove, savings } = funding;
  const ready = !!params && !!trove && !!savings;

  // Savings can cover up to its balance; the loan plan is for whatever Savings cannot cover.
  const fromSavings = savings ? (savings.balance < shortfall ? savings.balance : shortfall) : 0n;
  const stillNeeded = shortfall - fromSavings;

  let plan: BorrowPlan | null = null;
  let partial: bigint | null = null;
  if (ready && trove && params) {
    plan = planBorrow(stillNeeded > 0n ? stillNeeded : shortfall, trove, params);
    if (plan.kind === 'unsafe' && plan.maxSafe > 0n) {
      // Offer what can be borrowed safely, rounded down to a cent so the figure is readable and still safe.
      const cent = 10n ** 16n;
      const rounded = plan.maxSafe - (plan.maxSafe % cent);
      if (rounded > 0n) partial = rounded;
    }
  }
  const partialPlan = ready && trove && params && partial ? planBorrow(partial, trove, params) : null;

  return (
    <section className={styles.panel} aria-label="Fund this deposit without selling Bitcoin">
      <div className={styles.head}>
        <h3 className={styles.title}>Short by {money(shortfall)}</h3>
        <p className={styles.lead}>
          Cover it without selling your Bitcoin. These options use Mezo&apos;s own contracts and are read live from Mezo Mainnet.
        </p>
      </div>

      {funding.isLoading && (
        <div className={styles.source} aria-busy="true" aria-label="Loading your Mezo positions">
          <div className={styles.skeleton} style={{ width: '45%' }} />
          <div className={styles.skeleton} style={{ width: '80%' }} />
          <div className={styles.skeleton} style={{ width: '60%' }} />
        </div>
      )}

      {funding.hasError && (
        <div className={styles.source} role="alert">
          <p className={styles.note}>Could not read your Mezo positions right now. Your funds are unaffected.</p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => funding.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {ready && savings && params && trove && (
        <>
          {/* Source 1: Savings Vault */}
          <div className={styles.source}>
            <div className={styles.sourceHead}>
              <span className={styles.sourceName}>MUSD Savings Vault</span>
              <span className={styles.sourceValue}>You hold {money(savings.balance)}</span>
            </div>
            {savings.balance > 0n ? (
              <>
                <p className={styles.note}>
                  Withdraw anytime, no lock-up. {savings.balance >= shortfall ? 'This covers the whole deposit.' : `This covers ${money(fromSavings)} of it.`}
                </p>
                <div className={styles.actions}>
                  <Button variant="primary" disabled={locked} onClick={() => actions.withdrawSavings(fromSavings)}>
                    Withdraw {money(fromSavings)}
                  </Button>
                </div>
              </>
            ) : (
              <p className={styles.note}>Nothing in Savings on this wallet.</p>
            )}
          </div>

          {/* Source 2: loan against BTC */}
          <div className={styles.source}>
            <div className={styles.sourceHead}>
              <span className={styles.sourceName}>Borrow against your Bitcoin</span>
              <span className={styles.sourceValue}>BTC {usd(params.price)}</span>
            </div>

            {plan?.kind === 'no-trove' && (
              <>
                <p className={styles.note}>
                  This wallet has no BTC-backed loan on Mezo. A new loan needs at least {money(params.minNetDebt)} of debt plus a {money(params.gasCompensation)} deposit, so it suits larger positions. Open one in the Mezo app, then come back here.
                </p>
                <a className={styles.link} href={MEZO_LINKS.borrowApp} target="_blank" rel="noopener noreferrer">
                  Open a loan on Mezo <Icon icon={ExternalLink} size="sm" />
                  <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>(opens in a new tab)</span>
                </a>
              </>
            )}

            {plan?.kind === 'recovery-mode' && (
              <p className={styles.warn}>Mezo is in Recovery Mode, so new borrowing is paused. Use another source for now.</p>
            )}

            {plan?.kind === 'unsafe' && (
              <>
                <p className={styles.danger}>
                  Borrowing {money(plan.shortfall)} would leave your loan at {pct(plan.resultingIcr)} collateral. Netteo will not build a borrow under 150%, because Mezo can liquidate a loan below 110%.
                </p>
                {partialPlan?.kind === 'ok' ? (
                  <BorrowReview plan={partialPlan} params={params} trove={trove} reviewing={reviewing} setReviewing={setReviewing} locked={locked} onConfirm={() => actions.borrow(partialPlan.amount)} partial />
                ) : (
                  <p className={styles.note}>No safe amount is available on this loan right now.</p>
                )}
              </>
            )}

            {plan?.kind === 'ok' && (
              <BorrowReview plan={plan} params={params} trove={trove} reviewing={reviewing} setReviewing={setReviewing} locked={locked} onConfirm={() => actions.borrow(plan!.kind === 'ok' ? plan!.amount : 0n)} />
            )}
          </div>
        </>
      )}

      <TxStatus tx={actions.tx} onDismiss={actions.reset} />

      <a className={styles.link} href="https://mezo.org/docs/users/features/mezo-swap" target="_blank" rel="noopener noreferrer">
        Or get MUSD another way: how to swap on Mezo <Icon icon={ExternalLink} size="sm" />
      </a>
    </section>
  );
}

function BorrowReview(props: {
  plan: Extract<BorrowPlan, { kind: 'ok' }>;
  params: ProtocolParams;
  trove: { coll: bigint; debt: bigint };
  reviewing: boolean;
  setReviewing: (v: boolean) => void;
  locked: boolean;
  onConfirm: () => void;
  partial?: boolean;
}) {
  const { plan, params, trove, reviewing, setReviewing, locked, onConfirm, partial } = props;
  const liquidationPrice = (params.mcr * plan.newDebt) / trove.coll;

  return (
    <>
      <dl className={styles.rows}>
        <div>
          <dt>{partial ? 'Safe to borrow now' : 'Borrow'}</dt>
          <dd>{money(plan.amount)}</dd>
        </div>
        <div>
          <dt>Issuance fee ({(Number(params.borrowingRate) / 1e16).toFixed(1)}%, added to your debt)</dt>
          <dd>{money(plan.fee)}</dd>
        </div>
        <div>
          <dt>Interest ({(params.interestRateBps / 100).toFixed(0)}% a year, about 30 days)</dt>
          <dd>{money(plan.monthlyInterest)}</dd>
        </div>
        <div>
          <dt>Your collateral ratio</dt>
          <dd>
            {pct(plan.currentIcr)} to {pct(plan.resultingIcr)}
          </dd>
        </div>
      </dl>

      {!reviewing ? (
        <div className={styles.actions}>
          <Button variant="secondary" disabled={locked} onClick={() => setReviewing(true)}>
            Review borrow
          </Button>
        </div>
      ) : (
        <div className={styles.review} role="group" aria-label="Review before you borrow">
          <p className={styles.note} style={{ color: 'var(--color-ink)' }}>
            You are adding {money(plan.amount + plan.fee)} of debt to your Mezo loan. If Bitcoin falls below about{' '}
            <strong>{usd(liquidationPrice)}</strong> (now {usd(params.price)}), your loan can be liquidated and you lose collateral. Repay it later from the Mezo app.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" disabled={locked} onClick={onConfirm}>
              Confirm and borrow {money(plan.amount)}
            </Button>
            <Button variant="tertiary" disabled={locked} onClick={() => setReviewing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------------------------------ */

export interface SavePayoutPanelProps {
  owner: Address;
  /** What the cycle paid this wallet, in MUSD base units. */
  payout: bigint;
  /** Current MUSD in the wallet; the deposit can never exceed it. */
  walletBalance: bigint;
  disabled?: boolean;
  onDone: () => void;
}

/** After a settlement pays out, offer to put the received MUSD into Mezo's Savings Vault. */
export function SavePayoutPanel({ owner, payout, walletBalance, disabled, onDone }: SavePayoutPanelProps) {
  const funding = useMezoFunding(owner);
  const actions = useMezoActions(owner, onDone);
  const inFlight = actions.tx.status === 'wallet' || actions.tx.status === 'confirming';
  const locked = disabled || inFlight;
  const amount = payout < walletBalance ? payout : walletBalance;
  const { savings, vaultAllowance } = funding;
  const needsApproval = vaultAllowance < amount;

  return (
    <section className={styles.panel} aria-label="Save your payout in the Mezo Savings Vault">
      <div className={styles.head}>
        <h3 className={styles.title}>You received {money(payout)}</h3>
        <p className={styles.lead}>
          Put it to work in the MUSD Savings Vault. There is no lock-up and you can withdraw any time. Yield is variable and comes from MUSD protocol fees, as Mezo describes it.
        </p>
      </div>

      {funding.isLoading && <div className={styles.skeleton} style={{ width: '60%' }} aria-busy="true" />}

      {funding.hasError && (
        <div role="alert" className={styles.note}>
          Could not read the Savings Vault right now. Your funds are unaffected.{' '}
          <button type="button" onClick={() => funding.refetch()} style={{ background: 'none', border: 0, color: 'var(--color-wine)', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
            Try again
          </button>
        </div>
      )}

      {savings && (
        <div className={styles.source}>
          <div className={styles.sourceHead}>
            <span className={styles.sourceName}>MUSD Savings Vault</span>
            <span className={styles.sourceValue}>You hold {money(savings.balance)}</span>
          </div>
          {amount > 0n ? (
            <div className={styles.actions}>
              {needsApproval ? (
                <Button variant="secondary" disabled={locked} onClick={() => actions.approveVault(amount)}>
                  Step 1: Approve {money(amount)}
                </Button>
              ) : (
                <Button variant="primary" disabled={locked} onClick={() => actions.depositSavings(amount)}>
                  Save {money(amount)}
                </Button>
              )}
            </div>
          ) : (
            <p className={styles.note}>This wallet holds no MUSD right now, so there is nothing to save.</p>
          )}
          {savings.claimableYield > 0n && (
            <div className={styles.actions}>
              <Button variant="tertiary" disabled={locked} onClick={() => actions.claimYield()}>
                Claim {money(savings.claimableYield)} yield
              </Button>
            </div>
          )}
        </div>
      )}

      <TxStatus tx={actions.tx} onDismiss={actions.reset} />
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------ */

export interface NettingBenefitNoteProps {
  gross: bigint;
  net: bigint;
  symbol: string;
}

/** What netting saved, expressed in what it would have cost to borrow that liquidity on Mezo. */
export function NettingBenefitNote({ gross, net, symbol }: NettingBenefitNoteProps) {
  const { params } = useMezoFunding();
  if (symbol !== 'MUSD' || gross <= net) return null;
  const avoided = gross - net;

  if (!params) {
    return (
      <p className={styles.benefit}>
        Netting means <strong>{money(avoided)}</strong> less had to be funded up front.
      </p>
    );
  }
  const b = nettingBenefit(gross, net, params);
  return (
    <p className={styles.benefit}>
      Netting means <strong>{money(b.avoided)}</strong> less had to be funded up front. If that liquidity were borrowed against Bitcoin on Mezo, it would avoid about{' '}
      <strong>{money(b.feeAvoided)}</strong> in issuance fees ({(Number(params.borrowingRate) / 1e16).toFixed(1)}%) and about <strong>{money(b.interestAvoided)}</strong> interest per {b.days} days (
      {(params.interestRateBps / 100).toFixed(0)}% a year). Estimated from Mezo&apos;s current on-chain rates, not a guaranteed saving.
    </p>
  );
}
