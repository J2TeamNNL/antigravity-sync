/**
 * SetupWizard - Simplified setup wizard for first-time configuration
 * No need to reload IDE, no manual command copying
 */
import * as vscode from "vscode";
import { ConfigService } from "../services/ConfigService";
import { SyncService } from "../services/SyncService";
import { i18n } from "../services/LocalizationService";
import { ErrorDisplay } from "./ErrorDisplay";

export class SetupWizard {
  private configService: ConfigService;
  private syncService: SyncService;

  constructor(configService: ConfigService, syncService: SyncService) {
    this.configService = configService;
    this.syncService = syncService;
  }

  /**
   * Run the setup wizard
   * Returns true if setup completed successfully, false if cancelled
   */
  public async run(): Promise<boolean> {
    // Step 1: Welcome screen
    const shouldContinue = await this.showWelcome();
    if (!shouldContinue) {
      return false;
    }

    // Step 2: Get access token
    const token = await this.getAccessToken();
    if (!token) {
      return false;
    }

    // Step 3: Get repository URL
    const repoUrl = await this.getRepositoryUrl();
    if (!repoUrl) {
      return false;
    }

    // Step 4: Validate and configure
    const success = await this.validateAndConfigure(token, repoUrl);

    if (success) {
      await this.showSuccess();
    }

    return success;
  }

  /**
   * Show welcome screen
   */
  private async showWelcome(): Promise<boolean> {
    const selection = await vscode.window.showInformationMessage(
      `${i18n.t("setup.welcome")}\n\n${i18n.t("setup.description")}`,
      { modal: true },
      i18n.t("setup.continue"),
      i18n.t("setup.later"),
    );

    return selection === i18n.t("setup.continue");
  }

  /**
   * Get access token from user
   */
  private async getAccessToken(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      title: `${i18n.t("setup.enterPAT")} (1/2)`,
      prompt: i18n.t("setup.patPrompt"),
      password: true,
      placeHolder: i18n.t("setup.patPlaceholder"),
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.length < 8) {
          return i18n.t("error.invalidPAT");
        }
        return undefined;
      },
    });
  }

  /**
   * Get repository URL from user
   */
  private async getRepositoryUrl(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      title: `${i18n.t("setup.enterRepoUrl")} (2/2)`,
      prompt: i18n.t("setup.repoUrlPrompt"),
      placeHolder: i18n.t("setup.repoUrlPlaceholder"),
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || !value.includes("://")) {
          return i18n.t("error.invalidRepoUrl");
        }
        return undefined;
      },
    });
  }

  /**
   * Validate repository and configure sync
   */
  private async validateAndConfigure(
    token: string,
    repoUrl: string,
  ): Promise<boolean> {
    try {
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: i18n.t("setup.validating"),
          cancellable: false,
        },
        async (progress) => {
          try {
            // Step 1: Check repository
            progress.report({ message: i18n.t("setup.checking") });

            // Validate URL format
            const parsed = this.configService.parseRepositoryUrl(repoUrl);
            if (!parsed) {
              throw new Error(i18n.t("error.invalidRepoUrl"));
            }

            // Check if repository is public (security check)
            const isPublic = await this.checkIsPublicRepo(repoUrl);
            if (isPublic) {
              throw new Error(i18n.t("error.publicRepo"));
            }

            // Step 2: Save configuration
            progress.report({
              message: i18n.t("setup.initializing"),
              increment: 30,
            });

            // URL must be set first (credentials storage depends on URL)
            await this.configService.setRepositoryUrl(repoUrl);
            await this.configService.saveCredentials(token);

            // Step 3: Initialize sync (this will clone/setup repo)
            progress.report({
              message: i18n.t("setup.initializing"),
              increment: 40,
            });
            await this.syncService.initialize();

            progress.report({ increment: 30 });
            return true;
          } catch (error) {
            // Clean up credentials on error
            await this.configService.deleteCredentials();

            // Show detailed error
            await ErrorDisplay.showError(
              ErrorDisplay.fromError(error as Error),
            );

            return false;
          }
        },
      );
    } catch (error) {
      console.error("[SetupWizard] Error during setup:", error);
      return false;
    }
  }

  /**
   * Check if repository is public (security check)
   */
  private async checkIsPublicRepo(url: string): Promise<boolean> {
    try {
      // Try to access repo without authentication
      // If successful, it's public
      const response = await fetch(url.replace(".git", ""), {
        method: "HEAD",
        redirect: "follow",
      });

      // If we get 200 OK without auth, it's public
      return response.ok;
    } catch {
      // If fetch fails, assume it's private (needs auth)
      return false;
    }
  }

  /**
   * Show success message
   */
  private async showSuccess(): Promise<void> {
    const selection = await vscode.window.showInformationMessage(
      `${i18n.t("setup.success")}\n\n${i18n.t("setup.successDescription")}`,
      i18n.t("setup.openPanel"),
      i18n.t("ui.close"),
    );

    if (selection === i18n.t("setup.openPanel")) {
      vscode.commands.executeCommand("antigravity-sync.focus");
    }
  }

  /**
   * Show setup wizard (static method for convenience)
   */
  public static async show(
    configService: ConfigService,
    syncService: SyncService,
  ): Promise<boolean> {
    const wizard = new SetupWizard(configService, syncService);
    return await wizard.run();
  }
}
