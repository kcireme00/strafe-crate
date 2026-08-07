"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "@/app/support/support.module.css";

type Ticket = {
  id:string; category:string; subject:string; status:string; priority:string;
  created_at:string; updated_at:string;
};

const activeStatuses = ["open","in_progress","waiting_on_member"];
const categories = [
  ["billing","Billing or payment"],["subscription","Membership or cancellation"],
  ["fulfillment","Monthly drop or fulfillment"],["steam_trade","Steam trade or delivery link"],
  ["upgrade","Skin upgrade request"],["rewards","XP, credits, or rewards"],
  ["community","Community chat or moderation"],["account","Login, verification, or account access"],
  ["privacy","Privacy or account deletion"],["technical","Website or technical issue"],
  ["other","Other support request"],
];

export default function SupportCenter(){
  const supabase=useMemo(()=>getSupabase() as any,[]);
  const [tab,setTab]=useState<"tickets"|"review">("tickets");
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [restricted,setRestricted]=useState(false);
  const [category,setCategory]=useState("billing");
  const [subject,setSubject]=useState("");
  const [message,setMessage]=useState("");
  const [priority,setPriority]=useState("normal");
  const [stars,setStars]=useState(5);
  const [review,setReview]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const [{data:ticketsData},{data:restrictionData}] = await Promise.all([
      supabase.from("support_tickets").select("id,category,subject,status,priority,created_at,updated_at").order("created_at",{ascending:false}),
      supabase.from("support_ticket_restrictions").select("disabled").maybeSingle(),
    ]);
    setTickets((ticketsData??[]) as Ticket[]);
    setRestricted(Boolean(restrictionData?.disabled));
  }
  useEffect(()=>{void load()},[]);

  const active=tickets.find(ticket=>activeStatuses.includes(ticket.status));

  async function createTicket(event:React.FormEvent){
    event.preventDefault();
    if(active||restricted||!subject.trim()||!message.trim()) return;
    setBusy(true); setStatus("");
    const {data,error}=await supabase.rpc("create_support_ticket",{
      ticket_category:category,ticket_subject:subject.trim(),
      ticket_message:message.trim(),ticket_priority:priority,
    });
    setBusy(false);
    if(error) return setStatus(error.message);
    window.location.assign(`/support/tickets/${data}`);
  }

  async function submitReview(event:React.FormEvent){
    event.preventDefault(); if(!review.trim()) return;
    setBusy(true); setStatus("");
    const {error}=await supabase.rpc("submit_private_review",{review_rating:stars,review_body:review.trim()});
    setBusy(false);
    if(error) return setStatus(error.message);
    setReview(""); setStatus("Thank you. Your private review was submitted.");
  }

  return <>
    <nav className={styles.tabs}>
      <button className={tab==="tickets"?styles.active:""} onClick={()=>setTab("tickets")}>Support tickets</button>
      <button className={tab==="review"?styles.active:""} onClick={()=>setTab("review")}>Leave a review</button>
    </nav>

    {tab==="tickets"?<section className={styles.panel}>
      <div className={styles.responseNotice}><strong>Typical response time: 24–48 hours</strong><span>Urgent security concerns: strafecrate@gmail.com</span></div>

      {restricted?<div className={styles.blocked}><h2>Ticket access disabled</h2><p>This account cannot create or reply to support tickets. Contact strafecrate@gmail.com.</p></div>
      :active?<div className={styles.activeTicket}>
        <div><p className={styles.eyebrow}>ACTIVE TICKET</p><h2>{active.subject}</h2><span>{active.category.replaceAll("_"," ")} · {new Date(active.updated_at).toLocaleString()}</span></div>
        <Link className={styles.openTicket} href={`/support/tickets/${active.id}`}>Open ticket →</Link>
      </div>
      :<form className={styles.form} onSubmit={createTicket}>
        <div><h2>Create a support ticket</h2><p>Only one ticket can be open at a time. After it is closed, you may create another.</p></div>
        <div className={styles.grid}>
          <label>Issue type<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
        </div>
        <label>Subject<input maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)}/></label>
        <label>What happened?<textarea maxLength={5000} value={message} onChange={e=>setMessage(e.target.value)}/></label>
        <button className={styles.submit} disabled={busy}>{busy?"Submitting…":"Submit ticket"}</button>
      </form>}

      {status&&<p className={styles.status}>{status}</p>}
      {!!tickets.length&&<div className={styles.ticketList}>
        <h3>Ticket history</h3>
        {tickets.map(ticket=><Link className={styles.ticket} href={`/support/tickets/${ticket.id}`} key={ticket.id}>
          <div><strong>{ticket.subject}</strong><span>{new Date(ticket.created_at).toLocaleDateString()}</span></div><span className={styles.badge}>{ticket.status}</span>
        </Link>)}
      </div>}
    </section>
    :<section className={styles.panel}>
      <h2>Leave a private review</h2>
      <p className={styles.privacyNote}>Visible only to the Strafe Crate admin team.</p>
      <form className={styles.form} onSubmit={submitReview}>
        <label>Rating<div className={styles.stars}>{[1,2,3,4,5].map(v=><button className={`${styles.star} ${v<=stars?styles.active:""}`} type="button" onClick={()=>setStars(v)} key={v}>★</button>)}</div></label>
        <label>Review<textarea maxLength={3000} value={review} onChange={e=>setReview(e.target.value)}/></label>
        <button className={styles.submit} disabled={busy}>{busy?"Submitting…":"Submit private review"}</button>
      </form>
      {status&&<p className={styles.status}>{status}</p>}
    </section>}
  </>;
}
