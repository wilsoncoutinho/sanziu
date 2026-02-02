import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { api } from "../lib/api";

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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
  const [month] = useState(toYYYYMM(new Date()));
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
  }, [navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#F6F7F9" }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Extrato</Text>
      <Text style={{ marginTop: 6, opacity: 0.65 }}>{month}</Text>

      <FlatList
        style={{ marginTop: 14 }}
        data={txs}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const v = amountToNumber(item.amount);
          const isExpense = item.type === "EXPENSE";
          return (
            <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#E7E7E7" }}>
              <Text style={{ fontWeight: "800" }}>
                {item.category?.name} {item.description ? `— ${item.description}` : ""}
              </Text>
              <Text style={{ marginTop: 6, opacity: 0.7 }}>
                {String(item.date).slice(0, 10)} • {item.account?.name}
              </Text>
              <Text style={{ marginTop: 10, fontSize: 18, fontWeight: "900" }}>
                {isExpense ? "-" : "+"}{BRL(v)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ marginTop: 14, opacity: 0.7 }}>Sem lançamentos.</Text>}
      />
    </View>
  );
}

