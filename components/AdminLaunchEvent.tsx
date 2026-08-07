"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./AdminLaunchEvent.module.css";

type Claim = {
  claim_id:string;user_id:string;display_name:string;email:string;
  steam_profile_url:string|null;steam_trade_url:string|null;status:string;
  claimed_at:string;verified_at:string|null;reward_order_id:string|null;
};

export default function AdminLaunchEvent(){
  const supabase=useMemo(()=>getSupabase() as any,[]);
  const [claims,setClaims]=useState<Claim[]>([]);
  const [filter,setFilter]=useState("pending");
  const [busy,setBusy]=useState<string|null>(null);
  const [notice,setNotice]=useState("");

  async function load(){
    const {data,error}=await supabase.rpc("get_admin_launch_event_claims");
    if(error){setNotice(error.message);return;}
    const all=(data??[]) as Claim[];
    setClaims(filter==="all"?all:all.filter(c=>c.status===filter));
  }
  useEffect(()=>{void load()},[filter]);

  async function act(claimId:string,action:"approve"|"reject"){
    setBusy(claimId);setNotice("");
    const {error}=await supabase.rpc("admin_process_launch_event_claim",{
      target_claim_id:claimId,claim_action:action,
    });
    setBusy(null);
    if(error){setNotice(error.message);return;}
    setNotice(action==="approve"?"Verified. Trophy granted and reward added to fulfillment.":"Claim rejected.");
    await load();
  }

  return <section className={styles.wrap}>
    <div className={styles.header}>
      <div><p>LAUNCH SPONSORSHIP</p><h2>Sand Dune Event</h2><span>Verify Steam usernames, grant the Sand Dollar trophy, and create fulfillment orders.</span></div>
      <div className={styles.filters}><button onClick={()=>setFilter("pending")}>Pending</button><button onClick={()=>setFilter("approved")}>Approved</button><button onClick={()=>setFilter("fulfilled")}>Fulfilled</button><button onClick={()=>setFilter("all")}>All</button></div>
    </div>
    {notice&&<p className={styles.notice}>{notice}</p>}
    <div className={styles.list}>
      {claims.map(claim=><article key={claim.claim_id}>
        <div className={styles.member}><strong>{claim.display_name}</strong><span>{claim.email}</span><small>Claimed {new Date(claim.claimed_at).toLocaleString()}</small></div>
        <div className={styles.links}>
          {claim.steam_profile_url?<a href={claim.steam_profile_url} target="_blank" rel="noreferrer">Open Steam profile ↗</a>:<span>No Steam profile URL</span>}
          {claim.steam_trade_url?<a href={claim.steam_trade_url} target="_blank" rel="noreferrer">Open Trade URL ↗</a>:<span>No Trade URL</span>}
        </div>
        <span className={styles.badge}>{claim.status}</span>
        <div className={styles.actions}>
          {claim.status==="pending"&&<><button disabled={busy===claim.claim_id||!claim.steam_trade_url} onClick={()=>void act(claim.claim_id,"approve")}>Verify + create reward</button><button className={styles.reject} disabled={busy===claim.claim_id} onClick={()=>void act(claim.claim_id,"reject")}>Reject</button></>}
          {claim.reward_order_id&&<span>Fulfillment order created</span>}
        </div>
      </article>)}
      {!claims.length&&<div className={styles.empty}>No event claims in this view.</div>}
    </div>
  </section>
}
