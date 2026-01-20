// HomeScreen.tsx
import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Wifi, WifiOff, Zap, Gauge, Plug, Cpu } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";

// ------------------- Types -------------------
type Device = {
  id: string;
  name: string;
  type?: string;
  location: string;
  status: "Connected" | "Disconnected";
  alerts?: number;
};

type AlertItem = {
  id: string;
  device: string;
  type?: string;
  site: string;
  label: string;
  severity?: string;
  timestamp: string;
};

export type RootStackParamList = {
  Home: undefined;
  Measurement: { deviceId: string; deviceName: string; deviceType: string };
  MeasurementDetail: { selectedMeasurement: string; deviceId: string };
  AutoControl: { deviceId: string };
 NotificationDetail: { alarmId: string };


};

// ------------------- Helper -------------------
const getDeviceIcon = (type: string, size = 24, color = "#111") => {
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

// ------------------- HomeScreen -------------------
export default function HomeScreen() {
  const { isLoggedIn } = useContext(AuthContext)!;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Home">>();

  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
const fetchRecentAlerts = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const alertsRes = await axios.get(
      "http://192.168.3.232:5000/api/customer/recent-alerts",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const rawAlerts = alertsRes.data ?? [];

    // 1️⃣ Lọc trùng theo alarm_id
    const uniqueMap = new Map<string, any>();
    rawAlerts.forEach((a: any) => {
      const key = a.alarm_id || a.id;
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, a);
      }
    });

    // 2️⃣ Map + giới hạn 5 alert
    const mappedAlerts: AlertItem[] = Array.from(uniqueMap.values())
      .slice(0, 5)
      .map((a: any) => ({
        id: a.id,
        device: a.device,
        type: a.device_type,
        site: a.site,
        label: a.event_type,
        severity: a.severity,
        timestamp: a.timestamp,
      }));

    setAlerts(mappedAlerts);
  } catch (err) {
    console.error("fetchRecentAlerts error:", err);
  }
};

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const devicesRes = await axios.get("http://192.168.3.232:5000/api/customer/all-devices", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const normalizedDevices: Device[] = devicesRes.data.devices.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          location: d.location,
          status: d.status?.toLowerCase() === "connected" ? "Connected" : "Disconnected",
          alerts: d.alerts ?? 0,
        }));

        setDevices(normalizedDevices);

        const alertsRes = await axios.get("http://192.168.3.232:5000/api/customer/recent-alerts", {
          headers: { Authorization: `Bearer ${token}` },
        });

      const rawAlerts = alertsRes.data ?? [];

// 1️⃣ Lọc trùng theo alarm_id (fallback id)
const uniqueMap = new Map<string, any>();

rawAlerts.forEach((a: any) => {
  const key = a.alarm_id || a.id;
  if (key && !uniqueMap.has(key)) {
    uniqueMap.set(key, a);
  }
});

// 2️⃣ Map → UI model + giới hạn số lượng (VD: 5)
const mappedAlerts: AlertItem[] = Array.from(uniqueMap.values())
  .slice(0, 5) // 👈 CHỈ HIỆN 5 CẢNH BÁO GẦN NHẤT
  .map((a: any) => ({
    id: a.id,     
    device: a.device,
    type: a.device_type,
    site: a.site,
    label: a.event_type,
    severity: a.severity,
    timestamp: a.timestamp,
  }));

setAlerts(mappedAlerts);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) fetchData();
  }, [isLoggedIn]);
