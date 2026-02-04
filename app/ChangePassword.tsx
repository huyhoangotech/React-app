'use client';

import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import { useNavigation } from "@react-navigation/native"
import { ChevronLeft, Lock } from "lucide-react-native"

const API_BASE = "http://192.168.3.232:5000"

export default function ChangePassword() {
  const navigation = useNavigation<any>()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin")
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp")
      return
    }

    try {
      setLoading(true)

      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("Lỗi", "Bạn chưa đăng nhập")
        return
      }

      await axios.put(
        `${API_BASE}/api/customer/change-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      Alert.alert("Thành công", "Đổi mật khẩu thành công", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Đổi mật khẩu thất bại"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.headerContent}>
          <Lock size={24} color="#fff" />
          <Text style={styles.headerTitle}>Change Password</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Keep your account secure by using a strong password</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              secureTextEntry
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              secureTextEntry
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <LinearGradient
            colors={["#047857", "#059669", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.submitButton]}
          >
            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              style={{ flex: 1, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8 }}
            >
              {loading && <ActivityIndicator size="small" color="#fff" />}
              <Text style={styles.submitText}>
                {loading ? "Updating..." : "Update Password"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafb",
  },

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
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  infoCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  infoText: {
    fontSize: 13,
    color: "#047857",
    fontWeight: "500",
    lineHeight: 18,
  },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#d1fae5",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  field: {
    paddingVertical: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    color: "#047857",
  },
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
    gap: 12,
    marginBottom: 20,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    overflow: "hidden",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "700",
  },
})
