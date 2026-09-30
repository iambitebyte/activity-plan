import fs from "fs";
import path from "path";
import { MASTER_DATA_DIR } from "./paths";
import { STAGES } from "./stages";

export interface SessionDetail {
  background?: string;
  outline?: string;
  gains?: string;
}

export interface Session {
  id: string;
  date: string;
  /** 所属活动（master-data 下的文件夹名；散放在根目录的旧格式为 ""） */
  activity: string;
  time: string;
  fullTime: string;
  speaker: string;
  topic: string;
  /** 场馆（2026上海站新增） */
  venue?: string;
  /** 专场 */
  track?: string;
  /** 专场出品人 */
  producer?: string;
  /** 讲者头衔/单位 */
  speaker_title?: string;
  /** 讲者简介 */
  speaker_bio?: string;
  /** 联合讲者详情 */
  speakers_detail?: { name: string; title?: string | null; bio?: string | null }[];
  /** 软件工程生命周期阶段（一对多，首为主阶段） */
  stages?: string[];
  /** 阶段视角摘要 */
  stage_summary?: string;
  /** 议题详情：背景/大纲/听众收益 */
  detail?: SessionDetail | null;
  /** 专场页链接 */
  track_url?: string;
}

/** 一场活动（master-data 下的一个子目录，或根目录散放的旧格式文件） */
export interface Activity {
  /** 文件夹名（作为标识），旧格式为 "" */
  id: string;
  /** 显示名：meta.json 的 name，缺省用文件夹名 */
  name: string;
  /** 包含的日期（YYYYMMDD，升序） */
  dates: string[];
  /** 是否带有技术亮点分析（tech.md） */
  hasTech: boolean;
}

interface RawEntry {
  time: string;
  speaker: string;
  topic: string;
  venue?: string;
  track?: string;
  producer?: string;
  speaker_title?: string;
  speaker_bio?: string;
  speakers_detail?: { name: string; title?: string | null; bio?: string | null }[];
  stages?: string[];
  stage_summary?: string;
  detail?: SessionDetail | null;
  track_url?: string;
}

let cachedSessions: Session[] | null = null;
let cachedActivities: Activity[] | null = null;

/** 读取一个日期文件并展开为 Session（ID 尽量保持 `日期-序号`，与历史报名/留言数据兼容） */
function parseSessionFile(
  filePath: string,
  date: string,
  activityId: string,
  usedIds: Set<string>,
  out: Session[]
): void {
  const entries = JSON.parse(fs.readFileSync(filePath, "utf-8")) as RawEntry[];
  entries.forEach((entry, index: number) => {
    let id = `${date}-${index}`;
    if (usedIds.has(id)) {
      // 不同活动出现同一天时，加活动前缀消歧（不含 /，URL 安全）
      let prefixed = `${activityId || "activity"}~${date}-${index}`;
      let n = 2;
      while (usedIds.has(prefixed)) prefixed = `${activityId || "activity"}~${date}-${index}-${n++}`;
      id = prefixed;
    }
    usedIds.add(id);
    const timePart = entry.time.split(" ")[1] || entry.time;
    out.push({
      id,
      date,
      activity: activityId,
      time: timePart,
      fullTime: entry.time,
      speaker: entry.speaker,
      topic: entry.topic,
      venue: entry.venue ?? undefined,
      track: entry.track ?? undefined,
      producer: entry.producer ?? undefined,
      speaker_title: entry.speaker_title ?? undefined,
      speaker_bio: entry.speaker_bio ?? undefined,
      speakers_detail: entry.speakers_detail ?? undefined,
      stages: entry.stages ?? undefined,
      stage_summary: entry.stage_summary ?? undefined,
      detail: entry.detail ?? undefined,
      track_url: entry.track_url ?? undefined,
    });
  });
}

