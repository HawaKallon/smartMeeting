import Link from "next/link";
import { signOut } from "@/auth";
import { ROLE_LABELS, canManageEvents } from "@/lib/roles";
import type { SystemRole,  MinistryRole } from "@/generated/prisma/enums";

export function AppNav({
  user,
}: {
  user: { name?: string | null; email: string; role: SystemRole };
}) {
  const isAdmin = canManageEvents(user.systemRole);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-6">
          <Link href="/administrative" className="font-semibold text-gray-900">
            Smart Meeting
          </Link>
          <Link href="/administrative/calendar" className="text-sm text-gray-600 hover:text-gray-900">
            Calendar
          </Link>
          {isAdmin ? (
            <>
              <Link
                href="/administrative/events/new"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Schedule Activity
              </Link>
              <Link
                href="/administrative/attendance"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Attendance
              </Link>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-right text-xs leading-tight">
            <span className="block font-medium text-gray-900">
              {user.name ?? user.email}
            </span>
            <span className="block text-gray-500">{ROLE_LABELS[user.systemRole]}</span>
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/administrative/login" });
            }}
          >
            <button className="rounded-md border px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
