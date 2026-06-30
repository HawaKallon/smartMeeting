import { auth } from "@/auth";
import { resolveToken, checkInClosed } from "@/lib/checkin";
import { CheckInClient } from "./CheckInClient";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveToken(token);
  const session = await auth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6faff] p-4 text-slate-900">
      <div className="w-full max-w-sm rounded-[1.5rem] border border-[#d3deef] bg-[#fafdff] p-6 shadow-[0_18px_40px_rgba(0,53,128,0.08)]">
        {!resolved ? (
          <Message title="Invalid code" body="This check-in code was not recognized." />
        ) : resolved.expired ? (
          <Message
            title="Code expired"
            body="Ask the meeting organizer for a fresh QR code."
          />
        ) : checkInClosed(resolved.event.endAt) ? (
          <Message
            title="Meeting ended"
            body="This meeting has ended. Check-in is closed."
          />
        ) : !session?.user ? (
          <LoginPrompt token={token} />
        ) : (
          <CheckInClient
            token={token}
            eventTitle={resolved.event.title}
            hasGeofence={
              resolved.event.venueLat != null && resolved.event.venueLng != null
            }
          />
        )}
      </div>
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center">
      <h1 className="text-lg font-semibold text-[#003580]">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function LoginPrompt({ token }: { token: string }) {
  const callbackUrl = `/checkin/${token}`;
  return (
    <div className="text-center space-y-4">
      <h1 className="text-lg font-semibold text-[#003580]">Sign in to check in</h1>
      <p className="text-sm text-slate-600">You must be logged in to check in to this meeting.</p>
      <a
        href={`/administrative/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        className="inline-block rounded-xl bg-[#003580] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00265b]"
      >
        Sign in
      </a>
    </div>
  );
}
