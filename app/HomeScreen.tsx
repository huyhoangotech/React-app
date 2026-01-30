import React, { useContext, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  Wifi,
  WifiOff,
  Cpu,
  Zap,
  Gauge,
  Plug,
} from "lucide-react-native";

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";

/* ================= TYPES ================= */

type Device = {
  id: string;
  name: string;
  type?: string;
  location: string;
  status: "Connected" | "Disconnected";
};
// 3️⃣ ICON HELPER  ✅ ĐẶT Ở ĐÂY
const getDeviceIcon = (
  type?: string,
  size = 18,
  color = "#111"
) => {
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
        status:
          d.status === "connected" ? "Connected" : "Disconnected",
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Device Monitoring Dashboard</Text>

        <View style={styles.kpiBar}>
          <View style={[styles.kpiItem, { backgroundColor: "#3B82F6" }]}>
            <Cpu width={18} height={18} color="#fff" />
            <Text style={styles.kpiValue}>{kpi.total}</Text>
          </View>

          <View style={styles.kpiDivider} />

          <View style={[styles.kpiItem, { backgroundColor: "#10B981" }]}>
            <Wifi width={18} height={18} color="#fff" />
            <Text style={styles.kpiValue}>{kpi.online}</Text>
          </View>

          <View style={styles.kpiDivider} />

          <View style={[styles.kpiItem, { backgroundColor: "#EF4444" }]}>
            <WifiOff width={18} height={18} color="#fff" />
            <Text style={styles.kpiValue}>{kpi.offline}</Text>
          </View>
        </View>
      </View>

      {/* DEVICES HEADER */}
     <View style={styles.deviceSectionHeader}>
  <Text style={styles.deviceSectionTitle}>Devices</Text>

  <TouchableOpacity
    onPress={() => navigation.navigate("DeviceConfig")}
    style={styles.configBtn}
  >
    <Text style={styles.filterIcon}>⚙️</Text>
  </TouchableOpacity>
</View>


      {/* DEVICE LIST */}
      <FlatList
        data={devices}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ marginHorizontal: 16 }}
        renderItem={({ item }) => (
          <DeviceCard device={item} navigation={navigation} />
        )}
      />
    </View>
  );
}

/* ================= CARD ================= */

function DeviceCard({ device, navigation }: any) {
  const statusColor =
    device.status === "Connected" ? "#047857" : "#B91C1C";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("Measurement", {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type || "Unknown",
        })
      }
    >
      {/* HEADER: name + icon */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{device.name}</Text>
        {getDeviceIcon(device.type)}
      </View>

      <Text style={styles.cardType}>{device.type}</Text>
      <Text style={styles.cardLocation}>{device.location}</Text>

      {/* STATUS */}
      <View style={styles.statusRow}>
        <Text style={{ color: statusColor, fontWeight: "600" }}>
          {device.status}
        </Text>

        {device.status === "Connected" ? (
          <Wifi width={16} height={16} color={statusColor} />
        ) : (
          <WifiOff width={16} height={16} color={statusColor} />
        )}
      </View>
    </TouchableOpacity>
  );
}


/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: 50 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },

  kpiBar: { flexDirection: "row", height: 40 },
  kpiItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  configBtn: {
  marginLeft: 8, // 👈 khoảng cách sát chữ
},

  kpiDivider: { width: 1, backgroundColor: "#fff" },
  kpiValue: { color: "#fff", fontWeight: "700" },

  deviceSectionHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginHorizontal: 16,
  marginVertical: 8,
},

  deviceSectionTitle: { fontSize: 20, fontWeight: "700" },
  filterIcon: { fontSize: 16 },

  card: {
    backgroundColor: "#fff",
    flex: 0.48,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  cardHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

statusRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 6,
},

  cardTitle: { fontWeight: "700", fontSize: 14 },
  cardType: { fontSize: 11, color: "#6B7280" },
  cardLocation: { fontSize: 11, color: "#6B7280" },
});
