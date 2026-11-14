'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_WORKSPACE_MODE, MODE_STORAGE_KEY, type WorkspaceMode } from './mode';

export type { WorkspaceMode };

interface WorkspaceContextType {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  toggleMode: () => void;
  resetDemoWorkspace: () => void;
  resetCounter: number;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<WorkspaceMode>(DEFAULT_WORKSPACE_MODE);
  const [resetCounter, setResetCounter] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === 'live' || saved === 'demo') {
        setModeState(saved);
      }
    } catch {
      // Fallback to default
    }
  }, []);

  const setMode = (newMode: WorkspaceMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, newMode);
    } catch (err) {
      console.warn('Failed to persist workspace mode', err);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'demo' ? 'live' : 'demo');
  };

  const resetDemoWorkspace = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('netteo_demo_groups_v1');
        localStorage.removeItem('netteo_demo_obligations_v1');
        localStorage.removeItem('netteo_demo_cycles_v1');
      }
    } catch (err) {
      console.warn('Failed to clear demo local storage', err);
    }
    setResetCounter((prev) => prev + 1);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        resetDemoWorkspace,
        resetCounter,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
