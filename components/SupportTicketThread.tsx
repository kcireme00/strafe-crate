"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "@/app/support/support.module.css";

type Ticket={id:string;subject:string;category:string;status:string;priority:string;created_at:string;updated_at:string;locked:boolean};
type Message={id:string;author_role:string;body:string;created_at:string};

export default function SupportTicketThread({ticketId}:{ticketId:string}){
  const supabase=useMemo(()=>getSupabase() as any,[]);
  const [ticket,setTicket]=useState<Ticket|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [reply,setReply]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const [{data:t},{data:m}] = await Promise.all([
      supabase.from("support_tickets").select("id,subject,category,status,priority,created_at,updated_at,locked").eq("id",ticketId).maybeSingle(),
      supabase.from("support_ticket_messages").select("id,author_role,body,created_at").eq("ticket_id",ticketId).order("created_at",{ascending:true}),
    ]);
    setTicket(t as Ticket|null); setMessages((m??[]) as Message[]);
  }
  useEffect(()=>{void load()},[ticketId]);

  async function send(){
    if(!reply.trim()||busy) return;
    setBusy(true); setStatus("");
    const {error}=await supabase.rpc("add_support_ticket_message",{target_ticket_id:ticketId,message_body:reply.trim()});
    setBusy(false);
    if(error) return setStatus(error.message);
    setReply(""); await load();
  }

  if(!ticket) return <section className={styles.panel}>Loading ticket…</section>;
  const closed=["closed","archived","resolved"].includes(ticket.status)||ticket.locked;

  return <section className={styles.threadPanel}>
    <div className={styles.threadHeader}>
      <div><Link href="/support">← Support center</Link><p className={styles.eyebrow}>{ticket.category.replaceAll("_"," ")}</p><h1>{ticket.subject}</h1><span>Typical response time: 24–48 hours</span></div>
      <span className={styles.badge}>{ticket.status}</span>
    </div>
    <div className={styles.messages}>
      {messages.map(message=><article className={`${styles.messageBubble} ${message.author_role==="admin"?styles.adminBubble:styles.memberBubble}`} key={message.id}>
        <div><strong>{message.author_role==="admin"?"Strafe Crate Support":"You"}</strong><span>{new Date(message.created_at).toLocaleString()}</span></div>
        <p>{message.body}</p>
      </article>)}
    </div>
    {closed?<div className={styles.closedNotice}>This ticket is {ticket.status}. You may create a new ticket from the Support Center if needed.</div>
    :<div className={styles.replyBox}><textarea value={reply} maxLength={5000} placeholder="Add more information or reply to support…" onChange={e=>setReply(e.target.value)}/><button disabled={busy||!reply.trim()} onClick={()=>void send()}>{busy?"Sending…":"Send reply"}</button></div>}
    {status&&<p className={styles.status}>{status}</p>}
  </section>;
}
