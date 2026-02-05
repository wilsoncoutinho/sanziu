import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, Modal } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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
  const navigation = useNavigation<any>();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
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
                onPress={() => setAccountMenuVisible(true)}
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
                accessibilityLabel="Conta"
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
      <Modal
        visible={accountMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountMenuVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <TouchableOpacity
            onPress={() => setAccountMenuVisible(false)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
          <View
            style={{
              marginTop: 64,
              alignSelf: "flex-end",
              marginRight: theme.space(1.5),
              backgroundColor: theme.colors.card,
              borderRadius: theme.radius.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              paddingVertical: theme.space(1),
              minWidth: 220,
            }}
          >
            <MenuItem
              label="Conta"
              onPress={() => {
                setAccountMenuVisible(false);
                navigation.navigate("Account");
              }}
            />
            <MenuItem
              label="Alterar nome"
              onPress={() => {
                setAccountMenuVisible(false);
                navigation.navigate("ChangeName");
              }}
            />
            <MenuItem
              label="Alterar senha"
              onPress={() => {
                setAccountMenuVisible(false);
                navigation.navigate("ChangePassword");
              }}
            />
            <MenuItem
              label="Tenho um convite de casal"
              onPress={() => {
                setAccountMenuVisible(false);
                navigation.navigate("InviteCode");
              }}
            />
            <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.space(0.5) }} />
            <MenuItem
              label="Alterar foto"
              onPress={() => {
                setAccountMenuVisible(false);
                handlePickAvatar();
              }}
            />
          </View>
        </View>
      </Modal>
      <FeedbackModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: theme.space(1.25),
        paddingHorizontal: theme.space(2),
      }}
    >
      <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}
