"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import PublicPlayerCard from "@/components/PublicPlayerCard";

type Message = {
  id: string;
  user_id: string;
  body: string;
  display_name_snapshot: string;
  tier_name_snapshot: string | null;
  level_snapshot: number;
  created_at: string;
};

export default function LiveChat({ user }: { user: User }) {
  const supabase = useMemo(() => getSupabase(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [playerCard, setPlayerCard] = useState<any>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,user_id,body,display_name_snapshot,tier_name_snapshot,level_snapshot,created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!active) return;
      if (error) setStatus(error.message);
      else setMessages((data ?? []).reverse() as Message[]);
    }

    void load();

    const channel = supabase
      .channel("strafe-crate-global-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const next = payload.new as Message;
          setMessages((current) => [...current.slice(-99), next]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const cleaned = body.trim();
    if (!cleaned) return;

    setStatus("Sending...");
    const { error } = await (supabase.from("chat_messages") as any).insert({
      user_id: user.id,
      body: cleaned,
      display_name_snapshot: "Pending",
      level_snapshot: 1,
    });

    if (error) setStatus(error.message);
    else {
      setBody("");
      setStatus("");
    }
  }

  async function openCard(userId: string) {
    setStatus("Loading player card...");
    const { data, error } = await supabase.rpc("get_public_player_card", {
      target_user_id: userId,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setPlayerCard(Array.isArray(data) ? data[0] : data);
    setStatus("");
  }

  async function report(messageId: string) {
    const { error } = await (supabase.from("chat_reports") as any).insert({
      message_id: messageId,
      reporter_id: user.id,
      reason: "Member report",
    });
    setStatus(error ? error.message : "Message reported for review.");
  }

  return (
    <main className="community-shell shell">
      <div className="community-heading">
        <div>
          <p className="eyebrow">MEMBER COMMUNITY</p>
          <h1>Collector chat.</h1>
          <p>Click a member name to view their player card, level, tier, and featured trophies.</p>
        </div>
        <div className="community-rules">
          <strong>Keep it clean.</strong>
          <span>No spam, scams, harassment, trade-link impersonation, or credential requests.</span>
        </div>
      </div>

      <section className="chat-panel">
        <div className="chat-feed" aria-live="polite">
          {messages.map((message) => (
            <article className={`chat-message ${message.user_id === user.id ? "own" : ""}`} key={message.id}>
              <button className="chat-avatar" type="button" onClick={() => openCard(message.user_id)}>
                {message.display_name_snapshot.slice(0, 2).toUpperCase()}
              </button>
              <div className="chat-message-body">
                <div className="chat-meta">
                  <button type="button" onClick={() => openCard(message.user_id)}>
                    {message.display_name_snapshot}
                  </button>
                  <span>Level {message.level_snapshot}</span>
                  {message.tier_name_snapshot && <span>{message.tier_name_snapshot}</span>}
                  <time>{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                </div>
                <p>{message.body}</p>
              </div>
              {message.user_id !== user.id && (
                <button className="chat-report" type="button" onClick={() => report(message.id)}>
                  Report
                </button>
              )}
            </article>
          ))}
          {!messages.length && <p className="chat-empty">No messages yet. Start the collector conversation.</p>}
          <div ref={bottomRef} />
        </div>

        <div className="chat-composer">
          <label htmlFor="community-message">Message</label>
          <textarea
            id="community-message"
            maxLength={500}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Share collection progress, discuss skins, or help another member."
          />
          <div>
            <span>{body.length}/500</span>
            <button className="button primary" type="button" onClick={() => void send()}>
              Send message
            </button>
          </div>
          {status && <p className="chat-status">{status}</p>}
        </div>
      </section>

      {playerCard && <PublicPlayerCard card={playerCard} onClose={() => setPlayerCard(null)} />}
    </main>
  );
}
