"use client";

import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import SupportTicketThread from "@/components/SupportTicketThread";
import styles from "../../support.module.css";

export default function SupportTicketPage(){
  const params=useParams<{id:string}>();
  return <AuthGuard>{()=> <main className={styles.page}><div className={styles.shell}><SupportTicketThread ticketId={params.id}/></div></main>}</AuthGuard>;
}
