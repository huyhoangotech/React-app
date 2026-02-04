"use client";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect, useNavigation, } from "@react-navigation/native";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle, Bell, Calendar, ChevronRight, Filter, Info, RefreshCw, X, } from "lucide-react-native";
import React, { useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { ActivityIndicator, Dimensions, FlatList, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";

const { width } = Dimensions.get("window");

interface Alarm {
  id: string;
  name: string;
  time: string;
  value: string;
  device: string;
  deviceType: string;
  category: "alarm" | "event" | "info";
  date: string;
  isRead: boolean;
}

const CATEGORY_CONFIG = {
  alarm: {
    bg: "rgba(239, 68, 68, 0.08)",
    border: "#EF4444",
    dot: "#EF4444",
    label: "Alarm",
    icon: AlertTriangle,
    gradient: ["#EF4444", "#F87171"],
  },
  event: {
    bg: "rgba(59, 130, 246, 0.08)",
    border: "#3B82F6",
    dot: "#3B82F6",
    label: "Event",
    icon: Bell,
    gradient: ["#3B82F6", "#60A5FA"],
  },
  info: {
    bg: "rgba(16, 185, 129, 0.08)",
    border: "#10B981",
    dot: "#10B981",
    label: "Info",
    icon: Info,
    gradient: ["#10B981", "#34D399"],
  },
};
const READ_KEY = "READ_ALARMS";

const TIME_PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All" },
] as const;

export default function AlarmsScreen() {
  const navigation = useNavigation<any>();
  const { isLoggedIn } = useContext(AuthContext)!;
const { setUnreadCount } = useNotification();

  const [alarmData, setAlarmData] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timePeriod, setTimePeriod] = useState<"all" | "today" | "week" | "month">("today");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  /* ================= FETCH API ================= */
  const fetchAlarms = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        "http://192.168.3.232:5000/api/customer/alarms/logs",
        { headers: { Authorization: `Bearer ${token}` } }
      );
const readIdsJson = await AsyncStorage.getItem(READ_KEY);
const readIds = readIdsJson ? JSON.parse(readIdsJson) : [];
      const logsWithCategory = res.data.logs.map((log: any) => {
        const triggered = new Date(log.triggered_at);
        const fullDateTimeStr = `${triggered
          .getDate()
          .toString()
          .padStart(2, "0")}/${(triggered.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${triggered.getFullYear()} ${triggered.toLocaleTimeString()}`;

        return {
          id: log.id,
          device: log.device_name,
          deviceType: log.device_type_name,
          name: log.event_type,
          time: fullDateTimeStr,
          value: log.value,
          category: "alarm",
          date: triggered.toISOString().split("T")[0],
           isRead: readIds.includes(log.id),
        };
      });

   setAlarmData(logsWithCategory);
const unread = logsWithCategory.filter((log: Alarm) => !log.isRead).length;

