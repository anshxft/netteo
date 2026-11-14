export type WorkspaceMode = 'demo' | 'live';

export const MODE_STORAGE_KEY = 'netteo_workspace_mode_v1';

/** A first-time visitor lands on real Mezo Mainnet. Demo is only used once someone chooses it. */
export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = 'live';

/** The mode stores use when a caller does not pass one. Must agree with WorkspaceProvider's initial state. */
export function getActiveWorkspaceMode(): WorkspaceMode {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_MODE;
  try {
    return localStorage.getItem(MODE_STORAGE_KEY) === 'demo' ? 'demo' : DEFAULT_WORKSPACE_MODE;
  } catch {
    return DEFAULT_WORKSPACE_MODE;
  }
}
