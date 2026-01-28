/**
 * LocalizationService - Handles internationalization (i18n) for the extension
 * Supports English and Vietnamese
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export type Locale = "en" | "vi";

export class LocalizationService {
  private static instance: LocalizationService;
  private locale: Locale;
  private translations: Record<string, string> = {};

  private constructor() {
    // Auto-detect locale from VSCode settings
    const vscodeLocale = vscode.env.language;
    this.locale = vscodeLocale.startsWith("vi") ? "vi" : "en";

    // Load translations
    this.loadTranslations();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LocalizationService {
    if (!LocalizationService.instance) {
      LocalizationService.instance = new LocalizationService();
    }
    return LocalizationService.instance;
  }

  /**
   * Load translations for current locale
   */
  private loadTranslations(): void {
    try {
      const localesPath = path.join(__dirname, "..", "locales");
      const translationFile = path.join(localesPath, `${this.locale}.json`);

      if (fs.existsSync(translationFile)) {
        const content = fs.readFileSync(translationFile, "utf-8");
        this.translations = JSON.parse(content);
      } else {
        console.warn(
          `[LocalizationService] Translation file not found: ${translationFile}`,
        );
        // Fallback to English if locale file not found
        if (this.locale !== "en") {
          this.locale = "en";
          this.loadTranslations();
        }
      }
    } catch (error) {
      console.error("[LocalizationService] Error loading translations:", error);
      this.translations = {};
    }
  }

  /**
   * Get translated string by key
   * Supports placeholder replacement: t('hello.world', 'John') -> 'Hello, John!'
   *
   * @param key Translation key (e.g., 'setup.welcome')
   * @param args Optional arguments for placeholder replacement
   * @returns Translated string or key if translation not found
   */
  public t(key: string, ...args: any[]): string {
    let translation = this.translations[key];

    if (!translation) {
      console.warn(
        `[LocalizationService] Translation not found for key: ${key}`,
      );
      return key;
    }

    // Replace placeholders {0}, {1}, etc. with args
    args.forEach((arg, index) => {
      translation = translation.replace(
        new RegExp(`\\{${index}\\}`, "g"),
        String(arg),
      );
    });

    return translation;
  }

  /**
   * Get current locale
   */
  public getLocale(): Locale {
    return this.locale;
  }

  /**
   * Set locale and reload translations
   *
   * @param locale New locale to set
   */
  public setLocale(locale: Locale): void {
    if (this.locale !== locale) {
      this.locale = locale;
      this.loadTranslations();

      // Notify that locale changed (for UI updates)
      vscode.commands.executeCommand("antigravitySync.localeChanged", locale);
    }
  }

  /**
   * Check if a translation key exists
   *
   * @param key Translation key to check
   * @returns true if key exists, false otherwise
   */
  public has(key: string): boolean {
    return key in this.translations;
  }

  /**
   * Get all translations for current locale (for debugging)
   */
  public getAllTranslations(): Record<string, string> {
    return { ...this.translations };
  }
}

// Export singleton instance for convenience
export const i18n = LocalizationService.getInstance();