setUnreadCount(unread);


    } catch (error) {
      console.log("Error fetching alarms:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlarms();
    const interval = setInterval(() => {
      fetchAlarms();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAlarms]);

  useFocusEffect(
    useCallback(() => {
      fetchAlarms();
    }, [fetchAlarms])
  );

  const uniqueDevices = Array.from(new Set(alarmData.map((item) => item.device)));
  const uniqueTypes = Array.from(new Set(alarmData.map((item) => item.deviceType)));

  /* ================= FILTER LOGIC ================= */
  const filteredData = useMemo(() => {
    let result = alarmData;
    const today = new Date();

    if (timePeriod === "today") {
      const todayStr = today.toISOString().split("T")[0];
      result = result.filter((item) => item.date === todayStr);
    } else if (timePeriod === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((item) => new Date(item.date) >= weekAgo);
    } else if (timePeriod === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter((item) => new Date(item.date) >= monthAgo);
    }

    if (selectedDevice) result = result.filter((i) => i.device === selectedDevice);
    if (selectedType) result = result.filter((i) => i.deviceType === selectedType);
    if (selectedCategory) result = result.filter((i) => i.category === selectedCategory);

    return result;
  }, [timePeriod, selectedDevice, selectedType, selectedCategory, alarmData]);

  /* ================= STATS ================= */
  const stats = useMemo(() => {
    return {
      total: filteredData.length,
      alarms: filteredData.filter((i) => i.category === "alarm").length,
      events: filteredData.filter((i) => i.category === "event").length,
      info: filteredData.filter((i) => i.category === "info").length,
    };
  }, [filteredData]);

  /* ================= RENDER ITEM ================= */
  const renderItem = ({ item }: { item: Alarm }) => {
    const config = CATEGORY_CONFIG[item.category];
    const IconComponent = config.icon;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
       onPress={async () => {
  const readIdsJson = await AsyncStorage.getItem(READ_KEY);
  const readIds = readIdsJson ? JSON.parse(readIdsJson) : [];

  if (!readIds.includes(item.id)) {
    readIds.push(item.id);
    await AsyncStorage.setItem(READ_KEY, JSON.stringify(readIds));
  }

  setUnreadCount(prev => Math.max(prev - 1, 0));

  navigation.navigate("NotificationDetail", {
    alarmId: item.id,
  });
}}

        style={styles.card}
      >
        {/* Category Indicator */}
        <View style={[styles.cardIndicator, { backgroundColor: config.dot }]} />

        <View style={styles.cardContent}>
          {/* Left: Icon */}
          <View style={[styles.cardIconWrapper, { backgroundColor: config.bg }]}>
            <IconComponent width={20} height={20} color={config.dot} />
          </View>

          {/* Middle: Info */}
          <View style={styles.cardInfo}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDevice} numberOfLines={1}>
                {item.device ?? "Unknown Device"}
              </Text>
              <View style={[styles.categoryBadge, { backgroundColor: config.bg }]}>
                <Text style={[styles.categoryText, { color: config.dot }]}>
                  {config.label}
                </Text>
              </View>
            </View>

            <Text style={styles.cardName} numberOfLines={1}>
              {item.name ?? "No Name"}
            </Text>

            <View style={styles.cardMeta}>
              <Text style={styles.cardType}>{item.deviceType ?? "Unknown"}</Text>
              <View style={styles.cardDot} />
              <Text style={styles.cardTime}>{item.time ?? ""}</Text>
            </View>
          </View>

          {/* Right: Value & Arrow */}
          <View style={styles.cardRight}>
            <Text style={styles.cardValue}>{item.value ?? "-"}</Text>
            <ChevronRight width={16} height={16} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <LinearGradient
        colors={["#059669", "#10B981", "#34D399"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </LinearGradient>
    );
  }

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Stay informed</Text>
            <Text style={styles.title}>Notification Center</Text>
          </View>
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={styles.filterBtn}
          >
            <Filter width={22} height={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* STATS CARDS */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Bell width={18} height={18} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <AlertTriangle width={18} height={18} color="#EF4444" />
            </View>
            <Text style={styles.statNumber}>{stats.alarms}</Text>
            <Text style={styles.statLabel}>Alarms</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
              <Calendar width={18} height={18} color="#3B82F6" />
            </View>
            <Text style={styles.statNumber}>{stats.events}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Info width={18} height={18} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{stats.info}</Text>
            <Text style={styles.statLabel}>Info</Text>
          </View>
        </View>
      </LinearGradient>

      {/* TIME PERIOD TABS */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          {TIME_PERIODS.map(({ key, label }) => {
            const active = timePeriod === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setTimePeriod(key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* LIST */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Bell width={40} height={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyText}>No notifications found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      {/* REFRESH FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={fetchAlarms}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#059669", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <RefreshCw width={22} height={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* FILTER MODAL */}
      <Modal visible={filterModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Notifications</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalClose}
              >
                <X width={20} height={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Device Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Device</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedDevice}
                    onValueChange={(value) => setSelectedDevice(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Devices" value={null} />
                    {uniqueDevices.map((device) => (
                      <Picker.Item key={device} label={device} value={device} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Device Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Device Type</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedType}
                    onValueChange={(value) => setSelectedType(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Types" value={null} />
                    {uniqueTypes.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Clear Button */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(null);
                  setSelectedDevice(null);
                  setSelectedType(null);
                }}
                style={styles.clearButton}
              >
                <LinearGradient
                  colors={["#059669", "#10B981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.clearButtonGradient}
                >
                  <Text style={styles.clearButtonText}>Clear All Filters</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
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
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  welcomeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },

  // Tabs
  tabsWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#059669",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#fff",
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingLeft: 16,
  },
  cardIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  cardDevice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardType: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  cardDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 6,
  },
  cardTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  cardRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },

  // Empty
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    borderRadius: 28,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
  },
  picker: {
    height: 50,
  },
  clearButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  clearButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
