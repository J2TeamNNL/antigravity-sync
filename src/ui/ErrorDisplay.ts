/**
 * ErrorDisplay - Helper for displaying detailed error messages with suggested actions
 */
import * as vscode from "vscode";
import { i18n } from "../services/LocalizationService";

export type ErrorType =
  | "auth"
  | "network"
  | "git"
  | "config"
  | "unknown";

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: string;
  suggestedActions?: string[];
  docsUrl?: string;
}

export class ErrorDisplay {
  /**
   * Show error message with detailed information and suggested actions
   *
   * @param errorInfo Error information to display
   */
  public static async showError(errorInfo: ErrorInfo): Promise<void> {
    const { type, message, details, suggestedActions, docsUrl } = errorInfo;

    // Build error message
    let fullMessage = `❌ ${message}`;

    if (details) {
      fullMessage += `\n\n${i18n.t("error.details", details)}`;
    }

    if (suggestedActions && suggestedActions.length > 0) {
      fullMessage += `\n\n${i18n.t("error.suggestedActions")}:`;
      suggestedActions.forEach((action, index) => {
        fullMessage += `\n${index + 1}. ${action}`;
      });
    }

    // Build action buttons
    const actions: string[] = [];

    if (docsUrl) {
      actions.push(i18n.t("error.viewDocs"));
    }

    actions.push(i18n.t("ui.retry"), i18n.t("ui.close"));

    // Show error with actions
    const selection = await vscode.window.showErrorMessage(
      fullMessage,
      { modal: true },
      ...actions,
    );

    // Handle action selection
    if (selection === i18n.t("error.viewDocs") && docsUrl) {
      vscode.env.openExternal(vscode.Uri.parse(docsUrl));
    } else if (selection === i18n.t("ui.retry")) {
      // Emit retry event
      vscode.commands.executeCommand("aiContextSync.retryLastAction");
    }
  }

  /**
   * Create ErrorInfo from Error object
   *
   * @param error Error object
   * @returns ErrorInfo
   */
  public static fromError(error: Error): ErrorInfo {
    const message = error.message;
    let type: ErrorType = "unknown";

    // Detect error type from message
    if (
      message.includes("auth") ||
      message.includes("401") ||
      message.includes("403")
    ) {
      type = "auth";
    } else if (
      message.includes("network") ||
      message.includes("ENOTFOUND") ||
      message.includes("ETIMEDOUT")
    ) {
      type = "network";
    } else if (message.includes("git")) {
      type = "git";
    } else if (message.includes("config")) {
      type = "config";
    }

    return {
      type,
      message: i18n.t(`error.${type}Error`) || message,
      details: error.stack,
      suggestedActions: ErrorDisplay.getSuggestedActions(type),
    };
  }

  /**
   * Get suggested actions based on error type
   */
  private static getSuggestedActions(type: ErrorType): string[] {
    switch (type) {
      case "auth":
        return [
          i18n.t("error.auth.checkToken"),
          i18n.t("error.auth.regenerateToken"),
        ];
      case "network":
        return [
          i18n.t("error.network.checkConnection"),
          i18n.t("error.network.checkFirewall"),
        ];
      case "git":
        return [
          i18n.t("error.git.checkRepo"),
          i18n.t("error.git.checkPermissions"),
        ];
      default:
        return [i18n.t("ui.retry")];
    }
  }
}
