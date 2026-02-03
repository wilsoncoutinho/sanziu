import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity } from "react-native";
import { api } from "../lib/api";
import { theme } from "../ui/theme";
import { Ionicons } from "@expo/vector-icons";

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

export default function StatementScreen({ navigation }: any) {
  const [month, setMonth] = useState(toYYYYMM(new Date()));
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      const data = await api(`/api/transactions?month=${month}`, { method: "GET" });
      setTxs(data.transactions || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation, month]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: theme.space(2.5), backgroundColor: theme.colors.bg }}>
      <View style={{ marginTop: theme.space(0.75), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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
          accessibilityLabel="Próximo mês"
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
          const title = item.category?.name ?? (isExpense ? "Despesa" : "Receita");
          return (
            <View style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius.card, padding: theme.space(1.75), borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontWeight: "800", color: theme.colors.text }}>
                {title} {item.description ? `— ${item.description}` : ""}
              </Text>
              <Text style={{ marginTop: theme.space(0.75), color: theme.colors.muted }}>
                {String(item.date).slice(0, 10)} • {item.account?.name}
              </Text>
              <Text style={{ marginTop: theme.space(1.25), fontSize: 18, fontWeight: "900", color: theme.colors.text }}>
                {isExpense ? "-" : "+"}{BRL(v)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ marginTop: theme.space(1.75), color: theme.colors.muted }}>Sem lançamentos.</Text>}
      />
    </View>
  );
}

