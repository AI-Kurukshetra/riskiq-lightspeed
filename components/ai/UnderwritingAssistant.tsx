"use client";

import { MessageSquare, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Summarize key risks",
  "Should I approve this?",
  "Explain triggered rules",
  "What could improve this score?",
  "Are there red flags?",
];

export const UnderwritingAssistant = ({ applicationId }: { applicationId: string }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string): Promise<void> => {
    if (!text.trim()) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const response = await fetch("/api/ai-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        messages: nextMessages,
        userMessage: text,
      }),
    });

    if (!response.body) {
      setLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const copy = [...prev];
        const currentContent = copy[copy.length - 1]?.content ?? "";
        copy[copy.length - 1] = { role: "assistant", content: `${currentContent}${chunk}` };
        return copy;
      });
    }

    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        className="assistant-pulse fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[380px] border-l border-border bg-surface p-4 transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-2xl">AI Assistant</h3>
          <button type="button" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent"
              onClick={() => {
                void sendMessage(suggestion);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="mb-3 h-[calc(100%-170px)] space-y-2 overflow-y-auto rounded border border-border p-3">
          {messages.map((message, idx) => (
            <div key={idx} className={cn("max-w-[90%] rounded-2xl px-3 py-2 text-sm", message.role === "user" ? "ml-auto bg-accent text-white" : "border border-border bg-background")}>
              {message.content}
            </div>
          ))}
          {loading ? (
            <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-background px-3 py-2">
              <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
              <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
              <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(input);
          }}
        >
          <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask assistant..." />
          <Button type="submit" className="bg-accent text-white">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </aside>
    </>
  );
};
