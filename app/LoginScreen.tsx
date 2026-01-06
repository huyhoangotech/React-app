import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useContext, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-root-toast";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AuthContext } from "../contexts/AuthContext";
import { RootStackParamList } from "../navigation/RootNavigator";

/* ================= TYPES ================= */
type LoginScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList, "Login">;

/* ================= COMPONENT ================= */
export default function LoginScreen({
  navigation,
}: {
  navigation: LoginScreenNavigationProp;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("AuthContext must be used within AuthProvider");
  }
  const { setIsLoggedIn } = context;

  /* ================= HANDLER ================= */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("Sending login request for:", email);

      const response = await axios.post(
        "http://192.168.3.232:5000/api/customer/login-customer",
        { email, password }
      );

      const token = response.data.token;
      if (!token) {
        throw new Error("Không nhận được token từ server");
      }

      await AsyncStorage.setItem("token", token);

      Toast.show("Đăng nhập thành công!", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.CENTER,
        backgroundColor: "#4CAF50",
        textColor: "#fff",
      });

      // ✅ CẬP NHẬT AUTH STATE
      setIsLoggedIn(true);

      // ✅ CHUYỂN SANG HOME (KHÔNG BACK VỀ LOGIN)
      navigation.replace("HomeTabs");
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert(
        "Đăng nhập thất bại",
        error.response?.data?.error || "Có lỗi xảy ra"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng Nhập</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Đang đăng nhập..." : "Đăng Nhập"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#fdb7cf",
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});
