"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./AdminSupport.module.css";

type Ticket = {
  id:string; user_id:string; category:string; subject:string; message:string;
  status:string; priority:string; admin_response:string|null; created_at:string;
  profiles:{display_name:string|null;full_name:string|null;email:string|null}|null;
};

export default function AdminSupportTickets() {
  const supabase = useMemo(() => getSupabase() as any, []);
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [filter,setFilter]=useState("open");
  const [busy,setBusy]=useState<string|null>(null);

  async function load(){
    let query=supabase.from("support_tickets").select("id,user_id,category,subject,message,status,priority,admin_response,created_at,profiles!support_tickets_user_id_fkey(display_name,full_name,email)").order("created_at",{ascending:false});
    if(filter==="open") query=query.in("status",["open","in_progress","waiting_on_member"]);
    const {data}=await query;
    setTickets((data??[]) as unknown as Ticket[]);
  }
  useEffect(()=>{void load()},[filter]);

  async function save(ticket:Ticket,status:string,response:string){
    setBusy(ticket.id);
    await supabase.from("support_tickets").update({status,admin_response:response.trim()||null,updated_at:new Date().toISOString(),resolved_at:["resolved","closed"].includes(status)?new Date().toISOString():null}).eq("id",ticket.id);
    setBusy(null); await load();
  }

  return <section className={styles.wrap}>
    <div className={styles.toolbar}>
      <button onClick={()=>setFilter("open")}>Open tickets</button>
      <button onClick={()=>setFilter("all")}>All tickets</button>
      <button onClick={()=>void load()}>Refresh</button>
    </div>
    <div className={styles.list}>
      {tickets.map(ticket=><TicketCard key={ticket.id} ticket={ticket} busy={busy===ticket.id} onSave={save}/>)}
      {!tickets.length&&<div className={styles.empty}>No tickets in this view.</div>}
    </div>
  </section>
}

function TicketCard({ticket,busy,onSave}:{ticket:Ticket;busy:boolean;onSave:(t:Ticket,s:string,r:string)=>void}){
  const [status,setStatus]=useState(ticket.status);
  const [response,setResponse]=useState(ticket.admin_response??"");
  const name=ticket.profiles?.display_name||ticket.profiles?.full_name||"Member";
  return <article className={styles.card}>
    <div className={styles.top}>
      <div><h3>{ticket.subject}</h3><span className={styles.meta}>{name} · {ticket.profiles?.email||"No email"} · {ticket.category.replaceAll("_"," ")} · {ticket.priority} priority · {new Date(ticket.created_at).toLocaleString()}</span></div>
      <span className={styles.badge}>{ticket.status}</span>
    </div>
    <div className={styles.message}>{ticket.message}</div>
    <div className={styles.controls}>
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_on_member">Waiting on member</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label>
      <label>Response<textarea value={response} placeholder="Response visible to the member" onChange={e=>setResponse(e.target.value)}/></label>
      <button disabled={busy} onClick={()=>onSave(ticket,status,response)}>{busy?"Saving…":"Save response"}</button>
    </div>
  </article>
}
