import { auth } from "@/auth";
import { resolveToken } from "@/lib/checkin";
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        {!resolved ? (
          <Message title="Invalid code" body="This check-in code was not recognized." />
        ) : resolved.expired ? (
          <Message
            title="Code expired"
            body="Ask the meeting organizer for a fresh QR code."
          />
        ) : (
          <CheckInClient
            token={token}
            eventTitle={resolved.event.title}
            needsName={!session?.user}
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
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{body}</p>
    </div>
  );
}
