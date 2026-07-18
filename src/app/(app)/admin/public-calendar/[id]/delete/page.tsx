import { redirect } from "next/navigation";

export default async function DeletePublicEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/administrative/events/${id}`);
}
