/**
 * SidePanelProvider - WebviewViewProvider for the side panel
 */
import * as vscode from "vscode";
import * as fs from "fs";
import { SyncService } from "../services/SyncService";
import { ConfigService } from "../services/ConfigService";
import { NotificationService } from "../services/NotificationService";
import { GitService } from "../services/GitService";
import { ProjectSyncService } from "../services/ProjectSyncService";
import { getAllProviders } from "../providers";
import { i18n } from "../services/LocalizationService";

export class SidePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "aiContextSync.mainPanel";

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private readonly _syncService: SyncService;
  private readonly _configService: ConfigService;
  private readonly _projectSyncService: ProjectSyncService;

  constructor(
    extensionUri: vscode.Uri,
    syncService: SyncService,
    configService: ConfigService,
  ) {
    this._extensionUri = extensionUri;
    this._syncService = syncService;
    this._configService = configService;
    this._projectSyncService = new ProjectSyncService(configService);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "dist", "webview"),
        vscode.Uri.joinPath(this._extensionUri, "webview", "media"),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "checkConfig":
          await this.sendConfigState();
          break;
        case "saveConfig":
          await this.handleSaveConfig(message.token, message.repoPath);
          break;
        case "syncNow":
          await this.handleSync();
          break;
        case "push":
          await this.handlePush();
          break;
        case "pull":
          await this.handlePull();
          break;
        case "disconnect":
          await this.handleDisconnect();
          break;
        case "toggleFolder":
          await this.handleFolderToggle(message.folder, message.enabled);
          break;
        case "toggleAgent":
          await this.handleToggleAgent(message.agentId, message.enabled);
          break;
        case "setSyncMode":
          await this.handleSetSyncMode(message.mode);
          break;
        case "toggleSyncEnabled":
          await this.handleToggleSyncEnabled(message.enabled);
          break;
        case "openExternal":
          vscode.env.openExternal(vscode.Uri.parse(message.url));
          break;
        case "getGitStatus":
          // Just refresh status (git fetch + check) - no file copy needed
          await this.sendGitStatus();
          break;
        case "refreshProjectStatus":
          await this.sendProjectStatus();
          break;
      }
    });
  }

  /**
   * Send current config state to webview
   */
  private async sendConfigState(): Promise<void> {
    if (!this._view) return;

    const config = this._configService.getConfig();
    const privateConfigured = await this._configService.isPrivateConfigured();
    const syncMode = this._configService.getSyncMode();

    i18n.setLocale(this._configService.getResolvedLocale());

    const enabledAgents = this._configService.getEnabledAgents();
    const providers = getAllProviders();
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const agents = providers.map((provider) => ({
      id: provider.id,
      name: i18n.t(provider.displayNameKey),
      hasGlobal: provider.getGlobalPaths().length > 0,
      hasProject: workspaceRoot
        ? provider.getProjectPaths(workspaceRoot).length > 0
        : true,
    }));

    const projectStatus = await this._projectSyncService.getStatus();

    this._view.webview.postMessage({
      type: "configured",
      data: {
        configured: privateConfigured,
        privateConfigured,
        repoUrl: config.repositoryUrl,
        syncMode,
        enabledAgents,
        agents,
        locale: this._configService.getLocaleSetting(),
        projectStatus,
        strings: this.getUiStrings(),
      },
    });

    if (privateConfigured) {
      await this.updateStatus();

      // Wire git logger to UI panel (for when extension is already configured)
      this._syncService.setGitLogger((msg, type) => this.sendLog(msg, type));

      // Start auto-sync timer if not already running
      this._syncService.setCountdownCallback((seconds) => {
        if (this._view) {
          this._view.webview.postMessage({
            type: "countdown",
            data: { seconds },
          });
        }
      });
      this._syncService.startAutoSync();
    }
  }

  /**
   * Handle save config from webview inline form
   */
  private async handleSaveConfig(token: string, repoPathInput: string): Promise<void> {
    if (!this._view) return;

    if (!token) {
      this._view.webview.postMessage({
        type: "configError",
        data: { message: i18n.t("panel.config.errorMissing") },
      });
      return;
    }

    try {
      this.sendLog("Detecting provider from token...", "info");
      const provider = await this.detectProvider(token);

      const repoInfo = this.resolveRepoPath(repoPathInput, provider.username);
      this.sendLog(
        `Using ${provider.name} repo ${repoInfo.owner}/${repoInfo.repo}`,
        "info",
      );

      const remoteUrl = await this.ensureRepository(provider, repoInfo, token);

      this.sendLog("Saving credentials...", "info");
      await this._configService.setRepositoryUrl(remoteUrl);
      await this._configService.saveCredentials(token);

      // Decide initial direction
      const gitService = new GitService(this._configService.getSyncRepoPath());
      const localHasData = this.hasLocalData();
      const remoteHasData = await gitService.hasRemoteCommits(remoteUrl, token);
      let initialAction: "pull" | "push" | "none" = "none";

      if (localHasData && remoteHasData) {
        const choice = await vscode.window.showQuickPick(
          [
            { label: "Pull remote then merge (recommended)", description: "Keep remote as source of truth", value: "pull" },
            { label: "Push local over remote", description: "Use local data as source of truth", value: "push" },
          ],
          {
            placeHolder: "Remote already has data. Choose initial sync direction.",
          },
        );
        initialAction = (choice?.value as "pull" | "push") || "pull";
      } else if (remoteHasData) {
        initialAction = "pull";
      } else if (localHasData) {
        initialAction = "push";
      }

      this.sendLog("Initializing Git repository...", "info");
      await this._syncService.initialize();

      if (initialAction === "pull") {
        this.sendLog("Pulling remote data first...", "info");
        await this._syncService.pull();
      } else if (initialAction === "push") {
        this.sendLog("Pushing local data first...", "info");
        await this._syncService.push();
      }

      // Wire git logger to UI panel
      this._syncService.setGitLogger((msg, type) => this.sendLog(msg, type));

      this.sendLog("Connected successfully!", "success");

      // Setup auto-sync timer with countdown callback
      this._syncService.setCountdownCallback((seconds) => {
        if (this._view) {
          this._view.webview.postMessage({
            type: "countdown",
            data: { seconds },
          });
        }
      });
      this._syncService.startAutoSync();

      // Update webview and check git status
      await this.sendConfigState();
      await this.sendGitStatus();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Configuration failed";
      this.sendLog(`Connect failed: ${message}`, "error");
      this._view.webview.postMessage({
        type: "configError",
        data: { message },
      });
    }
  }

  private async detectProvider(
    token: string,
  ): Promise<{ name: "github" | "gitlab"; host: string; username: string }> {
    const ghResp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (ghResp.status === 200) {
      const data = (await ghResp.json()) as { login?: string };
      if (!data.login) {
        throw new Error("Cannot read GitHub username from token");
      }
      return { name: "github", host: "github.com", username: data.login };
    }

    if (ghResp.status !== 401 && ghResp.status !== 403) {
      // If GitHub responds with other error, surface it
      const text = await ghResp.text();
      throw new Error(`GitHub error: ${ghResp.status} ${text}`);
    }

    const glResp = await fetch("https://gitlab.com/api/v4/user", {
      headers: {
        "PRIVATE-TOKEN": token,
      },
    });
    if (glResp.status === 200) {
      const data = (await glResp.json()) as { username?: string };
      if (!data.username) {
        throw new Error("Cannot read GitLab username from token");
      }
      return { name: "gitlab", host: "gitlab.com", username: data.username };
    }

    const text = await glResp.text();
    throw new Error(`Cannot authenticate with GitHub or GitLab: ${text}`);
  }

  private resolveRepoPath(
    repoPath: string,
    defaultOwner: string,
  ): { owner: string; repo: string } {
    const cleaned = (repoPath || "").trim().replace(/^\/+|\/+$/g, "");
    if (!cleaned) {
      return { owner: defaultOwner, repo: "ai-context-sync" };
    }

    const parts = cleaned.split("/");
    if (parts.length === 1) {
      return { owner: defaultOwner, repo: this.stripGit(parts[0]) };
    }
    return { owner: parts[0], repo: this.stripGit(parts[1]) };
  }

  private stripGit(name: string): string {
    return name.endsWith(".git") ? name.slice(0, -4) : name;
  }

  private async ensureRepository(
    provider: { name: "github" | "gitlab"; host: string; username: string },
    repo: { owner: string; repo: string },
    token: string,
  ): Promise<string> {
    if (provider.name === "github") {
      const base = "https://api.github.com";
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      };

      const repoApi = `${base}/repos/${repo.owner}/${repo.repo}`;
      const res = await fetch(repoApi, { headers });
      if (res.status === 200) {
        return `https://${provider.host}/${repo.owner}/${repo.repo}.git`;
      }
      if (res.status !== 404) {
        const text = await res.text();
        throw new Error(`GitHub error: ${res.status} ${text}`);
      }

      // Create repo
      const createBody = { name: repo.repo, private: true };
      let createUrl = `${base}/user/repos`;
      if (repo.owner !== provider.username) {
        createUrl = `${base}/orgs/${repo.owner}/repos`;
      }
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createBody),
      });
      if (createRes.status === 201) {
        return `https://${provider.host}/${repo.owner}/${repo.repo}.git`;
      }
      const text = await createRes.text();
      throw new Error(`Failed to create GitHub repo: ${createRes.status} ${text}`);
    }

    // GitLab
    const headers = {
      "PRIVATE-TOKEN": token,
      "Content-Type": "application/json",
    };
    const encoded = encodeURIComponent(`${repo.owner}/${repo.repo}`);
    const getUrl = `https://gitlab.com/api/v4/projects/${encoded}`;
    const res = await fetch(getUrl, { headers });
    if (res.status === 200) {
      return `https://${provider.host}/${repo.owner}/${repo.repo}.git`;
    }
    if (res.status !== 404) {
      const text = await res.text();
      throw new Error(`GitLab error: ${res.status} ${text}`);
    }

    if (repo.owner !== provider.username) {
      throw new Error(
        "Creating GitLab repo under another owner/group is not supported in this flow. Use your own namespace or pre-create the repo.",
      );
    }

    const createRes = await fetch("https://gitlab.com/api/v4/projects", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: repo.repo,
        path: repo.repo,
        visibility: "private",
      }),
    });
    if (createRes.status === 201) {
      return `https://${provider.host}/${repo.owner}/${repo.repo}.git`;
    }
    const text = await createRes.text();
    throw new Error(`Failed to create GitLab repo: ${createRes.status} ${text}`);
  }

  private hasLocalData(): boolean {
    const syncPath = this._configService.getSyncRepoPath();
    if (!fs.existsSync(syncPath)) return false;
    const entries = fs.readdirSync(syncPath).filter((name: string) => name !== ".git");
    return entries.length > 0;
  }

  /**
   * Handle sync action
   */
  private async handleSync(): Promise<void> {
    this.updateStatus("syncing");
    this.sendLog("Syncing...", "info");
    try {
      const privateConfigured = await this._configService.isPrivateConfigured();
      if (!privateConfigured) {
        throw new Error("Private repository not configured");
      }

      await this._syncService.sync();
      this.updateStatus("synced");
      this.sendLog("Sync complete", "success");
      await this.sendGitStatus();
      if (this._configService.isProjectModeEnabled()) {
        await this.sendProjectStatus();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.updateStatus("error");
      this.sendLog(`Sync failed: ${errorMsg}`, "error");
      NotificationService.handleSyncError(error as Error);
    }
  }

  /**
   * Handle push action
   */
  private async handlePush(): Promise<void> {
    this.updateStatus("syncing");
    this.sendLog("Pushing...", "info");
    try {
      const privateConfigured = await this._configService.isPrivateConfigured();
      if (!privateConfigured) {
        throw new Error("Private repository not configured");
      }

      await this._syncService.push();
      this.updateStatus("synced");
      this.sendLog("Push complete", "success");
      await this.sendGitStatus();
      if (this._configService.isProjectModeEnabled()) {
        await this.sendProjectStatus();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.updateStatus("error");
      this.sendLog(`Push failed: ${errorMsg}`, "error");
      NotificationService.handleSyncError(error as Error);
    }
  }

  /**
   * Handle pull action
   */
  private async handlePull(): Promise<void> {
    this.updateStatus("syncing");
    this.sendLog("Pulling...", "info");
    try {
      const privateConfigured = await this._configService.isPrivateConfigured();
      if (!privateConfigured) {
        throw new Error("Private repository not configured");
      }

      await this._syncService.pull();
      this.updateStatus("synced");
      this.sendLog("Pull complete", "success");
      await this.sendGitStatus();
      if (this._configService.isProjectModeEnabled()) {
        await this.sendProjectStatus();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.updateStatus("error");
      this.sendLog(`Pull failed: ${errorMsg}`, "error");
      NotificationService.handleSyncError(error as Error);
    }
  }

  /**
   * Handle disconnect
   */
  private async handleDisconnect(): Promise<void> {
    // Delete credentials and clear URL
    await this._configService.deleteCredentials();
    await vscode.workspace
      .getConfiguration("aiContextSync")
      .update("repositoryUrl", "", vscode.ConfigurationTarget.Global);

    // Delete .git folder to allow connecting to different repo
    const syncRepoPath = this._configService.getSyncRepoPath();
    const gitPath = require("path").join(syncRepoPath, ".git");
    if (require("fs").existsSync(gitPath)) {
      require("fs").rmSync(gitPath, { recursive: true, force: true });
    }

    await this.sendConfigState();
  }

  /**
   * Update status in webview
   */
  private async updateStatus(
    status?: "synced" | "syncing" | "error" | "pending",
  ): Promise<void> {
    if (!this._view) return;

    let lastSync: string | undefined;
    if (!status) {
      // Get actual status from service
      try {
        const syncStatus = await this._syncService.getStatus();
        status = syncStatus.syncStatus === "Ready" ? "synced" : "pending";
        lastSync = syncStatus.lastSync || undefined;
      } catch {
        status = "synced";
      }
    }

    this._view.webview.postMessage({
      type: "updateStatus",
      data: { status, lastSync },
    });
  }

  /**
   * Handle folder toggle from webview
   */
  private async handleFolderToggle(
    folder: string,
    enabled: boolean,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration("aiContextSync");
    const syncFolders = config.get<string[]>("syncFolders", [
      "knowledge",
      "antigravity",
    ]);

    let newFolders: string[];
    if (enabled) {
      newFolders = [...new Set([...syncFolders, folder])];
    } else {
      newFolders = syncFolders.filter((f) => f !== folder);
    }

    await config.update(
      "syncFolders",
      newFolders,
      vscode.ConfigurationTarget.Global,
    );
  }

  private async handleToggleAgent(agentId: string, enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration("aiContextSync");
    const currentAgents = config.get<string[]>("enabledAgents", ["antigravity"]);
    const agentSet = new Set(currentAgents);

    if (enabled) {
      agentSet.add(agentId);
    } else {
      agentSet.delete(agentId);
    }

    if (agentSet.size === 0) {
      agentSet.add("antigravity");
    }

    await config.update(
      "enabledAgents",
      Array.from(agentSet),
      vscode.ConfigurationTarget.Global,
    );

    await this.sendConfigState();
  }

  private async handleSetSyncMode(mode: string): Promise<void> {
    const config = vscode.workspace.getConfiguration("aiContextSync");
    await config.update("syncMode", mode, vscode.ConfigurationTarget.Global);

    if (this._configService.isPrivateModeEnabled()) {
      const privateConfigured = await this._configService.isPrivateConfigured();
      if (privateConfigured) {
        try {
          await this._syncService.initialize();
        } catch {
          // Ignore initialization errors; UI will surface status
        }
        this._syncService.startAutoSync();
      }
    } else {
      this._syncService.stopAutoSync();
    }

    await this.sendConfigState();
  }

  /**
   * Handle enable/disable sync toggle
   */
  private async handleToggleSyncEnabled(enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration("aiContextSync");
    await config.update("enabled", enabled, vscode.ConfigurationTarget.Global);

    // Notify user
    if (enabled) {
      NotificationService.info("Sync enabled");
    } else {
      NotificationService.info("Sync disabled");
    }
  }

  /**
   * Send log message to webview
   */
  private sendLog(
    message: string,
    logType: "success" | "error" | "info",
  ): void {
    if (!this._view) return;
    this._view.webview.postMessage({
      type: "log",
      data: { message, logType },
    });
  }

  /**
   * Send git status to webview
   */
  private async sendGitStatus(): Promise<void> {
    if (!this._view) return;

    try {
      const privateConfigured = await this._configService.isPrivateConfigured();
      if (!privateConfigured) {
        return;
      }

      const status = await this._syncService.getDetailedStatus();
      this._view.webview.postMessage({
        type: "gitStatus",
        data: {
          ahead: status.ahead,
          behind: status.behind,
          files: status.files,
          totalFiles: status.totalFiles,
          syncRepoPath: this._configService.getSyncRepoPath(),
        },
      });
    } catch {
      // Ignore errors
    }
  }

  private async sendProjectStatus(): Promise<void> {
    if (!this._view) return;

    try {
      const status = await this._projectSyncService.getStatus();
      this._view.webview.postMessage({
        type: "projectStatus",
        data: status,
      });
    } catch {
      // Ignore errors
    }
  }

  /**
   * Show error in webview
   */
  public showError(message: string): void {
    if (!this._view) return;
    this._view.webview.postMessage({
      type: "showError",
      data: { message },
    });
  }

  /**
   * Update panel data (for external calls)
   */
  public async updatePanelData(): Promise<void> {
    await this.sendConfigState();
  }

  private getUiStrings(): Record<string, string> {
    return {
      "panel.mode.title": i18n.t("panel.mode.title"),
      "panel.mode.desc": i18n.t("panel.mode.desc"),
      "panel.mode.private": i18n.t("mode.privateRepo"),
      "panel.mode.project": i18n.t("mode.projectRepo"),
      "panel.mode.both": i18n.t("mode.both"),

      "panel.agents.title": i18n.t("panel.agents.title"),
      "panel.agents.desc": i18n.t("panel.agents.desc"),

      "panel.config.title": i18n.t("panel.config.title"),
      "panel.config.desc": i18n.t("panel.config.desc"),
      "panel.config.repoLabel": i18n.t("panel.config.repoLabel"),
      "panel.config.patLabel": i18n.t("panel.config.patLabel"),
      "panel.config.patHint": i18n.t("panel.config.patHint"),
      "panel.config.connect": i18n.t("panel.config.connect"),
      "panel.config.errorMissing": i18n.t("panel.config.errorMissing"),

      "panel.dashboard.status.synced": i18n.t("sync.synced"),
      "panel.dashboard.status.syncing": i18n.t("sync.syncing"),
      "panel.dashboard.status.error": i18n.t("sync.error"),
      "panel.dashboard.status.pending": i18n.t("sync.pending"),
      "panel.dashboard.push": i18n.t("ui.push"),
      "panel.dashboard.pull": i18n.t("ui.pull"),
      "panel.dashboard.syncEnabled": i18n.t("panel.dashboard.syncEnabled"),

      "panel.repo.title": i18n.t("panel.repo.title"),
      "panel.repo.disconnect": i18n.t("ui.disconnect"),

      "panel.gitStatus.title": i18n.t("panel.gitStatus.title"),
      "panel.gitStatus.filesToPush": i18n.t("panel.gitStatus.filesToPush"),
      "panel.gitStatus.commitsToPull": i18n.t("panel.gitStatus.commitsToPull"),
      "panel.gitStatus.noChanges": i18n.t("panel.gitStatus.noChanges"),
      "panel.gitStatus.more": i18n.t("panel.gitStatus.more"),
      "panel.gitStatus.hint": i18n.t("panel.gitStatus.hint"),

      "panel.log.title": i18n.t("panel.log.title"),
      "panel.log.ready": i18n.t("panel.log.ready"),

      "panel.project.title": i18n.t("panel.project.title"),
      "panel.project.desc": i18n.t("panel.project.desc"),
      "panel.project.refresh": i18n.t("panel.project.refresh"),
      "panel.project.noWorkspace": i18n.t("panel.project.noWorkspace"),
      "panel.project.noPaths": i18n.t("panel.project.noPaths"),
      "panel.project.notGit": i18n.t("panel.project.notGit"),
      "panel.project.empty": i18n.t("panel.project.empty"),
      "panel.project.files": i18n.t("panel.project.files")
    };
  }

  /**
   * Generate HTML for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview", "main.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "dist",
        "webview",
        "media",
        "styles.css",
      ),
    );

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src https://microsoft.github.io; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>AI Context Sync</title>
</head>
<body>
    <div id="app"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
