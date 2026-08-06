"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import PublicPlayerCard from "@/components/PublicPlayerCard";
import CommunityIdentity from "@/components/CommunityIdentity";

type CommunityIdentityData = {
  user_id: string;
  display_name: string;
  role: string;
  tier_name: string | null;
  tier_color: string | null;
  collector_level: number;
  featured_trophy_slug: string | null;
  featured_trophy_name: string | null;
  featured_trophy_rarity: "common" | "rare" | "epic" | "legendary" | null;
};


const LINK_PATTERN = /(?:https?:\/\/|www\.|steamcommunity\.com\/tradeoffer|discord\.gg|[a-z0-9-]+\.(?:com|net|org|gg|io|co)(?:\/|\b))/i;
const CLIENT_BLOCKED_LANGUAGE = /\b(?:fuck|fucking|shit|bitch|cunt|asshole|motherfucker|whore|slut)\b/i;

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
  const [playerCardAnchor, setPlayerCardAnchor] = useState<DOMRect | null>(null);
  const [identities, setIdentities] = useState<Record<string, CommunityIdentityData>>({});

  async function loadIdentities(userIds: string[]) {
    const unique = Array.from(new Set(userIds)).filter(Boolean);
    const missing = unique.filter((id) => !identities[id]);
    if (!missing.length) return;

    const results = await Promise.all(
      missing.map(async (id) => {
        const { data, error } = await (supabase as any).rpc(
          "get_public_community_identity",
          { target_user_id: id },
        );
        if (error) return null;
        return (Array.isArray(data) ? data[0] : data) as CommunityIdentityData | null;
      }),
    );

    setIdentities((current) => {
      const next = { ...current };
      results.forEach((identity) => {
        if (identity?.user_id) next[identity.user_id] = identity;
      });
      return next;
    });
  }

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
      else {
        const nextMessages = (data ?? []).reverse() as Message[];
        setMessages(nextMessages);
        void loadIdentities(nextMessages.map((message) => message.user_id));
      }
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
          void loadIdentities([next.user_id]);
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

  function tierClass(tier: string | null) {
    return `tier-${(tier ?? "pending").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }

  async function send() {
    const cleaned = body.trim();
    if (!cleaned) return;

    if (LINK_PATTERN.test(cleaned)) {
      setStatus("Links are not permitted in community chat.");
      return;
    }

    if (CLIENT_BLOCKED_LANGUAGE.test(cleaned)) {
      setStatus("That message contains language that is not permitted.");
      return;
    }

    setStatus("Sending...");
    const { data, error } = await (supabase as any).rpc("post_chat_message", {
      message_body: cleaned,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.posted) {
      setStatus(result?.message || "This message was blocked.");
      return;
    }

    setBody("");
    setStatus("");
  }

  async function openCard(userId: string, anchor: HTMLElement) {
    setPlayerCardAnchor(anchor.getBoundingClientRect());
    setStatus("Loading player card...");
    const { data, error } = await (supabase as any).rpc(
      "get_public_player_card",
      {
        target_user_id: userId,
      },
    );

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
          <span>No links, profanity, slurs, harassment, spam, scams, or credential requests. Violations trigger an automatic timeout.</span>
        </div>
      </div>

      <section className="chat-panel">
        <div className="chat-feed" aria-live="polite">
          {messages.map((message) => (
            <article
              className={`chat-message ${tierClass(identities[message.user_id]?.tier_name ?? message.tier_name_snapshot)} ${message.user_id === user.id ? "own" : ""}`}
              key={message.id}
              data-message-id={message.id}
            >
              <button
                className="chat-avatar"
                type="button"
                onClick={(event) => void openCard(message.user_id, event.currentTarget)}
              >
                {message.display_name_snapshot.slice(0, 2).toUpperCase()}
              </button>
              <div className="chat-message-body">
                <div className="chat-meta">
                  <CommunityIdentity
                    displayName={identities[message.user_id]?.display_name ?? message.display_name_snapshot}
                    level={identities[message.user_id]?.collector_level ?? message.level_snapshot}
                    tierLabel={identities[message.user_id]?.tier_name ?? message.tier_name_snapshot ?? "Membership pending"}
                    tierColor={identities[message.user_id]?.tier_color}
                    trophySlug={identities[message.user_id]?.featured_trophy_slug}
                    trophyName={identities[message.user_id]?.featured_trophy_name}
                    trophyRarity={identities[message.user_id]?.featured_trophy_rarity}
                    onClick={() => {
                      const anchor = document.querySelector(`[data-message-id="${message.id}"] .chat-avatar`) as HTMLElement | null;
                      if (anchor) void openCard(message.user_id, anchor);
                    }}
                  />
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
          <label className="sr-only" htmlFor="community-message">Message</label>

          <div className="chat-input-shell">
            <span className="chat-input-mark" aria-hidden="true">SC</span>

            <textarea
              id="community-message"
              maxLength={500}
              rows={1}
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                event.currentTarget.style.height = "0px";
                event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 128)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Message the community — links and offensive language are blocked"
            />

            <div className="chat-input-actions">
              <span className={body.length > 450 ? "near-limit" : ""}>
                {body.length}/500
              </span>
              <button
                className="chat-send-button"
                type="button"
                disabled={!body.trim()}
                onClick={() => void send()}
                aria-label="Send message"
              >
                <span>Send</span>
                <b aria-hidden="true">→</b>
              </button>
            </div>
          </div>

          <p className="chat-composer-help">
            Press Enter to send · Shift + Enter for a new line
          </p>

          {status && <p className="chat-status">{status}</p>}
        </div>
      </section>

      {playerCard && playerCardAnchor && (
        <PublicPlayerCard
          card={playerCard}
          anchor={playerCardAnchor}
          onClose={() => {
            setPlayerCard(null);
            setPlayerCardAnchor(null);
          }}
        />
      )}
    </main>
  );
}
