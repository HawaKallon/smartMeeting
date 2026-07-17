import { redirect } from "next/navigation";

export default function NewPublicEventPage() {
  redirect("/administrative/events/new");
}
