import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 语音转文字（OpenAI 兼容 /audio/transcriptions 协议）
 * 通过环境变量切换服务商，默认 Groq：
 *   STT_BASE_URL  - 服务地址（默认 https://api.groq.com/openai/v1）
 *   STT_API_KEY   - API key（默认读 GROQ_API_KEY）
 *   STT_MODEL     - 模型（默认 whisper-large-v3-turbo）
 *
 * 常见平台：
 *   Groq       https://api.groq.com/openai/v1        whisper-large-v3-turbo（需海外网络）
 *   硅基流动    https://api.siliconflow.cn/v1         FunAudioLLM/SenseVoiceSmall
 *             （国内直连，注册 https://cloud.siliconflow.cn 送额度）
 *   OpenAI     https://api.openai.com/v1             whisper-1 / gpt-4o-transcribe（需海外网络）
 */
export async function POST(request: Request) {
  const baseUrl = process.env.STT_BASE_URL || "https://api.groq.com/openai/v1";
  const apiKey = process.env.STT_API_KEY || process.env.GROQ_API_KEY;
  const model = process.env.STT_MODEL || "whisper-large-v3-turbo";

  if (!apiKey) {
    console.error("[STT] API key is not configured (STT_API_KEY / GROQ_API_KEY)");
    return NextResponse.json({ error: "API key 未配置，请在 .env 中设置" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log("[STT] Received audio:", audioFile.type, audioFile.size, "bytes");

    const upstream = new FormData();
    upstream.set("file", audioFile);
    upstream.set("model", model);
    upstream.set("response_format", "json");
    upstream.set("language", "zh");

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[STT] Upstream ${baseUrl} error:`, res.status, JSON.stringify(data));
      return NextResponse.json(
        { error: data.error?.message || `转写服务返回 ${res.status}` },
        { status: res.status }
      );
    }

    console.log("[STT] Transcription result:", data.text);
    return NextResponse.json({ text: data.text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    console.error("[STT] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
