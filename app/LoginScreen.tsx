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
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-root-toast";
import { registerForPushNotificationsAsync } from "@/notification";
import { AuthContext } from "../contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { LinearGradient } from 'expo-linear-gradient';
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("AuthContext must be used within AuthProvider");
  }

  const {
    setIsLoggedIn,
    setMustChangePassword,
    setUser,
  } = context;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await axios.post(
        "https://be.otech.vn/api/customer/login-customer",
        { email, password }
      );

      const { token, user } = response.data;

      if (!token) {
        throw new Error("Không nhận được token từ server");
      }

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));
      await AsyncStorage.setItem(
        "mustChangePassword",
        String(user.is_first_login)
      );

      setUser(user);
      setIsLoggedIn(true);
      setMustChangePassword(user.is_first_login);

      registerForPushNotificationsAsync()
        .then((token) => {
          console.log("Push token:", token);
        })
        .catch((err) => {
          console.log("Push notification error:", err);
        });

      Toast.show("Đăng nhập thành công!", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.CENTER,
        backgroundColor: "#10b981",
        textColor: "#fff",
      });
    } catch (error: any) {
      console.log("LOGIN ERROR FULL:", error);

      let message = "Unknown error";
      let status = "";
      let data = "";

      if (error.response) {
        status = error.response.status;
        data = JSON.stringify(error.response.data);
        message = "Server error";
      } else if (error.request) {
        message = "No response from server";
      } else {
        message = error.message;
      }

      Alert.alert(
        "Đăng nhập thất bại",
        `MSG: ${message}\nSTATUS: ${status}\nDATA: ${data}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo & Header */}
      <View style={styles.headerSection}>
        <View style={styles.logoContainer}>
         
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Đăng nhập vào tài khoản của bạn</Text>
      </View>

      {/* Form Section */}
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View
            style={[
              styles.inputWrapper,
              emailFocused && styles.inputWrapperFocused,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isSubmitting}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu</Text>
          <View
            style={[
              styles.inputWrapper,
              passwordFocused && styles.inputWrapperFocused,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              editable={!isSubmitting}
            />
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isSubmitting ? ["#059669", "#047857"] : ["#10b981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Đăng Nhập</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 4,
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperFocused: {
    borderColor: "#10b981",
    shadowColor: "#10b981",
    shadowOpacity: 0.15,
    elevation: 4,
  },
  input: {
    fontSize: 16,
    color: "#0f172a",
    paddingVertical: 14,
    fontWeight: "500",
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
