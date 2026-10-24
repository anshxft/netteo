'use client';

import React, { useState, useEffect } from 'react';
import styles from './GroupsView.module.css';
import { Button } from '@/components/common/Button';
import { createGroup } from '../store';
import { syncGroupToSupabase } from '@/lib/db/syncService';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useAccount, useSignMessage } from 'wagmi';
import { buildCreateGroupMessage } from '@/lib/auth/challenge';
import { X } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import { useToast } from '@/components/ui/Toast/ToastContext';

export interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const { mode } = useWorkspace();
  const { toast } = useToast();
  const { address: userAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
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

      if (mode === 'live') {
        if (!isConnected || !userAddress) {
          throw new Error('Please connect your wallet to create a group on Mezo.');
        }

        const participantList = [...initialAddresses];
        if (!participantList.some((p) => p.toLowerCase() === userAddress.toLowerCase())) {
          participantList.push(userAddress);
        }

        const nonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `nonce-${Date.now()}`;
        const timestamp = Date.now();

        const challengeMsg = buildCreateGroupMessage({
          action: 'create_group',
          name: name.trim(),
          description: description.trim(),
          participants: participantList,
          nonce,
          timestamp,
        });

        const signature = await signMessageAsync({ message: challengeMsg });

        let remoteSucceeded = false;
        try {
          const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_group',
              name: name.trim(),
              description: description.trim(),
              participants: participantList,
              signerAddress: userAddress,
              signature,
              nonce,
              timestamp,
            }),
          });

          const result = await res.json().catch(() => ({}));
          if (res.ok) {
            remoteSucceeded = true;
          } else {
            console.warn('[CreateGroupModal] Remote sync warning:', result.error);
          }
        } catch (fetchErr) {
          console.warn('[CreateGroupModal] Network fetch failed:', fetchErr);
        }

        // Always save to local store so user is NEVER blocked from using their group
        createGroup(
          {
            name: name.trim(),
            description: description.trim(),
            initialParticipants: participantList,
          },
          'live'
        );

        if (!remoteSucceeded) {
          toast?.warning('Group saved locally', 'Remote sync requires Supabase service role key.');
        } else {
          toast?.success('Group created', 'Working group created successfully!');
        }
      } else {
        createGroup(
          {
            name: name.trim(),
            description: description.trim(),
            initialParticipants: initialAddresses,
          },
          'demo'
        );
        toast?.success('Group created', 'Demo group created successfully!');
      }

      // Reset form upon successful creation
      setName('');
      setDescription('');
      setParticipantsRaw('');
      onCreated();
      onClose();
    } catch (err: any) {
      // Input preservation: name, description, and participantsRaw are NOT wiped
      setErrorMsg(err.message || 'Failed to create group.');
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
            Create Group
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
