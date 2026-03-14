import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      applicationId?: string;
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
      userMessage?: string;
    };

    if (!body.applicationId || !body.userMessage) {
      return NextResponse.json({ error: "applicationId and userMessage are required" }, { status: 400 });
    }

    const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
    if (!openAiApiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const admin = createAdminClient();

    const { data: application } = await admin
      .from("applications")
      .select("*, risk_scores(*), underwriting_decisions(*)")
      .eq("id", body.applicationId)
      .single();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const systemPrompt = `You are an AI underwriting assistant for RiskIQ.
You have the following application data: ${JSON.stringify(application)}.
Help the underwriter analyze this application.
Be concise and specific.
Never make the final decision — only provide analysis and insights.
Keep responses under 150 words.`;

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
        max_output_tokens: 300,
        instructions: systemPrompt,
        input: [
          ...(body.messages ?? [])
            .filter((message) => message.content.trim().length > 0)
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
          {
            role: "user",
            content: body.userMessage,
          },
        ],
      }),
    });

    if (!openAiResponse.ok) {
      const text = await openAiResponse.text();
      return NextResponse.json({ error: text || "OpenAI request failed" }, { status: 500 });
    }

    const payload = (await openAiResponse.json()) as {
      output?: Array<{
        content?: Array<{
          type?: string;
          text?: string;
        }>;
      }>;
    };

    const answer = payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text ?? "")
      .join("")
      .trim();

    return new Response(answer || "No analysis was returned for this application.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    console.error("ai-assistant route error", error);
    return NextResponse.json({ error: "Failed to process assistant request" }, { status: 500 });
  }
}
