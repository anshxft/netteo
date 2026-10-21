import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { CycleAssemblyView } from '@/features/settlement-cycles/components/CycleAssemblyView';

export const metadata: Metadata = {
  title: 'Assemble Settlement Cycle — Netteo',
  description: 'Select accepted claims, review deterministic netting calculations, and freeze a settlement cycle.',
};

export default function NewCyclePage() {
  return (
    <AppLayout>
      <CycleAssemblyView />
    </AppLayout>
  );
}
