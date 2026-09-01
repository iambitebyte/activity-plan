import fs from "fs";
import path from "path";
import { STAGES } from "./stages";

export interface SessionDetail {
  background?: string;
  outline?: string;
  gains?: string;
}

export interface Session {
  id: string;
  date: string;
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

let cachedSessions: Session[] | null = null;

export function loadSessions(): Session[] {
  if (cachedSessions) return cachedSessions;

  const dir = path.join(process.cwd(), "master-data");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

  cachedSessions = [];

  for (const file of files) {
    const date = file.replace(".json", "");
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    const entries = JSON.parse(content);

    (entries as {
      time: string; speaker: string; topic: string;
      venue?: string; track?: string; producer?: string;
      speaker_title?: string; speaker_bio?: string;
      speakers_detail?: { name: string; title?: string | null; bio?: string | null }[];
      stages?: string[]; stage_summary?: string;
      detail?: SessionDetail | null; track_url?: string;
    }[]).forEach((entry, index: number) => {
      const timePart = entry.time.split(" ")[1] || entry.time;
      cachedSessions!.push({
        id: `${date}-${index}`,
        date,
        time: timePart,
        fullTime: entry.time,
        speaker: entry.speaker,
        topic: entry.topic,
        venue: entry.venue,
        track: entry.track,
        producer: entry.producer,
        speaker_title: entry.speaker_title,
        speaker_bio: entry.speaker_bio,
        speakers_detail: entry.speakers_detail,
        stages: entry.stages,
        stage_summary: entry.stage_summary,
        detail: entry.detail ?? undefined,
        track_url: entry.track_url,
      });
    });
  }

  return cachedSessions;
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
