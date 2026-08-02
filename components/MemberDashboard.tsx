"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

type Profile = { id:string; full_name:string|null; display_name:string|null; email:string|null; role:string; steam_profile_url:string|null; steam_trade_url:string|null; account_approved:boolean };
export default function MemberDashboard({ user }: { user: User }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);
  const [profile, setProfile] = useState<Profile|null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [weapons, setWeapons] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    const [p,s,o,w,h] = await Promise.all([
      supabase.from("profiles").select("id,full_name,display_name,email,role,steam_profile_url,steam_trade_url,account_approved").eq("id",user.id).single(),
      supabase.from("subscriptions").select("status,current_period_end,cancel_at_period_end,membership_tiers(name,monthly_price_cents,upgrade_eligible)").eq("user_id",user.id).maybeSingle(),
      supabase.from("fulfillment_orders").select("id,billing_cycle,delivery_due_date,status,skin_name,exterior,weapon_categories(name)").eq("user_id",user.id).order("billing_cycle",{ascending:false}),
      supabase.from("weapon_categories").select("id,name,category").eq("active",true).order("category").order("name"),
      supabase.from("member_weapon_history").select("weapon_categories(name),rotation_number,received_at").eq("user_id",user.id)
    ]);
    if (p.error) setMessage(p.error.message); else setProfile(p.data);
    setSubscription(s.data); setOrders(o.data||[]); setWeapons(w.data||[]); setHistory(h.data||[]); setLoading(false);
  })(); }, [supabase,user.id]);

  async function save(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!profile)return; setMessage("Saving...");
    const payload = {full_name:profile.full_name,display_name:profile.display_name,steam_profile_url:profile.steam_profile_url||null,steam_trade_url:profile.steam_trade_url||null};
    const { error } = await (supabase.from("profiles") as any).update(payload).eq("id",user.id);
    setMessage(error?error.message:"Profile saved.");
  }
  async function logout(){await supabase.auth.signOut();router.replace("/login");}
  if(loading)return <main className="loading shell">Loading member data...</main>;
  if(!profile)return <main className="loading shell"><h1>Profile unavailable.</h1><p>{message}</p></main>;
  const received = new Set(history.map((x:any)=>x.weapon_categories?.name).filter(Boolean));
  const tier:any=subscription?.membership_tiers; const current=orders[0];
  return <main className="app-shell shell">
    <div className="dashboard-top"><div><p className="eyebrow">MEMBER DASHBOARD</p><h1>Welcome, {profile.display_name||profile.full_name||"member"}.</h1></div><div className="top-actions">{profile.role==="admin"&&<a className="button secondary" href="/admin">Admin dashboard</a>}<button className="text-button" onClick={logout}>Log out</button></div></div>
    <div className="metrics"><article><small>CURRENT TIER</small><strong>{tier?.name||"No active tier"}</strong><span>{tier?`$${tier.monthly_price_cents/100} monthly`:"Stripe connection comes next"}</span></article><article><small>SUBSCRIPTION</small><strong>{subscription?.status||"Pending"}</strong><span>Manage billing comes next</span></article><article><small>CURRENT ORDER</small><strong>{current?.status?.replaceAll("_"," ")||"No active order"}</strong><span>{current?`Due ${current.delivery_due_date}`:"Created after payment"}</span></article><article><small>WEAPON COVERAGE</small><strong>{received.size} of {weapons.length||34}</strong><span>Current rotation history</span></article></div>
    <section className="panel"><div className="panel-head"><div><h2>Profile and Steam settings</h2><p>This information is private to you and the admin account.</p></div><span className={profile.account_approved?"status good":"status"}>{profile.account_approved?"APPROVED":"REVIEW PENDING"}</span></div><form className="profile-form" onSubmit={save}><label>Full name<input value={profile.full_name||""} onChange={e=>setProfile({...profile,full_name:e.target.value})}/></label><label>Display name<input value={profile.display_name||""} onChange={e=>setProfile({...profile,display_name:e.target.value})}/></label><label>Steam profile URL<input type="url" value={profile.steam_profile_url||""} onChange={e=>setProfile({...profile,steam_profile_url:e.target.value})}/></label><label>Steam trade URL<input type="url" value={profile.steam_trade_url||""} onChange={e=>setProfile({...profile,steam_trade_url:e.target.value})}/></label><p className="security-note">Never enter your Steam password, Steam Guard code, session cookie, or API key.</p><button className="button primary">Save profile</button>{message&&<span className="save-message">{message}</span>}</form></section>
    <section className="panel"><h2>Weapon rotation</h2><p>Completed categories are read from your Supabase history.</p><div className="weapon-grid">{weapons.map((w:any)=><span className={received.has(w.name)?"received":""} key={w.id}>{received.has(w.name)?"✓":"○"} {w.name}</span>)}</div></section>
    <section className="panel"><h2>Drop history</h2>{orders.length?<div className="data-table"><div className="data-row head"><span>Cycle</span><span>Weapon</span><span>Skin</span><span>Status</span></div>{orders.map((o:any)=><div className="data-row" key={o.id}><span>{o.billing_cycle}</span><span>{o.weapon_categories?.name||"Not assigned"}</span><span>{o.skin_name||"Pending"}</span><span>{o.status.replaceAll("_"," ")}</span></div>)}</div>:<p className="empty-state">No monthly orders yet. Stripe will create them after successful payments.</p>}</section>
  </main>;
}
