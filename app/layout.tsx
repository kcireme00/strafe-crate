import type { Metadata } from "next";
import Link from "next/link";
import Brand from "@/components/Brand";
import "./globals.css";
export const metadata:Metadata={title:"Strafe Crate",description:"Premium monthly CS2 skin memberships."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><header className="site-header shell"><Brand/><nav><Link href="/#plans">Memberships</Link><Link href="/login">Login</Link><Link className="nav-cta" href="/signup">Create account</Link></nav></header>{children}<footer className="footer shell"><Brand/><p className="fine-print">Counter Strike, CS2, Steam, and related marks are trademarks or registered trademarks of Valve Corporation. Strafe Crate is independent and is not affiliated with or endorsed by Valve Corporation.</p></footer></body></html>}
