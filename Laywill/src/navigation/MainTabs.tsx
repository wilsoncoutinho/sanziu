import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import HomeScreen from "../screens/HomeScreen";
import NewTransactionScreen from "../screens/NewTransactionScreen";
import StatementScreen from "../screens/StatementScreen";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";
import { useAuth } from "../contexts/AuthContext";

const Tab = createBottomTabNavigator();
const AVATAR_KEY = "@meuappfinancas:avatarUri";

export default function MainTabs() {
  const { user, signOut } = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
    message: "",
  });

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  function avatarKeyForUser(userId: string) {
    return `${AVATAR_KEY}:${userId}`;
  }

  async function loadAvatarForUser(currentUserId?: string) {
    if (!currentUserId) {
      setAvatarUri(null);
      return;
    }
    const uri = await AsyncStorage.getItem(avatarKeyForUser(currentUserId));
    setAvatarUri(uri || null);
  }

  async function handlePickAvatar() {
    if (!user?.id) {
      showModal("Ação indisponível", "Faça login para escolher uma imagem.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showModal("Permissão necessária", "Autorize o acesso às fotos para escolher uma imagem.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    await AsyncStorage.setItem(avatarKeyForUser(user.id), uri);
    setAvatarUri(uri);
  }

  useEffect(() => {
    loadAvatarForUser(user?.id);
  }, [user?.id]);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTitleStyle: { fontWeight: "800", color: "white" },
          headerTintColor: "white",
          headerRight: () => (
            <View style={{ marginRight: theme.space(1.5), flexDirection: "row", alignItems: "center", gap: theme.space(1) }}>
              <TouchableOpacity
                onPress={handlePickAvatar}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
                accessibilityRole="button"
                accessibilityLabel="Escolher foto"
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Ionicons name="person" size={16} color={theme.colors.text} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={signOut}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel="Sair"
              >
                <Ionicons name="log-out-outline" size={16} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          ),
          tabBarStyle: {
            backgroundColor: theme.colors.bg,
            borderTopColor: theme.colors.border,
            height: 64,
            paddingBottom: 10,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: "rgba(234,240,255,0.45)",
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
        />
        <Tab.Screen
          name="Lançar"
          component={NewTransactionScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
            tabBarLabel: "",
            tabBarButton: (props) => {
              const { delayLongPress, disabled, ...rest } = props as any;
              return (
                <View style={{ flex: 1, alignItems: "center" }}>
                  <TouchableOpacity
                    {...(rest as any)}
                    onPress={async (e) => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      (rest as any).onPress?.(e);
                    }}
                    delayLongPress={delayLongPress ?? undefined}
                    disabled={disabled ?? undefined}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: theme.colors.primary,
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
              );
            },
          }}
        />
        <Tab.Screen
          name="Extrato"
          component={StatementScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} /> }}
        />
      </Tab.Navigator>
      <FeedbackModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}
