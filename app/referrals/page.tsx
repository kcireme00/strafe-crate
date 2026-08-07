"use client";

import AuthGuard from "@/components/AuthGuard";
import ReferralProgram from "@/components/ReferralProgram";

export default function ReferralPage() {
  return (
    <AuthGuard>
      {() => <ReferralProgram />}
    </AuthGuard>
  );
}
