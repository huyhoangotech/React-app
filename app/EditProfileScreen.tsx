'use client';

import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft } from "lucide-react-native";

export type RootStackParamList = {
  EditProfile: undefined;
  ChangePassword: undefined;
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

export default function EditProfileScreen() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthContext must be used within AuthProvider");
  const { setIsLoggedIn } = context;

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<any>(null);

  /* ================= FETCH PROFILE ================= */
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(`${API_BASE}/api/customer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = res.data.user;
      setUser(userData);
      setName(userData.name || "");
      setEmail(userData.email || "");
      setPhone(userData.phone || "");
      setAddress(userData.address || "");
      setAvatar(userData.avatar ? `${API_BASE}${userData.avatar}` : null);
    } catch (err) {
      console.log("Fetch profile error:", err);
      Alert.alert("Không thể tải thông tin profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  /* ================= PICK AVATAR ================= */
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAvatar(asset.uri);
      setAvatarFile({
        uri: asset.uri,
        name: asset.uri.split("/").pop(),
        type: "image/jpeg",
      });
    }
  };

  /* ================= SAVE PROFILE ================= */
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("address", address);
      if (avatarFile) {
        formData.append("avatar", avatarFile as any);
      }

      const res = await axios.put(`${API_BASE}/api/customer/profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      Alert.alert("Cập nhật thành công");
      setUser(res.data.user);
      navigation.goBack();
    } catch (err) {
      console.log("Update profile error:", err);
      Alert.alert("Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={pickAvatar}
          >
            <Image
              source={
                avatar
                  ? { uri: avatar }
                  : require("../assets/icons/profile.png")
              }
              style={styles.avatar}
            />
            <View style={styles.cameraIcon}>
              <Text style={styles.cameraText}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="Enter your email"
              keyboardType="email-address"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              placeholder="Enter your phone"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              placeholder="Enter your address"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <LinearGradient
            colors={["#047857", "#059669", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.saveButton, { marginRight: 8 }]}
          >
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            >
              <Text style={styles.saveText}>{saving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity
            style={[styles.cancelButton, { marginLeft: 8 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
  },

  container: { padding: 16, paddingBottom: 40, backgroundColor: "#f8fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  avatarSection: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#ecfdf5",
    borderWidth: 3,
    borderColor: "#10B981",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  cameraText: { fontSize: 20 },
  avatarHint: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#d1fae5",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  field: { paddingVertical: 12 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8, color: "#047857" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#ecfdf5",
  },

  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },

  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#6B7280", fontSize: 16, fontWeight: "700" },
});
