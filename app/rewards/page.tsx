import AuthGuard from "@/components/AuthGuard";
import RewardsDashboard from "@/components/RewardsDashboard";

export default function RewardsPage() {
  return <AuthGuard>{(user) => <RewardsDashboard user={user} />}</AuthGuard>;
}
