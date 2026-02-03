/**
 * SidePanelProvider - WebviewViewProvider for the side panel
 */
import * as vscode from "vscode";
import { SyncService } from "../services/SyncService";
import { ConfigService } from "../services/ConfigService";
import { NotificationService } from "../services/NotificationService";
import { GitService } from "../services/GitService";
import { AutoRetryService } from "../services/AutoRetryService";
import { ProjectSyncService } from "../services/ProjectSyncService";
import { getAllProviders } from "../providers";
import { i18n } from "../services/LocalizationService";

export class SidePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "antigravitySync.mainPanel";

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private readonly _syncService: SyncService;
  private readonly _configService: ConfigService;
  private readonly _autoRetryService: AutoRetryService;
  private readonly _projectSyncService: ProjectSyncService;

  constructor(
    extensionUri: vscode.Uri,
    syncService: SyncService,
    configService: ConfigService,
  ) {
    this._extensionUri = extensionUri;
    this._syncService = syncService;
    this._configService = configService;
    this._autoRetryService = new AutoRetryService();
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
          await this.handleSaveConfig(message.repoUrl, message.pat);
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
        case "toggleAgentPath":
          await this.handleToggleAgentPath(message.agentId, message.pathType, message.enabled);
          break;
        case "setSyncMode":
          await this.handleSetSyncMode(message.mode);
          break;
        case "setLocale":
          await this.handleSetLocale(message.locale);
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
        case "startAutoRetry":
          await this.handleStartAutoRetry();
          break;
        case "stopAutoRetry":
          await this.handleStopAutoRetry();
          break;
        case "setAutoStart":
          await this.handleSetAutoStart(message.data?.enabled ?? false);
          break;
        case "getAutoRetryStatus":
          this.sendAutoRetryStatus();
          this.sendAutoStartSetting();
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
    const agentPathSettings = this._configService.getAgentPathSettingsMap();
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

    const projectStatus = this._configService.isProjectModeEnabled()
      ? await this._projectSyncService.getStatus()
      : undefined;

    this._view.webview.postMessage({
      type: "configured",
      data: {
        configured: privateConfigured,
        privateConfigured,
        repoUrl: config.repositoryUrl,
        syncMode,
        enabledAgents,
        agentPathSettings,
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
  private async handleSaveConfig(repoUrl: string, pat: string): Promise<void> {
    if (!this._view) return;

    if (!repoUrl || !pat) {
      this._view.webview.postMessage({
        type: "configError",
        data: { message: i18n.t("panel.config.errorMissing") },
      });
      return;
    }

    try {
      this.sendLog("Connecting...", "info");

      // Validate URL is a Git repository URL
      this.sendLog("Validating repository URL...", "info");
      const validationResult = this.validateGitRepoUrl(repoUrl);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      if (pat.length < 5) {
        throw new Error("Access token appears too short");
      }

      // CRITICAL: Check if repo is PUBLIC (reject if accessible without auth)
      this.sendLog("Checking repository privacy...", "info");
      const isPublic = await this.checkIsPublicRepo(repoUrl);
      if (isPublic) {
        throw new Error(
          "Repository is PUBLIC! Your data may contain sensitive info. Please use a PRIVATE repository.",
        );
      }

      // Verify token has access to the repository FIRST (before saving)
      this.sendLog("Verifying access token...", "info");
      const tempGitService = new GitService(
        this._configService.getSyncRepoPath(),
      );
      await tempGitService.verifyAccess(repoUrl, pat);

      // Save URL first (credentials storage depends on URL)
      this.sendLog("Saving credentials to Git credential manager...", "info");
      await this._configService.setRepositoryUrl(repoUrl);
      // Now save credentials (uses Git credential manager - persists across workspaces)
      await this._configService.saveCredentials(pat);

      // Initialize sync
      this.sendLog("Initializing Git repository...", "info");
      await this._syncService.initialize();

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

  /**
   * Validate Git repository URL format
   */
  private validateGitRepoUrl(url: string): { valid: boolean; error?: string } {
    // Must start with valid protocol
    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://") &&
      !url.startsWith("git@")
    ) {
      return { valid: false, error: "Invalid URL. Use https://... or git@..." };
    }

    // Known Git providers
    const gitProviders = [
      "github.com",
      "gitlab.com",
      "bitbucket.org",
      "gitee.com",
      "codeberg.org",
      "sr.ht",
      "dev.azure.com",
    ];

    // Check if URL contains a known provider OR has .git extension OR has typical repo path
    const urlLower = url.toLowerCase();
    const isKnownProvider = gitProviders.some((p) => urlLower.includes(p));
    const hasGitExtension = urlLower.endsWith(".git");
    const hasRepoPath = /\/([\w.-]+)\/([\w.-]+)(\.git)?$/.test(url);

    if (!isKnownProvider && !hasGitExtension && !hasRepoPath) {
      return {
        valid: false,
        error:
          "URL does not look like a Git repository. Expected format: https://host/user/repo or git@host:user/repo.git",
      };
    }

    return { valid: true };
  }

  /**
   * Check if repository is PUBLIC by trying to access it without auth
   * If accessible without auth = PUBLIC = reject
   */
  private async checkIsPublicRepo(url: string): Promise<boolean> {
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    try {
      // Try git ls-remote without authentication
      // Disable credential helpers to ensure we test without stored creds
      await execAsync(`git ls-remote ${url}`, {
        timeout: 10000,
        env: {
          ...process.env,
          GIT_ASKPASS: "echo", // Disable GUI prompts
          GIT_TERMINAL_PROMPT: "0", // Disable terminal prompts
          GIT_SSH_COMMAND: "ssh -o BatchMode=yes", // Disable SSH prompts
          GIT_CONFIG_NOSYSTEM: "1", // Ignore system git config
          HOME: "/nonexistent", // Ignore user's credential helpers
        },
      });
      return true; // Accessible without auth = PUBLIC
    } catch {
      return false; // Not accessible = PRIVATE (or doesn't exist)
    }
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
      .getConfiguration("antigravitySync")
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
    const config = vscode.workspace.getConfiguration("antigravitySync");
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
    const config = vscode.workspace.getConfiguration("antigravitySync");
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

  private async handleToggleAgentPath(
    agentId: string,
    pathType: "global" | "project",
    enabled: boolean,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration("antigravitySync");
    const agentPaths = config.get<Record<string, any>>("agentPaths", {});
    const current = agentPaths[agentId] || {};

    agentPaths[agentId] = {
      ...current,
      ...(pathType === "global" ? { globalEnabled: enabled } : { projectEnabled: enabled }),
    };

    await config.update(
      "agentPaths",
      agentPaths,
      vscode.ConfigurationTarget.Global,
    );

    await this.sendConfigState();
  }

  private async handleSetSyncMode(mode: string): Promise<void> {
    const config = vscode.workspace.getConfiguration("antigravitySync");
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

  private async handleSetLocale(locale: string): Promise<void> {
    const config = vscode.workspace.getConfiguration("antigravitySync");
    await config.update("locale", locale, vscode.ConfigurationTarget.Global);
    i18n.setLocale(this._configService.getResolvedLocale());
    await this.sendConfigState();
  }

  /**
   * Handle enable/disable sync toggle
   */
  private async handleToggleSyncEnabled(enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration("antigravitySync");
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

  /**
   * Try to auto-start Auto Retry (called from extension activation)
   * Only starts if CDP is available, otherwise logs error silently
   */
  public async tryAutoStartRetry(): Promise<void> {
    // Set up log callback
    this._autoRetryService.setLogCallback((msg, type) => {
      this.sendAutoRetryLog(msg, type === "warning" ? "info" : type);
    });

    // Check CDP status
    const cdpAvailable = await this._autoRetryService.isCDPAvailable();

    if (!cdpAvailable) {
      this.sendAutoRetryLog(
        "Auto-start: CDP not available. Please restart IDE with CDP flag.",
        "error",
      );
      this.sendAutoRetryStatus();
      return;
    }

    // CDP available - start
    this.sendAutoRetryLog("Auto-starting Auto Retry...", "info");
    const started = await this._autoRetryService.start();

    if (started) {
      this.sendAutoRetryStatus();
      this.sendAutoRetryLog("✅ Auto Retry auto-started!", "success");
    } else {
      this.sendAutoRetryLog("Auto-start failed", "error");
      this.sendAutoRetryStatus();
    }
  }

  /**
   * Handle start auto-retry from webview
   * Single button flow: check CDP -> if OK, start; if not, auto-setup
   */
  private async handleStartAutoRetry(): Promise<void> {
    this.sendAutoRetryLog("Checking CDP...", "info");

    // Set up log callback
    this._autoRetryService.setLogCallback((msg, type) => {
      this.sendAutoRetryLog(msg, type === "warning" ? "info" : type);
    });

    // Check CDP status first
    const cdpAvailable = await this._autoRetryService.isCDPAvailable();

    if (!cdpAvailable) {
      // CDP not available - auto setup
      this.sendAutoRetryLog("CDP not enabled. Setting up...", "info");
      const setupSuccess = await this._autoRetryService.setupCDP();

      if (setupSuccess) {
        // Setup done, user needs to restart - dialog already shown by Relauncher
        this.sendAutoRetryLog(
          "Please restart IDE to enable Auto Retry",
          "info",
        );
      } else {
        this.sendAutoRetryLog(
          "Setup failed. Check instructions above.",
          "error",
        );
      }
      this.sendAutoRetryStatus();
      return;
    }

    // CDP available - start immediately
    this.sendAutoRetryLog("CDP available! Starting...", "success");
    const started = await this._autoRetryService.start();

    if (started) {
      this.sendAutoRetryStatus();
      NotificationService.info(
        "Auto Retry started - auto-clicking Retry buttons",
      );
    } else {
      this.sendAutoRetryStatus();
    }
  }

  /**
   * Handle stop auto-retry from webview
   */
  private async handleStopAutoRetry(): Promise<void> {
    await this._autoRetryService.stop();
    this.sendAutoRetryStatus();
    this.sendAutoRetryLog("Auto Retry stopped", "info");
  }

  /**
   * Send auto-retry status to webview
   */
  private sendAutoRetryStatus(): void {
    if (!this._view) return;
    const status = this._autoRetryService.getStatus();
    this._view.webview.postMessage({
      type: "autoRetryStatus",
      data: {
        running: status.running,
        retryCount: status.retryCount,
        connectionCount: status.connectionCount,
      },
    });
  }

  /**
   * Send auto-retry log message to webview
   */
  private sendAutoRetryLog(
    message: string,
    logType: "success" | "error" | "info",
  ): void {
    if (!this._view) return;
    this._view.webview.postMessage({
      type: "autoRetryLog",
      data: { message, logType },
    });
  }

  /**
   * Handle set auto-start setting from webview
   */
  private async handleSetAutoStart(enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration("antigravitySync");
    await config.update(
      "autoStartRetry",
      enabled,
      vscode.ConfigurationTarget.Global,
    );
    this.sendAutoRetryLog(
      enabled ? "Auto-start enabled" : "Auto-start disabled",
      "info",
    );
  }

  /**
   * Send auto-start setting to webview
   */
  private sendAutoStartSetting(): void {
    if (!this._view) return;
    const config = vscode.workspace.getConfiguration("antigravitySync");
    const enabled = config.get("autoStartRetry", false);
    this._view.webview.postMessage({
      type: "autoStartSetting",
      data: { enabled },
    });
  }

  private getUiStrings(): Record<string, string> {
    return {
      "panel.mode.title": i18n.t("panel.mode.title"),
      "panel.mode.desc": i18n.t("panel.mode.desc"),
      "panel.mode.private": i18n.t("mode.privateRepo"),
      "panel.mode.project": i18n.t("mode.projectRepo"),
      "panel.mode.both": i18n.t("mode.both"),

      "panel.locale.title": i18n.t("panel.locale.title"),
      "panel.locale.auto": i18n.t("panel.locale.auto"),
      "panel.locale.en": i18n.t("panel.locale.en"),
      "panel.locale.vi": i18n.t("panel.locale.vi"),

      "panel.agents.title": i18n.t("panel.agents.title"),
      "panel.agents.desc": i18n.t("panel.agents.desc"),
      "panel.agents.global": i18n.t("panel.agents.global"),
      "panel.agents.project": i18n.t("panel.agents.project"),

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
    <title>Antigravity Sync</title>
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
