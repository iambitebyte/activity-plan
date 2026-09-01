import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    console.error("[STT] GROQ_API_KEY is not configured");
    return NextResponse.json({ error: "GROQ_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log("[STT] Received audio:", audioFile.type, audioFile.size, "bytes");

    const groqForm = new FormData();
    groqForm.set("file", audioFile);
    groqForm.set("model", "whisper-large-v3-turbo");
    groqForm.set("response_format", "json");
    groqForm.set("language", "zh");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm,
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[STT] Groq API error:", res.status, JSON.stringify(data));
      return NextResponse.json({ error: data.error?.message || "Groq API error" }, { status: res.status });
    }

    console.log("[STT] Transcription result:", data.text);
    return NextResponse.json({ text: data.text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    console.error("[STT] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
