import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { GroupsView } from '@/features/groups/components/GroupsView';

export const metadata: Metadata = {
  title: 'Working Groups — Netteo',
  description: 'Manage defined service collectives and member addresses for bilateral obligation netting.',
};

export default function GroupsPage() {
  return (
    <AppLayout>
      <GroupsView />
    </AppLayout>
  );
}
