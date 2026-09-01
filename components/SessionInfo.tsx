"use client";

import { getStageMeta } from "@/lib/stages";

interface SessionLike {
  topic: string;
  speaker?: string;
  speaker_title?: string;
  venue?: string;
  track?: string;
  producer?: string;
  stages?: string[];
  stage_summary?: string;
  detail?: { background?: string; outline?: string; gains?: string } | null;
  track_url?: string;
}

/** 演讲扩展信息：阶段标签 + 阶段摘要 + 议题详情（背景/大纲/收益） */
export default function SessionInfo({ session }: { session: SessionLike }) {
  const hasDetail = session.detail?.background || session.detail?.outline || session.detail?.gains;

  return (
    <div className="space-y-4">
      {/* 元信息 */}
      {(session.track || session.venue || session.producer) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500">
          {session.track && (
            <span>
              专场：<span className="text-gray-700 font-medium">{session.track}</span>
            </span>
          )}
          {session.venue && (
            <span>
              场馆：<span className="text-gray-700 font-medium">{session.venue}</span>
            </span>
          )}
          {session.producer && (
            <span>
              出品人：<span className="text-gray-700 font-medium">{session.producer}</span>
            </span>
          )}
        </div>
      )}

      {/* 生命周期阶段 */}
      {session.stages && session.stages.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">软件工程阶段（首个为主阶段）</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {session.stages.map((st, i) => {
              const meta = getStageMeta(st);
              return (
                <span
                  key={st}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                    i === 0 ? meta.solid : meta.badge
                  }`}
                >
                  {i > 0 && <span className="opacity-60">→</span>}
                  {meta.icon} {st}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 阶段视角摘要 */}
      {session.stage_summary && (
        <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
          <p className="text-sm text-gray-700 leading-relaxed">{session.stage_summary}</p>
        </div>
      )}

      {/* 议题详情 */}
      {hasDetail && (
        <div className="space-y-3">
          {session.detail?.background && (
            <DetailSection title="议题背景" color="text-violet-600" text={session.detail.background} />
          )}
          {session.detail?.outline && (
            <DetailSection title="内容大纲" color="text-blue-600" text={session.detail.outline} />
          )}
          {session.detail?.gains && (
            <DetailSection title="听众收益" color="text-emerald-600" text={session.detail.gains} />
          )}
        </div>
      )}

      {/* 官网链接 */}
      {session.track_url && (
        <a
          href={session.track_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
        >
          🔗 查看专场官网详情
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
}

function DetailSection({ title, color, text }: { title: string; color: string; text: string }) {
  return (
    <details className="group rounded-lg border border-gray-200 overflow-hidden">
      <summary className={`flex items-center justify-between px-4 py-2.5 text-sm font-semibold ${color} bg-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors`}>
        <span>{title}</span>
        <svg
          className="w-4 h-4 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-4 py-3">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    </details>
  );
}
