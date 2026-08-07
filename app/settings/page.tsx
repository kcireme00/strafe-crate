"use client";

import AuthGuard from "@/components/AuthGuard";
import ProfileSettings from "@/components/ProfileSettings";
import DeleteAccount from "@/components/DeleteAccount";

export default function SettingsPage() {
  return (
    <AuthGuard>
      {() => (
        <main className="settings-page shell">
          <header className="settings-hero">
            <p className="eyebrow">ACCOUNT & DELIVERY</p>
            <h1>Profile settings.</h1>
            <p>Keep your public display name and private Steam delivery information current.</p>
          </header>
          <ProfileSettings />
          <DeleteAccount />
        </main>
      )}
    </AuthGuard>
  );
}
