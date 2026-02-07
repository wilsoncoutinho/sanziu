import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { Money } from "../ui/typography";
import { Card } from "../ui/Card";
import { Ionicons } from "@expo/vector-icons";
import { useWorkspace } from "../contexts/WorkspaceContext";

type Account = { id: string; name: string; type: string };
type Category = { id: string; name: string; type: "EXPENSE" | "INCOME" };

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

export default function NewTransactionScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const [month] = useState(toYYYYMM(new Date()));

  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saveNotice, setSaveNotice] = useState<{ visible: boolean; title: string }>({
    visible: false,
    title: "",
  });
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const accountsQuery = useQuery({
    queryKey: ["accounts", workspaceId],
    enabled: Boolean(workspaceId),
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Account")
        .select("id, name, type")
        .eq("workspaceId", workspaceId as string);
      if (error) throw error;
      return (data || []) as Account[];
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", workspaceId],
    enabled: Boolean(workspaceId),
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Category")
        .select("id, name, type")
        .eq("workspaceId", workspaceId as string);
      if (error) throw error;
      return (data || []) as Category[];
    },
  });

  const usageQuery = useQuery({
    queryKey: ["categoryUsage", workspaceId, month],
    enabled: Boolean(workspaceId),
    staleTime: 60000,
    queryFn: async () => {
      const { start, end } = monthRange(month);
      const usageRes = await supabase
        .from("Transaction")
        .select("categoryId")
        .eq("workspaceId", workspaceId as string)
        .gte("date", start.toISOString())
        .lt("date", end.toISOString())
        .not("categoryId", "is", null);
      if (usageRes.error) throw usageRes.error;

      const usageMap = new Map<string, number>();
      for (const t of usageRes.data || []) {
        const id = (t as any).categoryId as string | null;
        if (!id) continue;
        usageMap.set(id, (usageMap.get(id) || 0) + 1);
      }
      return usageMap;
    },
  });

  const categoriesWithUsage = useMemo(() => {
    const list = categoriesQuery.data || [];
    const usage = usageQuery.data;
    return list.map((cat) => ({
      ...cat,
      usageCount: usage?.get(cat.id) || 0,
    }));
  }, [categoriesQuery.data, usageQuery.data]);

  const filteredCategories = useMemo(
    () =>
      categoriesWithUsage
        .filter((c) => c.type === "EXPENSE")
        .slice()
        .sort((a, b) => {
          const diff = (b.usageCount ?? 0) - (a.usageCount ?? 0);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name);
        }),
    [categoriesWithUsage]
  );

  const selectedCategory = useMemo(
    () => filteredCategories.find((c) => c.id === categoryId) || null,
    [filteredCategories, categoryId]
  );

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      accountsQuery.refetch();
      categoriesQuery.refetch();
      usageQuery.refetch();
    });
    return unsub;
  }, [navigation, accountsQuery, categoriesQuery, usageQuery]);

  useEffect(() => {
    const firstAcc = accountsQuery.data?.[0]?.id;
    if (firstAcc) setAccountId((prev) => prev || firstAcc);
  }, [accountsQuery.data]);

  useEffect(() => {
    if (type === "INCOME") {
      setCategoryId("");
      return;
    }
    if (!filteredCategories.length) {
      setCategoryId("");
    } else if (!filteredCategories.find((x) => x.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [type, filteredCategories, categoryId]);

  function showSaveNotice(title: string) {
    setSaveNotice({ visible: true, title });
  }

  useEffect(() => {
    if (!saveNotice.visible) return;
    const t = setTimeout(() => {
      setSaveNotice((prev) => ({ ...prev, visible: false }));
    }, 2000);
    return () => clearTimeout(t);
  }, [saveNotice.visible]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      type: "EXPENSE" | "INCOME";
      amount: number;
      description: string | null;
      accountId: string;
      categoryId: string | null;
      workspaceId: string;
    }) => {
      const { error } = await supabase.from("Transaction").insert({
        ...payload,
        date: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setAmount("");
      setDescription("");
      showSaveNotice("Registrado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["homeSummary", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["statement", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["categoryUsage", workspaceId] }),
      ]);
    },
    onError: (e: any) => {
      console.log("[transaction.save]", e?.message || e);
      showSaveNotice("Erro ao salvar");
    },
  });

  async function save() {
    if (!workspaceId) return showSaveNotice("Sem workspace");
    if (!accountId) return showSaveNotice("Nenhuma conta");
    if (type === "EXPENSE" && !categoryId) return showSaveNotice("Sem categoria");
    if (!amount) return showSaveNotice("Digite um valor");

    const parsedAmount = amountToNumber(amount);
    if (!parsedAmount) return showSaveNotice("Valor invalido");

    saveMutation.mutate({
      type,
      amount: parsedAmount,
      description: description || null,
      accountId,
      categoryId: type === "EXPENSE" ? categoryId : null,
      workspaceId,
    });
  }

  const loading =
    workspaceLoading || accountsQuery.isPending || categoriesQuery.isPending || usageQuery.isPending;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: theme.space(2.5), backgroundColor: theme.colors.bg, position: "relative" }}>
      <View style={{ flexDirection: "row", gap: theme.space(1.25), marginTop: theme.space(1.75) }}>
        <Pill active={type === "EXPENSE"} label="Despesa" onPress={() => setType("EXPENSE")} />
        <Pill active={type === "INCOME"} label="Receita" onPress={() => setType("INCOME")} />
      </View>

      <View
        style={{
          marginTop: theme.space(1.75),
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.card,
          padding: theme.space(2),
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Valor</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="Ex: 57,90"
          placeholderTextColor={theme.colors.muted}
          style={{ marginTop: theme.space(1), ...Money }}
        />
      </View>

      {type === "EXPENSE" && (
        <View
          style={{
            marginTop: theme.space(1.5),
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.card,
            padding: theme.space(2),
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.colors.muted }}>Categoria</Text>
          <TouchableOpacity
            onPress={() => setCategoryModalVisible(true)}
            style={{
              marginTop: theme.space(0.75),
              borderRadius: theme.radius.input,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              padding: theme.space(1.5),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: theme.colors.text }}>
              {selectedCategory ? selectedCategory.name : "Selecione"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
          </TouchableOpacity>

          <Text style={{ marginTop: theme.space(1.5), fontSize: 12, color: theme.colors.muted }}>
            Descricao (opcional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Mercado"
            placeholderTextColor={theme.colors.muted}
            style={{ marginTop: theme.space(0.75), ...theme.input }}
          />
        </View>
      )}

      {type === "INCOME" && (
        <View
          style={{
            marginTop: theme.space(1.5),
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.card,
            padding: theme.space(2),
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.colors.muted }}>Descricao (opcional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Salario"
            placeholderTextColor={theme.colors.muted}
            style={{ marginTop: theme.space(0.75), ...theme.input }}
          />
        </View>
      )}

      <TouchableOpacity
        onPress={save}
        disabled={saveMutation.isPending}
        style={{
          marginTop: theme.space(1.75),
          backgroundColor: theme.colors.primary,
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          opacity: saveMutation.isPending ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>
          {saveMutation.isPending ? "Salvando..." : "Salvar"}
        </Text>
      </TouchableOpacity>

      {saveNotice.visible ? (
        <View style={{ marginTop: theme.space(1.25), alignItems: "center" }}>
          <View
            style={{
              width: "48%",
              padding: theme.space(1.5),
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text style={{ fontWeight: "800", color: "white" }}>{saveNotice.title}</Text>
          </View>
        </View>
      ) : null}

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
          <Card style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: theme.space(3) }}>
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 44, height: 4, borderRadius: 999, backgroundColor: theme.colors.border }} />
            </View>
            <ScrollView style={{ marginTop: theme.space(1.5), maxHeight: 320 }}>
              {filteredCategories.map((c) => {
                const active = c.id === categoryId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      setCategoryId(c.id);
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
                    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space(1) }}>
                      <Text style={{ color: theme.colors.text, fontWeight: active ? "800" : "600" }}>
                        {c.name}
                      </Text>
                      {(c.usageCount ?? 0) > 0 ? (
                        <View
                          style={{
                            paddingHorizontal: theme.space(1),
                            paddingVertical: theme.space(0.25),
                            borderRadius: theme.radius.pill,
                            backgroundColor: "rgba(255,255,255,0.06)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          <Text style={{ fontSize: 11, color: theme.colors.muted }}>
                            {c.usageCount === 1 ? "1x" : `${c.usageCount}x`}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {active ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        padding: theme.space(1.5),
        borderRadius: theme.radius.pill,
        alignItems: "center",
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
        backgroundColor: active ? theme.colors.primary : theme.colors.card,
      }}
    >
      <Text style={{ fontWeight: "800", color: active ? "white" : theme.colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

