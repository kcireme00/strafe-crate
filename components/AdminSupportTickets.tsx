"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./AdminSupport.module.css";

type Ticket={
  id:string;user_id:string;category:string;subject:string;status:string;priority:string;
  created_at:string;updated_at:string;locked:boolean;
  profiles:{display_name:string|null;full_name:string|null;email:string|null}|null;
  support_ticket_restrictions?:{disabled:boolean;reason:string|null}|null;
};

export default function AdminSupportTickets(){
  const supabase=useMemo(()=>getSupabase() as any,[]);
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [filter,setFilter]=useState("active");
  const [busy,setBusy]=useState<string|null>(null);
  const [status,setStatus]=useState("");

  async function load(){
    let query=supabase.from("support_tickets")
      .select("id,user_id,category,subject,status,priority,created_at,updated_at,locked,profiles!support_tickets_user_id_fkey(display_name,full_name,email)")
      .order("updated_at",{ascending:false});
    if(filter==="active") query=query.in("status",["open","in_progress","waiting_on_member"]);
    if(filter==="archived") query=query.eq("status","archived");
    const {data,error}=await query;
    if(error) setStatus(error.message);
    setTickets((data??[]) as unknown as Ticket[]);
  }
  useEffect(()=>{void load()},[filter]);

  async function changeStatus(ticket:Ticket,nextStatus:string){
    setBusy(ticket.id);setStatus("");
    const {error}=await supabase.rpc("admin_set_support_ticket_status",{target_ticket_id:ticket.id,next_status:nextStatus});
    setBusy(null);
    if(error) return setStatus(error.message);
    await load();
  }

  async function setAccess(ticket:Ticket,disable:boolean){
    const reason=disable?window.prompt("Reason for disabling support ticket access:","Repeated or abusive ticket use"):"";
    if(disable&&reason===null) return;
    setBusy(ticket.id);setStatus("");
    const {error}=await supabase.rpc("admin_set_ticket_access",{target_user_id:ticket.user_id,should_disable:disable,restriction_reason:reason});
    setBusy(null);
    if(error) return setStatus(error.message);
    setStatus(disable?"Ticket access disabled.":"Ticket access restored.");
  }

  return <section className={styles.wrap}>
    <div className={styles.toolbar}>
      <button onClick={()=>setFilter("active")}>Active</button>
      <button onClick={()=>setFilter("all")}>All</button>
      <button onClick={()=>setFilter("archived")}>Archived</button>
      <button onClick={()=>void load()}>Refresh</button>
    </div>
    {status&&<p>{status}</p>}
    <div className={styles.list}>
      {tickets.map(ticket=>{
        const name=ticket.profiles?.display_name||ticket.profiles?.full_name||"Member";
        return <article className={styles.card} key={ticket.id}>
          <div className={styles.top}>
            <div><h3>{ticket.subject}</h3><span className={styles.meta}>{name} · {ticket.profiles?.email||"No email"} · {ticket.category.replaceAll("_"," ")} · {ticket.priority} · Updated {new Date(ticket.updated_at).toLocaleString()}</span></div>
            <span className={styles.badge}>{ticket.status}</span>
          </div>
          <div className={styles.ticketActions}>
            <Link className={styles.openThread} href={`/admin/tickets/${ticket.id}`}>Open thread →</Link>
            <button disabled={busy===ticket.id} onClick={()=>void changeStatus(ticket,"closed")}>Close ticket</button>
            <button disabled={busy===ticket.id} onClick={()=>void changeStatus(ticket,"archived")}>Archive</button>
            <button className={styles.danger} disabled={busy===ticket.id} onClick={()=>void setAccess(ticket,true)}>Disable ticket access</button>
            <button disabled={busy===ticket.id} onClick={()=>void setAccess(ticket,false)}>Restore access</button>
          </div>
        </article>
      })}
      {!tickets.length&&<div className={styles.empty}>No tickets in this view.</div>}
    </div>
  </section>;
}
