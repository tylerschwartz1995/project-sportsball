import { notFound } from "next/navigation";
import { passkeysEnabled } from "@/auth/passkeys";
import { Passkeys } from "./passkeys";
export const metadata = { title: "Sign-In Settings" };
export default function SecurityPage() {
  if (!passkeysEnabled()) notFound();
  return <main className="login-page"><h1>Sign-In Settings</h1><Passkeys /></main>;
}
