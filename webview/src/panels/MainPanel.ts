/**
 * Main Panel Component - Modern Redesign
 */
import { vscode } from '../index';

let uiStrings: Record<string, string> = {};

function t(key: string, fallback: string): string {
  const value = uiStrings[key];
  if (!value || value === key) {
    return fallback;
  }
  return value;
}

export class MainPanel {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="main-panel">
        <section id="mode-section" class="mode-section">
          <div class="section-header">
            <span class="codicon codicon-sync"></span>
            <h3 id="mode-title">Sync Mode</h3>
          </div>
          <p class="description" id="mode-desc">Choose how you want to sync.</p>
          <vscode-dropdown id="sync-mode-select" class="full-width">
            <vscode-option value="private" id="sync-mode-private">Private</vscode-option>
            <vscode-option value="project" id="sync-mode-project">Project</vscode-option>
            <vscode-option value="both" id="sync-mode-both">Both</vscode-option>
          </vscode-dropdown>
        </section>

        <section id="locale-section" class="locale-section">
          <div class="section-header">
            <span class="codicon codicon-gear"></span>
            <h3 id="locale-title">Language</h3>
          </div>
          <vscode-dropdown id="locale-select" class="full-width">
            <vscode-option value="auto" id="locale-auto">Auto</vscode-option>
            <vscode-option value="en" id="locale-en">English</vscode-option>
            <vscode-option value="vi" id="locale-vi">Vietnamese</vscode-option>
          </vscode-dropdown>
        </section>

        <section id="agents-section" class="agents-section">
          <div class="section-header">
            <span class="codicon codicon-folder"></span>
            <h3 id="agents-title">Agents</h3>
          </div>
          <p class="description" id="agents-desc">Enable agents and choose global or project paths.</p>
          <div id="agent-list" class="agent-list"></div>
        </section>

        <vscode-divider></vscode-divider>

        <section id="config-section" class="config-section">
          <div class="section-header">
            <span class="codicon codicon-gear"></span>
            <h3 id="config-title">Setup</h3>
          </div>
          
          <p class="description" id="config-desc">Sync your AI context to a private Git repository.</p>
          
          <div class="form-group">
            <label for="repo-url-input" id="repo-url-label">Repository URL</label>
            <vscode-text-field id="repo-url-input" placeholder="https://host/user/repo" class="full-width"></vscode-text-field>
          </div>
          
          <div class="form-group">
            <label for="pat-input" id="pat-label">Access Token</label>
            <vscode-text-field id="pat-input" type="password" placeholder="Token with repo access" class="full-width"></vscode-text-field>
            <span class="hint" id="pat-hint">Token needs repository read/write access</span>
          </div>
          
          <vscode-button id="btn-save-config" class="full-width" style="display: flex; justify-content: center; text-align: center;">
            <span id="btn-connect-text" style="width: 100%; text-align: center;">Connect Repository</span>
            <span id="btn-connect-spinner" class="codicon codicon-sync codicon-modifier-spin" style="display: none;"></span>
          </vscode-button>
          
          <div id="config-error" class="error-box" style="display: none;"></div>
        </section>

        <!-- Auto Retry Section (CDP-based) -->
        <section class="auto-retry-section" id="auto-retry-section">
          <vscode-divider></vscode-divider>
          <div class="section-header">
            <span class="codicon codicon-zap"></span>
            <span class="section-title">Auto Retry</span>
            <span id="auto-retry-status" class="status-badge" style="margin-left: auto; font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);">OFF</span>
          </div>
          <p class="description" style="font-size: 11px; opacity: 0.8; margin: 0 0 8px 0;">
            Auto-click Retry buttons when AI agent encounters errors
          </p>
          
          <!-- Auto Start Checkbox -->
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <vscode-checkbox id="chk-auto-start">Auto-start on launch</vscode-checkbox>
          </div>
          
          <!-- Toggle Button (shows Start or Stop based on state) -->
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <vscode-button id="btn-toggle-auto-retry" appearance="primary" style="flex: 1;">
              <span class="codicon codicon-play" id="btn-toggle-icon"></span>
              <span id="btn-toggle-text">Start</span>
            </vscode-button>
          </div>
          
          <div id="auto-retry-log" class="log-output" style="margin-top: 8px; max-height: 120px;">
            <div class="log-empty">Click Start to enable auto-retry</div>
          </div>
        </section>

