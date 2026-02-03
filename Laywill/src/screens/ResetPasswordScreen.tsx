import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../lib/api";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function ResetPasswordScreen({ navigation, route }: any) {
  const [token, setToken] = useState(route?.params?.token || "");
  const [showTokenInput, setShowTokenInput] = useState(!route?.params?.token);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
    message: "",
  });

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  async function handleReset() {
    try {
      if (!token.trim()) return showModal("Erro", "Token obrigatorio");
      if (password.length < 6) return showModal("Erro", "Senha precisa ter pelo menos 6 caracteres");
      if (password !== password2) return showModal("Erro", "As senhas nao conferem");

      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: token.trim(), password }),
      });

      showModal("Senha alterada", "Agora voce pode fazer login.");
      navigation.goBack();
    } catch (e: any) {
      showModal("Falha", e?.message || "Erro");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: theme.space(2.5), justifyContent: "center", backgroundColor: theme.colors.bg }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color: theme.colors.text }}>Nova senha</Text>
      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>
        Crie uma nova senha para sua conta
      </Text>

      {showTokenInput ? (
        <View style={{ marginTop: theme.space(2.5) }}>
          <Text style={{ fontSize: 12, color: theme.colors.muted }}>Token</Text>
          <TextInput
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            placeholder="Cole o token aqui"
            placeholderTextColor={theme.colors.muted}
            style={{
              marginTop: theme.space(0.75),
              padding: theme.space(1.75),
              borderRadius: theme.radius.input,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
            }}
          />
        </View>
      ) : (
        <View style={{ marginTop: theme.space(2.5) }}>
          <Text style={{ color: theme.colors.muted }}>Token recebido pelo link.</Text>
          <TouchableOpacity
            onPress={() => setShowTokenInput(true)}
            style={{ marginTop: theme.space(0.75) }}
          >
            <Text style={{ color: theme.colors.text, opacity: 0.85 }}>Usar outro token</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Nova senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="minimo 6 caracteres"
          placeholderTextColor={theme.colors.muted}
          style={{
            marginTop: theme.space(0.75),
            padding: theme.space(1.75),
            borderRadius: theme.radius.input,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
            color: theme.colors.text,
          }}
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
          style={{
            marginTop: theme.space(0.75),
            padding: theme.space(1.75),
            borderRadius: theme.radius.input,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
            color: theme.colors.text,
          }}
        />
      </View>

      <TouchableOpacity
        onPress={handleReset}
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
        }}
      >
        <Text style={{ fontWeight: "800", color: "white" }}>Salvar nova senha</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: theme.space(1.5), alignItems: "center" }}>
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
