import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function AccountScreen({ navigation }: any) {
  const [name, setName] = useState<string>("-");
  const [email, setEmail] = useState<string>("-");
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

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) throw error;
        const user = data.user;
        const fullName = (user?.user_metadata as any)?.full_name || "";
        setName(fullName || "Sem nome");
        setEmail(user?.email || "Sem email");
      })
      .catch((e) => showModal("Erro", e?.message || "Falha ao carregar"));
  }, []);

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
        Conta
      </Text>
      <View style={{ marginTop: theme.space(2) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Nome</Text>
        <Text style={{ marginTop: 6, color: theme.colors.text, fontWeight: "700" }}>{name}</Text>
      </View>
      <View style={{ marginTop: theme.space(2) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Email</Text>
        <Text style={{ marginTop: 6, color: theme.colors.text, fontWeight: "700" }}>{email}</Text>
      </View>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: theme.space(3), alignItems: "center" }}
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
