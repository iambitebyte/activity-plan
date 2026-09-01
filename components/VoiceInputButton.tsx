"use client";

import { useRef, useCallback, useState, useEffect } from "react";

type VoiceStatus = "idle" | "recording" | "uploading";

interface VoiceInputButtonProps {
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onStatusChange?: (active: boolean) => void;
}

export default function VoiceInputButton({ disabled, onTranscript, onStatusChange }: VoiceInputButtonProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_DURATION = 120_000;

  useEffect(() => {
    onStatusChange?.(status !== "idle");
  }, [status, onStatusChange]);

  const pickMimeType = (): string => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "",
    ];
    for (const mt of candidates) {
      if (!mt || MediaRecorder.isTypeSupported(mt)) return mt;
    }
    return "";
  };

  const handleClick = useCallback(async () => {
    if (status === "recording") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      mediaRecorderRef.current?.stop();
      return;
    }

    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setStatus("uploading");
        try {
          const ext = recorder.mimeType?.includes("mp4")
            ? "m4a"
            : recorder.mimeType?.includes("ogg")
              ? "ogg"
              : "webm";
          const formData = new FormData();
          formData.append("audio", blob, `recording.${ext}`);

          const res = await fetch("/api/stt", { method: "POST", body: formData });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Server error");

          if (data.text?.trim()) {
            onTranscript(data.text.trim());
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "语音识别失败");
        } finally {
          setStatus("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      timeoutRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, MAX_DURATION);
      setStatus("recording");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowedError")) {
        setError("麦克风权限被拒绝，请允许麦克风访问后重试");
      } else {
        setError(`麦克风错误: ${msg}`);
      }
    }
  }, [status, onTranscript]);

  const isDisabled = disabled || status === "uploading";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
          status === "recording"
            ? "bg-red-50 text-red-500 animate-pulse"
            : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
        }`}
        title={
          status === "recording"
            ? "停止录音"
            : status === "uploading"
              ? "识别中..."
              : "语音输入"
        }
      >
        {status === "uploading" ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      {status === "recording" && (
        <span className="text-xs text-red-500">录音中...</span>
      )}
      {status === "uploading" && (
        <span className="text-xs text-gray-400">识别中...</span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