        <!-- Main Dashboard (shown when configured) -->
        <section id="dashboard-section" class="dashboard-section" style="display: none;">
          <!-- Status Card -->
          <div class="status-card">
            <div class="status-indicator" id="status-indicator">
              <span class="codicon codicon-check" id="status-icon"></span>
            </div>
            <div class="status-info">
              <span class="status-text" id="status-text">Synced</span>
              <span class="status-time" id="last-sync-time">Just now</span>
            </div>
            <div class="sync-countdown" id="sync-countdown" title="Auto-sync countdown">
              <span id="countdown-value">--:--</span>
            </div>
            <vscode-button appearance="icon" id="btn-sync-icon" title="Sync now">
              <span class="codicon codicon-sync"></span>
            </vscode-button>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <vscode-button appearance="secondary" id="btn-push">
              <span class="codicon codicon-cloud-upload"></span>
              <span id="push-label">Push</span>
            </vscode-button>
            <vscode-button appearance="secondary" id="btn-pull">
              <span class="codicon codicon-cloud-download"></span>
              <span id="pull-label">Pull</span>
            </vscode-button>
          </div>

          <!-- Sync Toggle -->
          <div class="sync-toggle-section">
            <div class="toggle-row">
              <span class="toggle-label" id="sync-enabled-label">Sync Enabled</span>
              <vscode-checkbox id="sync-enabled-toggle" checked></vscode-checkbox>
            </div>
          </div>

          <vscode-divider></vscode-divider>

          <!-- Repository Info -->
          <div class="repo-section">
            <div class="section-header">
              <span class="codicon codicon-repo"></span>
              <span class="section-title" id="repo-title">Repository</span>
              <vscode-button appearance="icon" id="btn-disconnect" title="Disconnect">
                <span class="codicon codicon-close"></span>
              </vscode-button>
            </div>
            <div class="repo-url" id="repo-display">host/user/repo</div>
          </div>

          <vscode-divider></vscode-divider>

          <!-- Git Status -->
          <div class="git-status-section">
            <div class="section-header">
              <span class="section-title" id="git-status-title">SYNC STATUS</span>
              <vscode-button appearance="icon" id="btn-refresh-status" title="Refresh status">
                <span id="refresh-icon" class="codicon codicon-sync"></span>
              </vscode-button>
            </div>
            <div class="git-status-content" id="git-status-content">
              <div class="git-summary" id="git-summary">
                <div class="git-stat">
                  <span class="git-stat-value" id="git-files-count">0</span>
                  <span class="git-stat-label" id="git-files-label">files to push</span>
                </div>
                <div class="git-stat">
                  <span class="git-stat-value" id="git-behind-count">0</span>
                  <span class="git-stat-label" id="git-behind-label">commits to pull</span>
                </div>
              </div>
              <div class="git-files" id="git-files">
                <div class="git-files-empty" id="git-files-empty">No pending changes</div>
              </div>
              <div class="git-hint">
                <code id="git-status-hint">cd ~/.gemini-sync-repo && git status</code>
              </div>
            </div>
          </div>

          <vscode-divider></vscode-divider>

          <!-- Log Output -->
          <div class="log-section">
            <div class="section-header">
              <span class="codicon codicon-terminal"></span>
              <span class="section-title" id="log-title">Sync Log</span>
              <vscode-button appearance="icon" id="btn-clear-log" title="Clear log">
                <span class="codicon codicon-clear-all"></span>
              </vscode-button>
            </div>
            <div class="log-output" id="log-output">
              <div class="log-empty" id="log-empty">Ready</div>
            </div>
          </div>
        </section>

        <!-- Project Status -->
        <section id="project-status-section" class="project-status-section" style="display: none;">
          <vscode-divider></vscode-divider>
          <div class="section-header">
            <span class="codicon codicon-repo"></span>
            <span class="section-title" id="project-title">Project Sync</span>
            <vscode-button appearance="icon" id="btn-refresh-project" title="Refresh">
              <span class="codicon codicon-sync"></span>
            </vscode-button>
          </div>
          <p class="description" id="project-desc">Manual mode: shows changes inside project paths.</p>
          <div class="project-status-content" id="project-status-content">
            <div class="git-files" id="project-files">
              <div class="git-files-empty" id="project-files-empty">No changes detected</div>
            </div>
            <div class="git-hint" id="project-meta"></div>
          </div>
        </section>

