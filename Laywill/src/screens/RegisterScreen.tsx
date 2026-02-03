import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../lib/api";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string; onClose?: () => void }>({
    visible: false,
    title: "",
    message: "",
  });

  function showModal(title: string, message?: string, onClose?: () => void) {
    setModal({ visible: true, title, message, onClose });
  }

  function closeModal() {
    const callback = modal.onClose;
    setModal((prev) => ({ ...prev, visible: false, onClose: undefined }));
    callback?.();
  }

  async function handleRegister() {
    try {
      if (!name.trim()) return showModal("Erro", "Digite seu nome");
      if (!email.trim()) return showModal("Erro", "Digite seu email");
      if (password.length < 6) return showModal("Erro", "Senha precisa ter pelo menos 6 caracteres");
      if (password !== password2) return showModal("Erro", "As senhas não conferem");

      const payload = { name: name.trim(), email: email.trim().toLowerCase(), password };

      // cria a conta
      await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showModal("Conta criada ✅", "Enviamos um codigo de confirmacao.", () =>
        navigation.navigate("VerifyEmail", { email: payload.email, password })
      );
    } catch (e: any) {
      showModal("Falha ao criar conta", e?.message || "Erro");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: theme.space(2.5), justifyContent: "center", backgroundColor: theme.colors.bg }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color: theme.colors.text }}>Criar conta</Text>
      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>
        Para acessar as finanças do casal
      </Text>

      <View style={{ marginTop: theme.space(2.5) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Maria"
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

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="mínimo 6 caracteres"
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
        onPress={handleRegister}
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
        }}
      >
        <Text style={{ fontWeight: "800", color: "white" }}>Criar conta</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: theme.space(1.5), alignItems: "center" }}>
        <Text style={{ color: theme.colors.text, opacity: 0.85 }}>Já tenho conta</Text>
      </TouchableOpacity>
      <FeedbackModal visible={modal.visible} title={modal.title} message={modal.message} onClose={closeModal} />
    </SafeAreaView>
  );
}
