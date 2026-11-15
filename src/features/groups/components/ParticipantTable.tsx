'use client';

import React, { useState } from 'react';
import styles from './GroupsView.module.css';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/icons/Icon';
import { addParticipantToGroup, removeParticipantFromGroup, getActiveWorkspaceMode } from '../store';
import { updateGroupParticipantsOnServer } from '@/lib/db/syncService';
import { UserPlus, Trash2, Copy, Check } from 'lucide-react';

export interface ParticipantTableProps {
  groupId: string;
  participants: string[];
  participantLimit: number;
  onUpdate: () => void;
  isOffline?: boolean;
}

export function ParticipantTable({
  groupId,
  participants,
  participantLimit,
  onUpdate,
  isOffline = false,
}: ParticipantTableProps) {
  const [newAddress, setNewAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFull = participants.length >= participantLimit;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const updated = addParticipantToGroup(groupId, newAddress); // validates and updates the local copy
      if (getActiveWorkspaceMode() === 'live') {
        // The server decides who may change members (group admin only). If it refuses, undo the local change.
        const serverError = await updateGroupParticipantsOnServer(groupId, updated.participants);
        if (serverError) {
          removeParticipantFromGroup(groupId, newAddress);
          throw new Error(serverError);
        }
      }
      setNewAddress(''); // Only clear on success, so a failed add keeps what was typed
      onUpdate();
    } catch (err: any) {
      // Input is strictly preserved in newAddress; sanitized message shown
      setErrorMsg(err.message || 'Unable to add participant address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (addr: string) => {
    if (confirm(`Remove participant ${addr.slice(0, 6)}...${addr.slice(-4)} from group?`)) {
      setErrorMsg(null);
      try {
        const updated = removeParticipantFromGroup(groupId, addr);
        if (getActiveWorkspaceMode() === 'live') {
          // Refused by the server (not an admin, or the member still has open obligations): put them back locally.
          const serverError = await updateGroupParticipantsOnServer(groupId, updated.participants);
          if (serverError) {
            addParticipantToGroup(groupId, addr);
            throw new Error(serverError);
          }
        }
        onUpdate();
      } catch (err: any) {
        setErrorMsg(err.message || 'Unable to remove participant.');
        onUpdate();
      }
    }
  };

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
          Group Participants ({participants.length}/{participantLimit})
        </h3>
        {isFull && (
          <span style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 500 }}>
            Participant limit reached (10 max)
          </span>
        )}
      </div>

      {errorMsg && (
        <div style={{ marginTop: 'var(--space-xs)' }} className={styles.errorBanner} role="alert">
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

      <div className={styles.tableContainer}>
        <table className={styles.table} aria-label="Group Participants">
          <thead>
            <tr>
              <th scope="col" style={{ width: '48px' }}>#</th>
              <th scope="col">Wallet Address</th>
              <th scope="col" style={{ width: '120px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((addr, idx) => (
              <tr key={addr}>
                <td style={{ color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {idx + 1}
                </td>
                <td>
                  <span className={styles.addressCode}>{addr}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 'var(--space-2xs)' }}>
                    <Button
                      variant="tertiary"
                      onClick={() => handleCopy(addr)}
                      style={{ minHeight: '32px', padding: '0 6px' }}
                      title="Copy address to clipboard"
                    >
                      <Icon
                        icon={copiedAddress === addr ? Check : Copy}
                        size="sm"
                        color={copiedAddress === addr ? 'var(--color-success)' : 'currentColor'}
                      />
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={isOffline}
                      onClick={() => handleRemove(addr)}
                      style={{ minHeight: '32px', padding: '0 6px' }}
                      title="Remove participant from group"
                    >
                      <Icon icon={Trash2} size="sm" color="var(--color-danger)" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Participant Row */}
      {!isFull && (
        <form onSubmit={handleAdd} className={styles.addParticipantForm}>
          <input
            type="text"
            className={styles.input}
            placeholder="0x... (42-character Ethereum address)"
            value={newAddress}
            disabled={isOffline || isSubmitting}
            onChange={(e) => setNewAddress(e.target.value)}
            aria-label="New participant Ethereum address"
            pattern="^0x[a-fA-F0-9]{40}$"
            title="Must be a valid 42-character hex address beginning with 0x"
            required
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={isOffline || isSubmitting || !newAddress.trim()}
            isLoading={isSubmitting}
            icon={<Icon icon={UserPlus} size="sm" />}
          >
            Add Member
          </Button>
        </form>
      )}
    </div>
  );
}
