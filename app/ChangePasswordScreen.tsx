import { AuthContext } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useContext, useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";

const API_BASE = "https://be.otech.vn";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [loading, setLoading] = useState(false);

  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("AuthContext must be used within AuthProvider");
  }

  const { setMustChangePassword } = context;

  const submit = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Vui lòng nhập đầy đủ mật khẩu");
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Missing token");

      await axios.put(
        `${API_BASE}/api/customer/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 🔥 TẮT FLAG ÉP ĐỔI MẬT KHẨU
      await AsyncStorage.setItem("mustChangePassword", "false");
      setMustChangePassword(false);

      Alert.alert("Đổi mật khẩu thành công");
      // ❌ KHÔNG navigation
    } catch (err: any) {
      Alert.alert(err.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>Mật khẩu hiện tại</Text>
      <TextInput
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrent}
      />

      <Text>Mật khẩu mới</Text>
      <TextInput
        secureTextEntry
        value={newPassword}
        onChangeText={setNew}
      />

      <Button
        title={loading ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
        onPress={submit}
        disabled={loading}
      />
    </View>
  );
}
