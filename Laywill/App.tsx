import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import HomeScreen from "./src/screens/HomeScreen";
import NewTransactionScreen from "./src/screens/NewTransactionScreen";
import StatementScreen from "./src/screens/StatementScreen";

import { api, setToken, getToken, clearToken } from "./src/lib/api";

type User = { id: string; name: string | null; email: string };

const Tab = createBottomTabNavigator();
const PENDING_INVITE_KEY = "@meuappfinancas:pendingInvite";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [email, setEmail] = useState("wilson@email.com");
  const [password, setPassword] = useState("123456");

  async function bootstrap() {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const data = await api("/api/auth/me", { method: "GET" });
      setUser(data.user ?? null);
    } catch {
      await clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteToken(token: string) {
    if (!token) return;
    if (!user) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, token);
      Alert.alert("Convite recebido", "Faça login para aceitar o convite.");
      return;
    }

    try {
      await api("/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      Alert.alert("Convite aceito", "Você entrou no workspace.");
    } catch (e: any) {
      Alert.alert("Falha ao aceitar convite", e?.message || "Erro");
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const path = parsed?.path || "";
      const [first, second] = path.split("/");
      if (first === "invite" && second) {
        await handleInviteToken(second);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => sub.remove();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem(PENDING_INVITE_KEY).then((pending) => {
      if (pending) {
        handleInviteToken(pending);
      }
    });
  }, [user]);

  async function handleLogin() {
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!data.token) throw new Error("Token não veio no login.");
      await setToken(data.token);

      const me = await api("/api/auth/me", { method: "GET" });
      setUser(me.user ?? null);
    } catch (e: any) {
      Alert.alert("Falha no login", e?.message || "Erro");
    }
  }

  async function handleLogout() {
    await clearToken();
    setUser(null);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20, justifyContent: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>Entrar</Text>
        <Text style={{ marginTop: 8, opacity: 0.7 }}>Acesse as finanças do casal</Text>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ marginTop: 6, padding: 14, borderRadius: 12, borderWidth: 1 }}
          />
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ marginTop: 6, padding: 14, borderRadius: 12, borderWidth: 1 }}
          />
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          style={{ marginTop: 16, padding: 16, borderRadius: 14, alignItems: "center", borderWidth: 1 }}
        >
          <Text style={{ fontWeight: "700" }}>Entrar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 12 }}>
              <Text style={{ fontWeight: "800" }}>Sair</Text>
            </TouchableOpacity>
          ),
          tabBarStyle: { height: 68, paddingBottom: 10, paddingTop: 8 },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen
          name="Lançar"
          component={NewTransactionScreen}
          options={{
            tabBarLabel: "",
            tabBarButton: (props) => (
              <View style={{ flex: 1, alignItems: "center" }}>
                <TouchableOpacity
                  {...props}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "#111827",
                    marginTop: -22,
                    shadowColor: "#000",
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Lançar"
                >
                  <Text style={{ color: "white", fontSize: 32, fontWeight: "800", marginTop: -2 }}>+</Text>
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tab.Screen name="Extrato" component={StatementScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

