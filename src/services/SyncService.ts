/**
 * SyncService - Core sync orchestration
 * Provider-agnostic: works with any Git remote (GitHub, GitLab, Bitbucket, etc.)
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ConfigService } from "./ConfigService";
import { GitService } from "./GitService";
import { FilterService } from "./FilterService";
import { StatusBarService, SyncState } from "./StatusBarService";
import { AgentId, AgentProvider, getAllProviders } from "../providers";
import { SyncHooks, DefaultSyncHooks } from "./SyncHooks";

export interface SyncStatus {
  syncStatus: string;
  lastSync: string | null;
  pendingChanges: number;
  repository: string | null;
}

// Helper to format timestamp
function ts(): string {
  const now = new Date();
  return `[${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}]`;
}

// Default auto-sync interval: 5 minutes
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

// Lock file settings - prevent multiple VS Code windows from syncing simultaneously
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - stale lock timeout

export class SyncService {
  private context: vscode.ExtensionContext;
  private configService: ConfigService;
  private statusBar: StatusBarService;
  private gitService: GitService | null = null;
  private isSyncing = false;
  private providers: AgentProvider[] = [];
  private useLegacyAntigravityLayout = false;
  private hooks: SyncHooks = new DefaultSyncHooks();

  // Auto-sync timer
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private nextSyncTime: number = 0;
  private countdownCallback: ((seconds: number) => void) | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;

  constructor(
    context: vscode.ExtensionContext,
    configService: ConfigService,
    statusBar: StatusBarService,
  ) {
    this.context = context;
    this.configService = configService;
    this.statusBar = statusBar;
    this.providers = getAllProviders();
  }

  /**
   * Initialize sync - setup git and filter services
   * Works with any Git provider (GitHub, GitLab, Bitbucket, etc.)
   */
  async initialize(): Promise<void> {
    if (!this.configService.isPrivateModeEnabled()) {
      return;
    }

    const config = this.configService.getConfig();
    const token = await this.configService.getCredentials();

    if (!config.repositoryUrl || !token) {
      throw new Error("Repository or access token not configured");
    }

    // Initialize Git service
    const syncRepoPath = this.configService.getSyncRepoPath();
    this.gitService = new GitService(syncRepoPath);
    await this.gitService.initializeRepository(config.repositoryUrl, token);

    // Detect legacy Antigravity layout (root-level folders)
    this.useLegacyAntigravityLayout =
      this.detectLegacyAntigravityLayout(syncRepoPath);

    // Copy initial files
    await this.copyFilesToSyncRepo();

    // Status is Pending until first push
    this.statusBar.update(SyncState.Pending);
  }

  /**
   * Get lock file path
   */
  private getLockFilePath(): string {
    return path.join(this.configService.getSyncRepoPath(), ".sync.lock");
  }

  private detectLegacyAntigravityLayout(syncRepoPath: string): boolean {
    const legacyMarkers = [
      "brain",
      "knowledge",
      "conversations",
      "skills",
      "workflows",
      "rules",
    ];

    return legacyMarkers.some((marker) =>
      fs.existsSync(path.join(syncRepoPath, marker)),
    );
  }

  private getAgentSyncRoot(syncRepoPath: string, agentId: AgentId): string {
    if (agentId === "antigravity" && this.useLegacyAntigravityLayout) {
      return syncRepoPath;
    }
    return path.join(syncRepoPath, "agents", agentId);
  }

  /**
   * Acquire sync lock - prevents multiple VS Code windows from syncing simultaneously
   * Uses atomic file creation with timeout for stale locks
   */
  private acquireLock(): boolean {
    const lockFile = this.getLockFilePath();

    // Check for existing lock
    if (fs.existsSync(lockFile)) {
      try {
        const lockTime = parseInt(fs.readFileSync(lockFile, "utf-8"));
        if (Date.now() - lockTime > LOCK_TIMEOUT_MS) {
          // Lock is stale (> 5 min), remove it
          console.log(ts() + " [SyncService] Stale lock detected, removing...");
          fs.unlinkSync(lockFile);
        } else {
          // Lock is still valid
          console.log(
            ts() + " [SyncService] Another sync in progress, skipping...",
          );
          return false;
        }
      } catch {
        // Error reading lock, try to remove it
        fs.unlinkSync(lockFile);
      }
    }

    // Try to create lock atomically
    try {
      fs.writeFileSync(lockFile, Date.now().toString(), { flag: "wx" });
      console.log(ts() + " [SyncService] Lock acquired");
      return true;
    } catch {
      // Another process got the lock first
      console.log(
        ts() + " [SyncService] Failed to acquire lock, another sync started",
      );
      return false;
    }
  }

  /**
   * Release sync lock
   */
  private releaseLock(): void {
    const lockFile = this.getLockFilePath();
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        console.log(ts() + " [SyncService] Lock released");
      }
    } catch {
      // Ignore errors when releasing lock
    }
  }

  /**
   * Full sync (push + pull)
   */
  async sync(): Promise<void> {
    if (!this.configService.isPrivateModeEnabled()) {
      return;
    }

    if (this.isSyncing) {
      console.log(
        ts() +
          " [SyncService.sync] Already syncing in this window, skipping...",
      );
      return;
    }

    // Try to acquire cross-window lock
    if (!this.acquireLock()) {
      return;
    }

    this.isSyncing = true;
    this.statusBar.update(SyncState.Syncing);
    console.log(ts() + " [SyncService.sync] === SYNC STARTED ===");

    let success = false;
    let totalFiles = 0;

    try {
      // Hook: onBeforeSync
      await this.hooks.onBeforeSync?.("sync");

      // Pull remote changes first
      console.log(
        ts() + " [SyncService.sync] Step 1: Pulling remote changes...",
      );
      await this.pull();

      // Push local changes (no need to pull again, already done)
      console.log(
        ts() + " [SyncService.sync] Step 2: Pushing local changes...",
      );
      totalFiles = await this.pushWithoutPull();

      console.log(ts() + " [SyncService.sync] === SYNC COMPLETE ===");
      this.statusBar.update(SyncState.Synced);
      success = true;
    } catch (error) {
      console.log(
        ts() + ` [SyncService.sync] Sync failed: ${(error as Error).message}`,
      );
      this.statusBar.update(SyncState.Error);
      throw error;
    } finally {
      // Hook: onAfterSync
      await this.hooks.onAfterSync?.("sync", success, totalFiles);
      this.isSyncing = false;
      this.releaseLock();
    }
  }

  /**
   * Push local changes to remote
   */
  async push(): Promise<void> {
    if (!this.gitService) {
      throw new Error("Sync not initialized");
    }

    this.statusBar.update(SyncState.Pushing);
    console.log("[SyncService.push] === PUSH STARTED ===");

    try {
      // Pull first to avoid divergent branches (when called standalone)
      console.log("[SyncService.push] Step 1: Pulling to avoid divergence...");
      await this.gitService.pull();

      // Copy filtered files to sync repo
      console.log(
        "[SyncService.push] Step 2: Copying local files to sync repo...",
      );
      const filesCopied = await this.copyFilesToSyncRepo();
      console.log(
        `[SyncService.push] Copied ${filesCopied} files to sync repo`,
      );

      // Stage and commit
      console.log("[SyncService.push] Step 3: Staging and committing...");
      await this.gitService.stageAll();
      const commitHash = await this.gitService.commit(
        `Sync: ${new Date().toISOString()}`,
      );

      if (commitHash) {
        console.log(
          `[SyncService.push] Step 4: Pushing commit ${commitHash.substring(0, 7)}...`,
        );
        await this.gitService.push();
        console.log("[SyncService.push] Push successful!");
      } else {
        console.log("[SyncService.push] No changes to commit");
      }

      console.log("[SyncService.push] === PUSH COMPLETE ===");
      this.statusBar.update(SyncState.Synced);
    } catch (error) {
      console.log(
        `[SyncService.push] Push failed: ${(error as Error).message}`,
      );
      this.statusBar.update(SyncState.Error);
      throw error;
    }
  }

  /**
   * Push without initial pull (used by sync() to avoid double pull)
   * @returns number of files copied
   */
  private async pushWithoutPull(): Promise<number> {
    if (!this.gitService) {
      throw new Error("Sync not initialized");
    }

    // Copy filtered files to sync repo
    console.log(
      "[SyncService.pushWithoutPull] Copying local files to sync repo...",
    );
    const filesCopied = await this.copyFilesToSyncRepo();
    console.log(`[SyncService.pushWithoutPull] Copied ${filesCopied} files`);

    // Stage and commit
    console.log("[SyncService.pushWithoutPull] Staging and committing...");
    await this.gitService.stageAll();
    const commitHash = await this.gitService.commit(
      `Sync: ${new Date().toISOString()}`,
    );

    if (commitHash) {
      console.log(
        `[SyncService.pushWithoutPull] Pushing commit ${commitHash.substring(0, 7)}...`,
      );
      await this.gitService.push();
      console.log("[SyncService.pushWithoutPull] Push successful!");
    } else {
      console.log("[SyncService.pushWithoutPull] No changes to commit");
    }

    return filesCopied;
  }

  /**
   * Pull remote changes to local
   */
  async pull(): Promise<void> {
    if (!this.gitService) {
      throw new Error("Sync not initialized");
    }

    this.statusBar.update(SyncState.Pulling);
    console.log("[SyncService.pull] === PULL STARTED ===");

    try {
      await this.gitService.pull();

      console.log(
        "[SyncService.pull] Copying files from sync repo to Gemini folder...",
      );
      const filesCopied = await this.copyFilesFromSyncRepo();
      console.log(
        `[SyncService.pull] Copied ${filesCopied} files to Gemini folder`,
      );

      console.log("[SyncService.pull] === PULL COMPLETE ===");
      this.statusBar.update(SyncState.Synced);
    } catch (error) {
      console.log(
        `[SyncService.pull] Pull failed: ${(error as Error).message}`,
      );
      this.statusBar.update(SyncState.Error);
      throw error;
    }
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    const config = this.configService.getConfig();
    let pendingChanges = 0;
    let lastSync: string | null = null;

    if (this.gitService) {
      pendingChanges = await this.gitService.getPendingChangesCount();
      lastSync = await this.gitService.getLastCommitDate();
    }

    return {
      syncStatus: this.isSyncing ? "Syncing..." : "Ready",
      lastSync,
      pendingChanges,
      repository: config.repositoryUrl || null,
    };
  }

  /**
   * Copy files only (for refresh status without push)
   */
  async copyFilesOnly(): Promise<void> {
    await this.copyFilesToSyncRepo();
  }

  /**
   * Get detailed git status for UI
   */
  async getDetailedStatus(): Promise<{
    ahead: number;
    behind: number;
    files: string[];
    totalFiles: number;
  }> {
    if (!this.gitService) {
      return { ahead: 0, behind: 0, files: [], totalFiles: 0 };
    }

    // Fetch from remote first to get accurate behind count
    try {
      await this.gitService.fetch();
    } catch {
      // Ignore fetch errors (offline, etc.)
    }

    const aheadBehind = await this.gitService.getAheadBehind();
    const changedFiles = await this.gitService.getChangedFiles(10);

    return {
      ahead: aheadBehind.ahead,
      behind: aheadBehind.behind,
      files: changedFiles.files,
      totalFiles: changedFiles.total,
    };
  }

  /**
   * Copy filtered files from gemini folder to sync repo
   * @returns number of files copied
   */
  private async copyFilesToSyncRepo(): Promise<number> {
    const syncRepoPath = this.configService.getSyncRepoPath();
    let copiedCount = 0;
    const enabledAgents = this.configService.getEnabledAgents();

    for (const provider of this.providers) {
      if (!enabledAgents.includes(provider.id)) {
        continue;
      }
      const pathSettings = this.configService.getAgentPathSettings(provider.id);
      if (!pathSettings.globalEnabled) {
        continue;
      }

      const globalPaths = this.configService.getAgentGlobalPaths(provider.id);
      const defaultExcludes = provider.getDefaultExcludes();
      const customExcludes = this.configService.getAgentExcludePatterns(
        provider.id,
      );
      const ignoreFileName = provider.getIgnoreFileName?.();

      for (const globalPath of globalPaths) {
        if (!fs.existsSync(globalPath)) {
          continue;
        }

        const destRoot = this.getAgentSyncRoot(syncRepoPath, provider.id);
        if (!fs.existsSync(destRoot)) {
          fs.mkdirSync(destRoot, { recursive: true });
        }

        const stat = fs.statSync(globalPath);
        if (stat.isFile()) {
          const destPath = path.join(destRoot, path.basename(globalPath));
          fs.copyFileSync(globalPath, destPath);
          copiedCount += 1;
          continue;
        }

        const filterService = new FilterService(
          globalPath,
          [...defaultExcludes, ...customExcludes],
          ignoreFileName,
        );
        const filesToSync = await filterService.getFilesToSync();

        for (const relativePath of filesToSync) {
          const sourcePath = path.join(globalPath, relativePath);
          const destPath = path.join(destRoot, relativePath);

          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            copiedCount++;
          }
        }
      }
    }

    return copiedCount;
  }

  /**
   * Copy files from sync repo back to gemini folder
   * @returns number of files copied
   */
  private async copyFilesFromSyncRepo(): Promise<number> {
    const syncRepoPath = this.configService.getSyncRepoPath();
    const enabledAgents = this.configService.getEnabledAgents();
    let totalCopied = 0;

    for (const provider of this.providers) {
      if (!enabledAgents.includes(provider.id)) {
        continue;
      }
      const pathSettings = this.configService.getAgentPathSettings(provider.id);
      if (!pathSettings.globalEnabled) {
        continue;
      }

      const globalPaths = this.configService.getAgentGlobalPaths(provider.id);
      if (globalPaths.length === 0) {
        continue;
      }

      const targetPath = globalPaths[0];
      if (!targetPath) {
        continue;
      }

      const sourceRoot = this.getAgentSyncRoot(syncRepoPath, provider.id);
      if (!fs.existsSync(sourceRoot)) {
        continue;
      }

      const excludeNames = [".git", ".sync.lock"];
      if (provider.id === "antigravity" && this.useLegacyAntigravityLayout) {
        excludeNames.push("agents");
      }

      totalCopied += await this.copyDirectoryContents(
        sourceRoot,
        targetPath,
        excludeNames,
      );
    }

    return totalCopied;
  }

  /**
   * Recursively copy directory contents
   * @returns number of files copied
   */
  private async copyDirectoryContents(
    source: string,
    dest: string,
    excludeNames: string[] = [],
  ): Promise<number> {
    if (!fs.existsSync(source)) {
      return 0;
    }

    let count = 0;
    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      if (excludeNames.includes(entry.name)) {
        continue;
      }

      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        count += await this.copyDirectoryContents(
          sourcePath,
          destPath,
          excludeNames,
        );
      } else {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(sourcePath, destPath);
        count++;
      }
    }

    return count;
  }

  /**
   * Set callback for countdown updates
   */
  setCountdownCallback(callback: (seconds: number) => void): void {
    this.countdownCallback = callback;
  }

  /**
   * Set logger callback for GitService to send logs to UI
   */
  setGitLogger(
    logger: (message: string, type: "info" | "success" | "error") => void,
  ): void {
    if (this.gitService) {
      this.gitService.setLogger(logger);
    }
  }

  /**
   * Set custom hooks for sync lifecycle events
   */
  setHooks(hooks: SyncHooks): void {
    this.hooks = hooks;
  }

  /**
   * Start auto-sync timer
   */
  startAutoSync(): void {
    if (!this.configService.isPrivateModeEnabled()) {
      return;
    }
    if (!this.gitService) {
      return;
    }

    this.stopAutoSync(); // Clear any existing timer

    this.nextSyncTime = Date.now() + AUTO_SYNC_INTERVAL_MS;

    // Start countdown interval (every second)
    this.countdownInterval = setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.ceil((this.nextSyncTime - Date.now()) / 1000),
      );
      if (this.countdownCallback) {
        this.countdownCallback(secondsLeft);
      }
    }, 1000);

    // Start sync timer
    this.autoSyncTimer = setInterval(async () => {
      try {
        await this.sync();
        this.nextSyncTime = Date.now() + AUTO_SYNC_INTERVAL_MS;
      } catch (error) {
        console.error("Auto-sync failed:", error);
      }
    }, AUTO_SYNC_INTERVAL_MS);
  }

  /**
   * Stop auto-sync timer
   */
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.nextSyncTime = 0;
    if (this.countdownCallback) {
      this.countdownCallback(0);
    }
  }

  /**
   * Get next sync time in seconds
   */
  getSecondsUntilNextSync(): number {
    if (!this.nextSyncTime) return 0;
    return Math.max(0, Math.ceil((this.nextSyncTime - Date.now()) / 1000));
  }
}
