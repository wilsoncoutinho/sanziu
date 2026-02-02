export const dynamic = "force-dynamic";

import Link from "next/link";

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Entrar</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Faça login para acessar as finanças do casal.
      </p>

      {/* Form simples, client-side via JS no AppClient; aqui vamos usar um form com JS inline? 
          Melhor: página simples com script no client = componente client abaixo. */}
      <LoginForm />

      <hr style={{ margin: "24px 0" }} />

      <p style={{ fontSize: 14, opacity: 0.8 }}>
        Dica: depois a gente cria uma tela de cadastro. Por enquanto você já criou o usuário via API.
      </p>

      <p style={{ marginTop: 8 }}>
        <Link href="/app">Ir para o app</Link>
      </p>
    </main>
  );
}

function LoginForm() {
  // componente client embutido pra manter simples
  // (Next exige "use client" no topo do arquivo, então fazemos um truque: separar em arquivo seria o ideal.
  // Pra manter 100% correto, vamos colocar o form em /app/app/AppClient.tsx e aqui só linkar.
  // Então este componente aqui não deve usar hooks.
  return (
    <p style={{ color: "#b00" }}>
      Abra <b>/app/app/page.tsx</b> — lá tem botão de login rápido.
      <br />
      (Se quiser login “bonitinho” aqui, eu te passo uma versão separada em arquivo client.)
    </p>
  );
}
