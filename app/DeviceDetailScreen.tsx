import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DeviceDetailScreen({ route, navigation }: any) {
  const { deviceId } = route.params;

  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [loadingDevice, setLoadingDevice] = useState<boolean>(true);

  const [alarms, setAlarms] = useState<any[]>([]);
  const [loadingAlarms, setLoadingAlarms] = useState<boolean>(false);

  const [measureTime, setMeasureTime] = useState<string>("");
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loadingMeasurements, setLoadingMeasurements] =
    useState<boolean>(false);

  // ------------------ Time ------------------
  useEffect(() => {
    const now = new Date();
    const formatted = `${now.getDate().toString().padStart(2, "0")}/${
      (now.getMonth() + 1).toString().padStart(2, "0")
    }/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${
      now.getMinutes().toString().padStart(2, "0")
    }:${now.getSeconds().toString().padStart(2, "0")}`;

    setMeasureTime(formatted);
  }, []);

  // ------------------ Fetch on ID Change ------------------
  useEffect(() => {
    fetchDeviceInfo();
    fetchDeviceAlarms();
    fetchMeasurements();
  }, [deviceId]);

  // ------------------ Fetch Device Info ------------------
  const fetchDeviceInfo = async () => {
    setLoadingDevice(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        `http://192.168.3.232:5000/api/customer/devices/${deviceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDeviceInfo(res.data || null);
    } catch (err) {
      console.log("❌ ERROR FETCHING DEVICE INFO:", err);
      setDeviceInfo(null);
    } finally {
      setLoadingDevice(false);
    }
  };

  // ------------------ Fetch Alarms ------------------
  const fetchDeviceAlarms = async () => {
    setLoadingAlarms(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        `http://192.168.3.232:5000/api/customer/alarms/logs`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const logs = res.data?.logs || [];

      const filtered = logs.filter(
        (l: any) => String(l.device_id) === String(deviceId)
      );

      const mapped = filtered.map((l: any) => ({
        title: l.event_type || l.name || "Alarm",
        time: l.triggered_at
          ? new Date(l.triggered_at).toLocaleString("vi-VN")
          : "-",
        color:
          l.severity === "high"
            ? "#FF4D4F"
            : l.severity === "medium"
            ? "#FACC15"
            : "#9CA3AF",
      }));

      setAlarms(mapped);
    } catch (err) {
      console.log("❌ ERROR FETCHING ALARMS:", err);
      setAlarms([]);
    } finally {
      setLoadingAlarms(false);
    }
  };

  // ------------------ Fetch Measurements (Dynamic) ------------------
  const fetchMeasurements = async () => {
    setLoadingMeasurements(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      // 1. Fetch parent measurements
      const parentRes = await axios.get(
        `http://192.168.3.232:5000/api/customer/devices/${deviceId}/parent-measurements`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const groups = parentRes.data?.measurements || [];

      // 2. Fetch children in parallel
      const promises = groups.map((g: any) =>
        axios
          .get(
            `http://192.168.3.232:5000/api/customer/devices/${deviceId}/measurements/${g.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then((res) => ({
            parent: g,
            children: res.data.measurements.map((m: any) => ({
              id: m.id,
              name: m.name,
              value: m.value ?? "-",
              unit: m.unit ?? "-",
            })),
          }))
      );

      const results = await Promise.all(promises);

      // 3. Flatten data like static UI
      let finalList: any[] = [];

      results.forEach((r: any) => {
        if (r.children.length > 0) {
          finalList.push(...r.children);
        } else {
          finalList.push({
            id: r.parent.id,
            name: r.parent.name,
            value: r.parent.value ?? "-",
            unit: r.parent.unit ?? "-",
          });
        }
      });

      setMeasurements(finalList);
    } catch (err) {
      console.log("❌ ERROR FETCHING MEASUREMENTS:", err);
      setMeasurements([]);
    } finally {
      setLoadingMeasurements(false);
    }
  };

  // ------------------ Loading ------------------
  if (loadingDevice) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!deviceInfo) {
    return (
      <View style={styles.center}>
        <Text>Không tìm thấy thông tin thiết bị.</Text>
      </View>
    );
  }

  const deviceFullName =
    `${deviceInfo?.name || "-"}` +
    ` | ${deviceInfo?.device_type_name || "-"}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 16 }}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft size={26} color="#080808ff" />
      </TouchableOpacity>

      {/* DEVICE INFO */}
      <View style={styles.deviceInfo}>
        <View style={styles.row}>
          <Text style={styles.label}>Thiết bị:</Text>
          <Text style={styles.value}>{deviceFullName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Serial:</Text>
          <Text style={styles.value}>{deviceInfo?.serial_number || "-"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>IP:</Text>
          <Text style={styles.value}>{deviceInfo?.ip_address || "-"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Model:</Text>
          <Text style={styles.value}>{deviceInfo?.model || "-"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Site:</Text>
          <Text style={styles.value}>{deviceInfo?.site_name || "-"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Added at:</Text>
          <Text style={styles.value}>
            {deviceInfo?.created_at
              ? new Date(deviceInfo.created_at).toLocaleString("vi-VN")
              : "-"}
          </Text>
        </View>
      </View>

      {/* MEASUREMENTS */}
    <View style={styles.card}>
  <View style={styles.measureHeader}>
    <Text style={styles.sectionTitle}>MEASUREMENTS</Text>
    <Text style={styles.measureTimeStamp}>{measureTime}</Text>
  </View>

  {/* Scroll riêng cho measurements */}
  <ScrollView
    style={styles.measurementsScroll}
    contentContainerStyle={{ paddingBottom: 4 }}
    nestedScrollEnabled
  >
    {loadingMeasurements ? (
      <ActivityIndicator style={{ marginTop: 12 }} />
    ) : measurements.length === 0 ? (
      <Text style={{ marginTop: 10, color: "#6B7280" }}>
        Không có dữ liệu đo.
      </Text>
    ) : (
      measurements.map((m, index) => (
        <View key={index} style={styles.measureRow}>
          <Text style={styles.measureLabel}>
            {m.name} {m.unit !== "-" ? `(${m.unit})` : ""}
          </Text>
          <Text style={styles.measureValue}>{m.value}</Text>
        </View>
      ))
    )}
  </ScrollView>
</View>


      {/* ALARMS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ALARMS</Text>

        {loadingAlarms ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : alarms.length === 0 ? (
          <Text style={{ marginTop: 10, color: "#6B7280" }}>
            Không có cảnh báo nào.
          </Text>
        ) : (
          alarms.map((alarm, index) => (
            <View key={index} style={styles.alarmRow}>
              <View
                style={[styles.alarmDot, { backgroundColor: alarm.color }]}
              />
              <View style={styles.alarmContent}>
                <Text style={styles.alarmTitle}>{alarm.title}</Text>
                <Text style={styles.alarmTime}>{alarm.time}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ------------------ Styles ------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", padding: 16 },

  backBtn: {
    position: "absolute",
    top: 35,
    left: 5,
    marginBottom: 16,
  },
  measurementsScroll: {
  maxHeight: 260,   // ✅ chiều cao cố định như bản tĩnh
},


  deviceInfo: {
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    marginTop: 60,
  },

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 13, color: "#374151" },
  value: { fontSize: 13, fontWeight: "600", color: "#111827" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
  },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4, color: "#111" },

  measureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },

  measureTimeStamp: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  measureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  measureLabel: { fontSize: 13, color: "#374151" },
  measureValue: { fontSize: 13, fontWeight: "600", color: "#111827" },

  alarmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  alarmDot: { width: 12, height: 12, borderRadius: 6 },
  alarmContent: { flex: 1 },
  alarmTitle: { fontSize: 14, fontWeight: "600" },
  alarmTime: { fontSize: 12, color: "#6B7280" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
