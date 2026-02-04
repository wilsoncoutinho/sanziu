import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function ChangePasswordScreen({ navigation }: any) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
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
      if (password.length < 6) return showModal("Erro", "Senha precisa ter pelo menos 6 caracteres");
      if (password !== password2) return showModal("Erro", "As senhas nao conferem");
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      showModal("Senha atualizada", "Sua senha foi alterada.");
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
        Alterar senha
      </Text>

      <View style={{ marginTop: theme.space(2.5) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Nova senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="minimo 6 caracteres"
          placeholderTextColor={theme.colors.muted}
          style={{ marginTop: theme.space(0.75), ...theme.input }}
        />
      </View>

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Confirmar senha</Text>
        <TextInput
          value={password2}
          onChangeText={setPassword2}
          secureTextEntry
          placeholder="repita a senha"
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
