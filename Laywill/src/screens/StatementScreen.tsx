import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { useWorkspace } from "../contexts/WorkspaceContext";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthRange(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map((v) => Number(v));
  const start = new Date(y, (m || 1) - 1, 1);
  const end = new Date(y, m || 1, 1);
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

function visibleAccountName(v: any) {
  const name = relationName(v);
  if (!name) return "";
  return name.trim().toLowerCase() === "carteira" ? "" : name;
}

function formatDatePtBr(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export default function StatementScreen({ navigation, route }: any) {
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const [month, setMonth] = useState(toYYYYMM(new Date()));
  const [focusCategory, setFocusCategory] = useState<string | null>(route?.params?.focusCategory ?? null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    setFocusCategory(route?.params?.focusCategory ?? null);
  }, [route?.params?.focusCategory]);

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

  const txs = statementQuery.data || [];
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of txs as any[]) {
      const name = relationName((t as any).category);
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [txs]);

  const filteredTxs = useMemo(() => {
    if (!focusCategory) return txs;
    return txs.filter((item: any) => relationName(item.category) === focusCategory);
  }, [txs, focusCategory]);

  const filteredTotal = useMemo(() => {
    return filteredTxs.reduce((acc: number, item: any) => {
      const value = amountToNumber(item.amount);
      return item.type === "INCOME" ? acc + value : acc - value;
    }, 0);
  }, [filteredTxs]);

  if (workspaceLoading || statementQuery.isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

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
          accessibilityLabel="Próximo mês"
        >
          <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setCategoryModalVisible(true)}
        style={{
          marginTop: theme.space(1.25),
          backgroundColor: "rgba(124,58,237,0.18)",
          borderRadius: theme.radius.input,
          borderWidth: 1,
          borderColor: "rgba(124,58,237,0.45)",
          padding: theme.space(1.5),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space(0.75) }}>
          <Ionicons name="funnel-outline" size={16} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            Categoria: {focusCategory || "Todas"}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={theme.colors.text} />
      </TouchableOpacity>

      {focusCategory ? (
        <View
          style={{
            marginTop: theme.space(1),
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.space(1.5),
          }}
        >
          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Soma total (filtro atual)</Text>
          <Text
            style={{
              marginTop: theme.space(0.5),
              color: theme.colors.text,
              fontSize: 22,
              fontWeight: "900",
            }}
          >
            {filteredTotal >= 0 ? "+" : "-"}
            {BRL(Math.abs(filteredTotal))}
          </Text>
        </View>
      ) : null}

      <FlatList
        style={{ marginTop: theme.space(1.5) }}
        data={filteredTxs}
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
                {formatDatePtBr(String(item.date))}
                {visibleAccountName(item.account) ? ` - ${visibleAccountName(item.account)}` : ""}
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

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <TouchableOpacity
            onPress={() => setCategoryModalVisible(false)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingHorizontal: theme.space(2),
              paddingTop: theme.space(1.5),
              paddingBottom: theme.space(3),
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 44, height: 4, borderRadius: 999, backgroundColor: theme.colors.border }} />
            </View>
            <ScrollView style={{ marginTop: theme.space(1.25), maxHeight: 320 }}>
              {["__ALL__", ...categoryOptions].map((opt) => {
                const label = opt === "__ALL__" ? "Todas" : opt;
                const active = (opt === "__ALL__" && !focusCategory) || label === focusCategory;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      const next = opt === "__ALL__" ? null : label;
                      setFocusCategory(next);
                      navigation.setParams({ focusCategory: next || undefined });
                      setCategoryModalVisible(false);
                    }}
                    style={{
                      paddingVertical: theme.space(1.5),
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: active ? "800" : "600" }}>{label}</Text>
                    {active ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
