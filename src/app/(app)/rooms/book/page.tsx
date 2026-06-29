// DISABLED: Room booking is now integrated into event creation
// Users book rooms by creating events with a room selection

export default function BookRoomPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Room Booking Disabled</h1>
      <p className="text-muted-foreground">
        Room booking is now integrated into event creation. 
        Go to <a href="/administrative/events/new" className="text-blue-400 hover:underline">Create Event</a> to book a room.
      </p>
    </div>
  );
}
