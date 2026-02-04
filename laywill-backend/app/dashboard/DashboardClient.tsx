"use client";

export default function DashboardClient() {
  return (
    <section style={{ maxWidth: 720, margin: "40px auto", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ marginTop: 0 }}>
        O login agora é feito pelo Supabase Auth. Esta tela antiga usava rotas de
        autenticação do backend e foi desativada.
      </p>
      <p>
        Se você quiser o dashboard web, posso integrar o Supabase Auth aqui também.
      </p>
    </section>
  );
}