        <!-- Error Display -->
        <div id="global-error" class="global-error" style="display: none;">
          <span class="codicon codicon-error"></span>
          <span id="error-message"></span>
          <vscode-button appearance="icon" id="btn-dismiss-error">
            <span class="codicon codicon-close"></span>
          </vscode-button>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.checkConfigured();
  }

  private checkConfigured(): void {
    // Check if already configured - request state from extension
    vscode.postMessage({ type: 'checkConfig' });
  }

  private attachEventListeners(): void {
    // Save config button
    document.getElementById('btn-save-config')?.addEventListener('click', () => {
      const repoInput = document.getElementById('repo-url-input') as HTMLInputElement;
      const patInput = document.getElementById('pat-input') as HTMLInputElement;

      // Show loading state
      setConnectLoading(true);

      vscode.postMessage({
        type: 'saveConfig',
        repoUrl: repoInput?.value || '',
        pat: patInput?.value || ''
      });
    });

    // Sync button (icon)
    document.getElementById('btn-sync-icon')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'syncNow' });
    });

    // Sync mode dropdown
    document.getElementById('sync-mode-select')?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      vscode.postMessage({
        type: 'setSyncMode',
        mode: target.value
      });
    });

    // Locale dropdown
    document.getElementById('locale-select')?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      vscode.postMessage({
        type: 'setLocale',
        locale: target.value
      });
    });

    // Push button
    document.getElementById('btn-push')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'push' });
    });

    // Pull button
    document.getElementById('btn-pull')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'pull' });
    });

    // Disconnect button
    document.getElementById('btn-disconnect')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'disconnect' });
    });

    // Dismiss error
    document.getElementById('btn-dismiss-error')?.addEventListener('click', () => {
      const errorEl = document.getElementById('global-error');
      if (errorEl) errorEl.style.display = 'none';
    });

    // Folder checkboxes
    ['knowledge', 'antigravity', 'brain', 'conversations'].forEach(folder => {
      document.getElementById(`folder-${folder}`)?.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        vscode.postMessage({
          type: 'toggleFolder',
          folder: folder,
          enabled: target.checked
        });
      });
    });

    // Sync enabled toggle
    document.getElementById('sync-enabled-toggle')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      vscode.postMessage({
        type: 'toggleSyncEnabled',
        enabled: target.checked
      });
    });

    // Refresh git status
    document.getElementById('btn-refresh-status')?.addEventListener('click', () => {
      setRefreshLoading(true);
      vscode.postMessage({ type: 'getGitStatus' });
    });

    // Refresh project status
    document.getElementById('btn-refresh-project')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'refreshProjectStatus' });
    });

    // Clear log button
    document.getElementById('btn-clear-log')?.addEventListener('click', () => {
      clearLog();
    });

    // Auto Retry - Toggle button
    document.getElementById('btn-toggle-auto-retry')?.addEventListener('click', () => {
      const statusBadge = document.getElementById('auto-retry-status');
      const isRunning = statusBadge?.textContent === 'ON';
      if (isRunning) {
        vscode.postMessage({ type: 'stopAutoRetry' });
      } else {
        vscode.postMessage({ type: 'startAutoRetry' });
      }
    });

    // Auto Retry - Auto-start checkbox
    document.getElementById('chk-auto-start')?.addEventListener('change', (e) => {
      const checkbox = e.target as HTMLInputElement;
      vscode.postMessage({ type: 'setAutoStart', data: { enabled: checkbox.checked } });
    });

    // Request initial auto-retry status and auto-start setting
    vscode.postMessage({ type: 'getAutoRetryStatus' });
  }
}