/** 读取活动目录的 meta.json 显示名，缺省用文件夹名 */
function readActivityName(dirPath: string, folderName: string): string {
  const metaPath = path.join(dirPath, "meta.json");
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as { name?: string };
      if (meta.name) return meta.name;
    } catch {
      // meta.json 损坏时退回文件夹名
    }
  }
  return folderName;
}

function build(): void {
  cachedSessions = [];
  cachedActivities = [];

  if (!fs.existsSync(MASTER_DATA_DIR)) return;

  const usedIds = new Set<string>();
  const dirents = fs.readdirSync(MASTER_DATA_DIR, { withFileTypes: true });

  // 1) 根目录散放的 JSON（旧扁平格式，保持兼容），归入 id="" 的活动
  const rootFiles = dirents
    .filter((d) => d.isFile() && d.name.endsWith(".json"))
    .map((d) => d.name)
    .sort();
  if (rootFiles.length > 0) {
    const dates: string[] = [];
    for (const file of rootFiles) {
      const date = file.replace(".json", "");
      parseSessionFile(path.join(MASTER_DATA_DIR, file), date, "", usedIds, cachedSessions);
      dates.push(date);
    }
    cachedActivities.push({ id: "", name: "历史日程", dates: [...new Set(dates)].sort(), hasTech: false });
  }

  // 2) 子目录 = 各场活动（活动1/、活动2/……）
  const folders = dirents.filter((d) => d.isDirectory()).map((d) => d.name).sort();
  for (const folder of folders) {
    const dirPath = path.join(MASTER_DATA_DIR, folder);
    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".json") && f !== "meta.json")
      .sort();
    const dates: string[] = [];
    for (const file of files) {
      const date = file.replace(".json", "");
      parseSessionFile(path.join(dirPath, file), date, folder, usedIds, cachedSessions);
      dates.push(date);
    }
    if (dates.length > 0) {
      cachedActivities.push({
        id: folder,
        name: readActivityName(dirPath, folder),
        dates: [...new Set(dates)].sort(),
        hasTech: fs.existsSync(path.join(dirPath, "tech.md")),
      });
    }
  }

  // 活动按最早日期升序（最新活动在末尾，供 UI 默认选中）
  cachedActivities.sort((a, b) => (a.dates[0] ?? "").localeCompare(b.dates[0] ?? ""));
}

function ensureCache(): void {
  if (cachedSessions === null || cachedActivities === null) build();
}

export function loadSessions(): Session[] {
  ensureCache();
  return cachedSessions!;
}

/** 全部活动（按最早日期升序） */
export function getActivities(): Activity[] {
  ensureCache();
  return cachedActivities!;
}

export function getSessionById(id: string): Session | undefined {
  return loadSessions().find((s) => s.id === id);
}

export function getDates(): string[] {
  const sessions = loadSessions();
  const dates = [...new Set(sessions.map((s) => s.date))];
  return dates.sort();
}

export function getSessionsByDate(date: string): Session[] {
  return loadSessions().filter((s) => s.date === date);
}

export function getTimeSlots(date: string): string[] {
  const sessions = getSessionsByDate(date);
  const slots = [...new Set(sessions.map((s) => s.time))];
  return slots.sort();
}

export function formatDisplayDate(dateStr: string): string {
  const year = dateStr.slice(0, 4);
  const month = parseInt(dateStr.slice(4, 6));
  const day = parseInt(dateStr.slice(6, 8));
  return `${year}年${month}月${day}日`;
}

/** 全部出现过的阶段（按生命周期顺序，仅含有数据的阶段） */
export function getStages(): string[] {
  const sessions = loadSessions();
  const set = new Set<string>();
  for (const s of sessions) {
    for (const st of s.stages ?? []) set.add(st);
  }
  return STAGES.filter((st) => set.has(st));
}

/** 读取活动的技术亮点分析（tech.md），不存在返回 null */
export function getTechMarkdown(activityId: string): string | null {
  if (!activityId) return null;
  const file = path.join(MASTER_DATA_DIR, activityId, "tech.md");
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf-8");
}