useEffect(() => {
  if (!isLoggedIn) return;

  // 🔁 Poll alerts mỗi 5 giây
  const interval = setInterval(() => {
    fetchRecentAlerts();
  }, 5000);

  return () => clearInterval(interval);
}, [isLoggedIn]);

  const totalDevices = devices.length;
  const connectedDevices = devices.filter((d) => d.status === "Connected").length;
  const disconnectedDevices = devices.filter((d) => d.status === "Disconnected").length;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text>Loading data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header + KPI */}
      <View style={styles.header}>
        <Text style={styles.title}>Device Monitoring Dashboard</Text>
        <View style={styles.kpiBar}>
          <View style={[styles.kpiItem, { backgroundColor: "#3B82F6" }]}>
            <Cpu width={20} height={20} color="#fff" />
            <Text style={styles.kpiValue}>{totalDevices}</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={[styles.kpiItem, { backgroundColor: "#10B981" }]}>
            <Wifi width={20} height={20} color="#fff" />
            <Text style={styles.kpiValue}>{connectedDevices}</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={[styles.kpiItem, { backgroundColor: "#EF4444" }]}>
            <WifiOff width={20} height={20} color="#fff" />
            <Text style={styles.kpiValue}>{disconnectedDevices}</Text>
          </View>
        </View>
      </View>

      {/* ---------- Recent Alerts ---------- */}
      <View style={styles.alertSection}>
        <Text style={styles.sectionTitle}>
          Recent Alerts ({alerts.length})
        </Text>

        <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
          {alerts.map((alert) => (
            <TouchableOpacity
              key={`${alert.id}-${alert.timestamp}`}
              activeOpacity={0.7}
            onPress={() => {
    console.log("CLICK ALERT", alert.id);
  navigation.navigate("NotificationDetail", {
    alarmId: alert.id,
  });
}}
            >
              <View style={styles.alertCard}>
                <View
                  style={[
                    styles.alertDot,
                    {
                      backgroundColor:
                        alert.severity === "high"
                          ? "#EF4444"
                          : "#F59E0B",
                    },
                  ]}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.alertLine1} numberOfLines={1}>
                    {alert.device}: {alert.label} in {alert.site}
                  </Text>
                  <Text style={styles.alertLine2}>{alert.type}</Text>
                </View>

                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Devices */}
      <Text style={styles.deviceSectionTitle}>Devices</Text>
      <View style={{ flex: 1 }}>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        numColumns={2}
         showsVerticalScrollIndicator={true}
        columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 8 }}
        renderItem={({ item }) => (
          <DeviceCard device={item} navigation={navigation} />
        )}
        contentContainerStyle={{ paddingBottom: 20, marginHorizontal: 16 }}
      /></View>
    </View>
  );
}

// ------------------- DeviceCard -------------------
type DeviceCardProps = {
  device: Device;
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

function DeviceCard({ device, navigation }: DeviceCardProps) {
  const statusColor = device.status === "Connected" ? "#047857" : "#B91C1C";
  const icon = getDeviceIcon(device.type || "", 24, "#111");
  const statusIcon =
    device.status === "Connected" ? (
      <Wifi width={18} height={18} color={statusColor} />
    ) : (
      <WifiOff width={18} height={18} color={statusColor} />
    );

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        navigation.navigate("Measurement", {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type || "Unknown",
        });
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{device.name}</Text>
        {icon}
      </View>

      <Text style={styles.cardType}>{device.type}</Text>
      <Text style={styles.cardLocation}>{device.location}</Text>

      <View style={styles.cardFooter}>
        <Text style={{ color: statusColor }}>{device.status}</Text>
        {statusIcon}
      </View>
    </TouchableOpacity>
  );
}

// ------------------- Styles -------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 50 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6 },
  kpiBar: {
    flexDirection: "row",
    width: "100%",
    height: 40,
    overflow: "hidden",
    borderRadius: 0,
  },
  devicesWrapper: {
  flex: 1,              // 🔥 QUAN TRỌNG
  marginTop: 8,
  paddingHorizontal: 16,
},

  kpiItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  kpiDivider: { width: 1, backgroundColor: "#fff" },
  kpiValue: { color: "#fff", fontWeight: "700", fontSize: 14 },

  alertSection: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  alertDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  alertLine1: { fontSize: 12, fontWeight: "600" },
  alertLine2: { fontSize: 10, marginTop: 2 },
  alertTime: { fontSize: 10, color: "#6B7280", marginLeft: 6 },

  deviceSectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginHorizontal: 16, marginBottom: 8 },
  card: { backgroundColor: "white", flex: 0.48, borderRadius: 12, padding: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontWeight: "700", fontSize: 14 },
  cardType: { fontSize: 11, color: "#6B7280" },
  cardLocation: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4 },
});
