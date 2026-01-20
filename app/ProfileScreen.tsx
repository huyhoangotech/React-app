import React, { useContext, useState, useCallback } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  EditProfile: undefined;
 ChangePasswordProfile: undefined;

};

const API_BASE = "http://192.168.3.232:5000";

/* ================= TYPES ================= */
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string | null;
}

interface Site {
  id: string;
  name: string;
  address?: string;
  devices?: string;
}

export default function ProfileScreen() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthContext must be used within AuthProvider");

  const { setIsLoggedIn } = context;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [sites, setSites] = useState<Site[]>([]);

  /* ================= LOGOUT ================= */
 const handleLogout = async () => {
  try {
    await AsyncStorage.multiRemove([
      "token",
      "user",
      "mustChangePassword",
    ]);

    setIsLoggedIn(false); // ✅ QUAN TRỌNG NHẤT
  } catch (err) {
    Alert.alert("Đăng xuất thất bại");
  }
};


  /* ================= FETCH PROFILE ================= */
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(`${API_BASE}/api/customer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res.data.user);
      setCustomerName(res.data.customer?.name ?? "-");
      setSites(res.data.sites ?? []);
    } catch (err) {
      console.log("Profile error:", err);
      Alert.alert("Không thể tải profile");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Tự động fetch profile khi màn hình focus
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Không có dữ liệu profile</Text>
      </View>
    );
  }

  /* ================= AVATAR URL ================= */
  const avatarUri =
    user.avatar && user.avatar.startsWith("http")
      ? user.avatar
      : user.avatar
      ? `${API_BASE}${user.avatar}`
      : null;

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <Image
          source={
            avatarUri
              ? { uri: avatarUri }
              : require("../assets/icons/profile.png")
          }
          style={styles.avatar}
        />
      </View>

      {/* Name & Info */}
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.info}>{customerName}</Text>
      <Text style={styles.info}>Email: {user.email}</Text>
      <Text style={styles.info}>Address: {user.address || "-"}</Text>
      <Text style={styles.info}>Phone: {user.phone || "-"}</Text>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => navigation.navigate("EditProfile")}>
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>
        <Text style={styles.dot}>•</Text>
        <TouchableOpacity onPress={() => navigation.navigate("ChangePasswordProfile")}>
          <Text style={styles.actionText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* Sites */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Your Sites</Text>
      </View>

      <FlatList
        data={sites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.siteCard}>
            <Text style={styles.siteTitle}>Site: {item.name}</Text>
            <Text style={styles.siteAddress}>{item.address}</Text>
            <Text style={styles.deviceCount}>
              • Devices: {Number(item.devices ?? 0)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

/* ================= STYLES ================= */
const CARD_BG = "#EFEFF4";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 32, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  avatarWrapper: { alignItems: "center", marginTop: 10 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#DDD" },

  name: { marginTop: 12, fontSize: 22, fontWeight: "700", textAlign: "center" },
  info: { marginTop: 8, fontSize: 14, color: "#333", textAlign: "center" },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  actionText: { fontSize: 14, fontWeight: "600", color: "#4A90E2" },
  dot: { marginHorizontal: 10, color: "#888" },

  logoutButton: {
    marginTop: 20,
    alignSelf: "center",
    backgroundColor: "#f44336",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  sectionHeaderRow: { marginTop: 26 },
  sectionHeader: { fontSize: 20, fontWeight: "600" },

  siteCard: {
    marginTop: 14,
    backgroundColor: CARD_BG,
    padding: 14,
    borderRadius: 10,
  },
  siteTitle: { fontSize: 16, fontWeight: "700" },
  siteAddress: { marginTop: 4, fontSize: 13, color: "#6B7280" },
  deviceCount: { marginTop: 4, fontSize: 14 },
});
