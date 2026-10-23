import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { GroupsView } from '@/features/groups/components/GroupsView';

export const metadata: Metadata = {
  title: 'Groups — Netteo',
  description: 'Manage counterparty groups and member addresses for bilateral payment netting.',
};

export default function GroupsPage() {
  return (
    <AppLayout>
      <GroupsView />
    </AppLayout>
  );
}
