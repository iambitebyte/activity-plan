import path from "path";
import fs from "fs";
import crypto from "crypto";
import { UPLOAD_DIR, LEGACY_UPLOAD_DIRS, ensureDataDirs } from "./paths";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

let legacyMigrated = false;

/** 旧版上传目录（项目内 upload/ 或 ~/.qecon/uploads）中的文件自动搬入新目录 */
function migrateLegacyUploads(): void {
  if (legacyMigrated) return;
  legacyMigrated = true;
  for (const legacyDir of LEGACY_UPLOAD_DIRS) {
    if (!fs.existsSync(legacyDir)) continue;
    for (const file of fs.readdirSync(legacyDir)) {
      const from = path.join(legacyDir, file);
      const to = path.join(UPLOAD_DIR, file);
      if (!fs.statSync(from).isFile() || fs.existsSync(to)) continue;
      try {
        fs.renameSync(from, to);
      } catch {
        // 跨文件系统时 rename 失败，退回复制+删除
        try {
          fs.copyFileSync(from, to);
          fs.unlinkSync(from);
        } catch {
          // 单个文件迁移失败不影响服务，读取时会再回退到旧目录查找
        }
      }
    }
  }
}

export function getUploadDir(): string {
  ensureDataDirs();
  migrateLegacyUploads();
  return UPLOAD_DIR;
}

export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}

export function computeMd5(buffer: Buffer): string {
  return crypto.createHash("md5").update(buffer).digest("hex");
}

export function generateStorageFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return `${crypto.randomUUID()}${ext}`;
}

export function getFilePath(filename: string): string {
  const primary = path.join(getUploadDir(), filename);
  if (fs.existsSync(primary)) return primary;
  // 迁移失败的旧文件仍留在旧目录时，回退查找
  for (const legacyDir of LEGACY_UPLOAD_DIRS) {
    const candidate = path.join(legacyDir, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return primary;
}
