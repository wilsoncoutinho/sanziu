import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from "react-native";
import { api } from "../lib/api";
import { theme } from "../ui/theme";
import { Money } from "../ui/typography";
import { Card } from "../ui/Card";
import { Ionicons } from "@expo/vector-icons";

type Account = { id: string; name: string; type: string };
type Category = { id: string; name: string; type: "EXPENSE" | "INCOME"; usageCount?: number };

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function NewTransactionScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [month] = useState(toYYYYMM(new Date()));

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("Aviso");

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const filteredCategories = useMemo(
    () =>
      categories
        .filter((c) => c.type === "EXPENSE")
        .slice()
        .sort((a, b) => {
          const diff = (b.usageCount ?? 0) - (a.usageCount ?? 0);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name);
        }),
    [categories]
  );

  const selectedCategory = useMemo(
    () => filteredCategories.find((c) => c.id === categoryId) || null,
    [filteredCategories, categoryId]
  );

  async function loadBase() {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        api("/api/accounts", { method: "GET" }),
        api(`/api/categories?month=${month}`, { method: "GET" }),
      ]);
      setAccounts(a.accounts || []);
      setCategories(c.categories || []);

      const firstAcc = (a.accounts || [])[0]?.id;
      if (firstAcc) setAccountId(firstAcc);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadBase);
    loadBase();
    return unsub;
  }, [navigation]);

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
  }, [type, categories]);

  useEffect(() => {
    if (!modalVisible) return;
    const t = setTimeout(() => {
      setModalVisible(false);
    }, 2000);
    return () => clearTimeout(t);
  }, [modalVisible]);

  async function save() {
    if (!accountId) return Alert.alert("Nenhuma conta disponível");
    if (type === "EXPENSE" && !categoryId) return Alert.alert("Selecione uma categoria");
    if (!amount) {
      setModalTitle("Atenção");
      setModalMessage("Digite um valor");
      setModalVisible(true);
      return;
    }

    try {
      await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          type,
          amount, // pode ser string, backend aceita
          date: new Date().toISOString().slice(0, 10),
          description: description || null,
          accountId,
          categoryId: type === "EXPENSE" ? categoryId : null,
        }),
      });

      setAmount("");
      setDescription("");
      setModalTitle("Salvo");
      setModalMessage("Lançamento registrado");
      setModalVisible(true);
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao salvar");
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: theme.space(2.5), backgroundColor: theme.colors.bg, position: "relative" }}>

      {/* Tipo */}
      <View style={{ flexDirection: "row", gap: theme.space(1.25), marginTop: theme.space(1.75) }}>
        <Pill active={type === "EXPENSE"} label="Despesa" onPress={() => setType("EXPENSE")} />
        <Pill active={type === "INCOME"} label="Receita" onPress={() => setType("INCOME")} />
      </View>

      {/* Valor grande */}
      <View style={{ marginTop: theme.space(1.75), backgroundColor: theme.colors.card, borderRadius: theme.radius.card, padding: theme.space(2), borderWidth: 1, borderColor: theme.colors.border }}>
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
        <View style={{ marginTop: theme.space(1.5), backgroundColor: theme.colors.card, borderRadius: theme.radius.card, padding: theme.space(2), borderWidth: 1, borderColor: theme.colors.border }}>
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

          <Text style={{ marginTop: theme.space(1.5), fontSize: 12, color: theme.colors.muted }}>Descrição (opcional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Mercado"
            placeholderTextColor={theme.colors.muted}
            style={{
              marginTop: theme.space(0.75),
              padding: theme.space(1.5),
              borderRadius: theme.radius.input,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
            }}
          />
        </View>
      )}

      {type === "INCOME" && (
        <View style={{ marginTop: theme.space(1.5), backgroundColor: theme.colors.card, borderRadius: theme.radius.card, padding: theme.space(2), borderWidth: 1, borderColor: theme.colors.border }}>
          <Text style={{ fontSize: 12, color: theme.colors.muted }}>Descrição (opcional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Salário"
            placeholderTextColor={theme.colors.muted}
            style={{
              marginTop: theme.space(0.75),
              padding: theme.space(1.5),
              borderRadius: theme.radius.input,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
            }}
          />
        </View>
      )}

      <TouchableOpacity
        onPress={save}
        style={{ marginTop: theme.space(1.75), backgroundColor: theme.colors.primary, padding: theme.space(2), borderRadius: theme.radius.input, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>Salvar</Text>
      </TouchableOpacity>

      {modalVisible ? (
        <View
          style={{
            marginTop: theme.space(1.5),
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "48%",
              alignSelf: "center",
              padding: theme.space(1.5),
              borderRadius: theme.radius.input,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800", color: "white" }}>{modalTitle}</Text>
          </View>
        </View>
      ) : null}

      <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
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
                      <Text style={{ color: theme.colors.text, fontWeight: active ? "800" : "600" }}>{c.name}</Text>
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
