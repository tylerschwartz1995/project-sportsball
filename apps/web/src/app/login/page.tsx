import { LoginForm } from "./login-form";
export const metadata = { title: "Sign In", robots: { index: false, follow: false } };
export default function LoginPage() {
  return <main className="login-page"><h1>Sign In to Sportsball</h1><p>Use your approved email address. No password needed.</p><LoginForm /></main>;
}
