'use client';

import React, { useContext, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from "react-native";
import {
  Wifi,
  WifiOff,
  Cpu,
  Zap,
  Gauge,
  Plug,
  Settings,
  Activity,
  MapPin,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

/* ================= TYPES ================= */

type Device = {
  id: string;
  name: string;
  type?: string;
  location: string;
  status: "Connected" | "Disconnected";
};

const getDeviceIcon = (type?: string, size = 24, color = "#059669") => {
  switch (type) {
    case "Recloser":
    case "Relay":
      return <Zap width={size} height={size} color={color} />;
    case "Meter":
      return <Gauge width={size} height={size} color={color} />;
    case "Transformer":
      return <Plug width={size} height={size} color={color} />;
    default:
      return <Cpu width={size} height={size} color={color} />;
  }
};

export type RootStackParamList = {
  Home: undefined;
  Measurement: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
  };
  DeviceConfig: undefined;
};

/* ================= SCREEN ================= */

export default function HomeScreen() {
  const { isLoggedIn } = useContext(AuthContext)!;

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const [kpi, setKpi] = useState({
    total: 0,
    online: 0,
    offline: 0,
  });

  /* ================= API ================= */

  const fetchKPI = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const res = await axios.get(
      "http://192.168.3.232:5000/api/customer/all-devices",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const allDevices = res.data.devices;

    const total = allDevices.length;
    const online = allDevices.filter(
      (d: any) => d.status === "connected"
    ).length;

    setKpi({
      total,
      online,
      offline: total - online,
    });
  };

  const fetchUserDevices = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const res = await axios.get(
      "http://192.168.3.232:5000/api/customer/user-devices",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const mapped: Device[] = res.data.data
      .filter((d: any) => d.is_visible === 1)
      .map((d: any) => ({
        id: d.device_id,
        name: d.name,
        type: d.type,
        location: d.location,
        status: d.status === "connected" ? "Connected" : "Disconnected",
      }));

    setDevices(mapped);
  };

  /* ================= LIFECYCLE ================= */

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) return;

      setLoading(true);
      Promise.all([fetchKPI(), fetchUserDevices()]).finally(() =>
        setLoading(false)
      );
    }, [isLoggedIn])
  );

  /* ================= UI ================= */

  if (loading) {
    return (
      <LinearGradient
        colors={["#059669", "#10B981", "#34D399"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER WITH GRADIENT */}
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.title}>Device Monitoring</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("DeviceConfig")}
            style={styles.settingsBtn}
          >
            <Settings width={24} height={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* KPI CARDS */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Activity width={20} height={20} color="#10B981" />
            </View>
            <Text style={styles.kpiNumber}>{kpi.total}</Text>
            <Text style={styles.kpiLabel}>Total Devices</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: "rgba(34, 197, 94, 0.15)" }]}>
              <Wifi width={20} height={20} color="#22C55E" />
            </View>
            <Text style={styles.kpiNumber}>{kpi.online}</Text>
            <Text style={styles.kpiLabel}>Online</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <WifiOff width={20} height={20} color="#EF4444" />
            </View>
            <Text style={styles.kpiNumber}>{kpi.offline}</Text>
            <Text style={styles.kpiLabel}>Offline</Text>
          </View>
        </View>
      </LinearGradient>

      {/* DEVICES SECTION */}
      <View style={styles.devicesSection}>
        <View style={styles.deviceSectionHeader}>
          <Text style={styles.deviceSectionTitle}>My Devices</Text>
          <View style={styles.deviceCount}>
            <Text style={styles.deviceCountText}>{devices.length}</Text>
          </View>
        </View>

        {/* DEVICE LIST */}
        <FlatList
          data={devices}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <DeviceCard device={item} navigation={navigation} />
          )}
        />
      </View>
    </View>
  );
}

/* ================= CARD ================= */

function DeviceCard({ device, navigation }: any) {
  const isConnected = device.status === "Connected";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.card}
      onPress={() =>
        navigation.navigate("Measurement", {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type || "Unknown",
          canControl: false,
        })
      }
    >
      {/* Status Indicator */}
      <View
        style={[
          styles.statusIndicator,
          { backgroundColor: isConnected ? "#22C55E" : "#EF4444" },
        ]}
      />

      {/* Icon Container */}
      <View style={styles.cardIconWrapper}>
        {getDeviceIcon(device.type, 28, "#059669")}
      </View>

      {/* Device Info */}
      <Text style={styles.cardTitle} numberOfLines={1}>
        {device.name}
      </Text>
      
      <View style={styles.typeContainer}>
        <Text style={styles.cardType}>{device.type || "Device"}</Text>
      </View>

      <View style={styles.locationRow}>
        <MapPin width={12} height={12} color="#9CA3AF" />
        <Text style={styles.cardLocation} numberOfLines={1}>
          {device.location}
        </Text>
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: isConnected
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
          },
        ]}
      >
        {isConnected ? (
          <Wifi width={14} height={14} color="#22C55E" />
        ) : (
          <WifiOff width={14} height={14} color="#EF4444" />
        )}
        <Text
          style={[
            styles.statusText,
            { color: isConnected ? "#22C55E" : "#EF4444" },
          ]}
        >
          {device.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FDF4",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },

  // Header
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  welcomeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // KPI Cards
  kpiContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  kpiIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  kpiLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },

  // Devices Section
  devicesSection: {
    flex: 1,
    paddingTop: 20,
  },
  deviceSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  deviceSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  deviceCount: {
    marginLeft: 10,
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deviceCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 20,
  },

  // Device Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  statusIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 12,
  },
  cardIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: "#1F2937",
    marginBottom: 4,
  },
  typeContainer: {
    marginBottom: 6,
  },
  cardType: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  cardLocation: {
    fontSize: 11,
    color: "#9CA3AF",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
