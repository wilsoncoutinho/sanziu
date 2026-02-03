import React, { useState } from "react";
import { SafeAreaView, Text, View, TextInput, TouchableOpacity } from "react-native";
import { theme } from "../ui/theme";
import { useAuth } from "../contexts/AuthContext";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
    message: "",
  });

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      showModal("Erro", e?.message || "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: theme.space(2.5), justifyContent: "center", backgroundColor: theme.colors.bg }}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: theme.colors.text }}>Entrar</Text>
      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>Acesse as finanças do casal</Text>

      <View style={{ marginTop: theme.space(2.5) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
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
        onPress={handleLogin}
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text style={{ fontWeight: "700", color: "white" }}>{loading ? "Entrando..." : "Entrar"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={{ marginTop: theme.space(1.5), alignItems: "center" }}>
        <Text style={{ color: theme.colors.text, opacity: 0.85 }}>Criar conta</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={{ marginTop: theme.space(1), alignItems: "center" }}>
        <Text style={{ color: theme.colors.text, opacity: 0.85 }}>Esqueci a senha</Text>
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
