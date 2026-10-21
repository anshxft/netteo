'use client';

import { Group, CreateGroupInput } from './types';
import { normalizeAddress, MAX_PARTICIPANTS_PER_CYCLE } from '../settlement-cycles/netting';

export const CANONICAL_GROUP: Group = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Genesis Design & Infra Collective',
  description: 'Shared design, infrastructure, and API reimbursement working group.',
  participantLimit: 10,
  participants: [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333',
  ],
  createdAt: '2026-10-20T10:00:00.000Z',
  status: 'active',
};

export function getActiveWorkspaceMode(): 'demo' | 'live' {
  if (typeof window === 'undefined') return 'demo';
  try {
    const mode = localStorage.getItem('netteo_workspace_mode_v1');
    return mode === 'live' ? 'live' : 'demo';
  } catch {
    return 'demo';
  }
}

function getStorageKey(mode?: 'demo' | 'live'): string {
  const m = mode || getActiveWorkspaceMode();
  return m === 'live' ? 'netteo_live_groups_v1' : 'netteo_demo_groups_v1';
}

export function loadGroups(mode?: 'demo' | 'live'): Group[] {
  const activeMode = mode || getActiveWorkspaceMode();
  if (typeof window === 'undefined') {
    return activeMode === 'demo' ? [CANONICAL_GROUP] : [];
  }
  try {
    const storageKey = getStorageKey(activeMode);
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      if (activeMode === 'demo') {
        saveGroups([CANONICAL_GROUP], 'demo');
        return [CANONICAL_GROUP];
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (activeMode === 'demo') {
        saveGroups([CANONICAL_GROUP], 'demo');
        return [CANONICAL_GROUP];
      }
      return [];
    }
    return parsed.map((g: any) => ({
      ...g,
      id: g.id === 'grp-genesis-001' ? CANONICAL_GROUP.id : g.id,
    }));
  } catch {
    return activeMode === 'demo' ? [CANONICAL_GROUP] : [];
  }
}

export function saveGroups(groups: Group[], mode?: 'demo' | 'live'): void {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = getStorageKey(mode);
    localStorage.setItem(storageKey, JSON.stringify(groups));
  } catch (err) {
    console.error('Failed to save groups to local storage', err);
  }
}

export function createGroup(input: CreateGroupInput, mode?: 'demo' | 'live'): Group {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Group name is required.');
  }

  const limit = Math.min(input.participantLimit || 10, MAX_PARTICIPANTS_PER_CYCLE);

  // Validate initial participants
  const validatedParticipants: string[] = [];
  if (input.initialParticipants) {
    for (const rawAddr of input.initialParticipants) {
      const trimmed = rawAddr.trim();
      if (!trimmed) continue;
      const normalized = normalizeAddress(trimmed);
      if (validatedParticipants.includes(normalized)) {
        throw new Error(`Duplicate participant address: ${normalized}`);
      }
      validatedParticipants.push(normalized);
    }
  }

  if (validatedParticipants.length > limit) {
    throw new Error(`Participants exceed group limit of ${limit}.`);
  }

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;

  const newGroup: Group = {
    id: newId,
    name: trimmedName,
    description: input.description.trim(),
    participantLimit: limit,
    participants: validatedParticipants,
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  const current = loadGroups(mode);
  const updated = [newGroup, ...current];
  saveGroups(updated, mode);
  return newGroup;
}

export function addParticipantToGroup(groupId: string, rawAddress: string, mode?: 'demo' | 'live'): Group {
  const normalized = normalizeAddress(rawAddress.trim());
  const groups = loadGroups(mode);
  const groupIndex = groups.findIndex((g) => g.id === groupId);
  if (groupIndex === -1) {
    throw new Error('Working group not found.');
  }

  const group = groups[groupIndex];
  if (group.participants.includes(normalized)) {
    throw new Error('Address is already a member of this working group.');
  }

  if (group.participants.length >= group.participantLimit) {
    throw new Error(`Participant limit reached (${group.participantLimit} members max).`);
  }

  const updatedGroup: Group = {
    ...group,
    participants: [...group.participants, normalized],
  };

  groups[groupIndex] = updatedGroup;
  saveGroups(groups, mode);
  return updatedGroup;
}

export function removeParticipantFromGroup(groupId: string, address: string, mode?: 'demo' | 'live'): Group {
  const normalized = normalizeAddress(address.trim());
  const groups = loadGroups(mode);
  const groupIndex = groups.findIndex((g) => g.id === groupId);
  if (groupIndex === -1) {
    throw new Error('Working group not found.');
  }

  const group = groups[groupIndex];
  const updatedGroup: Group = {
    ...group,
    participants: group.participants.filter((p) => p !== normalized),
  };

  groups[groupIndex] = updatedGroup;
  saveGroups(groups, mode);
  return updatedGroup;
}
