'use client';

// DeviceManagerScreen.tsx

import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
   TextInput,
} from "react-native";
import {
  Wifi,
  WifiOff,
  Zap,
  Gauge,
  Plug,
  Cpu,
  Plus,
  MapPin,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// ---------------- TYPES ----------------
interface Device {
  id: string;
  name: string;
  type: "Recloser" | "Meter" | "Relay" | "Transformer" | string;
  location: string;
  status: "Connected" | "Disconnected";
}

// ---------------- ICON HELPER ----------------
const getDeviceIcon = (type: Device["type"], size = 24, color = "#059669") => {
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
const [search, setSearch] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");

const [statusFilter, setStatusFilter] = useState<
  "Connected" | "Disconnected" | null
>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ------------ Fetch devices from API ------------
  const fetchDevices = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      
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
      console.error("Error fetching devices:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(search);
  }, 250);

  return () => clearTimeout(timer);
}, [search]);

  // ------------ Stats ------------
  const connectedCount = devices.filter((d) => d.status === "Connected").length;
  const disconnectedCount = devices.filter((d) => d.status === "Disconnected").length;
const filteredDevices = devices.filter((device) => {
  const keyword = debouncedSearch.toLowerCase();

  const matchesSearch =
    device.name.toLowerCase().includes(keyword) ||
    device.location?.toLowerCase().includes(keyword) ||
    device.type?.toLowerCase().includes(keyword);

  const matchesStatus =
    !statusFilter || device.status === statusFilter;

  return matchesSearch && matchesStatus;
});



  // ------------ Loading Screen ------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={["#047857", "#059669", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </LinearGradient>
      </View>
    );
  }

  // ---------------- Render Item ----------------
  const renderItem = ({ item }: { item: Device }) => {
    const isConnected = item.status === "Connected";

    return (
  <TouchableOpacity
    style={styles.card}
    activeOpacity={0.7}
    onPress={() =>
      navigation.navigate("Measurement", {
        deviceId: item.id,
        deviceName: item.name,
        deviceType: item.type || "Unknown",
        canControl: true, // ✅ DEVICE -> được quyền điều khiển
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

    {/* Icon */}
    <View style={styles.iconWrapper}>
      {getDeviceIcon(item.type, 28, "#059669")}
    </View>

    {/* Device Name */}
    <Text style={styles.deviceName} numberOfLines={1}>
      {item.name}
    </Text>

    {/* Device Type Badge */}
    <View style={styles.typeBadge}>
      <Text style={styles.typeBadgeText}>{item.type}</Text>
    </View>

    {/* Location */}
    <View style={styles.locationRow}>
      <MapPin width={12} height={12} color="#6B7280" />
      <Text style={styles.locationText} numberOfLines={1}>
        {item.location}
      </Text>
    </View>

    {/* Status Row */}
    <View style={styles.statusRow}>
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
          {item.status}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

  };

  // ---------------- Render ----------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Device Manager</Text>
            <Text style={styles.headerSubtitle}>Manage all your devices</Text>
          </View>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
            <Plus width={20} height={20} color="#059669" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
     <View style={styles.statsContainer}>
  {/* TOTAL */}
  <TouchableOpacity
    style={[
      styles.statCard,
      statusFilter === null && { borderWidth: 2, borderColor: "#fff" },
    ]}
    activeOpacity={0.8}
    onPress={() => setStatusFilter(null)}
  >
    <Text style={styles.statValue}>{devices.length}</Text>
    <Text style={styles.statLabel}>Total</Text>
  </TouchableOpacity>

  {/* CONNECTED */}
  <TouchableOpacity
    style={[
      styles.statCard,
      statusFilter === "Connected" && {
        borderWidth: 2,
        borderColor: "#22C55E",
        backgroundColor: "rgba(34,197,94,0.25)",
      },
    ]}
    activeOpacity={0.8}
    onPress={() =>
      setStatusFilter((prev) =>
        prev === "Connected" ? null : "Connected"
      )
    }
  >
    <View style={styles.statIconRow}>
      <View style={[styles.statDot, { backgroundColor: "#22C55E" }]} />
      <Text style={styles.statValue}>{connectedCount}</Text>
    </View>
    <Text style={styles.statLabel}>Connected</Text>
  </TouchableOpacity>

  {/* OFFLINE */}
  <TouchableOpacity
    style={[
      styles.statCard,
      statusFilter === "Disconnected" && {
        borderWidth: 2,
        borderColor: "#EF4444",
        backgroundColor: "rgba(239,68,68,0.25)",
      },
    ]}
    activeOpacity={0.8}
    onPress={() =>
      setStatusFilter((prev) =>
        prev === "Disconnected" ? null : "Disconnected"
      )
    }
  >
    <View style={styles.statIconRow}>
      <View style={[styles.statDot, { backgroundColor: "#EF4444" }]} />
      <Text style={styles.statValue}>{disconnectedCount}</Text>
    </View>
    <Text style={styles.statLabel}>Offline</Text>
  </TouchableOpacity>
</View>

      </LinearGradient>

      {/* Search & Filter Bar */}
   <View style={styles.searchBar}>
  <View style={styles.searchInput}>
    <Search width={18} height={18} color="#9CA3AF" />

    <TextInput
      placeholder="Search devices..."
      placeholderTextColor="#9CA3AF"
      value={search}
      onChangeText={setSearch}
      style={{ flex: 1, fontSize: 15 }}
    />
  </View>
</View>



      {/* Device List */}
      <FlatList
       data={filteredDevices}

        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => fetchDevices(true)}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => fetchDevices(true)}
      >
        <LinearGradient
          colors={["#047857", "#059669"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <RefreshCw
            width={22}
            height={22}
            color="#ffffff"
            style={refreshing ? { opacity: 0.5 } : {}}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },

  // Header
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    fontWeight: "500",
  },

  // Search Bar
  searchBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // List
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 100,
    gap: 16,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: "relative",
  },
  statusIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(5, 150, 105, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(5, 150, 105, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  statusRow: {
    marginTop: "auto",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
