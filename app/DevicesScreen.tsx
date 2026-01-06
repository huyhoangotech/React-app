// DeviceManagerScreen.tsx

import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Wifi, WifiOff, Zap, Gauge, Plug, Cpu } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// ---------------- TYPES ----------------
interface Device {
  id: string;
  name: string;
  type: "Recloser" | "Meter" | "Relay" | "Transformer" | string;
  location: string;
  status: "Connected" | "Disconnected";
}

// ---------------- ICON HELPER ----------------
const getDeviceIcon = (type: Device["type"], size = 20, color = "#111") => {
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

// ---------------- MAIN SCREEN ----------------
export default function DeviceManagerScreen() {
  const navigation = useNavigation<any>();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // ------------ Fetch devices from API ------------
  const fetchDevices = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        "http://192.168.3.232:5000/api/customer/all-devices",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const mapped: Device[] = res.data.devices.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type ?? "Unknown",
        location: d.location,
        status: d.status?.toLowerCase() === "connected" ? "Connected" : "Disconnected",
      }));

      setDevices(mapped);
    } catch (err) {
      console.error("❌ Error fetching devices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text>Loading devices...</Text>
      </View>
    );
  }

  // ---------------- Render Item ----------------
  const renderItem = ({ item }: { item: Device }) => {
    const statusColor = item.status === "Connected" ? "#2E7D32" : "#C62828";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("DeviceDetail", { deviceId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.deviceName}>{item.name}</Text>
          {getDeviceIcon(item.type)}
        </View>

        <Text style={styles.deviceType}>{item.type}</Text>
        <Text style={styles.location}>{item.location}</Text>

        <View style={styles.statusRow}>
          <Text style={[styles.status, { color: statusColor }]}>
            {item.status}
          </Text>

          {item.status === "Connected" ? (
            <Wifi width={18} height={18} color={statusColor} />
          ) : (
            <WifiOff width={18} height={18} color={statusColor} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ---------------- Render ----------------
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Device Manager</Text>

        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>Add Device +</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subText}>Manage all your devices</Text>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          marginBottom: 16,
        }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 32,
        }}
      />
    </View>
  );
}

// ---------------- STYLES ----------------
const CARD_BG = "#F5F6FA";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 46,
    backgroundColor: "#FFFFFF",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#111" },
  addButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  subText: { fontSize: 14, color: "#666", marginTop: 4, marginBottom: 12 },

  card: {
    flex: 1,
    backgroundColor: CARD_BG,
    padding: 14,
    borderRadius: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginHorizontal: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: { fontSize: 17, fontWeight: "700", color: "#222" },
  deviceType: { fontSize: 15, fontWeight: "500", color: "#555", marginTop: 4 },
  location: { marginTop: 14, color: "#333", fontSize: 14 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    justifyContent: "space-between",
  },
  status: { fontSize: 14, fontWeight: "600" },
});
