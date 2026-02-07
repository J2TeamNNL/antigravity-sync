/**
 * ConfigSchema - Runtime validation schema cho extension settings
 */
export interface ConfigSchemaField {
  key: string;
  type: "string" | "boolean" | "number" | "array" | "object";
  default: any;
  min?: number;
  max?: number;
  enum?: string[];
  description: string;
}

export const CONFIG_SCHEMA: ConfigSchemaField[] = [
  {
    key: "repositoryUrl",
    type: "string",
    default: "",
    description: "Private Git repository URL để sync data",
  },
  {
    key: "autoSync",
    type: "boolean",
    default: true,
    description: "Bật/tắt auto sync",
  },
  {
    key: "syncIntervalMinutes",
    type: "number",
    default: 5,
    min: 1,
    max: 60,
    description: "Khoảng thời gian (phút) giữa các lần sync",
  },
  {
    key: "excludePatterns",
    type: "array",
    default: [],
    description: "Global exclude patterns (glob format)",
  },
  {
    key: "geminiPath",
    type: "string",
    default: "",
    description: "Custom path đến thư mục .gemini/antigravity",
  },
  {
    key: "enabledAgents",
    type: "array",
    default: ["antigravity"],
    description: "Danh sách agents được bật (antigravity, cursor, windsurf)",
  },
  {
    key: "syncMode",
    type: "string",
    default: "private",
    enum: ["private", "project", "both"],
    description:
      "Chế độ sync: private (global data), project (workspace), hoặc both",
  },
  {
    key: "agentPaths",
    type: "object",
    default: {},
    description:
      "Per-agent path configuration (globalEnabled, projectEnabled, globalPath)",
  },
  {
    key: "agentExcludePatterns",
    type: "object",
    default: {},
    description: "Per-agent exclude patterns",
  },
];

/**
 * Validation errors
 */
export class ConfigValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
  ) {
    super(`Config validation error for "${field}": ${message}`);
    this.name = "ConfigValidationError";
  }
}

/**
 * Validate một config value dựa theo schema
 */
export function validateConfigField(
  field: ConfigSchemaField,
  value: any,
): void {
  // Type validation
  if (field.type === "string" && typeof value !== "string") {
    throw new ConfigValidationError(
      field.key,
      `Expected string, got ${typeof value}`,
    );
  }
  if (field.type === "boolean" && typeof value !== "boolean") {
    throw new ConfigValidationError(
      field.key,
      `Expected boolean, got ${typeof value}`,
    );
  }
  if (field.type === "number" && typeof value !== "number") {
    throw new ConfigValidationError(
      field.key,
      `Expected number, got ${typeof value}`,
    );
  }
  if (field.type === "array" && !Array.isArray(value)) {
    throw new ConfigValidationError(
      field.key,
      `Expected array, got ${typeof value}`,
    );
  }
  if (
    field.type === "object" &&
    (typeof value !== "object" || Array.isArray(value))
  ) {
    throw new ConfigValidationError(
      field.key,
      `Expected object, got ${typeof value}`,
    );
  }

  // Range validation for numbers
  if (field.type === "number") {
    if (field.min !== undefined && value < field.min) {
      throw new ConfigValidationError(
        field.key,
        `Value ${value} is below minimum ${field.min}`,
      );
    }
    if (field.max !== undefined && value > field.max) {
      throw new ConfigValidationError(
        field.key,
        `Value ${value} is above maximum ${field.max}`,
      );
    }
  }

  // Enum validation for strings
  if (field.type === "string" && field.enum && !field.enum.includes(value)) {
    throw new ConfigValidationError(
      field.key,
      `Value "${value}" is not in allowed values: ${field.enum.join(", ")}`,
    );
  }
}

/**
 * Validate toàn bộ config object
 */
export function validateConfig(config: any): void {
  for (const field of CONFIG_SCHEMA) {
    const value = config[field.key];

    // Skip validation nếu value là default hoặc undefined (sẽ dùng default)
    if (value === undefined || value === field.default) {
      continue;
    }

    try {
      validateConfigField(field, value);
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        console.error(`[ConfigSchema] ${error.message}`);
        throw error;
      }
      throw error;
    }
  }
}
