import AuthGuard from "@/components/AuthGuard";
import UpgradeProgram from "@/components/UpgradeProgram";

export default function Page(){return <AuthGuard>{() => <UpgradeProgram />}</AuthGuard>;}
