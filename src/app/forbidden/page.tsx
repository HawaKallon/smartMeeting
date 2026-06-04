import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50">
      <h1 className="text-2xl font-semibold text-gray-900">403 — Forbidden</h1>
      <p className="text-sm text-gray-500">
        Your ministry role does not permit access to this page.
      </p>
      <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
        Back to dashboard
      </Link>
    </main>
  );
}
