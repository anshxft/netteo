import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { CycleExecutionView } from '@/features/settlement-cycles/components/CycleExecutionView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Settlement Cycle ${id} — Netteo`,
    description: 'Track net debtor funding progress, execute atomic distribution, or claim refund on Mezo.',
  };
}

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppLayout>
      <CycleExecutionView cycleId={id} />
    </AppLayout>
  );
}
