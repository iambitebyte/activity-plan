import fs from "fs";
import os from "os";
import path from "path";

/**
 * 所有运行时状态（数据库 / 上传文件 / master-data）的根目录。
 * 通过 .env 的 DATA_DIR 配置，默认放在项目同级目录 ../activity_data，
 * 使数据与代码彻底分离。
 */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "..", "activity_data");

/** 活动日程 master data 根目录：master-data/<活动文件夹>/<日期>.json */
export const MASTER_DATA_DIR = path.join(DATA_DIR, "master-data");

/** SQLite 数据库目录 */
export const DB_DIR = path.join(DATA_DIR, "db");
export const DB_PATH = path.join(DB_DIR, "qecon.db");

/** 上传文件目录（UPLOAD_DIR 可单独覆盖，默认收进 DATA_DIR） */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(DATA_DIR, "uploads");

/** 旧版数据位置（仅在旧数据存在且新位置为空时自动迁移） */
export const LEGACY_DB_PATH = path.join(os.homedir(), ".qecon", "qecon.db");
export const LEGACY_UPLOAD_DIRS = [
  path.join(process.cwd(), "upload"),
  path.join(os.homedir(), ".qecon", "uploads"),
];

let dirsEnsured = false;

/** 确保数据目录结构存在（幂等） */
export function ensureDataDirs(): void {
  if (dirsEnsured) return;
  fs.mkdirSync(DB_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(MASTER_DATA_DIR, { recursive: true });
  dirsEnsured = true;
}
