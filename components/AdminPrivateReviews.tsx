"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./AdminSupport.module.css";

type Review={id:string;rating:number;body:string;created_at:string;updated_at:string;profiles:{display_name:string|null;full_name:string|null;email:string|null}|null};

export default function AdminPrivateReviews(){
  const supabase=useMemo(()=>getSupabase() as any,[]);
  const [reviews,setReviews]=useState<Review[]>([]);
  async function load(){const {data}=await supabase.from("private_reviews").select("id,rating,body,created_at,updated_at,profiles!private_reviews_user_id_fkey(display_name,full_name,email)").order("updated_at",{ascending:false});setReviews((data??[]) as unknown as Review[])}
  useEffect(()=>{void load()},[]);
  return <section className={styles.wrap}>
    <div className={styles.toolbar}><button onClick={()=>void load()}>Refresh reviews</button></div>
    <div className={styles.list}>
      {reviews.map(review=>{const name=review.profiles?.display_name||review.profiles?.full_name||"Member";return <article className={styles.card} key={review.id}>
        <div className={styles.top}><div><h3>{name}</h3><span className={styles.meta}>{review.profiles?.email||"No email"} · Updated {new Date(review.updated_at).toLocaleString()}</span></div><span className={styles.stars}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span></div>
        <div className={styles.message}>{review.body}</div>
      </article>})}
      {!reviews.length&&<div className={styles.empty}>No private reviews yet.</div>}
    </div>
  </section>
}
