import fs from "fs";
import path from "path";

export interface Session {
  id: string;
  date: string;
  time: string;
  fullTime: string;
  speaker: string;
  topic: string;
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

    entries.forEach((entry: { time: string; speaker: string; topic: string }, index: number) => {
      const timePart = entry.time.split(" ")[1] || entry.time;
      cachedSessions!.push({
        id: `${date}-${index}`,
        date,
        time: timePart,
        fullTime: entry.time,
        speaker: entry.speaker,
        topic: entry.topic,
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
