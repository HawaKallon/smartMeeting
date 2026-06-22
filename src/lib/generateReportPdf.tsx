import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ROLE_LABELS } from "@/lib/roles";
import type { ReportAnalytics } from "@/lib/analytics";

const TYPE_LABELS: Record<string, string> = {
  MEETING: "Meeting",
  CONFERENCE: "Conference",
  APPOINTMENT: "Appointment",
};
const METHOD_LABELS: Record<string, string> = { QR: "QR code", MANUAL: "Manual", GEO: "Geofence" };

const s = StyleSheet.create({
  page: { paddingHorizontal: 48, paddingVertical: 48, fontFamily: "Helvetica", fontSize: 10, color: "#374151" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#111827" },
  subtitle: { fontSize: 10, color: "#6b7280", marginTop: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 18, marginBottom: 8 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: { width: "31%", border: "1 solid #e5e7eb", borderRadius: 4, padding: 10, marginBottom: 8 },
  statLabel: { fontSize: 8, color: "#6b7280" },
  statValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 2 },
  row: { flexDirection: "row", borderBottom: "1 solid #f0f0f0", paddingVertical: 4 },
  cellL: { flex: 1, color: "#374151" },
  cellR: { width: 60, textAlign: "right", fontFamily: "Helvetica-Bold", color: "#111827" },
  footer: { marginTop: 32, fontSize: 8, color: "#9ca3af" },
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{String(value)}</Text>
    </View>
  );
}

function Table({ rows }: { rows: { label: string; value: number | string }[] }) {
  if (rows.length === 0) return <Text style={{ color: "#9ca3af" }}>No data</Text>;
  return (
    <View>
      {rows.map((r) => (
        <View key={r.label} style={s.row}>
          <Text style={s.cellL}>{r.label}</Text>
          <Text style={s.cellR}>{String(r.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function ReportDoc({ a, scopeLabel, generatedDate }: { a: ReportAnalytics; scopeLabel: string; generatedDate: string }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Reports & Analytics</Text>
        <Text style={s.subtitle}>
          {scopeLabel} · Generated {generatedDate}
        </Text>

        <Text style={s.sectionTitle}>Overview</Text>
        <View style={s.statsRow}>
          <Stat label="Users" value={a.users.total} />
          {a.ministries && <Stat label="Ministries" value={`${a.ministries.total} (${a.ministries.active} active)`} />}
          <Stat label="Rooms" value={a.rooms.total} />
          <Stat label="Events" value={a.events.total} />
          <Stat label="Check-ins" value={a.attendance.total} />
          <Stat label="Attendance rate" value={`${Math.round(a.attendance.rate * 100)}%`} />
        </View>

        <Text style={s.sectionTitle}>Users by role</Text>
        <Table rows={a.users.byRole.map((r) => ({ label: ROLE_LABELS[r.role], value: r.count }))} />

        <Text style={s.sectionTitle}>Events</Text>
        <Table
          rows={[
            { label: "Upcoming", value: a.events.upcoming },
            { label: "Past", value: a.events.past },
            ...a.events.byType.map((t) => ({ label: TYPE_LABELS[t.type] ?? t.type, value: t.count })),
          ]}
        />

        <Text style={s.sectionTitle}>Attendance</Text>
        <Table
          rows={[
            ...a.attendance.byMethod.map((m) => ({ label: METHOD_LABELS[m.method] ?? m.method, value: m.count })),
            { label: "Within geofence", value: a.attendance.withinGeofence },
            { label: "Outside geofence", value: a.attendance.outsideGeofence },
            { label: "Mock-location flags", value: a.attendance.mockLocation },
          ]}
        />

        <Text style={s.footer}>Smart Meeting & Attendance Logger</Text>
      </Page>
    </Document>
  );
}

export async function generateReportPdf(args: {
  analytics: ReportAnalytics;
  scopeLabel: string;
  generatedDate: string;
}): Promise<Buffer> {
  return renderToBuffer(
    <ReportDoc a={args.analytics} scopeLabel={args.scopeLabel} generatedDate={args.generatedDate} />,
  );
}
