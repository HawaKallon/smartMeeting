import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <h1 className="text-2xl font-semibold text-foreground">403 — Forbidden</h1>
      <p className="text-sm text-muted-foreground">
        Your ministry role does not permit access to this page.
      </p>
      <Link href="/administrative" className="text-sm font-medium text-sidebar-primary hover:underline">
        Back to dashboard
      </Link>
    </main>
  );
}
