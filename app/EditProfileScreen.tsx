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
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity onPress={pickAvatar}>
            <Image
              source={
                avatar
                  ? { uri: avatar }
                  : require("../assets/icons/profile.png")
              }
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        {/* Editable Fields */}
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="Phone"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            placeholder="Address"
          />
        </View>

        {/* Save & Cancel Buttons */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 24 }}>
          <TouchableOpacity
            style={[styles.saveButton, { flex: 1, marginRight: 8, backgroundColor: "#2563EB" }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { flex: 1, marginLeft: 8, backgroundColor: "#6B7280" }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.saveText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 60, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  avatarWrapper: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#DDD" },

  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },

  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
