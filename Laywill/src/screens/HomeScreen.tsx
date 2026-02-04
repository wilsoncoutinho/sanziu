import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabase";
import { getCurrentWorkspaceId } from "../lib/supabaseHelpers";
import { theme } from "../ui/theme";
import { Card } from "../ui/Card";
import { H1, Muted, Money } from "../ui/typography";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { FeedbackModal } from "../ui/FeedbackModal";

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

function amountToNumber(v: any) {
  const s = typeof v === "string" ? v : v?.toString?.() ?? String(v ?? "0");
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function BRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function createInviteCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function HomeScreen({ navigation }: any) {
  const [month] = useState(toYYYYMM(new Date()));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ income: number; expense: number; net: number }>(
    {
      income: 0,
      expense: 0,
      net: 0,
    }
  );
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>(
    {
      visible: false,
      title: "",
      message: "",
    }
  );
  const [inviteCode, setInviteCode] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  async function load() {
    setLoading(true);
    try {
      const ws = await getCurrentWorkspaceId();
      setWorkspaceId(ws);
      if (!ws) {
        setSummary({ income: 0, expense: 0, net: 0 });
        return;
      }

      const { start, end } = monthRange(month);
      const { data, error } = await supabase
        .from("Transaction")
        .select("type, amount")
        .eq("workspaceId", ws)
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

      setSummary({ income, expense, net: income - expense });
    } catch (e: any) {
      showModal("Falha", e?.message || "Erro");
      setSummary({ income: 0, expense: 0, net: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation]);

  const netLabel = useMemo(
    () => (summary.net >= 0 ? "Saldo positivo" : "Saldo negativo"),
    [summary.net]
  );

  return (
    <View style={{ flex: 1, padding: theme.space(2.5), backgroundColor: theme.colors.bg }}>
      <Text style={H1}>Resumo do mês</Text>
      <Text style={[Muted, { marginTop: 6 }]}>{month}</Text>
      <Text style={[Muted, { marginTop: 4 }]}>{netLabel}</Text>

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
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!workspaceId) {
                showModal("Workspace", "Nenhum workspace encontrado.");
                return;
              }

              const token = createInviteCode();
              const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
              const { error } = await supabase
                .from("WorkspaceInvite")
                .insert({
                  token,
                  workspaceId,
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
                Convidar esposa
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Card>
          </TouchableOpacity>
        </>
      )}
      <FeedbackModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        actionLabel={inviteCode ? "Copiar código" : undefined}
        onAction={
          inviteCode
            ? async () => {
                await Clipboard.setStringAsync(inviteCode);
                showModal("Copiado", "O codigo foi copiado para a area de transferencia.");
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