// Export function to update UI from extension messages
export function showConfigured(data: {
  configured: boolean;
  privateConfigured: boolean;
  repoUrl?: string;
  syncMode: 'private' | 'project' | 'both';
  enabledAgents: string[];
  agentPathSettings: Record<string, { globalEnabled?: boolean; projectEnabled?: boolean }>;
  agents: { id: string; name: string; hasGlobal: boolean; hasProject: boolean }[];
  locale: string;
  strings: Record<string, string>;
  projectStatus?: {
    hasWorkspace: boolean;
    isGitRepo: boolean;
    rootPath?: string;
    files: string[];
    totalFiles: number;
    message?: string;
  };
}): void {
  const configSection = document.getElementById('config-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const projectSection = document.getElementById('project-status-section');
  const repoDisplay = document.getElementById('repo-display');

  // Reset loading state
  setConnectLoading(false);

  updateStrings(data.strings);
  updateSyncModeSelect(data.syncMode);
  updateLocaleSelect(data.locale);
  renderAgentList(data.agents, data.enabledAgents, data.agentPathSettings);

  if (configSection) {
    const showConfig = (data.syncMode === 'private' || data.syncMode === 'both') && !data.privateConfigured;
    configSection.style.display = showConfig ? 'block' : 'none';
  }

  if (dashboardSection) {
    dashboardSection.style.display = data.privateConfigured ? 'block' : 'none';
  }

  if (projectSection) {
    projectSection.style.display = (data.syncMode === 'project' || data.syncMode === 'both') ? 'block' : 'none';
  }

  if (repoDisplay && data.repoUrl) {
    repoDisplay.textContent = data.repoUrl;
  }

  if (data.projectStatus) {
    updateProjectStatus(data.projectStatus);
  }
}

export function updateStrings(strings: Record<string, string>): void {
  uiStrings = strings || {};
  applyStrings();
}

function applyStrings(): void {
  const setText = (id: string, value: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  };

  setText('mode-title', t('panel.mode.title', 'Sync Mode'));
  setText('mode-desc', t('panel.mode.desc', 'Choose how you want to sync.'));
  setText('sync-mode-private', t('panel.mode.private', 'Private'));
  setText('sync-mode-project', t('panel.mode.project', 'Project'));
  setText('sync-mode-both', t('panel.mode.both', 'Both'));

  setText('locale-title', t('panel.locale.title', 'Language'));
  setText('locale-auto', t('panel.locale.auto', 'Auto'));
  setText('locale-en', t('panel.locale.en', 'English'));
  setText('locale-vi', t('panel.locale.vi', 'Vietnamese'));

  setText('agents-title', t('panel.agents.title', 'Agents'));
  setText('agents-desc', t('panel.agents.desc', 'Enable agents and choose global or project paths.'));

  setText('config-title', t('panel.config.title', 'Setup'));
  setText('config-desc', t('panel.config.desc', 'Sync your AI context to a private Git repository.'));
  setText('repo-url-label', t('panel.config.repoLabel', 'Repository URL'));
  setText('pat-label', t('panel.config.patLabel', 'Access Token'));
  setText('pat-hint', t('panel.config.patHint', 'Token needs repository read/write access'));
  setText('btn-connect-text', t('panel.config.connect', 'Connect Repository'));

  setText('push-label', t('panel.dashboard.push', 'Push'));
  setText('pull-label', t('panel.dashboard.pull', 'Pull'));
  setText('sync-enabled-label', t('panel.dashboard.syncEnabled', 'Sync Enabled'));
  setText('repo-title', t('panel.repo.title', 'Repository'));

  setText('git-status-title', t('panel.gitStatus.title', 'Sync Status'));
  setText('git-files-label', t('panel.gitStatus.filesToPush', 'files to push'));
  setText('git-behind-label', t('panel.gitStatus.commitsToPull', 'commits to pull'));
  setText('git-files-empty', t('panel.gitStatus.noChanges', 'No pending changes'));
  setText('git-status-hint', t('panel.gitStatus.hint', 'cd ~/.gemini-sync-repo && git status'));

  setText('log-title', t('panel.log.title', 'Sync Log'));
  setText('log-empty', t('panel.log.ready', 'Ready'));

  setText('project-title', t('panel.project.title', 'Project Sync'));
  setText('project-desc', t('panel.project.desc', 'Manual mode: shows changes inside project paths.'));
  setText('project-files-empty', t('panel.project.empty', 'No changes detected'));
}

function updateSyncModeSelect(mode: 'private' | 'project' | 'both'): void {
  const select = document.getElementById('sync-mode-select') as HTMLSelectElement;
  if (select) {
    select.value = mode;
  }
}

function updateLocaleSelect(locale: string): void {
  const select = document.getElementById('locale-select') as HTMLSelectElement;
  if (select) {
    select.value = locale;
  }
}

function renderAgentList(
  agents: { id: string; name: string; hasGlobal: boolean; hasProject: boolean }[],
  enabledAgents: string[],
  agentPathSettings: Record<string, { globalEnabled?: boolean; projectEnabled?: boolean }>,
): void {
  const container = document.getElementById('agent-list');
  if (!container) return;

  container.innerHTML = '';

  agents.forEach(agent => {
    const wrapper = document.createElement('div');
    wrapper.className = 'agent-item';

    const header = document.createElement('div');
    header.className = 'agent-row';

    const agentToggle = document.createElement('vscode-checkbox') as any;
    agentToggle.id = `agent-${agent.id}-enabled`;
    agentToggle.checked = enabledAgents.includes(agent.id);
    agentToggle.textContent = agent.name;
    agentToggle.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      vscode.postMessage({
        type: 'toggleAgent',
        agentId: agent.id,
        enabled: target.checked
      });
    });

    header.appendChild(agentToggle);
    wrapper.appendChild(header);

    const pathRow = document.createElement('div');
    pathRow.className = 'agent-paths';

    const pathSettings = agentPathSettings[agent.id] || {};
    const isEnabled = enabledAgents.includes(agent.id);

    if (agent.hasGlobal) {
      const globalLabel = document.createElement('label');
      globalLabel.className = 'agent-path-item';
      const globalToggle = document.createElement('vscode-checkbox') as any;
      globalToggle.id = `agent-${agent.id}-global`;
      globalToggle.checked = pathSettings.globalEnabled ?? true;
      globalToggle.disabled = !isEnabled;
      globalToggle.textContent = t('panel.agents.global', 'Global');
      globalToggle.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        vscode.postMessage({
          type: 'toggleAgentPath',
          agentId: agent.id,
          pathType: 'global',
          enabled: target.checked
        });
      });
      globalLabel.appendChild(globalToggle);
      pathRow.appendChild(globalLabel);
    }

    if (agent.hasProject) {
      const projectLabel = document.createElement('label');
      projectLabel.className = 'agent-path-item';
      const projectToggle = document.createElement('vscode-checkbox') as any;
      projectToggle.id = `agent-${agent.id}-project`;
      projectToggle.checked = pathSettings.projectEnabled ?? true;
      projectToggle.disabled = !isEnabled;
      projectToggle.textContent = t('panel.agents.project', 'Project');
      projectToggle.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        vscode.postMessage({
          type: 'toggleAgentPath',
          agentId: agent.id,
          pathType: 'project',
          enabled: target.checked
        });
      });
      projectLabel.appendChild(projectToggle);
      pathRow.appendChild(projectLabel);
    }

    wrapper.appendChild(pathRow);
    container.appendChild(wrapper);
  });
}

