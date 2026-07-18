"use client";

import { useActionState, useState, useCallback, KeyboardEvent } from "react";
import { createEvent, createRoomInline, type ActionState } from "../actions";
import { RoomSchedulePreview } from "./RoomSchedulePreview";
import { RecurrenceFields } from "@/components/RecurrenceFields";
import { X, Plus, Upload, Building2, Globe } from "lucide-react";

const field = "mt-1 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none";
const publicCalendarField = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#d7e5fb]";
const label = "block text-sm font-medium text-foreground/80";
const publicCalendarLabel = "block text-sm font-medium text-foreground mb-2";

type Invite = { email: string; name: string };
type Room = { id: string; name: string; location: string; capacity: number; ministryId: string };
type Ministry = {
  id: string;
  name: string;
  code: string;
  compoundMaxGpsAccuracy: number;
};
type CoOrganizerCandidate = { id: string; name: string | null; email: string };

export function EventForm({
  rooms,
  ministries,
  coOrganizerCandidates = [],
  isSuperAdmin = false,
  initialDate,
  initialIsPublic = false,
}: {
  rooms: Room[];
  ministries?: Ministry[];
  coOrganizerCandidates?: CoOrganizerCandidate[];
  isSuperAdmin?: boolean;
  initialDate?: string;
  initialIsPublic?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createEvent,
    undefined,
  );

  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");

  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);
  const [selectedCoOrganizers, setSelectedCoOrganizers] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Banner image preview
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Inline room creation
  const [extraRooms, setExtraRooms] = useState<Room[]>([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomLocation, setNewRoomLocation] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState("");
  const [addRoomPending, setAddRoomPending] = useState(false);
  const [addRoomError, setAddRoomError] = useState("");

  const defaultCategories = ["CONFERENCE", "WORKSHOP", "TRAINING", "MEETING", "LAUNCH", "OTHER"];
  const filteredCategories = defaultCategories.filter((cat) =>
    cat.toLowerCase().includes(categoryInput.toLowerCase())
  );
  const showCustomOption = categoryInput && !defaultCategories.some((cat) => cat.toLowerCase() === categoryInput.toLowerCase());
  // Combined datetime strings (YYYY-MM-DDTHH:mm). Seed from a calendar-day
  // prefill at 09:00-10:00; the native inputs drive changes.
  const [startAt, setStartAt] = useState(initialDate ? `${initialDate}T09:00` : "");
  const [endAt, setEndAt] = useState(initialDate ? `${initialDate}T10:00` : "");
  const ministryOptions = ministries ?? [];
  const isSuperAdminCreate = isSuperAdmin;
  const availableRooms = (isSuperAdminCreate
    ? [...rooms, ...extraRooms].filter((room) => room.ministryId === selectedMinistryId)
    : [...rooms, ...extraRooms]);
  const selectedMinistry = isSuperAdminCreate
    ? ministryOptions.find((ministry) => ministry.id === selectedMinistryId)
    : ministryOptions[0];

  const handleBannerImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setBannerPreview(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);
  const selectedRoom = availableRooms.find((room) => room.id === selectedRoomId);

  function addInvite() {
    const email = inviteEmail.trim().toLowerCase();
    const name = inviteName.trim();

    setInviteError("");

    if (!email || !name) {
      setInviteError("Both name and email are required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Invalid email address");
      return;
    }

    if (invites.find((i) => i.email === email)) {
      setInviteError("This email is already invited");
      return;
    }

    setInvites((prev) => [...prev, { email, name }]);
    setInviteName("");
    setInviteEmail("");
  }

  function removeInvite(email: string) {
    setInvites((prev) => prev.filter((i) => i.email !== email));
  }

  function handleInviteKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addInvite();
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Pass invites as JSON */}
      <input type="hidden" name="invitees" value={JSON.stringify(invites)} />
      {isSuperAdminCreate && <input type="hidden" name="ministryId" value={selectedMinistryId} />}

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <input type="hidden" name="isPublic" value={isPublic ? "true" : "false"} />
      <input type="hidden" name="coOrganizerIds" value={JSON.stringify(selectedCoOrganizers)} />

      {/* Activity Type Toggle */}
      <div>
        <label className={label}>Activity Type</label>
        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-1 flex gap-1">
          <button
            type="button"
            onClick={() => setIsPublic(false)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              !isPublic
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Internal Activity</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPublic(true)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              isPublic
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Public Activity</span>
          </button>
        </div>
      </div>

      <div>
        <label className={label}>Title</label>
        <input name="title" required className={field} />
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={3} className={field} />
      </div>

      {/* For public events: Location field */}
      {isPublic && (
        <div>
          <label className={label}>Location</label>
          <input type="text" name="venueName" placeholder="e.g., Main Conference Hall, National Stadium" className={field} />
        </div>
      )}

      {/* For internal events: Room selection with inline creation */}
      {!isPublic && (
        <div>
          <label className={label}>Location</label>
          <div className="flex gap-2 mb-3">
            <select
              name="roomId"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              disabled={isSuperAdminCreate && !selectedMinistryId}
              className={`${field} flex-1`}
            >
              <option value="">
                {isSuperAdminCreate && !selectedMinistryId ? "Select a ministry first" : "Select a room"}
              </option>
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.capacity} people) - {room.location}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddRoom(!showAddRoom)}
              disabled={isSuperAdminCreate && !selectedMinistryId}
              className="flex-shrink-0 rounded-md border border-border bg-muted/50 px-3 py-2 text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Add a new room"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Inline room creation panel */}
          {showAddRoom && (
            <div className="mb-3 rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground">Create New Room</h3>

              {addRoomError && (
                <div className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-400">
                  {addRoomError}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-foreground/80">Room Name *</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., Conference Room A"
                  className={field}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground/80">Location *</label>
                <input
                  type="text"
                  value={newRoomLocation}
                  onChange={(e) => setNewRoomLocation(e.target.value)}
                  placeholder="e.g., Floor 3"
                  className={field}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground/80">Capacity *</label>
                <input
                  type="number"
                  value={newRoomCapacity}
                  onChange={(e) => setNewRoomCapacity(e.target.value)}
                  placeholder="Maximum people"
                  min="1"
                  className={field}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setAddRoomError("");
                    setAddRoomPending(true);
                    try {
                      const formData = new FormData();
                      formData.append("name", newRoomName);
                      formData.append("location", newRoomLocation);
                      formData.append("capacity", newRoomCapacity);
                      if (isSuperAdminCreate && selectedMinistryId) {
                        formData.append("ministryId", selectedMinistryId);
                      }

                      const result = await createRoomInline(formData);

                      if (result.error) {
                        setAddRoomError(result.error);
                      } else if (result.room) {
                        setExtraRooms([...extraRooms, result.room]);
                        setSelectedRoomId(result.room.id);
                        setNewRoomName("");
                        setNewRoomLocation("");
                        setNewRoomCapacity("");
                        setShowAddRoom(false);
                      }
                    } catch (err) {
                      setAddRoomError("Failed to create room");
                      console.error(err);
                    } finally {
                      setAddRoomPending(false);
                    }
                  }}
                  disabled={addRoomPending || !newRoomName || !newRoomLocation || !newRoomCapacity}
                  className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                >
                  {addRoomPending ? "Creating..." : "Create Room"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRoom(false);
                    setNewRoomName("");
                    setNewRoomLocation("");
                    setNewRoomCapacity("");
                    setAddRoomError("");
                  }}
                  className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Contact Email (optional)</label>
          <input type="email" name="contactEmail" placeholder="contact@example.com" className={field} />
        </div>
        <div>
          <label className={label}>Contact Phone (optional)</label>
          <input type="tel" name="contactPhone" placeholder="+232 76 123 456" className={field} />
        </div>
      </div>

      {isSuperAdminCreate && (
        <div>
          <label className={label}>Ministry</label>
          <select
            value={selectedMinistryId}
            onChange={(e) => {
              setSelectedMinistryId(e.target.value);
              setSelectedRoomId("");
            }}
            required
            className={field}
          >
            <option value="">Select a ministry</option>
            {ministryOptions.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name} ({ministry.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Internal-only fields */}
      {!isPublic && (
        <>
          <div>
            <label className={label}>Session Type</label>
            <select name="type" defaultValue="MEETING" className={field}>
              <option value="MEETING">Meeting</option>
              <option value="CONFERENCE">Conference</option>
              <option value="APPOINTMENT">External Appointment</option>
            </select>
          </div>

          <div>
            <label className={label}>Co-organizers *</label>
            <input type="hidden" name="coOrganizerIds" value={JSON.stringify(selectedCoOrganizers)} />

            {/* Selected co-organizers chips */}
            {selectedCoOrganizers.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedCoOrganizers.map((id) => {
                  const candidate = coOrganizerCandidates.find((c) => c.id === id);
                  return candidate ? (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-600"
                    >
                      <span>{candidate.name || candidate.email}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCoOrganizers(selectedCoOrganizers.filter((cid) => cid !== id))}
                        className="ml-1 text-blue-400 hover:text-blue-700 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Dropdown for selecting co-organizers */}
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && !selectedCoOrganizers.includes(id)) {
                  setSelectedCoOrganizers([...selectedCoOrganizers, id]);
                }
                e.target.value = "";
              }}
              className={field}
            >
              <option value="">+ Add co-organizer</option>
              {coOrganizerCandidates
                .filter((c) => !selectedCoOrganizers.includes(c.id))
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name || candidate.email} ({candidate.email})
                  </option>
                ))}
            </select>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select at least one person to co-organize this activity.
            </p>
          </div>
        </>
      )}

      {/* Public-only fields */}
      {isPublic && (
        <>
          <div>
            <label className={label}>Category</label>
            <input type="hidden" name="category" value={selectedCategory} />
            <div className="relative">
              <input
                type="text"
                value={categoryInput}
                onChange={(e) => {
                  setCategoryInput(e.target.value);
                  setCategoryOpen(true);
                }}
                onFocus={() => setCategoryOpen(true)}
                onBlur={() => setTimeout(() => setCategoryOpen(false), 150)}
                placeholder="Select or type a category"
                className={field}
              />
              {categoryOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10">
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCategories.length > 0 && (
                      <>
                        {filteredCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setCategoryInput(cat === "CONFERENCE" ? "Conference" : cat === "WORKSHOP" ? "Workshop" : cat === "TRAINING" ? "Training" : cat === "MEETING" ? "Meeting" : cat === "LAUNCH" ? "Launch" : "Other");
                              setCategoryOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                          >
                            {cat === "CONFERENCE" ? "Conference" : cat === "WORKSHOP" ? "Workshop" : cat === "TRAINING" ? "Training" : cat === "MEETING" ? "Meeting" : cat === "LAUNCH" ? "Launch" : "Other"}
                          </button>
                        ))}
                      </>
                    )}
                    {showCustomOption && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(categoryInput.toUpperCase());
                          setCategoryOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-t border-border text-sm text-muted-foreground"
                      >
                        + Add "{categoryInput}" as custom category
                      </button>
                    )}
                    {filteredCategories.length === 0 && !showCustomOption && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No categories match</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Start typing to search or create a custom category</p>
          </div>

          <div>
            <label className={label}>Banner Image</label>
            {bannerPreview && (
              <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden border border-border">
                <img src={bannerPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <input
              type="file"
              id="bannerImage"
              name="bannerImage"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleBannerImageChange}
              className="sr-only"
            />
            <label
              htmlFor="bannerImage"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              <Upload className="h-4 w-4" />
              Choose Image
            </label>
            <p className="mt-1 text-xs text-muted-foreground">Max 5MB, JPG/PNG recommended</p>
          </div>

          <div>
            <label className={label}>External URL (optional)</label>
            <input type="url" name="externalUrl" placeholder="https://example.com" className={field} />
          </div>

          <div>
            <label className={label}>Invited Ministries</label>
            <input type="hidden" name="invitedMinistryIds" value={JSON.stringify(selectedMinistries)} />

            {/* Selected ministries chips */}
            {selectedMinistries.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedMinistries.map((id) => {
                  const ministry = ministryOptions.find((m) => m.id === id);
                  return ministry ? (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-600"
                    >
                      <span>{ministry.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMinistries(selectedMinistries.filter((mid) => mid !== id))}
                        className="ml-1 text-green-400 hover:text-green-700 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Dropdown for selecting ministries */}
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && !selectedMinistries.includes(id)) {
                  setSelectedMinistries([...selectedMinistries, id]);
                }
                e.target.value = "";
              }}
              className={field}
            >
              <option value="">+ Add ministry</option>
              {ministryOptions
                .filter((m) => !selectedMinistries.includes(m.id))
                .map((ministry) => (
                  <option key={ministry.id} value={ministry.id}>
                    {ministry.name} ({ministry.code})
                  </option>
                ))}
            </select>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select ministries that will receive an invitation to this activity.
            </p>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startAt" className={publicCalendarLabel}>
            Start Date &amp; Time *
          </label>
          <input
            type="datetime-local"
            id="startAt"
            name="startAt"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
            className={publicCalendarField}
          />
        </div>
        <div>
          <label htmlFor="endAt" className={publicCalendarLabel}>
            End Date &amp; Time *
          </label>
          <input
            type="datetime-local"
            id="endAt"
            name="endAt"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
            className={publicCalendarField}
          />
        </div>
      </div>

      {/* Recurrence */}
      <RecurrenceFields />

      {/* Hidden geofence fields */}
      <input type="hidden" name="geofenceRadius" value="100" />

      {/* Room Schedule Preview - internal events only */}
      {!isPublic && selectedRoomId && startAt && endAt && (
        <RoomSchedulePreview
          roomId={selectedRoomId}
          startAt={startAt}
          endAt={endAt}
          rooms={availableRooms}
        />
      )}

      {/* ── Invite attendees ── (internal events only) */}
      {!isPublic && (
      <div>
        <label className={label}>Invite attendees</label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Enter name and email to add attendees. Invitation emails will be sent on creation.
        </p>

        {/* Attendee list */}
        {invites.length > 0 && (
          <div className="mt-3 space-y-2 rounded-lg bg-muted/30 p-3 border border-border/50">
            {invites.map((inv) => (
              <div
                key={inv.email}
                className="flex items-center justify-between rounded-lg bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{inv.name}</p>
                  <p className="text-xs text-muted-foreground">{inv.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeInvite(inv.email)}
                  className="ml-2 flex-shrink-0 text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              {invites.length} attendee{invites.length !== 1 ? "s" : ""} added
            </p>
          </div>
        )}

        {/* Add attendee form */}
        <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
          {inviteError && (
            <div className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-400 mb-2">
              {inviteError}
            </div>
          )}

          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              onKeyDown={handleInviteKeyDown}
              placeholder="Full name"
              className="mt-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none w-1/4 flex-shrink-0"
            />

            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={handleInviteKeyDown}
              placeholder="Email address"
              className="mt-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none flex-1 min-w-0"
            />
            <button
              type="button"
              onClick={addInvite}
              className="mt-1 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:bg-foreground/90 transition-colors whitespace-nowrap flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
      >
        {pending ? "Scheduling…" : "Schedule activity"}
      </button>
    </form>
  );
}
