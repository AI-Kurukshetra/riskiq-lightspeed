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

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
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

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 300,
        stream: true,
        system: systemPrompt,
        messages: [
          ...(body.messages ?? []),
          { role: "user", content: body.userMessage },
        ],
      }),
    });

    if (!anthropicResponse.ok || !anthropicResponse.body) {
      const text = await anthropicResponse.text();
      return NextResponse.json({ error: text || "Anthropic request failed" }, { status: 500 });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = anthropicResponse.body!.getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload) as {
                type?: string;
                delta?: { text?: string };
              };

              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
            } catch {
              // ignore malformed stream chunks
            }
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
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
