import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { useWorkspace } from "../contexts/WorkspaceContext";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";
import { Card } from "../ui/Card";
import { H1, Money, Muted } from "../ui/typography";

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function shiftMonth(yyyyMm: string, delta: number) {
  const [y, m] = yyyyMm.split("-").map((v) => Number(v));
  const base = new Date(y, (m || 1) - 1, 1);
  base.setMonth(base.getMonth() + delta);
  return toYYYYMM(base);
}

function monthRange(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map((v) => Number(v));
  const start = new Date(y, (m || 1) - 1, 1);
  const end = new Date(y, m || 1, 1);
  return { start, end };
}

function amountToNumber(v: any) {
  const s = typeof v === "string" ? v : v?.toString?.() ?? String(v ?? "0");
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function BRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map((v) => Number(v));
  const date = new Date(y, (m || 1) - 1, 1);
  const label = date
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(" de ", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function createInviteCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function pickVariant(options: string[], seed: number) {
  if (options.length === 0) return "";
  return options[Math.abs(seed) % options.length];
}

export default function HomeScreen({ navigation }: any) {
  const { workspaceId, loading: workspaceLoading, refreshWorkspace } = useWorkspace();
  const [month] = useState(toYYYYMM(new Date()));
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
    message: "",
  });
  const [inviteCode, setInviteCode] = useState("");

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  const summaryQuery = useQuery({
    queryKey: ["homeSummary", workspaceId, month],
    enabled: Boolean(workspaceId),
    staleTime: 30000,
    queryFn: async () => {
      const { start, end } = monthRange(month);
      const { data, error } = await supabase
        .from("Transaction")
        .select("type, amount")
        .eq("workspaceId", workspaceId as string)
        .gte("date", start.toISOString())
        .lt("date", end.toISOString());
      if (error) throw error;

      let income = 0;
      let expense = 0;
      for (const t of data || []) {
        const v = amountToNumber((t as any).amount);
        if ((t as any).type === "INCOME") income += v;
        else expense += v;
      }

      return { income, expense, net: income - expense };
    },
  });

  const insightQuery = useQuery({
    queryKey: ["homeInsight", workspaceId, month],
    enabled: Boolean(workspaceId),
    staleTime: 30000,
    queryFn: async () => {
      const prevMonth = shiftMonth(month, -1);
      const { start: prevStart } = monthRange(prevMonth);
      const { start: currStart, end: currEnd } = monthRange(month);

      const { data, error } = await supabase
        .from("Transaction")
        .select("type, amount, date, category:Category(name)")
        .eq("workspaceId", workspaceId as string)
        .gte("date", prevStart.toISOString())
        .lt("date", currEnd.toISOString());

      if (error) throw error;

      let currentExpense = 0;
      let previousExpense = 0;
      const categoryTotals = new Map<string, number>();

      for (const t of data || []) {
        if ((t as any).type !== "EXPENSE") continue;
        const amount = amountToNumber((t as any).amount);
        const txDate = new Date((t as any).date);
        const isCurrentMonth = txDate >= currStart && txDate < currEnd;
        if (isCurrentMonth) {
          currentExpense += amount;
          const category = (Array.isArray((t as any).category) ? (t as any).category[0] : (t as any).category)
            ?.name;
          const key = category || "Sem categoria";
          categoryTotals.set(key, (categoryTotals.get(key) || 0) + amount);
        } else {
          previousExpense += amount;
        }
      }

      let topCategoryName = "";
      let topCategoryAmount = 0;
      for (const [name, total] of categoryTotals.entries()) {
        if (total > topCategoryAmount) {
          topCategoryName = name;
          topCategoryAmount = total;
        }
      }

      return { currentExpense, previousExpense, topCategoryName, topCategoryAmount };
    },
  });

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      summaryQuery.refetch();
      insightQuery.refetch();
    });
    return unsub;
  }, [navigation, summaryQuery, insightQuery]);

  useEffect(() => {
    if (!summaryQuery.error) return;
    const e = summaryQuery.error as any;
    showModal("Falha", e?.message || "Erro");
  }, [summaryQuery.error]);

  const summary = summaryQuery.data || { income: 0, expense: 0, net: 0 };
  const netLabel = useMemo(
    () => (summary.net >= 0 ? "Saldo positivo" : "Saldo negativo"),
    [summary.net]
  );

  const topInsightCategory = insightQuery.data?.topCategoryName || "";
  const insightText = useMemo(() => {
    const insight = insightQuery.data;
    if (!insight) return "Gerando observação do mês...";

    const { currentExpense, previousExpense, topCategoryName, topCategoryAmount } = insight;
    const seedBase = month.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) + topCategoryName.length;
    let comparison = "";

    if (previousExpense <= 0 && currentExpense <= 0) {
      comparison = pickVariant(
        [
          "Ainda não há dados suficientes para comparar gastos.",
          "Você ainda não tem movimentações suficientes para uma comparação.",
          "Assim que houver mais lançamentos, traremos uma comparação do mês.",
        ],
        seedBase
      );
    } else if (previousExpense <= 0) {
      comparison = pickVariant(
        [
          "Este é seu primeiro mês com gastos registrados.",
          "Primeiro mês com despesas registradas por aqui.",
          "Você começou a registrar gastos agora, ótimo início.",
        ],
        seedBase + 3
      );
    } else {
      const deltaPct = ((currentExpense - previousExpense) / previousExpense) * 100;
      const absPct = Math.abs(deltaPct).toFixed(0);
      if (deltaPct > 0) {
        comparison = pickVariant(
          [
            `Seus gastos subiram ${absPct}% em relação ao mês passado.`,
            `Você gastou ${absPct}% a mais que no mês anterior.`,
            `Houve aumento de ${absPct}% nos gastos deste mês.`,
          ],
          seedBase + 7
        );
      } else if (deltaPct < 0) {
        comparison = pickVariant(
          [
            `Seus gastos caíram ${absPct}% versus o mês passado.`,
            `Você gastou ${absPct}% a menos que no mês anterior.`,
            `Boa notícia: redução de ${absPct}% nos gastos do mês.`,
          ],
          seedBase + 11
        );
      } else {
        comparison = pickVariant(
          [
            "Seus gastos ficaram no mesmo nível do mês passado.",
            "Os gastos se mantiveram estáveis em relação ao mês anterior.",
            "Sem variação relevante: gastos iguais ao mês passado.",
          ],
          seedBase + 13
        );
      }
    }

    if (topCategoryAmount > 0) {
      const categorySentence = pickVariant(
        [
          `A categoria com maior peso foi ${topCategoryName} (${BRL(topCategoryAmount)}).`,
          `Seu principal foco de despesa foi ${topCategoryName}, com ${BRL(topCategoryAmount)}.`,
          `${topCategoryName} liderou os gastos do mês, totalizando ${BRL(topCategoryAmount)}.`,
        ],
        seedBase + 17
      );
      return `${comparison} ${categorySentence}`;
    }
    return comparison;
  }, [insightQuery.data, month]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: theme.space(2.5),
          paddingBottom: theme.space(5),
        }}
      >
        <Text style={H1}>Resumo do mês</Text>
        <Text style={[Muted, { marginTop: 6 }]}>{monthLabel(month)}</Text>
        <Text style={[Muted, { marginTop: 4 }]}>{netLabel}</Text>

        {workspaceLoading || summaryQuery.isPending ? (
          <View style={{ marginTop: theme.space(2.5) }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <>
            <Card
              style={{
                marginTop: theme.space(2),
                backgroundColor: "rgba(124,58,237,0.18)",
                borderColor: "rgba(124,58,237,0.45)",
              }}
            >
              <Text style={Muted}>Saldo do mês</Text>
              <Text style={[Money, { marginTop: 6 }]}>{BRL(summary.net)}</Text>

              <View style={{ flexDirection: "row", gap: 12, marginTop: theme.space(2) }}>
                <MiniStat icon="arrow-up" label="Entradas" value={BRL(summary.income)} />
                <MiniStat icon="arrow-down" label="Saídas" value={BRL(summary.expense)} />
              </View>
            </Card>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                navigation.navigate("Extrato");
              }}
              style={{ marginTop: theme.space(1.25) }}
            >
              <Card
                style={{
                  padding: theme.space(1.75),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.space(1.5),
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: theme.colors.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={{ fontWeight: "700", color: theme.colors.text, flex: 1 }}>
                  Ver extrato do mês
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                let activeWorkspace = workspaceId;
                if (!activeWorkspace) activeWorkspace = await refreshWorkspace();
                if (!activeWorkspace) {
                  showModal("Workspace", "Nenhum workspace encontrado.");
                  return;
                }

                const token = createInviteCode();
                const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                const { error } = await supabase.from("WorkspaceInvite").insert({
                  token,
                  workspaceId: activeWorkspace,
                  role: "EDITOR",
                  expiresAt,
                });

                if (error) {
                  showModal("Falha", error.message || "Erro ao criar convite");
                  return;
                }

                setInviteCode(token);
                showModal("Convite criado", "Copie e envie este código:\n\n" + token);
              }}
              style={{ marginTop: theme.space(1.25) }}
            >
              <Card
                style={{
                  padding: theme.space(1.75),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.space(1.5),
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: theme.colors.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person-add-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={{ fontWeight: "700", color: theme.colors.text, flex: 1 }}>
                  Convidar pessoa
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Extrato", {
                  focusCategory: topInsightCategory || null,
                })
              }
              style={{ marginTop: theme.space(1.25) }}
            >
              <Card
                style={{
                  padding: theme.space(1.75),
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space(1.5) }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: theme.colors.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="analytics-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={{ color: theme.colors.text, fontWeight: "700", flex: 1 }}>Análise mensal</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                </View>
                <Text style={{ color: theme.colors.muted, marginTop: 10 }}>{insightText}</Text>
              </Card>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <FeedbackModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        actionLabel={inviteCode ? "Copiar código" : undefined}
        onAction={
          inviteCode
            ? async () => {
                await Clipboard.setStringAsync(inviteCode);
                showModal("Copiado", "O código foi copiado para a área de transferência.");
                setInviteCode("");
                setTimeout(() => {
                  setModal((prev) => ({ ...prev, visible: false }));
                }, 600);
              }
            : undefined
        }
        onClose={() => {
          setInviteCode("");
          setModal((prev) => ({ ...prev, visible: false }));
        }}
      />
    </View>
  );
}

function MiniStat({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={16} color={theme.colors.success} />
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>{label}</Text>
      </View>
      <Text style={{ marginTop: 6, fontSize: 16, fontWeight: "800", color: theme.colors.text }}>
        {value}
      </Text>
    </View>
  );
}
