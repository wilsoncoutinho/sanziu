import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../lib/api";

type Account = { id: string; name: string; type: string };
type Category = { id: string; name: string; type: "EXPENSE" | "INCOME" };

export default function NewTransactionScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  async function loadBase() {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        api("/api/accounts", { method: "GET" }),
        api("/api/categories", { method: "GET" }),
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
    if (!filteredCategories.length) {
      setCategoryId("");
    } else if (!filteredCategories.find((x) => x.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [type, categories]);

  async function save() {
    if (!accountId) return Alert.alert("Nenhuma conta disponível");
    if (!categoryId) return Alert.alert("Selecione uma categoria");
    if (!amount) return Alert.alert("Digite um valor");

    try {
      await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          type,
          amount, // pode ser string, backend aceita
          date: new Date().toISOString().slice(0, 10),
          description: description || null,
          accountId,
          categoryId,
        }),
      });

      setAmount("");
      setDescription("");
      Alert.alert("Salvo ✅", "Lançamento registrado.");
      navigation.navigate("Home");
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao salvar");
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#F6F7F9" }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Lançar</Text>

      {/* Tipo */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <Pill active={type === "EXPENSE"} label="Despesa" onPress={() => setType("EXPENSE")} />
        <Pill active={type === "INCOME"} label="Receita" onPress={() => setType("INCOME")} />
      </View>

      {/* Valor grande */}
      <View style={{ marginTop: 14, backgroundColor: "white", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#E7E7E7" }}>
        <Text style={{ fontSize: 12, opacity: 0.65 }}>Valor</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="Ex: 57,90"
          style={{ marginTop: 8, fontSize: 28, fontWeight: "800" }}
        />
      </View>

      {/* Categoria */}
      <View style={{ marginTop: 12, backgroundColor: "white", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#E7E7E7" }}>
        <Text style={{ fontSize: 12, opacity: 0.65 }}>Categoria</Text>
        <View style={{ marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: "#E7E7E7", overflow: "hidden" }}>
          <Picker selectedValue={categoryId} onValueChange={(v) => setCategoryId(String(v))}>
            {filteredCategories.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id} />
            ))}
          </Picker>
        </View>

        <Text style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>Descrição (opcional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Mercado"
          style={{ marginTop: 6, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E7E7E7" }}
        />
      </View>

      <TouchableOpacity
        onPress={save}
        style={{ marginTop: 14, backgroundColor: "#111827", padding: 16, borderRadius: 16, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 999,
        alignItems: "center",
        borderWidth: 1,
        borderColor: active ? "#111827" : "#E7E7E7",
        backgroundColor: active ? "#111827" : "white",
      }}
    >
      <Text style={{ fontWeight: "800", color: active ? "white" : "#111827" }}>{label}</Text>
    </TouchableOpacity>
  );
}

