import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { ObligationsView } from '@/features/obligations/components/ObligationsView';

export const metadata: Metadata = {
  title: 'Obligation Desk — Netteo',
  description: 'Financial ledger for recording, reviewing, and accepting bilateral claims prior to settlement netting.',
};

export default function ObligationsPage() {
  return (
    <AppLayout>
      <ObligationsView />
    </AppLayout>
  );
}
