export const metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
