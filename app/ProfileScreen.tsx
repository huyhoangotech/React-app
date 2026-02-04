'use client';

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
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const { width } = Dimensions.get("window");

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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
const tabBarHeight = useBottomTabBarHeight();

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "user", "mustChangePassword"]);
      setIsLoggedIn(false);
    } catch (err) {
      Alert.alert("Đăng xuất thất bại");
    }
  };

  /* ================= FETCH PROFILE ================= */
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setUser(null);
        setIsLoggedIn(false);
        return;
      }

      const res = await axios.get(`${API_BASE}/api/customer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res.data.user);
      setCustomerName(res.data.customer?.name ?? "-");
      setSites(res.data.sites ?? []);
    } catch (err: any) {
      console.log("Profile error:", err);

      if (err.response?.status === 401 || err.response?.status === 403) {
        setIsLoggedIn(false);
      } else {
        Alert.alert("Không thể tải profile");
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>No profile data available</Text>
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
  <ScrollView
    style={styles.container}
    contentContainerStyle={{
    paddingBottom: tabBarHeight + 10,
    flexGrow: 1,
  }}
    showsVerticalScrollIndicator={false}
  >

      {/* HEADER GRADIENT */}
    <LinearGradient
  colors={["#047857", "#059669", "#10B981"]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.header}
>
  <View style={styles.headerRow}>
    <View>
      <Text style={styles.headerTitle}>Profile</Text>
      <Text style={styles.headerSubtitle}>Your account information</Text>
    </View>

    <TouchableOpacity
      onPress={handleLogout}
      style={styles.logoutIcon}
    >
      <Ionicons name="log-out-outline" size={22} color="#047857" />
    </TouchableOpacity>
  </View>
</LinearGradient>


      {/* PROFILE SECTION */}
      <View style={styles.profileSection}>
        {/* AVATAR */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={["#10B981", "#059669"]}
            style={styles.avatarGradient}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={48} color="#FFF" />
            )}
          </LinearGradient>
        </View>

        {/* USER INFO CARD */}
        <View style={styles.infoCard}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.customerName}>{customerName}</Text>

          {/* INFO ITEMS */}
          <View style={styles.infoItems}>
            <View style={styles.infoItem}>
              <Ionicons name="mail" size={18} color="#059669" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            </View>

            {user.phone && (
              <View style={styles.infoItem}>
                <Ionicons name="call" size={18} color="#059669" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{user.phone}</Text>
                </View>
              </View>
            )}

            {user.address && (
              <View style={styles.infoItem}>
                <Ionicons name="location" size={18} color="#059669" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{user.address}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Ionicons name="pencil" size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ChangePasswordProfile")}
            >
              <Ionicons name="lock-closed" size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* SITES SECTION */}
      {sites.length > 0 && (
        <View style={styles.sitesSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={20} color="#059669" />
            <Text style={styles.sectionTitle}>Your Sites</Text>
          </View>

          <FlatList
            data={sites}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.siteCard}>
                <LinearGradient
                  colors={["rgba(16, 185, 129, 0.05)", "rgba(16, 185, 129, 0.02)"]}
                  style={styles.siteCardGradient}
                >
                  <View style={styles.siteCardHeader}>
                    <View style={styles.siteIconWrapper}>
                      <Ionicons
                        name="location"
                        size={20}
                        color="#059669"
                      />
                    </View>
                    <Text style={styles.siteTitle}>{item.name}</Text>
                  </View>

                  {item.address && (
                    <View style={styles.siteDetail}>
                      <Ionicons
                        name="map"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.siteAddress}>{item.address}</Text>
                    </View>
                  )}

                  {item.devices && (
                    <View style={styles.siteDetail}>
                      <Ionicons
                        name="tablet-landscape"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.deviceCount}>
                        {Number(item.devices ?? 0)} device
                        {Number(item.devices ?? 0) !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
            )}
          />
        </View>
      )}
   </ScrollView>

  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  centerText: {
    fontSize: 16,
    color: "#6B7280",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },

  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
headerRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

logoutIcon: {
  backgroundColor: "#ECFDF5", // xanh nhạt
  padding: 10,
  borderRadius: 12,
},

  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  customerName: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
    marginBottom: 16,
  },

  infoItems: {
    gap: 14,
    marginBottom: 18,
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  infoText: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  actionButtons: {
    gap: 10,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 12,
  },

  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },

  sitesSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  siteCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  siteCardGradient: {
    padding: 16,
  },

  siteCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  siteIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(5, 150, 105, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  siteTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },

  siteDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  siteAddress: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  deviceCount: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  logoutSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: "auto",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 14,
  },

  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
