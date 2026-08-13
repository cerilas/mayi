export default function PostureReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#f1f5f9",
        minHeight: "100vh",
        height: "auto",
        overflow: "visible",
        display: "block",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
