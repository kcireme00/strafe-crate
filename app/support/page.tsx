"use client";

import AuthGuard from "@/components/AuthGuard";
import SupportCenter from "@/components/SupportCenter";
import styles from "./support.module.css";

export default function SupportPage() {
  return (
    <AuthGuard>
      {() => (
        <main className={styles.page}>
          <div className={styles.shell}>
            <header className={styles.hero}>
              <p className={styles.eyebrow}>MEMBER SUPPORT</p>
              <h1>Support center.</h1>
              <p>Create and track support tickets or privately review your Strafe Crate experience. For urgent account-security concerns, contact strafecrate@gmail.com.</p>
            </header>
            <SupportCenter />
          </div>
        </main>
      )}
    </AuthGuard>
  );
}
