import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../lib/api";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
    message: "",
  });

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  async function handleSend() {
    try {
      if (!email.trim()) return showModal("Erro", "Digite seu email");
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      showModal("Email enviado", "Verifique sua caixa de entrada.");
    } catch (e: any) {
      const msg = e?.message || "Erro";
      if (String(msg).includes("503")) {
        showModal("Serviço indisponível", "Configuração de email pendente. Tente novamente mais tarde.");
        return;
      }
      showModal("Falha", msg);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: theme.space(2.5), justifyContent: "center", backgroundColor: theme.colors.bg }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color: theme.colors.text }}>Esqueci a senha</Text>
      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>
        Enviaremos um link para redefinir sua senha
      </Text>

      <View style={{ marginTop: theme.space(2.5) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email@exemplo.com"
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
        onPress={handleSend}
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
        }}
      >
        <Text style={{ fontWeight: "800", color: "white" }}>Enviar link</Text>
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
