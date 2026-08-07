"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./AdminSupport.module.css";

type Ticket={id:string;user_id:string;subject:string;category:string;status:string;priority:string;created_at:string;updated_at:string;profiles:{display_name:string|null;full_name:string|null;email:string|null}|null};
type Message={id:string;author_role:string;body:string;created_at:string};

export default function AdminTicketThread({ticketId}:{ticketId:string}){
  const supabase=useMemo(()=>getSupabase() as any,[]);
  const [ticket,setTicket]=useState<Ticket|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [reply,setReply]=useState("");
  const [nextStatus,setNextStatus]=useState("in_progress");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");

  async function load(){
    const [{data:t},{data:m}]=await Promise.all([
      supabase.from("support_tickets").select("id,user_id,subject,category,status,priority,created_at,updated_at,profiles!support_tickets_user_id_fkey(display_name,full_name,email)").eq("id",ticketId).maybeSingle(),
      supabase.from("support_ticket_messages").select("id,author_role,body,created_at").eq("ticket_id",ticketId).order("created_at",{ascending:true}),
    ]);
    setTicket(t as Ticket|null);setMessages((m??[]) as Message[]);
  }
  useEffect(()=>{void load()},[ticketId]);

  async function sendReply(){
    if(!reply.trim()||busy) return;
    setBusy(true);setNotice("");
    const {error}=await supabase.rpc("admin_reply_support_ticket",{target_ticket_id:ticketId,response_body:reply.trim(),next_status:nextStatus});
    setBusy(false);
    if(error) return setNotice(error.message);
    setReply("");await load();
  }

  if(!ticket) return <div>Loading…</div>;
  const name=ticket.profiles?.display_name||ticket.profiles?.full_name||"Member";

  return <section className={styles.threadWrap}>
    <div className={styles.threadHeader}>
      <div><Link href="/admin">← Operations Hub</Link><h1>{ticket.subject}</h1><p>{name} · {ticket.profiles?.email||"No email"} · {ticket.category.replaceAll("_"," ")} · {ticket.priority}</p></div>
      <span className={styles.badge}>{ticket.status}</span>
    </div>
    <div className={styles.adminMessages}>
      {messages.map(message=><article className={`${styles.threadMessage} ${message.author_role==="admin"?styles.adminMessage:styles.memberMessage}`} key={message.id}>
        <div><strong>{message.author_role==="admin"?"Strafe Crate Support":name}</strong><span>{new Date(message.created_at).toLocaleString()}</span></div>
        <p>{message.body}</p>
      </article>)}
    </div>
    <div className={styles.replyComposer}>
      <label>Set status<select value={nextStatus} onChange={e=>setNextStatus(e.target.value)}><option value="in_progress">In progress</option><option value="waiting_on_member">Waiting on member</option><option value="resolved">Resolved</option><option value="closed">Close ticket</option><option value="archived">Archive ticket</option></select></label>
      <label>Reply<textarea value={reply} maxLength={5000} onChange={e=>setReply(e.target.value)} placeholder="Write a response visible to the member…"/></label>
      <button disabled={busy||!reply.trim()} onClick={()=>void sendReply()}>{busy?"Sending…":"Send response"}</button>
    </div>
    {notice&&<p>{notice}</p>}
  </section>;
}
