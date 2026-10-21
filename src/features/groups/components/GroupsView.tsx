'use client';

import React, { useState, useEffect } from 'react';
import styles from './GroupsView.module.css';
import { Group } from '../types';
import { loadGroups, saveGroups } from '../store';
import { syncGroupsFromSupabase } from '@/lib/db/syncService';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { ParticipantTable } from './ParticipantTable';
import { CreateGroupModal } from './CreateGroupModal';
import { Users, Plus, AlertCircle, RefreshCw } from 'lucide-react';

export function GroupsView() {
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
      // First attempt Supabase remote synchronization
      const remote = await syncGroupsFromSupabase();
      if (remote && remote.length > 0) {
        setGroups(remote);
        saveGroups(remote);
      } else {
        const data = loadGroups();
        setGroups(data);
      }
    } catch {
      try {
        const data = loadGroups();
        setGroups(data);
      } catch {
        setError('Failed to load working groups. Please refresh or try again.');
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
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }
  }, []);

  const handleGroupCreated = () => {
    fetchGroups();
    setSuccessNotice('Working group created successfully.');
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  return (
    <div>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>Working Groups</h1>
          <p className={styles.subtitle}>
            Service collectives, DAO working groups, and contributor pods that share mutual payment obligations on Mezo.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}
          disabled={isOffline || isLoading}
          onClick={() => setIsModalOpen(true)}
        >
          New Group
        </Button>
      </div>

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
          <h2 className={styles.emptyStateTitle}>No Working Groups Found</h2>
          <p className={styles.emptyStateDesc}>
            Create a defined collective of counterparty addresses to record bilateral obligations and run settlement cycles.
          </p>
          <Button
            variant="primary"
            icon={<Icon icon={Plus} size="sm" color="#FFFFFF" />}
            disabled={isOffline}
            onClick={() => setIsModalOpen(true)}
          >
            Create Working Group
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
