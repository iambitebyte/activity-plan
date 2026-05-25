import path from "path";
import os from "os";
import fs from "fs";
import crypto from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(os.homedir(), ".qecon", "uploads");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function getUploadDir(): string {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
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
  return path.join(getUploadDir(), filename);
}
