import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, auth } from "@/auth";
import { PasswordInput } from "@/components/PasswordInput";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const session = await auth();
  if (session?.user) redirect(callbackUrl || "/");

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const cb = String(formData.get("callbackUrl") || "/");
    try {
      await signIn("credentials", { email, password, redirectTo: cb });
    } catch (error) {
      if (error instanceof AuthError) {
        const params = new URLSearchParams({ error: error.type });
        if (cb && cb !== "/") params.set("callbackUrl", cb);
        redirect(`/login?${params}`);
      }
      throw error; // re-throw NEXT_REDIRECT so Next.js handles the success redirect
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-foreground">Ministry Sign In</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Smart Meeting &amp; Attendance Logger
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Invalid email or password.
          </p>
        ) : null}

        <form action={login} className="mt-6 space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
          <div>
            <label className="block text-sm font-medium text-foreground">Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">
              Password
            </label>
            <div className="mt-1">
              <PasswordInput
                name="password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
