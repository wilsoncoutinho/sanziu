export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <DashboardClient />
    </main>
  );
}
