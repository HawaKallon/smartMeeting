import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { ArrowLeft, CalendarCheck2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signIn, auth } from "@/auth";
import { PasswordInput } from "@/components/PasswordInput";
import { SierraLeoneFlag } from "@/components/SierraLeoneFlag";

// The auth route group keeps this public page outside the protected app layout.
export const metadata: Metadata = {
  title: "Administrative Sign In | Smart Meeting",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const session = await auth();
  if (session?.user) redirect(callbackUrl || "/administrative");

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const cb = String(formData.get("callbackUrl") || "/administrative");
    try {
      await signIn("credentials", { email, password, redirectTo: cb });
    } catch (loginError) {
      if (loginError instanceof AuthError) {
        const params = new URLSearchParams({ error: loginError.type });
        if (cb && cb !== "/administrative") params.set("callbackUrl", cb);
        redirect(`/administrative/login?${params}`);
      }
      throw loginError;
    }
  }

  return (
    <main className="flex min-h-screen flex-col text-slate-900">
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[#d8e1ee] bg-white shadow-[0_30px_90px_rgba(0,53,128,0.12)] md:min-h-[700px] md:grid-cols-[1.1fr_0.95fr]">
          <aside className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#003580_0%,#0a4aa0_58%,#007236_100%)] p-12 text-white md:flex md:flex-col md:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[48px] border-white/5" aria-hidden="true" />
            <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#fab700]/20" aria-hidden="true" />

            <div className="relative">
              <div className="flex items-start justify-between gap-6">
                <div className="flex h-14 w-14 items-center justify-center">
                  <Image
                    src="/coat_of_arms.jpeg"
                    alt="Sierra Leone coat of arms"
                    width={52}
                    height={52}
                    className="h-13 w-13 object-contain"
                  />
                </div>
                <SierraLeoneFlag className="h-12 w-20 border-white/20" />
              </div>
              <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                Government of Sierra Leone
              </p>
              <h1 className="mt-4 max-w-md text-4xl font-bold leading-tight tracking-tight">
                Smart Meeting &amp; Attendance Logger
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-blue-100/80">
                The secure administrative workspace for official ministry meetings, attendance, records, and action tracking.
              </p>
            </div>

            <div className="relative space-y-4 border-t border-white/15 pt-7">
              <Feature icon={<ShieldCheck className="h-5 w-5" />} text="Restricted to authorized government personnel" />
              <Feature icon={<CalendarCheck2 className="h-5 w-5" />} text="Official schedules, attendance, and meeting records" />
              <Feature icon={<LockKeyhole className="h-5 w-5" />} text="Protected access with auditable administrative activity" />
            </div>
          </aside>

          <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
            <div className="mb-9 md:hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center">
                  <Image
                    src="/coat_of_arms.jpeg"
                    alt="Sierra Leone coat of arms"
                    width={44}
                    height={44}
                    className="h-11 w-11 object-contain"
                  />
                </div>
                <SierraLeoneFlag className="h-12 w-20" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#007236]">Government of Sierra Leone</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#007236]">Administrative portal</p>
              <h2 className="mt-2 text-4xl font-bold tracking-tight text-[#003580]">Sign in to continue</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Use your official government email address and assigned credentials to access the internal ministry meeting workspace.
              </p>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                The email address or password entered is incorrect.
              </div>
            ) : null}

            <form action={login} className="mt-8 space-y-5">
              <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/administrative"} />
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">Official email address</label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@ministry.gov.sl"
                    className="w-full rounded-2xl border border-[#d8e1ee] bg-[#fbfdff] py-3.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#003580] focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <div className="mt-2">
                  <PasswordInput
                    name="password"
                    autoComplete="current-password"
                    required
                    inputClassName="w-full rounded-2xl border border-[#d8e1ee] bg-[#fbfdff] px-4 py-3.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#003580] focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]"
                    buttonClassName="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#003580]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#003580] px-4 py-3.5 text-sm font-bold text-white shadow-[0_16px_32px_rgba(0,53,128,0.18)] transition hover:bg-[#002a68] focus:outline-none focus:ring-2 focus:ring-[#d7e5fb] focus:ring-offset-2"
              >
                Sign in securely
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#003580] hover:underline">
                <ArrowLeft className="h-4 w-4" /> Return to the public calendar
              </Link>
              <p className="mt-5 text-xs leading-5 text-slate-500">
                Unauthorized access is prohibited. Activity within this system may be logged for security and accountability.
              </p>
            </div>
          </div>
        </section>
      </div>

      <footer className="px-4 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Government of Sierra Leone
      </footer>
    </main>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-blue-50/90">
      <span className="text-[#fab700]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
