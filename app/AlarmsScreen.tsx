"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  useCallback,           // ✅ thêm
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  useNavigation,
  useFocusEffect,        // ✅ thêm
} from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../contexts/AuthContext";

interface Alarm {
  id: string;
  name: string;
  time: string;
  value: string;
  device: string;
  deviceType: string;
  category: "alarm" | "event" | "info";
  date: string;
}

const CATEGORY_COLORS = {
  alarm: { bg: "#FFE5E5", border: "#FF4D4F", dot: "#FF4D4F", label: "Alarm" },
  event: { bg: "#E6F7FF", border: "#1890FF", dot: "#1890FF", label: "Event" },
  info: { bg: "#F6FFED", border: "#52C41A", dot: "#52C41A", label: "Info" },
};

export default function AlarmsScreen() {
  const navigation = useNavigation<any>();
  const { isLoggedIn } = useContext(AuthContext)!;

  const [alarmData, setAlarmData] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timePeriod, setTimePeriod] =
    useState<"all" | "today" | "week" | "month">("all");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ================================
  // 📌 FETCH API (TÁCH RIÊNG)
  // ================================
  const fetchAlarms = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        "http://192.168.3.232:5000/api/customer/alarms/logs",
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
        };
      });

      setAlarmData(logsWithCategory);
    } catch (error) {
      console.log("Error fetching alarms:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ================================
  // ✅ CÁCH 1: POLLING 5 GIÂY
  // ================================
  useEffect(() => {
    fetchAlarms(); // load lần đầu

    const interval = setInterval(() => {
      fetchAlarms();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchAlarms]);

  // ================================
  // ✅ CÁCH 2: REFRESH KHI QUAY LẠI MÀN
  // ================================
  useFocusEffect(
    useCallback(() => {
      fetchAlarms();
    }, [fetchAlarms])
  );

  const uniqueDevices = Array.from(
    new Set(alarmData.map((item) => item.device))
  );
  const uniqueTypes = Array.from(
    new Set(alarmData.map((item) => item.deviceType))
  );

  // ==========================================
  // 📌 FILTER LOGIC
  // ==========================================
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

    if (selectedDevice)
      result = result.filter((i) => i.device === selectedDevice);
    if (selectedType)
      result = result.filter((i) => i.deviceType === selectedType);
    if (selectedCategory)
      result = result.filter((i) => i.category === selectedCategory);

    return result;
  }, [
    timePeriod,
    selectedDevice,
    selectedType,
    selectedCategory,
    alarmData,
  ]);

  // ==========================================
  // 📌 RENDER ITEM (GIỮ NGUYÊN)
  // ==========================================
  const renderItem = ({ item }: { item: Alarm }) => {
    const colors = CATEGORY_COLORS[item.category];

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("NotificationDetail", { alarmId: item.id })
        }
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.bg, borderLeftColor: colors.border },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.colDevice}>
              <View style={styles.deviceBadge}>
                <View
                  style={[styles.dot, { backgroundColor: colors.dot }]}
                />
                <Text style={styles.deviceText}>
                  {item.device ?? "Unknown Device"}
                </Text>
              </View>
              <Text style={styles.typeText}>
                {item.deviceType ?? "Unknown Type"}
              </Text>
            </View>

            <View style={styles.colName}>
              <Text
                style={styles.nameText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name ?? "No Name"}
              </Text>
              <Text style={styles.timeText}>{item.time ?? ""}</Text>
            </View>

            <View style={styles.colValue}>
              <Text style={styles.valueText}>{item.value ?? "-"}</Text>
            </View>

            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: colors.dot },
              ]}
            >
              <Text style={styles.categoryText}>{colors.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ==========================================
  // 📌 UI (GIỮ NGUYÊN)
  // ==========================================
  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ marginTop: 40 }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Notification Center</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
              <View style={styles.filterButton}>
                <Text style={styles.filterIcon}>⚙️</Text>
                <Text style={styles.filterText}>Filters</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Time Period Tabs */}
          <View style={styles.tabsRow}>
            {["Today", "Week", "Month", "All"].map((label) => {
              const key =
                label.toLowerCase() as "today" | "week" | "month" | "all";
              const active = timePeriod === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTimePeriod(key)}
                  style={styles.tabButton}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabActive]}
                  >
                    {label}
                  </Text>
                  {active && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerText, { flex: 1 }]}>Device</Text>
            <Text style={[styles.headerText, { flex: 1.2 }]}>
              Alert Name
            </Text>
            <Text
              style={[
                styles.headerText,
                { width: 70, textAlign: "center" },
              ]}
            >
              Value
            </Text>
            <Text
              style={[
                styles.headerText,
                { width: 70, textAlign: "center" },
              ]}
            >
              Type
            </Text>
          </View>

          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingVertical: 12,
              paddingBottom: 20,
            }}
          />
        </>
      )}

      {/* Filter Modal (GIỮ NGUYÊN) */}
      <Modal visible={filterModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Filters */}
              <View style={{ marginBottom: 20, paddingHorizontal: 16 }}>
                <Text style={{ fontWeight: "600", marginBottom: 8 }}>
                  Device
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 8,
                    overflow: "hidden",
                    height: 50,
                    justifyContent: "center",
                  }}
                >
                  <Picker
                    selectedValue={selectedDevice}
                    onValueChange={(value) =>
                      setSelectedDevice(value)
                    }
                    style={{ height: 50 }}
                  >
                    <Picker.Item label="All" value={null} />
                    {uniqueDevices.map((device) => (
                      <Picker.Item
                        key={device}
                        label={device}
                        value={device}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={{ marginBottom: 20, paddingHorizontal: 16 }}>
                <Text style={{ fontWeight: "600", marginBottom: 8 }}>
                  Device Type
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 8,
                    overflow: "hidden",
                    height: 50,
                    justifyContent: "center",
                  }}
                >
                  <Picker
                    selectedValue={selectedType}
                    onValueChange={(value) =>
                      setSelectedType(value)
                    }
                    style={{ height: 50 }}
                  >
                    <Picker.Item label="All" value={null} />
                    {uniqueTypes.map((type) => (
                      <Picker.Item
                        key={type}
                        label={type}
                        value={type}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(null);
                  setSelectedDevice(null);
                  setSelectedType(null);
                }}
                style={{
                  paddingVertical: 12,
                  backgroundColor: "#E5E7EB",
                  borderRadius: 8,
                  alignItems: "center",
                  marginHorizontal: 16,
                }}
              >
                <Text style={{ fontWeight: "600" }}>
                  Clear All Filters
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ================================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 52, backgroundColor: "#FAFBFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  filterButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F3F4F6", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  filterIcon: { fontSize: 16 },
  filterText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  tabsRow: { flexDirection: "row", gap: 24, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tabButton: { alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#9CA3AF" },
  tabActive: { color: "#2563EB", fontWeight: "700" },
  tabIndicator: { height: 3, backgroundColor: "#2563EB", marginTop: 4, borderRadius: 2, width: "100%" },

  headerRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: "#E5E7EB", marginBottom: 8 },
  headerText: { fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 },

  card: { borderRadius: 10, padding: 12, marginBottom: 10, borderLeftWidth: 4, backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },

  colDevice: { flex: 1 },
  deviceBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  deviceText: { fontSize: 14, fontWeight: "700", color: "#111827" },
  typeText: { fontSize: 12, color: "#6B7280", marginTop: 2 },

 colName: {
  flex: 1.6,   // ⬅️ tăng từ 1.2 → 1.8
  minWidth: 0, // ⬅️ bắt buộc để ellipsis hoạt động
},

  nameText: { fontSize: 14, fontWeight: "700", color: "#111827" },
  timeText: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  colValue: { width: 55, alignItems: "center" },
  valueText: { fontSize: 13, fontWeight: "600", color: "#374151" },

  categoryBadge: { width: 56, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, alignItems: "center" },
  categoryText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24, maxHeight: "80%" },
});
