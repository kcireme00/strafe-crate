"use client";

import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import AdminTicketThread from "@/components/AdminTicketThread";
import styles from "../../admin.module.css";

export default function AdminTicketPage(){
  const params=useParams<{id:string}>();
  return <AuthGuard admin>{()=> <main className={styles.page}><div className={styles.shell}><AdminTicketThread ticketId={params.id}/></div></main>}</AuthGuard>;
}
