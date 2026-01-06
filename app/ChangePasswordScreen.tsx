import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE = "http://192.168.3.232:5000";

export default function ChangePasswordScreen({ navigation }: any) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");

  const submit = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      await axios.put(
        `${API_BASE}/api/customer/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Đổi mật khẩu thành công");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(err.response?.data?.message || "Đổi mật khẩu thất bại");
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>Mật khẩu hiện tại</Text>
      <TextInput secureTextEntry value={currentPassword} onChangeText={setCurrent} />

      <Text>Mật khẩu mới</Text>
      <TextInput secureTextEntry value={newPassword} onChangeText={setNew} />

      <Button title="Đổi mật khẩu" onPress={submit} />
    </View>
  );
}
