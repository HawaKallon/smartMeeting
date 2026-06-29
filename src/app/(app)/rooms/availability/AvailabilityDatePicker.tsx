"use client";

import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/DatePicker";

/** Date filter for the availability page — picks a date and navigates. */
export function AvailabilityDatePicker({
  roomId,
  date,
}: {
  roomId: string;
  date: string;
}) {
  const router = useRouter();
  return (
    <DatePicker
      value={date}
      onChange={(d) => {
        if (d && d !== date) {
          router.push(`/administrative/rooms/availability?roomId=${roomId}&date=${d}`);
        }
      }}
    />
  );
}