export function updateFolderCheckboxes(syncFolders: string[]): void {
  const folders = ['knowledge', 'brain', 'conversations'];
  for (const folder of folders) {
    const checkbox = document.getElementById(`folder-${folder}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = syncFolders.includes(folder);
    }
  }
}

export function updateStatus(status: 'synced' | 'syncing' | 'error' | 'pending', lastSync?: string): void {
  const indicator = document.getElementById('status-indicator');
  const icon = document.getElementById('status-icon');
  const text = document.getElementById('status-text');
  const time = document.getElementById('last-sync-time');

  if (indicator && icon && text) {
    indicator.className = `status-indicator status-${status}`;

    const iconMap: Record<string, string> = {
      synced: 'codicon-check',
      syncing: 'codicon-sync codicon-modifier-spin',
      error: 'codicon-error',
      pending: 'codicon-clock'
    };

    const textMap: Record<string, string> = {
      synced: t('panel.dashboard.status.synced', 'Synced'),
      syncing: t('panel.dashboard.status.syncing', 'Syncing...'),
      error: t('panel.dashboard.status.error', 'Sync Error'),
      pending: t('panel.dashboard.status.pending', 'Changes pending')
    };

    icon.className = `codicon ${iconMap[status]}`;
    text.textContent = textMap[status];
  }

  if (time && lastSync) {
    time.textContent = formatRelativeTime(lastSync);
  }
}

export function showError(message: string): void {
  const errorEl = document.getElementById('global-error');
  const errorMsg = document.getElementById('error-message');

  if (errorEl && errorMsg) {
    errorMsg.textContent = message;
    errorEl.style.display = 'flex';
  }
}

export function showConfigError(message: string): void {
  const errorEl = document.getElementById('config-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
  // Reset loading state on error
  setConnectLoading(false);
}

export function setConnectLoading(loading: boolean): void {
  const btn = document.getElementById('btn-save-config') as HTMLButtonElement;
  const text = document.getElementById('btn-connect-text');
  const spinner = document.getElementById('btn-connect-spinner');

  if (btn) {
    btn.disabled = loading;
  }
  if (text) {
    text.style.display = loading ? 'none' : 'inline';
  }
  if (spinner) {
    spinner.style.display = loading ? 'inline' : 'none';
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function appendLog(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const logOutput = document.getElementById('log-output');
  if (!logOutput) return;

  // Remove empty message
  const empty = logOutput.querySelector('.log-empty');
  if (empty) empty.remove();

  // Create new log line
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.textContent = message;

  // Add to bottom
  logOutput.appendChild(line);

  // Auto-scroll to bottom
  logOutput.scrollTop = logOutput.scrollHeight;

  // Keep only last 50 lines
  while (logOutput.children.length > 50) {
    logOutput.firstChild?.remove();
  }
}

export function clearLog(): void {
  const logOutput = document.getElementById('log-output');
  if (!logOutput) return;
  logOutput.innerHTML = `<div class="log-empty">${t('panel.log.ready', 'Ready')}</div>`;
}

export function updateGitStatus(data: {
  ahead: number;
  behind: number;
  files: string[];
  totalFiles: number;
  syncRepoPath: string;
}): void {
  const filesCountEl = document.getElementById('git-files-count');
  const behindCountEl = document.getElementById('git-behind-count');
  const filesEl = document.getElementById('git-files');
  const refreshIcon = document.getElementById('refresh-icon');

  // Stop loading animation
  if (refreshIcon) {
    refreshIcon.classList.remove('codicon-modifier-spin');
  }

  // Update files count
  if (filesCountEl) {
    filesCountEl.textContent = String(data.totalFiles);
    filesCountEl.className = data.totalFiles > 0 ? 'git-stat-value has-changes' : 'git-stat-value';
  }

  // Update behind count
  if (behindCountEl) {
    behindCountEl.textContent = String(data.behind);
    behindCountEl.className = data.behind > 0 ? 'git-stat-value has-pull' : 'git-stat-value';
  }

  // Update files list
  if (filesEl) {
    if (data.files.length === 0) {
      filesEl.innerHTML = `<div class="git-files-empty" id="git-files-empty">${t('panel.gitStatus.noChanges', 'No pending changes')}</div>`;
    } else {
      let html = '<div class="git-files-list">';
      data.files.forEach(file => {
        html += `<div class="git-file-item">${file}</div>`;
      });
      if (data.totalFiles > data.files.length) {
        const moreCount = data.totalFiles - data.files.length;
        const moreText = t('panel.gitStatus.more', '...and {0} more').replace('{0}', String(moreCount));
        html += `<div class="git-file-more">${moreText}</div>`;
      }
      html += '</div>';
      filesEl.innerHTML = html;
    }
  }
}

export function updateProjectStatus(data: {
  hasWorkspace: boolean;
  isGitRepo: boolean;
  rootPath?: string;
  files: string[];
  totalFiles: number;
  message?: string;
}): void {
  const filesEl = document.getElementById('project-files');
  const emptyEl = document.getElementById('project-files-empty');
  const metaEl = document.getElementById('project-meta');

  if (!filesEl || !emptyEl || !metaEl) return;

  let emptyMessage = t('panel.project.empty', 'No changes detected');
  if (!data.hasWorkspace) {
    emptyMessage = t('panel.project.noWorkspace', 'No workspace open.');
  } else if (data.message && data.message.toLowerCase().includes('no project paths')) {
    emptyMessage = t('panel.project.noPaths', 'No project paths enabled.');
  } else if (!data.isGitRepo) {
    emptyMessage = t('panel.project.notGit', 'Workspace is not a Git repository.');
  }

  if (data.files.length === 0) {
    filesEl.innerHTML = `<div class="git-files-empty" id="project-files-empty">${emptyMessage}</div>`;
    metaEl.textContent = data.rootPath ? data.rootPath : '';
    return;
  }

  let html = '<div class="git-files-list">';
  data.files.forEach(file => {
    html += `<div class="git-file-item">${file}</div>`;
  });
  if (data.totalFiles > data.files.length) {
    const moreCount = data.totalFiles - data.files.length;
    const moreText = t('panel.gitStatus.more', '...and {0} more').replace('{0}', String(moreCount));
    html += `<div class="git-file-more">${moreText}</div>`;
  }
  html += '</div>';
  filesEl.innerHTML = html;
  metaEl.textContent = `${data.totalFiles} ${t('panel.project.files', 'files')}`;
}

export function setRefreshLoading(loading: boolean): void {
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) {
    if (loading) {
      refreshIcon.classList.add('codicon-modifier-spin');
    } else {
      refreshIcon.classList.remove('codicon-modifier-spin');
    }
  }
}

export function updateCountdown(seconds: number): void {
  const countdownEl = document.getElementById('countdown-value');
  if (countdownEl) {
    if (seconds <= 0) {
      countdownEl.textContent = '--:--';
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      countdownEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }
}

export function updateAutoRetryStatus(running: boolean, retryCount: number, connectionCount?: number): void {
  const statusBadge = document.getElementById('auto-retry-status');
  const toggleBtn = document.getElementById('btn-toggle-auto-retry');
  const toggleIcon = document.getElementById('btn-toggle-icon');
  const toggleText = document.getElementById('btn-toggle-text');

  // Update status badge
  if (statusBadge) {
    statusBadge.textContent = running ? 'ON' : 'OFF';
    statusBadge.style.background = running
      ? 'var(--vscode-debugIcon-startForeground)'
      : 'var(--vscode-badge-background)';
    statusBadge.style.color = running
      ? 'white'
      : 'var(--vscode-badge-foreground)';
  }

  // Update toggle button
  if (toggleBtn && toggleIcon && toggleText) {
    if (running) {
      toggleBtn.setAttribute('appearance', 'secondary');
      toggleIcon.className = 'codicon codicon-debug-stop';
      toggleText.textContent = 'Stop';
    } else {
      toggleBtn.setAttribute('appearance', 'primary');
      toggleIcon.className = 'codicon codicon-play';
      toggleText.textContent = 'Start';
    }
  }
}

export function updateAutoStartCheckbox(enabled: boolean): void {
  const checkbox = document.getElementById('chk-auto-start') as HTMLInputElement;
  if (checkbox) {
    checkbox.checked = enabled;
  }
}

export function updateCDPStatus(available: boolean, hasFlag: boolean, port: number): void {
  const cdpIcon = document.getElementById('cdp-status-icon');
  const cdpText = document.getElementById('cdp-status-text');
  const setupBtn = document.getElementById('btn-setup-cdp');
  const logOutput = document.getElementById('auto-retry-log');

  if (cdpIcon && cdpText) {
    if (available) {
      cdpIcon.className = 'codicon codicon-check';
      cdpIcon.style.color = 'var(--vscode-debugIcon-startForeground)';
      cdpText.textContent = `CDP: Connected (port ${port})`;
    } else if (hasFlag) {
      cdpIcon.className = 'codicon codicon-warning';
      cdpIcon.style.color = 'var(--vscode-debugIcon-pauseForeground)';
      cdpText.textContent = 'CDP: Has flag but not responding';
    } else {
      cdpIcon.className = 'codicon codicon-circle-outline';
      cdpIcon.style.color = 'var(--vscode-debugIcon-disconnectForeground)';
      cdpText.textContent = `CDP: Not connected (port ${port})`;
    }
  }

  // Update setup button visibility
  if (setupBtn) {
    setupBtn.style.display = available ? 'none' : 'inline-flex';
  }

  // Update log hint
  if (logOutput && !available) {
    const empty = logOutput.querySelector('.log-empty');
    if (empty) {
      empty.textContent = hasFlag
        ? 'CDP not responding. Try restarting IDE.'
        : `Click "Setup CDP" then restart IDE with --remote-debugging-port=${port}`;
    }
  }
}

export function appendAutoRetryLog(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const logOutput = document.getElementById('auto-retry-log');
  if (!logOutput) return;

  // Remove empty message
  const empty = logOutput.querySelector('.log-empty');
  if (empty) empty.remove();

  // Create new log line
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.textContent = message;

  // Add to bottom
  logOutput.appendChild(line);

  // Auto-scroll to bottom
  logOutput.scrollTop = logOutput.scrollHeight;

  // Keep only last 20 lines
  while (logOutput.children.length > 20) {
    logOutput.firstChild?.remove();
  }
}
