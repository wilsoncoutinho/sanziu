import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as Linking from "expo-linking";
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

export default function HomeScreen({ navigation }: any) {
  const [month] = useState(toYYYYMM(new Date()));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ income: number; expense: number; net: number }>({
    income: 0,
    expense: 0,
    net: 0,
  });

  async function load() {
    setLoading(true);
    try {
      const data = await api(`/api/transactions?month=${month}`, { method: "GET" });
      setSummary({
        income: amountToNumber(data.summary?.income),
        expense: amountToNumber(data.summary?.expense),
        net: amountToNumber(data.summary?.net),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation]);

  const netLabel = useMemo(() => (summary.net >= 0 ? "Saldo positivo" : "Saldo negativo"), [summary.net]);

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#F6F7F9" }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Resumo do mês</Text>
      <Text style={{ marginTop: 6, opacity: 0.65 }}>{month}</Text>

      {loading ? (
        <View style={{ marginTop: 20 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {/* Card principal */}
          <View
            style={{
              marginTop: 16,
              backgroundColor: "white",
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E7E7E7",
            }}
          >
            <Text style={{ fontSize: 12, opacity: 0.65 }}>{netLabel}</Text>
            <Text style={{ marginTop: 6, fontSize: 28, fontWeight: "800" }}>{BRL(summary.net)}</Text>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
              <MiniStat label="Entradas" value={BRL(summary.income)} />
              <MiniStat label="Saídas" value={BRL(summary.expense)} />
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("Extrato")}
            style={{
              marginTop: 10,
              backgroundColor: "white",
              padding: 14,
              borderRadius: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#E7E7E7",
            }}
          >
            <Text style={{ fontWeight: "700" }}>Ver extrato do mês</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              const data = await api("/api/invites", { method: "POST" });
              const inviteLink = Linking.createURL(`invite/${data.token}`);
              Alert.alert(
                "Convite criado",
                "Envie este link para sua esposa:\n\n" + inviteLink
              );
            }}
            style={{
              marginTop: 10,
              backgroundColor: "white",
              padding: 14,
              borderRadius: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#E7E7E7",
            }}
          >
            <Text style={{ fontWeight: "700" }}>Convidar esposa</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F6F7F9",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <Text style={{ fontSize: 12, opacity: 0.65 }}>{label}</Text>
      <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

