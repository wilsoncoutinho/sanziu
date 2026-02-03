import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as Linking from "expo-linking";
import { api } from "../lib/api";
import { theme } from "../ui/theme";
import { Card } from "../ui/Card";
import { H1, Muted, Money } from "../ui/typography";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";


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
    <View style={{ flex: 1, padding: theme.space(2.5), backgroundColor: theme.colors.bg }}>
      <Text style={H1}>Resumo do mês</Text>
      <Text style={[Muted, { marginTop: 6 }]}>{month}</Text>

      {loading ? (
        <View style={{ marginTop: theme.space(2.5) }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <>
          <Card style={{ marginTop: theme.space(2) }}>
            <Text style={Muted}>Saldo do mês</Text>
            <Text style={[Money, { marginTop: 6 }]}>{BRL(summary.net)}</Text>

            <View style={{ flexDirection: "row", gap: 12, marginTop: theme.space(2) }}>
              <MiniStat icon="arrow-up" label="Entradas" value={BRL(summary.income)} />
              <MiniStat icon="arrow-down" label="Saídas" value={BRL(summary.expense)} />
            </View>
          </Card>

          <TouchableOpacity
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("Extrato");
            }}
            style={{ marginTop: theme.space(1.25) }}
          >
            <Card style={{ padding: theme.space(1.75), flexDirection: "row", alignItems: "center", gap: theme.space(1.5) }}>
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
              <Text style={{ fontWeight: "700", color: theme.colors.text, flex: 1 }}>Ver extrato do mês</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const data = await api("/api/invites", { method: "POST" });
              const inviteLink = Linking.createURL(`invite/${data.token}`);
              Alert.alert("Convite criado", "Envie este link para sua esposa:\n\n" + inviteLink);
            }}
            style={{ marginTop: theme.space(1.25) }}
          >
            <Card style={{ padding: theme.space(1.75), flexDirection: "row", alignItems: "center", gap: theme.space(1.5) }}>
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
              <Text style={{ fontWeight: "700", color: theme.colors.text, flex: 1 }}>Convidar esposa</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Card>
          </TouchableOpacity>
        </>
      )}
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
      <Text style={{ marginTop: 6, fontSize: 16, fontWeight: "800", color: theme.colors.text }}>{value}</Text>
    </View>
  );
}
