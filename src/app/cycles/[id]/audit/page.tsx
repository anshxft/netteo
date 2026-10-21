import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuditStatementView } from '@/features/audit/components/AuditStatementView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Audit Statement: Cycle ${id} — Netteo`,
    description: 'Cryptographic proof and reconciliation statement for Netteo settlement cycle.',
  };
}

export default async function CycleAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppLayout>
      <AuditStatementView cycleId={id} />
    </AppLayout>
  );
}
