export default function PostureReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[var(--bg-secondary)]">{children}</div>;
}
