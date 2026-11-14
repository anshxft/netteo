'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress, getAddress, type Address } from 'viem';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/common/Button';
import { parseAmountToBaseUnits } from '@/features/obligations/store';
import { FundingSourcesPanel } from '@/features/settlement-cycles/components/FundingSources';
import styles from './FundingCheckView.module.css';

// Public wallets that hold a BTC-backed loan on Mezo Mainnet today (read from TroveManager). On-chain data, not an endorsement.
const REAL_LOANS: { address: Address; label: string }[] = [
  { address: '0x593c427d8C7bf5C555Ed41cd7CB7cCe8C9F15bB5', label: 'Very healthy loan' },
  { address: '0x08278D4b1c5F7D652095a2050f1d978AEc5377ac', label: 'Healthy loan' },
  { address: '0x467FFa9B2b3300a14D44f0A2707E28014C673Fb4', label: 'Under 150%' },
  { address: '0xA7F5Dc5955a599524A28DFf21389D88c49DBf738', label: 'Close to liquidation' },
];

/**
 * Read-only "what could this wallet do?" tool. It answers the question a debtor has before a settlement:
 * how much MUSD can be found in Savings and against Bitcoin, and what would it cost and risk?
 * Borrowing and withdrawing are only enabled when the connected wallet is the wallet being checked.
 */
export function FundingCheckView() {
  const { address: connected } = useAccount();
  const [addressInput, setAddressInput] = useState('');
  const [amountInput, setAmountInput] = useState('500');

  const trimmed = addressInput.trim();
  const addressError = trimmed && !isAddress(trimmed) ? 'That is not a valid wallet address.' : null;
  const owner = trimmed && isAddress(trimmed) ? getAddress(trimmed) : null;

  let shortfall: bigint | null = null;
  let amountError: string | null = null;
  try {
    shortfall = parseAmountToBaseUnits(amountInput, 18);
  } catch (e) {
    amountError = amountInput.trim() ? (e as Error).message : null;
  }

  const isOwnWallet = !!owner && !!connected && owner.toLowerCase() === connected.toLowerCase();

  return (
    <>
      <PageHeader
        title="Funding check"
        subtitle="See how a wallet could fund a settlement without selling Bitcoin: from the MUSD Savings Vault or a loan against BTC, read live from Mezo Mainnet."
      />

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()} noValidate>
          <label className={styles.label} htmlFor="fc-address">
            Wallet address
          </label>
          <input
            id="fc-address"
            className={styles.input}
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!addressError}
            aria-describedby={addressError ? 'fc-address-err' : undefined}
          />
          {addressError && (
            <p id="fc-address-err" className={styles.error} role="alert">
              {addressError}
            </p>
          )}
          <div className={styles.row}>
            {connected && (
              <Button variant="secondary" type="button" onClick={() => setAddressInput(connected)}>
                Use my wallet
              </Button>
            )}
          </div>

          <label className={styles.label} htmlFor="fc-amount">
            MUSD still needed for the deposit
          </label>
          <input
            id="fc-amount"
            className={styles.input}
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            aria-invalid={!!amountError}
            aria-describedby={amountError ? 'fc-amount-err' : undefined}
          />
          {amountError && (
            <p id="fc-amount-err" className={styles.error} role="alert">
              {amountError}
            </p>
          )}

          <p className={styles.hint}>Or try a real wallet with a BTC-backed loan on Mezo today:</p>
          <ul className={styles.chips}>
            {REAL_LOANS.map((l) => (
              <li key={l.address}>
                <button type="button" className={styles.chip} onClick={() => setAddressInput(l.address)}>
                  <span>{l.label}</span>
                  <code>
                    {l.address.slice(0, 6)}…{l.address.slice(-4)}
                  </code>
                </button>
              </li>
            ))}
          </ul>
        </form>

        <div className={styles.result}>
          {!owner && <p className={styles.empty}>Enter a wallet address, or pick one above, to see its Mezo funding options.</p>}

          {owner && shortfall && (
            <>
              {!isOwnWallet && (
                <p className={styles.readOnly} role="status">
                  Read-only view. Borrowing and withdrawing are enabled only when you connect this wallet.
                </p>
              )}
              <FundingSourcesPanel owner={owner} shortfall={shortfall} disabled={!isOwnWallet} onFunded={() => undefined} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
