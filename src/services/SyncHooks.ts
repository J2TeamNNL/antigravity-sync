/**
 * SyncHooks - Extensibility interface cho SyncService
 * Cho phép plugin/telemetry hook vào các lifecycle events
 */

export interface ConflictInfo {
  filePath: string;
  resolution: "larger" | "newer" | "manual";
  localSize?: number;
  remoteSize?: number;
  localModified?: Date;
  remoteModified?: Date;
}

export interface SyncHooks {
  /**
   * Called trước khi bắt đầu sync operation
   * @param operation - Loại operation: 'sync' | 'push' | 'pull'
   */
  onBeforeSync?(operation: "sync" | "push" | "pull"): Promise<void> | void;

  /**
   * Called sau khi sync operation hoàn tất
   * @param operation - Loại operation: 'sync' | 'push' | 'pull'
   * @param success - true nếu thành công, false nếu có lỗi
   * @param fileCount - Số lượng files đã sync
   */
  onAfterSync?(
    operation: "sync" | "push" | "pull",
    success: boolean,
    fileCount: number,
  ): Promise<void> | void;

  /**
   * Called khi có conflict được resolve
   * @param conflicts - Danh sách conflicts đã được resolve
   */
  onConflictResolved?(conflicts: ConflictInfo[]): Promise<void> | void;
}

/**
 * Default no-op hooks implementation
 */
export class DefaultSyncHooks implements SyncHooks {
  async onBeforeSync(operation: "sync" | "push" | "pull"): Promise<void> {
    // No-op
  }

  async onAfterSync(
    operation: "sync" | "push" | "pull",
    success: boolean,
    fileCount: number,
  ): Promise<void> {
    // No-op
  }

  async onConflictResolved(conflicts: ConflictInfo[]): Promise<void> {
    // No-op
  }
}
