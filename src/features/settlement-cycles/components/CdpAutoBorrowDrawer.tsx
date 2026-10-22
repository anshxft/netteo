'use client';

import React, { useState, useId, useEffect } from 'react';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  RefreshCw,
  Info,
} from 'lucide-react';
import styles from './CdpAutoBorrowDrawer.module.css';

export interface CdpAutoBorrowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  requiredMusdAmount: bigint; // Base units (18 decimals)
  currentMusdBalance?: bigint;
  cycleId: string;
  userAddress: string;
  mode: 'demo' | 'live';
  onBorrowSuccess?: (mintedAmount: bigint) => void;
}

const BTC_PRICE_USD = 68500; // Simulated Mezo Testnet Oracle Price Index ($68,500.00 / BTC)
const BASE_18 = 10n ** 18n;

export function CdpAutoBorrowDrawer({
  isOpen,
  onClose,
  requiredMusdAmount,
  currentMusdBalance = 0n,
  cycleId,
  userAddress,
  mode,
  onBorrowSuccess,
}: CdpAutoBorrowDrawerProps) {
  const titleId = useId();
  const descId = useId();

  // Collateral ratio selection (110 = Protocol MCR, 150 = Recommended Safe, 200 = Conservative)
  const [collateralRatio, setCollateralRatio] = useState<number>(150);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Offline detection
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard navigation: Escape key closes drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Calculate deficit
  const deficitBase = requiredMusdAmount > currentMusdBalance ? requiredMusdAmount - currentMusdBalance : 0n;
  const borrowTargetBase = deficitBase > 0n ? deficitBase : requiredMusdAmount;
  const borrowTargetFloat = Number(borrowTargetBase) / 1e18;

  // Computed Financial Metrics
  const requiredCollateralUsd = borrowTargetFloat * (collateralRatio / 100);
  const requiredTbtc = requiredCollateralUsd / BTC_PRICE_USD;
  const liquidationPriceBtc = (borrowTargetFloat * 1.10) / (requiredTbtc || 0.000001);
  const stabilityFeeMusd = borrowTargetFloat * 0.005; // 0.5% protocol fee
  const healthFactor = (collateralRatio / 110).toFixed(2);

  const isFullyCovered = deficitBase === 0n && currentMusdBalance >= requiredMusdAmount;

  const handleExecuteBorrow = async () => {
    if (isSubmitting || isOffline) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === 'live') {
        // Generate prefilled deep link to Mezo CDP portal
        const cdpUrl = `https://cdp.test.mezo.org/borrow?collateral=tbtc&borrow=${borrowTargetFloat.toFixed(
          2
        )}&cr=${collateralRatio}`;
        window.open(cdpUrl, '_blank', 'noopener,noreferrer');
        setIsSubmitting(false);
        return;
      }

      // Demo Sandbox mode: simulate 700ms CDP vault lock & MUSD mint
      await new Promise((res) => setTimeout(res, 700));

      setIsSuccess(true);
      if (onBorrowSuccess) {
        onBorrowSuccess(borrowTargetBase);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Mezo CDP borrow simulation encountered an unexpected network timeout. Please retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => !isSubmitting && onClose()} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.headerTitleArea}>
            <div className={styles.badgeRow}>
              <span className={styles.cdpBadge}>
                <Icon icon={Zap} size="sm" color="var(--color-wine)" />
                <span>Mezo Bitcoin-Fi CDP</span>
              </span>
              <span className={styles.networkBadge}>Matsnet Testnet (31611)</span>
            </div>
            <h2 id={titleId} className={styles.drawerTitle}>
              Mezo CDP Auto-Borrow
            </h2>
            <p id={descId} className={styles.drawerSubtitle}>
              Mint required MUSD collateralized by Bitcoin without liquidating your BTC holdings.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close CDP Auto-Borrow Assistant"
          >
            <Icon icon={X} size="md" />
          </button>
        </div>

        {/* Offline Banner */}
        {isOffline && (
          <div className={styles.offlineBanner} role="alert">
            <Icon icon={AlertTriangle} size="sm" color="var(--color-danger)" />
            <span>You are offline. CDP borrowing is disabled until network connection is restored.</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className={styles.errorBanner} role="alert">
            <Icon icon={AlertTriangle} size="sm" color="var(--color-danger)" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success State */}
        {isSuccess ? (
          <div className={styles.successState}>
            <div className={styles.successIconWrapper}>
              <Icon icon={CheckCircle2} size="lg" color="var(--color-success)" />
            </div>
            <h3 className={styles.successTitle}>MUSD Minted Successfully!</h3>
            <p className={styles.successDesc}>
              Minted <span className={styles.tabularNumbers}>{borrowTargetFloat.toFixed(2)} MUSD</span> backed by{' '}
              <span className={styles.tabularNumbers}>{requiredTbtc.toFixed(6)} tBTC</span> into your connected account.
            </p>
            <div className={styles.successActionRow}>
              <Button
                variant="primary"
                onClick={() => {
                  setIsSuccess(false);
                  onClose();
                }}
              >
                Proceed to Deposit
              </Button>
            </div>
          </div>
        ) : isFullyCovered ? (
          /* Empty / Fully Covered State */
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <Icon icon={ShieldCheck} size="lg" color="var(--color-success)" />
            </div>
            <h3 className={styles.emptyTitle}>Obligation Fully Covered</h3>
            <p className={styles.emptyDesc}>
              Your current balance of{' '}
              <span className={styles.tabularNumbers}>{(Number(currentMusdBalance) / 1e18).toFixed(2)} MUSD</span>{' '}
              covers your required cycle deposit of{' '}
              <span className={styles.tabularNumbers}>{(Number(requiredMusdAmount) / 1e18).toFixed(2)} MUSD</span>. No
              CDP borrow is needed.
            </p>
            <Button variant="secondary" onClick={onClose}>
              Back to Cycle Desk
            </Button>
          </div>
        ) : (
          /* Main Interactive Borrow Body */
          <div className={styles.drawerBody}>
            {/* Obligation Deficit Summary */}
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricLabel}>Required Cycle Debt</span>
                <span className={styles.metricValue}>
                  {borrowTargetFloat.toFixed(2)} <span className={styles.metricUnit}>MUSD</span>
                </span>
              </div>
              <div className={styles.metricSubRow}>
                <span>Mezo Oracle BTC Index:</span>
                <span className={styles.tabularNumbers}>${BTC_PRICE_USD.toLocaleString()} USD</span>
              </div>
            </div>

            {/* Collateral Ratio Selector */}
            <div className={styles.ratioSection}>
              <div className={styles.ratioLabelRow}>
                <label className={styles.fieldLabel}>Collateralization Ratio (CR)</label>
                <span className={styles.healthBadge}>Health Factor: {healthFactor}</span>
              </div>

              <div className={styles.ratioPills} role="radiogroup" aria-label="Collateral Ratio Presets">
                <button
                  type="button"
                  className={`${styles.ratioPill} ${collateralRatio === 110 ? styles.ratioPillSelectedWarning : ''}`}
                  onClick={() => setCollateralRatio(110)}
                  disabled={isSubmitting}
                >
                  <span className={styles.ratioPct}>110% MCR</span>
                  <span className={styles.ratioSub}>Minimum Protocol</span>
                </button>

                <button
                  type="button"
                  className={`${styles.ratioPill} ${collateralRatio === 150 ? styles.ratioPillSelectedSafe : ''}`}
                  onClick={() => setCollateralRatio(150)}
                  disabled={isSubmitting}
                >
                  <span className={styles.ratioPct}>150% Safe</span>
                  <span className={styles.ratioSub}>Mezo Recommended</span>
                </button>

                <button
                  type="button"
                  className={`${styles.ratioPill} ${collateralRatio === 200 ? styles.ratioPillSelectedSafe : ''}`}
                  onClick={() => setCollateralRatio(200)}
                  disabled={isSubmitting}
                >
                  <span className={styles.ratioPct}>200% Treasury</span>
                  <span className={styles.ratioSub}>Conservative</span>
                </button>
              </div>

              {collateralRatio === 110 && (
                <div className={styles.warningNote}>
                  <Icon icon={AlertTriangle} size="sm" color="var(--color-danger)" />
                  <span>
                    Warning: 110% is Mezo&apos;s liquidation floor. Any market dip below ${liquidationPriceBtc.toFixed(0)} will
                    trigger automated vault liquidation.
                  </span>
                </div>
              )}
            </div>

            {/* Financial Calculation Breakdown Table */}
            <div className={styles.breakdownTable}>
              <div className={styles.tableRow}>
                <span className={styles.rowLabel}>Bitcoin Collateral to Lock (tBTC)</span>
                <span className={`${styles.rowValue} ${styles.tabularNumbers}`}>
                  {requiredTbtc.toFixed(6)} tBTC
                </span>
              </div>

              <div className={styles.tableRow}>
                <span className={styles.rowLabel}>Collateral Value in USD</span>
                <span className={`${styles.rowValue} ${styles.tabularNumbers}`}>
                  ${requiredCollateralUsd.toFixed(2)} USD
                </span>
              </div>

              <div className={styles.tableRow}>
                <span className={styles.rowLabel}>Estimated Liquidation Price</span>
                <span className={`${styles.rowValue} ${styles.tabularNumbers}`}>
                  ${liquidationPriceBtc.toFixed(2)} / BTC
                </span>
              </div>

              <div className={styles.tableRow}>
                <span className={styles.rowLabel}>Protocol Stability Fee (0.5%)</span>
                <span className={`${styles.rowValue} ${styles.tabularNumbers}`}>
                  {stabilityFeeMusd.toFixed(2)} MUSD
                </span>
              </div>

              <div className={`${styles.tableRow} ${styles.tableRowHighlight}`}>
                <span className={styles.rowLabelBold}>Net MUSD Received</span>
                <span className={`${styles.rowValueBold} ${styles.tabularNumbers}`}>
                  {borrowTargetFloat.toFixed(2)} MUSD
                </span>
              </div>
            </div>

            {/* Execution Footer */}
            <div className={styles.drawerFooter}>
              <Button
                variant="primary"
                onClick={handleExecuteBorrow}
                disabled={isSubmitting || isOffline}
                isLoading={isSubmitting}
                loadingText={mode === 'live' ? 'Opening Mezo CDP...' : 'Minting MUSD via CDP...'}
                icon={
                  <Icon
                    icon={mode === 'live' ? ExternalLink : Zap}
                    size="sm"
                    color="#FFFFFF"
                  />
                }
              >
                {mode === 'live'
                  ? `Borrow ${borrowTargetFloat.toFixed(2)} MUSD on Mezo CDP`
                  : `Mint ${borrowTargetFloat.toFixed(2)} MUSD via CDP (Demo)`}
              </Button>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
