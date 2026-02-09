import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";
import { Card } from "../ui/Card";

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
        backgroundColor: theme.colors.bg,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800", color: theme.colors.text }}>Minha conta</Text>

      <Card style={{ marginTop: theme.space(2), padding: theme.space(2) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space(1.25) }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: theme.colors.bg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="person" size={20} color={theme.colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: theme.colors.muted }}>Nome</Text>
            <Text style={{ marginTop: 4, color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>{name}</Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: theme.space(1.25), padding: theme.space(2) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Email</Text>
        <Text style={{ marginTop: 6, color: theme.colors.text, fontWeight: "700" }}>{email}</Text>
      </Card>

      <TouchableOpacity onPress={() => navigation.navigate("ChangeName")} style={{ marginTop: theme.space(1.25) }}>
        <Card
          style={{
            padding: theme.space(1.75),
            flexDirection: "row",
            alignItems: "center",
            gap: theme.space(1.25),
          }}
        >
          <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.text, fontWeight: "700", flex: 1 }}>Alterar nome</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Card>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("ChangePassword")}
        style={{ marginTop: theme.space(1.25) }}
      >
        <Card
          style={{
            padding: theme.space(1.75),
            flexDirection: "row",
            alignItems: "center",
            gap: theme.space(1.25),
          }}
        >
          <Ionicons name="key-outline" size={18} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.text, fontWeight: "700", flex: 1 }}>Alterar senha</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Card>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: theme.space(2.5), alignItems: "center" }}
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
