import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { Ionicons } from "@expo/vector-icons";
import { useWorkspace } from "../contexts/WorkspaceContext";

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthRange(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map((v) => Number(v));
  const start = new Date(y, (m || 1) - 1, 1);
  const end = new Date(y, (m || 1), 1);
  return { start, end };
}

function toMonthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map((v) => Number(v));
  const date = new Date(y, (m || 1) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function shiftMonth(yyyyMm: string, delta: number) {
  const [y, m] = yyyyMm.split("-").map((v) => Number(v));
  const base = new Date(y, (m || 1) - 1, 1);
  base.setMonth(base.getMonth() + delta);
  return toYYYYMM(base);
}

function amountToNumber(v: any) {
  const s = typeof v === "string" ? v : v?.toString?.() ?? String(v ?? "0");
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function BRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function relationName(v: any) {
  if (Array.isArray(v)) return v[0]?.name ?? "";
  return v?.name ?? "";
}

function formatDatePtBr(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export default function StatementScreen({ navigation }: any) {
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const [month, setMonth] = useState(toYYYYMM(new Date()));

  const statementQuery = useQuery({
    queryKey: ["statement", workspaceId, month],
    enabled: Boolean(workspaceId),
    staleTime: 30000,
    queryFn: async () => {
      const { start, end } = monthRange(month);
      const { data, error } = await supabase
        .from("Transaction")
        .select("id, type, amount, date, description, category:Category(name), account:Account(name)")
        .eq("workspaceId", workspaceId as string)
        .gte("date", start.toISOString())
        .lt("date", end.toISOString())
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      statementQuery.refetch();
    });
    return unsub;
  }, [navigation, statementQuery]);

  if (workspaceLoading || statementQuery.isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const txs = statementQuery.data || [];

  return (
    <View style={{ flex: 1, padding: theme.space(2.5), backgroundColor: theme.colors.bg }}>
      <View
        style={{
          marginTop: theme.space(0.75),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => setMonth((m) => shiftMonth(m, -1))}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
        >
          <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>{toMonthLabel(month)}</Text>

        <TouchableOpacity
          onPress={() => setMonth((m) => shiftMonth(m, 1))}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="Proximo mês"
        >
          <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        style={{ marginTop: theme.space(1.75) }}
        data={txs}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: theme.space(1.25) }} />}
        renderItem={({ item }) => {
          const v = amountToNumber(item.amount);
          const isExpense = item.type === "EXPENSE";
          const title = relationName(item.category) || (isExpense ? "Despesa" : "Receita");
          return (
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.card,
                padding: theme.space(1.75),
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text style={{ fontWeight: "800", color: theme.colors.text }}>
                {title} {item.description ? `- ${item.description}` : ""}
              </Text>
              <Text style={{ marginTop: theme.space(0.75), color: theme.colors.muted }}>
                {formatDatePtBr(String(item.date))} - {relationName(item.account)}
              </Text>
              <Text
                style={{ marginTop: theme.space(1.25), fontSize: 18, fontWeight: "900", color: theme.colors.text }}
              >
                {isExpense ? "-" : "+"}
                {BRL(v)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{ marginTop: theme.space(1.75), color: theme.colors.muted }}>Sem lançamentos.</Text>
        }
      />
    </View>
  );
}
