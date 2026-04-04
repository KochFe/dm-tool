'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { ChatMessage } from '@/types';

interface ChatSidebarProps {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  currentLocationName?: string | null;
  partyLevel?: number;
  mode?: "overlay" | "panel";
}

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-4 h-4"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-4 h-4"
  >
    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
  </svg>
);

export default function ChatSidebar({ campaignId, isOpen, onClose, currentLocationName, partyLevel: _partyLevel, mode = "overlay" }: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = currentLocationName
    ? [
        `Who are the NPCs in ${currentLocationName}?`,
        `What quests are available in ${currentLocationName}?`,
        `Tell me about ${currentLocationName} lore`,
      ]
    : [
        'What are the rules for grappling?',
        'Suggest an interesting plot hook',
        'What is the history of the Underdark?',
      ];

  // Auto-scroll to bottom on new messages or loading state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus textarea when sidebar opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the CSS transition start first
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key closes sidebar (overlay mode only)
  useEffect(() => {
    if (mode === "panel") return; // Don't register escape in panel mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, mode]);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const assistantMessage = await api.sendChatMessage(campaignId, nextMessages);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach the Oracle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const panelMode = mode === "panel";
  const asideClass = panelMode
    ? "flex flex-col h-full bg-card"
    : `fixed top-[57px] right-0 bottom-0 z-30 w-[380px] bg-card border-l border-border flex flex-col transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`;

  return (
    <aside
      role="complementary"
      aria-label="Lore Oracle chat"
      className={asideClass}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <SparklesIcon className="w-4 h-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">Lore Oracle</p>
            <p className="text-xs text-muted-foreground leading-tight">
              Ask anything about rules, lore, or your campaign
            </p>
          </div>
        </div>
        {!panelMode && (
          <button
            onClick={onClose}
            aria-label="Close chat sidebar"
            className="text-muted-foreground hover:text-foreground/80 hover:bg-accent p-1.5 rounded-lg transition-colors duration-150"
          >
            <XIcon />
          </button>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center gap-4 h-full">
            <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/80 mb-1">The Oracle awaits</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px] mx-auto">
                Ask about D&amp;D rules, lore, campaign context, or generate content on the fly.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-muted/50 border border-border text-muted-foreground hover:text-primary hover:border-ring hover:bg-muted transition-colors duration-150"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <>
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-primary/15 border border-ring text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5 items-start">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center mt-0.5">
                    <SparklesIcon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 bg-muted border border-border text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              )
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-start">
                <div className="shrink-0 w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center mt-0.5">
                  <SparklesIcon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted border border-border flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="text-xs text-red-400 px-4 py-2 bg-red-950/20 border-t border-red-900/30">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-border px-4 py-3 bg-card">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Oracle..."
            rows={1}
            className="flex-1 bg-muted border border-border text-foreground rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground resize-none focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors duration-150 max-h-36 overflow-y-auto"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            className="shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground p-2.5 rounded-xl transition-colors duration-150 self-end"
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-1.5 text-right">
          Enter to send &middot; Shift+Enter for new line
        </p>
      </div>
    </aside>
  );
}
