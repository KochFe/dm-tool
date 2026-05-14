"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { CampaignDraft, ChatMessage } from "@/types";

interface AssistantMessage {
  role: "assistant";
  content: string;
  reasoning: string;
  error?: string;
  isStreaming: boolean;
}

interface UserMessage {
  role: "user";
  content: string;
}

type DisplayMessage = AssistantMessage | UserMessage;

interface GeneralChatProps {
  provider: string;
  campaignId?: string;
  campaignDraft?: CampaignDraft;
  placeholder?: string;
}

export default function GeneralChat({
  provider,
  campaignId,
  campaignDraft,
  placeholder = "Ask the assistant…",
}: GeneralChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showReasoningFor, setShowReasoningFor] = useState<Set<number>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    setMessages([]);
    setShowReasoningFor(new Set());
  }, [provider]);

  const toggleReasoning = (index: number) => {
    setShowReasoningFor((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const submit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: UserMessage = { role: "user", content: trimmed };
    const placeholderAssistant: AssistantMessage = {
      role: "assistant",
      content: "",
      reasoning: "",
      isStreaming: true,
    };
    const sentHistory: ChatMessage[] = messages
      .filter((m): m is UserMessage | AssistantMessage => m.role !== "assistant" || !!(m as AssistantMessage).content)
      .map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.content }
          : { role: "assistant" as const, content: m.content }
      );
    sentHistory.push({ role: "user", content: trimmed });

    setMessages((prev) => [...prev, userMsg, placeholderAssistant]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const stream = await api.streamGeneralChat({
        provider,
        messages: sentHistory,
        campaignId,
        campaignDraft,
        signal: controller.signal,
      });

      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1] as AssistantMessage;
          if (chunk.type === "reasoning") {
            last.reasoning += chunk.delta;
          } else if (chunk.type === "content") {
            last.content += chunk.delta;
          } else if (chunk.type === "error") {
            last.error = chunk.message;
          } else if (chunk.type === "done") {
            last.isStreaming = false;
          }
          return next;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1] as AssistantMessage;
        last.error = message;
        last.isStreaming = false;
        return next;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          (last as AssistantMessage).isStreaming = false;
        }
        return next;
      });
    }
  }, [input, isStreaming, messages, provider, campaignId, campaignDraft]);

  const cancel = () => {
    abortRef.current?.abort();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Start the conversation. Ask for plot ideas, NPC concepts, or world-building help.
          </div>
        )}
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-primary/15 border border-ring text-foreground text-sm whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex flex-col gap-2 items-start">
              {msg.reasoning && (
                <details
                  className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2 max-w-[85%]"
                  open={showReasoningFor.has(i)}
                  onToggle={() => toggleReasoning(i)}
                >
                  <summary className="cursor-pointer select-none">Show thinking</summary>
                  <div className="mt-2 whitespace-pre-wrap leading-relaxed">{msg.reasoning}</div>
                </details>
              )}
              {msg.content && (
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 bg-muted border border-border text-foreground text-sm whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}
              {msg.isStreaming && !msg.content && !msg.reasoning && (
                <div className="rounded-2xl px-4 py-2.5 bg-muted border border-border flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              )}
              {msg.error && (
                <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2 max-w-[85%]">
                  {msg.error}
                </div>
              )}
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 bg-card">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-muted border border-border text-foreground rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground resize-none focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 max-h-36 overflow-y-auto"
          />
          {isStreaming ? (
            <button
              onClick={cancel}
              className="shrink-0 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-2.5 rounded-xl text-sm"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!input.trim()}
              className="shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground px-4 py-2.5 rounded-xl text-sm"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
