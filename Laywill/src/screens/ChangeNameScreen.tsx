import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function ChangeNameScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>(
    {
      visible: false,
      title: "",
      message: "",
    }
  );

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  async function handleSave() {
    try {
      if (!name.trim()) return showModal("Erro", "Digite seu nome");
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      });
      if (error) throw error;
      showModal("Nome atualizado", "Seu nome foi alterado.");
    } catch (e: any) {
      showModal("Falha", e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        padding: theme.space(2.5),
        justifyContent: "center",
        backgroundColor: theme.colors.bg,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800", color: theme.colors.text }}>
        Alterar nome
      </Text>

      <View style={{ marginTop: theme.space(2.5) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          placeholderTextColor={theme.colors.muted}
          style={{ marginTop: theme.space(0.75), ...theme.input }}
        />
      </View>

      <TouchableOpacity
        onPress={handleSave}
        disabled={loading}
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ fontWeight: "800", color: "white" }}>
          {loading ? "Salvando..." : "Salvar"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: theme.space(1.5), alignItems: "center" }}
      >
        <Text style={{ color: theme.colors.text, opacity: 0.85 }}>Voltar</Text>
      </TouchableOpacity>

      <FeedbackModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}
