"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───

interface AISegment {
  name: string;
  priority: "CORE" | "SECONDARY" | "TERTIARY";
  description: string;
  rules: {
    genres?: string[];
    platforms?: string[];
    spender?: boolean;
    engagement?: string;
  };
}

interface AIProjectMeta {
  gameTitle?: string;
  lifecycle?: string;
  monetization?: string;
  platforms?: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatFlowProps {
  onBack: () => void;
  onProjectReady: (meta: AIProjectMeta, segments: AISegment[], projectName: string) => void;
}

// ─── Priority badge colors ───

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  CORE: { bg: "bg-nz-primary-light", text: "text-nz-primary-text" },
  SECONDARY: { bg: "bg-nz-bg-subtle", text: "text-nz-text-secondary" },
  TERTIARY: { bg: "bg-nz-bg-subtle", text: "text-nz-text-muted" },
};

// ─── Component ───

export function AIChatFlow({ onBack, onProjectReady }: AIChatFlowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposedSegments, setProposedSegments] = useState<AISegment[] | null>(null);
  const [proposedMeta, setProposedMeta] = useState<AIProjectMeta | null>(null);
  const [nameStep, setNameStep] = useState(false);
  const [projectName, setProjectName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, proposedSegments, nameStep]);

  // Send first AI message on mount
  useEffect(() => {
    const firstMessage: ChatMessage = {
      role: "assistant",
      content: "What kind of players are you trying to find? Tell me about your game or the audience you have in mind.",
    };
    setMessages([firstMessage]);
  }, []);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: userText.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setProposedSegments(null);
    setProposedMeta(null);

    try {
      const res = await fetch("/api/ai-project-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          version: "v5",
        }),
      });

      if (!res.ok) throw new Error("Failed to get AI response");
      const data = await res.json();

      const assistantMsg: ChatMessage = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.segments) {
        setProposedSegments(data.segments);
        setProposedMeta(data.projectMeta || null);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Could you try again?" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleConfirm = () => {
    setNameStep(true);
  };

  const handleFinalCreate = () => {
    if (!proposedSegments || !projectName.trim()) return;
    onProjectReady(proposedMeta || {}, proposedSegments, projectName.trim());
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-nz-border bg-white shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-body text-nz-text-secondary hover:text-nz-primary transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-xl font-heading font-semibold text-nz-text">
          Tell us about the audience you want to build
        </h1>
        <p className="text-sm font-body text-nz-text-secondary mt-1">
          Be as specific or as vague as you like — we&apos;ll figure out the rest
        </p>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] px-4 py-3 rounded-card text-sm font-body ${
                msg.role === "user"
                  ? "bg-nz-primary text-white"
                  : "bg-white border border-nz-border text-nz-text shadow-card"
              }`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-nz-border rounded-card px-4 py-3 shadow-card flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-nz-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-nz-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-nz-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Segment proposal card */}
        {proposedSegments && !nameStep && (
          <div className="bg-white border border-nz-border rounded-card shadow-card p-5 mt-4">
            <h3 className="text-sm font-heading font-semibold text-nz-text mb-3">Proposed Segments</h3>
            <div className="space-y-3 mb-5">
              {proposedSegments.map((seg, i) => {
                const style = PRIORITY_STYLES[seg.priority] || PRIORITY_STYLES.TERTIARY;
                return (
                  <div key={i} className="flex items-start gap-3 p-3 bg-nz-bg-subtle rounded-card">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${style.bg} ${style.text}`}>
                      {seg.priority}
                    </span>
                    <div>
                      <div className="text-sm font-heading font-semibold text-nz-text">{seg.name}</div>
                      <div className="text-xs font-body text-nz-text-secondary mt-0.5">{seg.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2.5 text-sm font-heading font-semibold text-white bg-nz-primary rounded-card hover:bg-nz-primary-hover transition-colors"
              >
                Looks good — build it
              </button>
              <button
                type="button"
                onClick={() => {
                  setProposedSegments(null);
                  setProposedMeta(null);
                  setInput("I'd like to adjust — ");
                }}
                className="px-5 py-2.5 text-sm font-heading font-semibold text-nz-text bg-white border border-nz-border rounded-card hover:bg-nz-bg-subtle transition-colors"
              >
                Let me adjust
              </button>
            </div>
          </div>
        )}

        {/* Name step */}
        {nameStep && (
          <div className="bg-white border border-nz-border rounded-card shadow-card p-5 mt-4">
            <h3 className="text-sm font-heading font-semibold text-nz-text mb-2">
              Last thing — what should we call this project?
            </h3>
            <div className="flex gap-3">
              <input
                autoFocus
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && projectName.trim()) handleFinalCreate(); }}
                placeholder="e.g. RPG Audience Q3 2026"
                className="flex-1 px-3 py-2 text-sm font-body text-nz-text border border-nz-border rounded-card focus:outline-none focus:border-nz-primary placeholder:text-nz-text-muted"
              />
              <button
                type="button"
                onClick={handleFinalCreate}
                disabled={!projectName.trim()}
                className="px-5 py-2 text-sm font-heading font-semibold text-white bg-nz-primary rounded-card hover:bg-nz-primary-hover transition-colors disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      {!nameStep && (
        <div className="px-6 py-4 border-t border-nz-border bg-white shrink-0">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-body text-nz-text border border-nz-border rounded-card focus:outline-none focus:border-nz-primary placeholder:text-nz-text-muted disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 text-sm font-heading font-semibold text-white bg-nz-primary rounded-card hover:bg-nz-primary-hover transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
