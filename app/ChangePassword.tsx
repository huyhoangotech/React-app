import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import { useNavigation } from "@react-navigation/native"

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
      <Text style={styles.label}>Mật khẩu hiện tại</Text>
      <TextInput
        secureTextEntry
        style={styles.input}
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />

      <Text style={styles.label}>Mật khẩu mới</Text>
      <TextInput
        secureTextEntry
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
      <TextInput
        secureTextEntry
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Button
        title={loading ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
        onPress={submit}
        disabled={loading}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    flex: 1,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
  },
})
