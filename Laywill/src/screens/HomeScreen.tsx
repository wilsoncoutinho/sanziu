import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { Card } from "../ui/Card";
import { H1, Muted, Money } from "../ui/typography";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { FeedbackModal } from "../ui/FeedbackModal";
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
  return date.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
}

function createInviteCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      summaryQuery.refetch();
    });
    return unsub;
  }, [navigation, summaryQuery]);

  const summary = summaryQuery.data || { income: 0, expense: 0, net: 0 };

  useEffect(() => {
    if (!summaryQuery.error) return;
    const e = summaryQuery.error as any;
    showModal("Falha", e?.message || "Erro");
  }, [summaryQuery.error]);

  const netLabel = useMemo(
    () => (summary.net >= 0 ? "Saldo positivo" : "Saldo negativo"),
    [summary.net]
  );

  return (
    <View style={{ flex: 1, padding: theme.space(2.5), backgroundColor: theme.colors.bg }}>
      <Text style={H1}>Resumo do mês</Text>
      <Text style={[Muted, { marginTop: 6 }]}>{monthLabel(month)}</Text>
      <Text style={[Muted, { marginTop: 4 }]}>{netLabel}</Text>

      {workspaceLoading || summaryQuery.isPending ? (
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
              <MiniStat icon="arrow-down" label="Saidas" value={BRL(summary.expense)} />
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
              if (!activeWorkspace) {
                activeWorkspace = await refreshWorkspace();
              }
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
              showModal("Convite criado", "Copie e envie este codigo:\n\n" + token);
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
        actionLabel={inviteCode ? "Copiar codigo" : undefined}
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
