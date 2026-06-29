import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { ArrowLeft, CalendarCheck2, Landmark, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signIn, auth } from "@/auth";
import { PasswordInput } from "@/components/PasswordInput";

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
    <main className="flex min-h-screen flex-col bg-[#eef2f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#12355b] text-white shadow-sm">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1f8f4e]">
                Government of Sierra Leone
              </p>
              <h1 className="mt-0.5 text-lg font-bold tracking-tight text-[#12355b]">
                Administrative Sign In
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
            <span
              className="flex h-7 w-11 overflow-hidden rounded-[4px] border border-slate-300 bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.35)_inset]"
              aria-hidden="true"
            >
              <span className="flex-1 bg-[#1f8f4e]" />
              <span className="flex-1 bg-white" />
              <span className="flex-1 bg-[#1f6fa8]" />
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 sm:inline">
              Sierra Leone
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:min-h-[650px] md:grid-cols-[1.05fr_1fr]">
          <aside className="relative hidden overflow-hidden bg-[#12355b] p-12 text-white md:flex md:flex-col md:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[48px] border-white/5" aria-hidden="true" />
            <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#1f8f4e]/20" aria-hidden="true" />

            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <Landmark className="h-7 w-7" />
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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#12355b] text-white">
                <Landmark className="h-6 w-6" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#1f8f4e]">Government of Sierra Leone</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#1f8f4e]">Administrative portal</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#12355b]">Sign in to continue</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Use your official government email address and assigned credentials.
              </p>
            </div>

            {error ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                The email address or password entered is incorrect.
              </div>
            ) : null}

            <form action={login} className="mt-7 space-y-5">
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
                    className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1f6fa8] focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                    inputClassName="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1f6fa8] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    buttonClassName="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#12355b]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#12355b] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0d2947] focus:outline-none focus:ring-2 focus:ring-[#1f6fa8] focus:ring-offset-2"
              >
                Sign in securely
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f6fa8] hover:underline">
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
      <span className="text-emerald-300">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
