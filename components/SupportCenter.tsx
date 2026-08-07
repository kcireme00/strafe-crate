"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "@/app/support/support.module.css";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
};

const categories = [
  ["billing", "Billing or payment"],
  ["subscription", "Membership or cancellation"],
  ["fulfillment", "Monthly drop or fulfillment"],
  ["steam_trade", "Steam trade or delivery link"],
  ["upgrade", "Skin upgrade request"],
  ["rewards", "XP, credits, or rewards"],
  ["community", "Community chat or moderation"],
  ["account", "Login, verification, or account access"],
  ["privacy", "Privacy or account deletion"],
  ["technical", "Website or technical issue"],
  ["other", "Other support request"],
];

export default function SupportCenter() {
  const supabase = useMemo(() => getSupabase(), []);
  const [tab, setTab] = useState<"tickets" | "review">("tickets");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [category, setCategory] = useState("billing");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadTickets() {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id,category,subject,message,status,priority,admin_response,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (!error) setTickets((data ?? []) as Ticket[]);
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function createTicket(event: React.FormEvent) {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setBusy(true);
    setStatus("");

    const { error } = await supabase.from("support_tickets").insert({
      category,
      subject: subject.trim(),
      message: message.trim(),
      priority,
    });

    setBusy(false);
    if (error) return setStatus(error.message);

    setSubject("");
    setMessage("");
    setPriority("normal");
    setStatus("Ticket submitted. You can track the response below.");
    await loadTickets();
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (!review.trim()) return;
    setBusy(true);
    setStatus("");

    const { error } = await supabase.rpc("submit_private_review", {
      review_rating: stars,
      review_body: review.trim(),
    });

    setBusy(false);
    if (error) return setStatus(error.message);

    setReview("");
    setStatus("Thank you. Your private review was submitted to the Strafe Crate team.");
  }

  return (
    <>
      <nav className={styles.tabs} aria-label="Support sections">
        <button className={tab === "tickets" ? styles.active : ""} onClick={() => { setTab("tickets"); setStatus(""); }}>Support tickets</button>
        <button className={tab === "review" ? styles.active : ""} onClick={() => { setTab("review"); setStatus(""); }}>Leave a review</button>
      </nav>

      {tab === "tickets" ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Create a support ticket</h2>
              <p>Choose the closest issue type so it reaches the right admin workflow.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={createTicket}>
            <div className={styles.grid}>
              <label>Issue type
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label>Priority
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low — question or feedback</option>
                  <option value="normal">Normal — assistance needed</option>
                  <option value="high">High — billing, access, or delivery issue</option>
                </select>
              </label>
            </div>
            <label>Subject
              <input maxLength={120} value={subject} placeholder="Brief summary of the issue" onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label>What happened?
              <textarea maxLength={5000} value={message} placeholder="Include order month, tier, trade details, error messages, or anything else that helps us investigate." onChange={(e) => setMessage(e.target.value)} />
            </label>
            <button className={styles.submit} disabled={busy || !subject.trim() || !message.trim()}>
              {busy ? "Submitting…" : "Submit ticket"}
            </button>
          </form>

          {status && <p className={styles.status}>{status}</p>}

          <div className={styles.ticketList}>
            {tickets.map((ticket) => (
              <article className={styles.ticket} key={ticket.id}>
                <div className={styles.ticketTop}>
                  <div>
                    <h3>{ticket.subject}</h3>
                    <span className={styles.ticketMeta}>{ticket.category.replaceAll("_", " ")} · {new Date(ticket.created_at).toLocaleString()}</span>
                  </div>
                  <span className={styles.badge}>{ticket.status}</span>
                </div>
                <p>{ticket.message}</p>
                {ticket.admin_response && <div className={styles.reply}><strong>Strafe Crate response</strong><p>{ticket.admin_response}</p></div>}
              </article>
            ))}
            {!tickets.length && <p>No tickets yet.</p>}
          </div>
        </section>
      ) : (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Leave a private review</h2>
              <p>Tell the Strafe Crate team about your experience.</p>
            </div>
          </div>
          <p className={styles.privacyNote}>Reviews are private and visible only in the Admin Operations Hub. They are not automatically published publicly.</p>
          <form className={styles.form} onSubmit={submitReview}>
            <label>Rating
              <div className={styles.stars} aria-label={`${stars} out of 5 stars`}>
                {[1,2,3,4,5].map((value) => (
                  <button className={`${styles.star} ${value <= stars ? styles.active : ""}`} type="button" key={value} aria-label={`${value} stars`} onClick={() => setStars(value)}>★</button>
                ))}
              </div>
            </label>
            <label>Review
              <textarea maxLength={3000} value={review} placeholder="What worked well? What should we improve?" onChange={(e) => setReview(e.target.value)} />
            </label>
            <button className={styles.submit} disabled={busy || !review.trim()}>
              {busy ? "Submitting…" : "Submit private review"}
            </button>
          </form>
          {status && <p className={styles.status}>{status}</p>}
        </section>
      )}
    </>
  );
}
