'use client';

import React, { useState, useEffect } from 'react';
import styles from './GroupsView.module.css';
import { Group } from '../types';
import { loadGroups, saveGroups } from '../store';
import { syncGroupsFromSupabase } from '@/lib/db/syncService';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { ParticipantTable } from './ParticipantTable';
import { CreateGroupModal } from './CreateGroupModal';
import { Users, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

export function GroupsView() {
  const { mode, resetCounter } = useWorkspace();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'live') {
        const remote = await syncGroupsFromSupabase();
        if (remote && remote.length > 0) {
          setGroups(remote);
          saveGroups(remote, 'live');
        } else {
          const data = loadGroups('live');
          setGroups(data);
        }
      } else {
        const data = loadGroups('demo');
        setGroups(data);
      }
    } catch {
      try {
        const data = loadGroups(mode);
        setGroups(data);
      } catch {
        setError('Failed to load groups. Please refresh or try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const onOnline = () => setIsOffline(false);
      const onOffline = () => setIsOffline(true);
      const onOpenCreateGroup = () => setIsModalOpen(true);

      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'create-group') {
        setIsModalOpen(true);
        window.history.replaceState({}, '', window.location.pathname);
      }

      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      window.addEventListener('netteo_open_create_group', onOpenCreateGroup);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('netteo_open_create_group', onOpenCreateGroup);
      };
    }
  }, [mode, resetCounter]);

  const handleGroupCreated = () => {
    fetchGroups();
    setSuccessNotice('Group created successfully.');
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  return (
    <div>
      {/* Unified Page Header */}
      <PageHeader
        title="Groups"
        subtitle="Partner collectives, project teams, and DAO pods that share mutual payments and settle net balances on Mezo."
        actions={
          <Button
            variant="primary"
            icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}
            disabled={isOffline || isLoading}
            onClick={() => setIsModalOpen(true)}
          >
            New Group
          </Button>
        }
      />

      {/* Success Notification Banner */}
      {successNotice && (
        <div className={styles.successBanner} role="status">
          <span>{successNotice}</span>
        </div>
      )}

      {/* --- STATE 1: Error State with Recovery --- */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Icon icon={AlertCircle} size="sm" color="var(--color-danger)" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" onClick={fetchGroups} style={{ minHeight: '32px' }}>
            <Icon icon={RefreshCw} size="sm" />
            Retry
          </Button>
        </div>
      )}

      {/* --- STATE 2: Loading State (within 200ms, width-locked skeleton) --- */}
      {isLoading && (
        <div className={styles.groupGrid} aria-busy="true" aria-label="Loading groups...">
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonLine} style={{ width: '40%' }} />
            <div className={styles.skeletonLine} style={{ width: '70%' }} />
            <div className={styles.skeletonLine} style={{ width: '100%', height: '100px' }} />
          </div>
        </div>
      )}

      {/* --- STATE 3: Empty State --- */}
      {!isLoading && !error && groups.length === 0 && (
        <div className={styles.emptyState}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-sand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-wine)',
            }}
          >
            <Icon icon={Users} size="lg" color="var(--color-wine)" />
          </div>
          <h2 className={styles.emptyStateTitle}>No Groups Found</h2>
          <p className={styles.emptyStateDesc}>
            Create a group of partner wallet addresses to record payments and run multilateral settlements.
          </p>
          <Button
            variant="primary"
            icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}
            disabled={isOffline}
            onClick={() => setIsModalOpen(true)}
          >
            Create Group
          </Button>
        </div>
      )}

      {/* --- STATE 4: Success / Populated State --- */}
      {!isLoading && !error && groups.length > 0 && (
        <div className={styles.groupGrid}>
          {groups.map((group) => (
            <article key={group.id} className={styles.groupCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.groupName}>{group.name}</h2>
                  {group.description && <p className={styles.groupDesc}>{group.description}</p>}
                </div>
                <div className={styles.participantBadge}>
                  <Icon icon={Users} size="sm" color="var(--color-ink)" />
                  <span>
                    {group.participants.length} / {group.participantLimit} members
                  </span>
                </div>
              </div>

              {/* Participant Management Table */}
              <ParticipantTable
                groupId={group.id}
                participants={group.participants}
                participantLimit={group.participantLimit}
                onUpdate={fetchGroups}
                isOffline={isOffline}
              />
            </article>
          ))}
        </div>
      )}

      {/* Create Group Modal Dialog */}
      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
