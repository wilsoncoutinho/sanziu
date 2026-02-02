"use client";

import { useEffect, useMemo, useState } from "react";

type User = { id: string; name: string | null; email: string; createdAt?: string };

type Account = { id: string; name: string; type: string; initialBal: any; createdAt: string };
type Category = { id: string; name: string; type: "EXPENSE" | "INCOME"; createdAt: string };

type Tx = {
  id: string;
  type: "EXPENSE" | "INCOME";
  amount: any;
  date: string;
  description: string | null;
  account: { id: string; name: string };
  category: { id: string; name: string; type: "EXPENSE" | "INCOME" };
};

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function amountToNumber(v: any) {
  // Prisma Decimal pode chegar como string
  const s = typeof v === "string" ? v : v?.toString?.() ?? String(v ?? "0");
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function DashboardClient() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Login form state
  const [email, setEmail] = useState("wilson@email.com");
  const [password, setPassword] = useState("123456");
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  // Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Transactions
  const [month, setMonth] = useState(toYYYYMM(new Date()));
  const [txs, setTxs] = useState<Tx[]>([]);
  const [summary, setSummary] = useState<{ income: number; expense: number; net: number } | null>(null);

  // Form transaction
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("57.90");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState<string>("Mercado");
  const [txMsg, setTxMsg] = useState<string | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === txType),
    [categories, txType]
  );

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `Erro ${res.status}`;
      throw new Error(msg);
    }
    return data as T;
  }

  async function loadMe() {
    try {
      const data = await api<{ user: User | null }>("/api/auth/me", { method: "GET" });
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }

  async function loadBaseData() {
    const [a, c] = await Promise.all([
      api<{ accounts: Account[] }>("/api/accounts", { method: "GET" }),
      api<{ categories: Category[] }>("/api/categories", { method: "GET" }),
    ]);

    setAccounts(a.accounts);
    setCategories(c.categories);

    // defaults (pra não ficar vazio)
    if (!accountId && a.accounts.length) setAccountId(a.accounts[0].id);
  }

  async function loadTransactions(selectedMonth: string) {
    const data = await api<{ month: string; summary: any; transactions: Tx[] }>(
      `/api/transactions?month=${encodeURIComponent(selectedMonth)}`,
      { method: "GET" }
    );
    setTxs(data.transactions ?? []);
    setSummary({
      income: amountToNumber(data.summary?.income),
      expense: amountToNumber(data.summary?.expense),
      net: amountToNumber(data.summary?.net),
    });
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await loadBaseData();
      await loadTransactions(month);
    })().catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadTransactions(month).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    // quando muda txType, tenta setar uma categoria válida
    if (!filteredCategories.length) {
      setCategoryId("");
    } else if (!filteredCategories.find((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txType, categories]);

  async function handleLogin() {
    setAuthMsg(null);
    try {
      const data = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      setAuthMsg("Login OK ✅");
    } catch (e: any) {
      setAuthMsg(e.message || "Falha no login");
    }
  }

  async function handleLogout() {
    setAuthMsg(null);
    try {
      await api<{ ok: true }>("/api/auth/logout", { method: "POST" });
      setUser(null);
      setAccounts([]);
      setCategories([]);
      setTxs([]);
      setSummary(null);
      setAuthMsg("Saiu ✅");
    } catch (e: any) {
      setAuthMsg(e.message || "Erro ao sair");
    }
  }

  async function handleCreateTx() {
    setTxMsg(null);

    if (!accountId) return setTxMsg("Escolha uma conta.");
    if (!categoryId) return setTxMsg("Escolha uma categoria.");
    if (!amount) return setTxMsg("Informe o valor.");

    try {
      await api<{ transaction: Tx }>("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          type: txType,
          amount,
          date,
          description: description || null,
          accountId,
          categoryId,
        }),
      });

      setTxMsg("Lançado ✅");
      // Recarrega mês
      await loadTransactions(month);

      // “otimização de 10s”: mantém conta/categoria e limpa só valor/descrição
      setAmount("");
      setDescription("");
    } catch (e: any) {
      setTxMsg(e.message || "Erro ao lançar");
    }
  }

  if (!authChecked) {
    return <p>Carregando…</p>;
  }

  if (!user) {
    // Tela de login embutida (simples e funcional)
    return (
      <section style={{ maxWidth: 420, margin: "40px auto" }}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Login</h1>
        <p style={{ marginTop: 0, opacity: 0.8 }}>
          Entre para acessar as finanças do casal.
        </p>

        <label style={{ display: "block", marginTop: 12 }}>
          Email
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </label>

        <label style={{ display: "block", marginTop: 12 }}>
          Senha
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="******"
          />
        </label>

        <button
          onClick={handleLogin}
          style={{ marginTop: 14, padding: "10px 14px", cursor: "pointer" }}
        >
          Entrar
        </button>

        {authMsg && <p style={{ marginTop: 12 }}>{authMsg}</p>}
      </section>
    );
  }

  return (
    <section>
      <header style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, margin: 0 }}>Finanças do Casal</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
            Logado como <b>{user.name ?? user.email}</b>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleLogout} style={{ padding: "10px 14px", cursor: "pointer" }}>
            Sair
          </button>
        </div>
      </header>

      <hr style={{ margin: "18px 0" }} />

      {/* Controles mês + resumo */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Mês
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ marginLeft: 8, padding: 8 }}
          />
        </label>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Stat label="Entradas" value={summary?.income ?? 0} />
          <Stat label="Saídas" value={summary?.expense ?? 0} />
          <Stat label="Saldo" value={summary?.net ?? 0} />
        </div>
      </div>

      <hr style={{ margin: "18px 0" }} />

      {/* Form rápido de lançamento */}
      <h2 style={{ marginBottom: 8 }}>Lançar (10 segundos)</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        <label style={{ gridColumn: "span 1" }}>
          Tipo
          <select
            value={txType}
            onChange={(e) => setTxType(e.target.value as any)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </select>
        </label>

        <label style={{ gridColumn: "span 2" }}>
          Conta
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </label>

        <label style={{ gridColumn: "span 2" }}>
          Categoria
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          >
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ gridColumn: "span 1" }}>
          Valor
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="Ex: 57.90"
          />
        </label>

        <label style={{ gridColumn: "span 1" }}>
          Data
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ gridColumn: "span 5" }}>
          Descrição
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="Ex: Mercado, Uber, Aluguel..."
          />
        </label>

        <div style={{ gridColumn: "span 6" }}>
          <button onClick={handleCreateTx} style={{ padding: "10px 14px", cursor: "pointer" }}>
            Salvar lançamento
          </button>
          {txMsg && <span style={{ marginLeft: 12 }}>{txMsg}</span>}
        </div>
      </div>

      <hr style={{ margin: "18px 0" }} />

      {/* Lista do mês */}
      <h2 style={{ marginBottom: 8 }}>Lançamentos do mês</h2>

      {txs.length === 0 ? (
        <p style={{ opacity: 0.8 }}>Nenhum lançamento nesse mês ainda.</p>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
          {txs.map((t) => {
            const v = amountToNumber(t.amount);
            return (
              <div
                key={t.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 120px 1fr 140px 140px",
                  gap: 10,
                  padding: 10,
                  borderTop: "1px solid #eee",
                }}
              >
                <div>{String(t.date).slice(0, 10)}</div>
                <div>{t.type === "EXPENSE" ? "Despesa" : "Receita"}</div>
                <div>
                  <b>{t.category?.name}</b>
                  {t.description ? <span style={{ opacity: 0.8 }}> — {t.description}</span> : null}
                </div>
                <div>{t.account?.name}</div>
                <div style={{ textAlign: "right" }}>
                  {v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8, minWidth: 140 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>
        {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </div>
    </div>
  );
}
