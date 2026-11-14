import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { FundingCheckView } from '@/features/funding/FundingCheckView';

export const metadata: Metadata = {
  title: 'Funding check — Netteo',
  description: 'See how a wallet could fund a MUSD settlement from the Mezo Savings Vault or a loan against Bitcoin.',
};

export default function FundingPage() {
  return (
    <AppLayout>
      <FundingCheckView />
    </AppLayout>
  );
}
