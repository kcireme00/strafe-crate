"use client";

import AuthGuard from "@/components/AuthGuard";
import TrophyCabinet from "@/components/TrophyCabinet";
import styles from "./TrophiesPage.module.css";

function Content() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p>PROFILE ACHIEVEMENTS</p>
          <h1>Trophies</h1>
          <span>
            Unlock achievements and choose the three emblems shown on your
            player card and community identity.
          </span>
        </header>

        <TrophyCabinet />
      </div>
    </main>
  );
}

export default function TrophiesPage() {
  return (
    <AuthGuard>
      {() => <Content />}
    </AuthGuard>
  );
}
