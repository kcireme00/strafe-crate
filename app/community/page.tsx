import AuthGuard from "@/components/AuthGuard";
import LiveChat from "@/components/LiveChat";

export default function CommunityPage() {
  return <AuthGuard>{(user) => <LiveChat user={user} />}</AuthGuard>;
}
