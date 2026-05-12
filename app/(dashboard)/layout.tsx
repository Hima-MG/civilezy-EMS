// The proxy (proxy.ts) already enforces authentication for every route under
// /employee, /cre, /hr, and /admin before this layout is ever reached.
// Repeating a getUser() call here adds an unnecessary outbound network round-
// trip on every dashboard render — removed intentionally.
export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
