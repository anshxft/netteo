'use client';

import React, { useState, useEffect } from 'react';
import styles from './GroupsView.module.css';
import { Button } from '@/components/common/Button';
import { createGroup } from '../store';
import { syncGroupToSupabase } from '@/lib/db/syncService';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { X } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';

export interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const { mode } = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [participantsRaw, setParticipantsRaw] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const initialAddresses = participantsRaw
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const created = createGroup(
        {
          name,
          description,
          initialParticipants: initialAddresses,
        },
        mode
      );

      // Background sync to Supabase (only in live mode)
      if (mode === 'live') {
        const creator = created.participants[0] || '0x1111111111111111111111111111111111111111';
        syncGroupToSupabase(created, creator).catch((err) => {
          console.warn('[Sync] Supabase group sync deferred:', err);
        });
      }

      // Reset form upon successful creation
      setName('');
      setDescription('');
      setParticipantsRaw('');
      onCreated();
      onClose();
    } catch (err: any) {
      // Input preservation: name, description, and participantsRaw are NOT wiped
      setErrorMsg(err.message || 'Failed to create working group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="modal-title" className={styles.modalTitle}>
            Create Working Group
          </h2>
          <Button
            variant="tertiary"
            onClick={onClose}
            style={{ minHeight: '32px', padding: '0 4px' }}
            aria-label="Close dialog"
          >
            <Icon icon={X} size="sm" />
          </Button>
        </div>

        {errorMsg && (
          <div className={styles.errorBanner} role="alert">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label htmlFor="group-name" className={styles.fieldLabel}>
              Group Name *
            </label>
            <input
              id="group-name"
              type="text"
              className={styles.input}
              placeholder="e.g. Design & Engineering Collective"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="group-desc" className={styles.fieldLabel}>
              Description
            </label>
            <textarea
              id="group-desc"
              className={styles.textarea}
              placeholder="Brief description of mutual obligations and service scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="group-participants" className={styles.fieldLabel}>
              Initial Member Addresses (optional, 10 max, one per line)
            </label>
            <textarea
              id="group-participants"
              className={styles.textarea}
              placeholder="0x1111...&#10;0x2222..."
              value={participantsRaw}
              onChange={(e) => setParticipantsRaw(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-xl)' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !name.trim()}
              isLoading={isSubmitting}
              loadingText="Creating..."
            >
              Create Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
