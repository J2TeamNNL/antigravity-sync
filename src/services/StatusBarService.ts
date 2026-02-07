/**
 * StatusBarService - VS Code status bar integration
 */
import * as vscode from 'vscode';

export enum SyncState {
  Synced = 'synced',
  Syncing = 'syncing',
  Pushing = 'pushing',
  Pulling = 'pulling',
  Pending = 'pending',
  Error = 'error',
  NotConfigured = 'not-configured'
}

interface StateConfig {
  icon: string;
  text: string;
  tooltip: string;
  color?: vscode.ThemeColor;
}

const STATE_CONFIGS: Record<SyncState, StateConfig> = {
  [SyncState.Synced]: {
    icon: '$(check)',
    text: 'Synced',
    tooltip: 'AI Context Sync: All changes synced'
  },
  [SyncState.Syncing]: {
    icon: '$(sync~spin)',
    text: 'Syncing...',
    tooltip: 'AI Context Sync: Syncing changes...'
  },
  [SyncState.Pushing]: {
    icon: '$(cloud-upload)',
    text: 'Pushing...',
    tooltip: 'AI Context Sync: Pushing changes to remote...'
  },
  [SyncState.Pulling]: {
    icon: '$(cloud-download)',
    text: 'Pulling...',
    tooltip: 'AI Context Sync: Pulling changes from remote...'
  },
  [SyncState.Pending]: {
    icon: '$(circle-outline)',
    text: 'Pending',
    tooltip: 'AI Context Sync: Changes pending - click to push'
  },
  [SyncState.Error]: {
    icon: '$(error)',
    text: 'Error',
    tooltip: 'AI Context Sync: Sync error - click to retry',
    color: new vscode.ThemeColor('errorForeground')
  },
  [SyncState.NotConfigured]: {
    icon: '$(gear)',
    text: 'Configure',
    tooltip: 'AI Context Sync: Click to configure'
  }
};

export class StatusBarService {
  private statusBarItem: vscode.StatusBarItem;
  private currentState: SyncState = SyncState.NotConfigured;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'aiContextSync.syncNow';
    this.update(SyncState.NotConfigured);
  }

  /**
   * Update status bar state
   */
  update(state: SyncState): void {
    this.currentState = state;
    const config = STATE_CONFIGS[state];

    this.statusBarItem.text = `${config.icon} ${config.text}`;
    this.statusBarItem.tooltip = config.tooltip;
    this.statusBarItem.color = config.color;

    // Change command based on state
    if (state === SyncState.NotConfigured) {
      this.statusBarItem.command = 'aiContextSync.configure';
    } else if (state === SyncState.Error) {
      this.statusBarItem.command = 'aiContextSync.syncNow';
    } else {
      this.statusBarItem.command = 'aiContextSync.showStatus';
    }
  }

  /**
   * Set error state with custom message
   */
  setError(errorMessage: string): void {
    this.currentState = SyncState.Error;
    const shortMessage = errorMessage.length > 50
      ? errorMessage.substring(0, 47) + '...'
      : errorMessage;

    this.statusBarItem.text = `$(error) ${shortMessage}`;
    this.statusBarItem.tooltip = `AI Context Sync Error: ${errorMessage}\n\nClick to retry`;
    this.statusBarItem.color = new vscode.ThemeColor('errorForeground');
    this.statusBarItem.command = 'aiContextSync.syncNow';
  }

  /**
   * Get current state
   */
  getState(): SyncState {
    return this.currentState;
  }

  /**
   * Show status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Get the status bar item for disposal
   */
  getStatusBarItem(): vscode.StatusBarItem {
    return this.statusBarItem;
  }
}
