
'use client';

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { Keyboard, Scan } from "lucide-react-native";
import React, { useState } from "react";
import { useRoute } from "@react-navigation/native";
import { useEffect } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";

const { width } = Dimensions.get("window");
const INPUT_WIDTH = width - 40;

export default function AddDevice() {
    const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const [serial, setSerial] = useState("");
  const [device, setDevice] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔍 Step 1: Check serial
  useEffect(() => {
    console.log("📥 ROUTE PARAMS:", route.params);

    if (route.params?.serial) {
      console.log("✅ NHẬN SERIAL:", route.params.serial);

      setSerial(route.params.serial);

      // auto check luôn
      handleCheckSerialWithParam(route.params.serial);
    }
  }, [route.params?.serial]);

  // 🔥 gọi API check serial (dùng chung)
  const handleCheckSerialWithParam = async (inputSerial: string) => {
    if (!inputSerial?.trim()) return;

    try {
      console.log("📡 CALL API SERIAL:", inputSerial);

      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      // 🔥 1. check device
      const deviceRes = await axios.get(
        `https://be.otech.vn/api/customer/by-serial/${serial.trim()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setDevice(deviceRes.data.device);

      // 🔥 2. lấy sites
      const siteRes = await axios.get(
        "https://be.otech.vn/api/customer/my-sites",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSites(siteRes.data.sites);
    } catch (err: any) {
      setDevice(null);
      setSites([]);

      Alert.alert(
        "Error",
        err?.response?.data?.error || "Device not found"
      );
    } finally {
      setLoading(false);
    }
  };
 const handleCheckSerial = () => {
    if (!serial.trim()) {
      Alert.alert("Error", "Please enter serial number");
      return;
    }

    handleCheckSerialWithParam(serial.trim());
  };
  // 🔥 Step 2: Claim device
  const handleClaimDevice = async () => {
    if (!selectedSite) {
      Alert.alert("Error", "Please select a site");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      await axios.post(
        "https://be.otech.vn/api/customer/claim",
        {
          serial: serial.trim(),
          site_id: selectedSite,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert("Success", "Device added successfully");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.error || "Failed to add device"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Add Device</Text>
        <Text style={styles.headerSubtitle}>
          Add a new device via QR scan or serial number
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Scan QR */}
        <TouchableOpacity
          style={styles.optionButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("ScanQRCode")}
        >
          <View style={styles.optionIcon}>
            <Scan width={28} height={28} color="#059669" />
          </View>
          <Text style={styles.optionText}>Scan QR Code</Text>
        </TouchableOpacity>

    <View style={styles.serialContainer}>
          <Text style={styles.serialLabel}>Enter Serial Number</Text>

          <TextInput
            placeholder="Serial Number"
            placeholderTextColor="#9CA3AF"
            value={serial}
            onChangeText={setSerial}
            style={styles.serialInput}
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleCheckSerial}
            disabled={loading}
          >
            <LinearGradient
              colors={["#047857", "#059669"]}
              style={styles.submitGradient}
            >
              <Keyboard width={20} height={20} color="#ffffff" />
              <Text style={styles.submitText}>
                {loading ? "Checking..." : "Check Device"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Device info */}
        {device && (
          <View style={styles.deviceBox}>
            <Text style={styles.deviceTitle}>Device Found</Text>
            <Text>Device Name: {device.name || "N/A"}</Text>
            <Text>Serial Numer: {serial}</Text>
          </View>
        )}

        {/* Select site */}
        {device && (
          <View style={styles.siteContainer}>
            <Text style={styles.serialLabel}>Select Site</Text>

            {sites.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedSite(s.id)}
                style={[
                  styles.siteItem,
                  selectedSite === s.id && styles.siteItemActive,
                ]}
              >
                <Text
                  style={{
                    color: selectedSite === s.id ? "#fff" : "#000",
                  }}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Claim button */}
        {device && (
          <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={handleClaimDevice}
            disabled={loading}
          >
            <LinearGradient
              colors={["#047857", "#059669"]}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>
                {loading ? "Processing..." : "Add Device"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  body: {
    padding: 20,
    gap: 20,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 3,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(5,150,105,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionText: {
    fontWeight: "700",
    fontSize: 16,
  },
  serialContainer: {
    gap: 10,
  },
  serialLabel: {
    fontWeight: "600",
  },
  serialInput: {
    width: INPUT_WIDTH,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  submitButton: {
    marginTop: 10,
  },
  submitGradient: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
  },
  deviceBox: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },
  deviceTitle: {
    fontWeight: "700",
    marginBottom: 6,
  },
  siteContainer: {
    marginTop: 10,
  },
  siteItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  siteItemActive: {
    backgroundColor: "#059669",
  },
});

