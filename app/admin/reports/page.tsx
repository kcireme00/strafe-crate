"use client";

import AuthGuard from "@/components/AuthGuard";
import AdminChatReports from "@/components/AdminChatReports";

export default function AdminReportsPage() {
  return (
    <AuthGuard admin>
      {() => <AdminChatReports />}
    </AuthGuard>
  );
}
