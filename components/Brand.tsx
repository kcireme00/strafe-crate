import Image from "next/image";
import Link from "next/link";

export default function Brand() {
  return <Link className="brand" href="/">
    <Image src="/strafe-crate-mark.png" width={58} height={58} alt="Strafe Crate" priority />
    <span><strong>STRAFE</strong><em>CRATE</em></span>
  </Link>;
}
