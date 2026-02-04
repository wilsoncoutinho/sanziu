import React, { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../ui/theme";
import { supabase } from "../lib/supabase";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    setLoading(true);

    // LOGIN DIRETO PELO SUPABASE
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Erro ao entrar", error.message);
    }
    // O AuthContext vai detectar a mudança automaticamente e redirecionar
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
      <Text style={{ fontSize: 28, fontWeight: "700", color: theme.colors.text }}>
        Entrar
      </Text>

      <View style={{ marginTop: theme.space(2.5) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ ...theme.input }}
        />
      </View>

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ ...theme.input }}
        />
      </View>

      <TouchableOpacity
        onPress={handleLogin}
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radius.input,
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: "700", color: "white" }}>
          {loading ? "Entrando..." : "Entrar"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Register")}
        style={{ marginTop: 15, alignItems: "center" }}
      >
        <Text style={{ color: theme.colors.text }}>Criar conta</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate("ForgotPassword")}
        style={{ marginTop: 10, alignItems: "center" }}
      >
        <Text style={{ color: theme.colors.text }}>Esqueci a senha</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate("InviteCode")}
        style={{ marginTop: 10, alignItems: "center" }}
      >
        <Text style={{ color: theme.colors.text }}>Tenho um Convite de Casal</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate("EmailChange")}
        style={{ marginTop: 10, alignItems: "center" }}
      >
        <Text style={{ color: theme.colors.text }}>Confirmar troca de email</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
