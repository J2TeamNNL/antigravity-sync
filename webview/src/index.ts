/**
 * Webview Entry Point - Modern Redesign
 */
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeDivider,
  vsCodeTextField,
  vsCodeDropdown,
  vsCodeOption
} from '@vscode/webview-ui-toolkit';

// Register VS Code UI Toolkit components
provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeCheckbox(),
  vsCodeDivider(),
  vsCodeTextField(),
  vsCodeDropdown(),
  vsCodeOption()
);

import { MainPanel, showConfigured, updateStatus, showError, showConfigError, appendLog, clearLog, updateGitStatus, setRefreshLoading, updateCountdown, updateAutoRetryStatus, appendAutoRetryLog, updateCDPStatus, updateAutoStartCheckbox, updateProjectStatus } from './panels/MainPanel';

// Declare vscode API type
interface VsCodeApi {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
}

declare function acquireVsCodeApi(): VsCodeApi;

// Export vscode API for use in components
export const vscode: VsCodeApi = acquireVsCodeApi();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    const mainPanel = new MainPanel(app);
    mainPanel.render();
  }
});

// Handle messages from extension
interface AgentMeta {
  id: string;
  name: string;
  hasGlobal: boolean;
  hasProject: boolean;
}

interface AgentPathSetting {
  globalEnabled?: boolean;
  projectEnabled?: boolean;
  globalPath?: string;
}

interface ProjectStatus {
  hasWorkspace: boolean;
  isGitRepo: boolean;
  rootPath?: string;
  files: string[];
  totalFiles: number;
  message?: string;
}

interface ConfiguredMessage {
  type: 'configured';
  data: {
    configured: boolean;
    privateConfigured: boolean;
    repoUrl?: string;
    syncMode: 'private' | 'project' | 'both';
    enabledAgents: string[];
    agentPathSettings: Record<string, AgentPathSetting>;
    agents: AgentMeta[];
    locale: string;
    strings: Record<string, string>;
    projectStatus?: ProjectStatus;
  };
}

interface StatusMessage {
  type: 'updateStatus';
  data: { status: 'synced' | 'syncing' | 'error' | 'pending'; lastSync?: string };
}

interface ErrorMessage {
  type: 'showError';
  data: { message: string };
}

interface ConfigErrorMessage {
  type: 'configError';
  data: { message: string };
}

interface LogMessage {
  type: 'log';
  data: { message: string; logType: 'success' | 'error' | 'info' };
}

interface ClearLogMessage {
  type: 'clearLog';
  data: Record<string, never>;
}

interface GitStatusMessage {
  type: 'gitStatus';
  data: { ahead: number; behind: number; files: string[]; totalFiles: number; syncRepoPath: string };
}

interface ProjectStatusMessage {
  type: 'projectStatus';
  data: ProjectStatus;
}

interface CountdownMessage {
  type: 'countdown';
  data: { seconds: number };
}

interface AutoRetryStatusMessage {
  type: 'autoRetryStatus';
  data: { running: boolean; retryCount: number; connectionCount?: number };
}

interface AutoRetryLogMessage {
  type: 'autoRetryLog';
  data: { message: string; logType: 'success' | 'error' | 'info' };
}

interface CDPStatusMessage {
  type: 'cdpStatus';
  data: { available: boolean; hasFlag: boolean; port: number };
}

interface AutoStartSettingMessage {
  type: 'autoStartSetting';
  data: { enabled: boolean };
}

type ExtensionMessage = ConfiguredMessage | StatusMessage | ErrorMessage | ConfigErrorMessage | LogMessage | ClearLogMessage | GitStatusMessage | ProjectStatusMessage | CountdownMessage | AutoRetryStatusMessage | AutoRetryLogMessage | CDPStatusMessage | AutoStartSettingMessage;

window.addEventListener('message', (event: MessageEvent<ExtensionMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'configured':
      showConfigured(message.data);
      break;
    case 'updateStatus':
      updateStatus(message.data.status, message.data.lastSync);
      break;
    case 'showError':
      showError(message.data.message);
      break;
    case 'configError':
      showConfigError(message.data.message);
      break;
    case 'log':
      appendLog(message.data.message, message.data.logType);
      break;
    case 'clearLog':
      clearLog();
      break;
    case 'gitStatus':
      updateGitStatus(message.data);
      break;
    case 'projectStatus':
      updateProjectStatus(message.data);
      break;
    case 'countdown':
      updateCountdown(message.data.seconds);
      break;
    case 'autoRetryStatus':
      updateAutoRetryStatus(message.data.running, message.data.retryCount, message.data.connectionCount);
      break;
    case 'autoRetryLog':
      appendAutoRetryLog(message.data.message, message.data.logType);
      break;
    case 'cdpStatus':
      updateCDPStatus(message.data.available, message.data.hasFlag, message.data.port);
      break;
    case 'autoStartSetting':
      updateAutoStartCheckbox(message.data.enabled);
      break;
  }
});
