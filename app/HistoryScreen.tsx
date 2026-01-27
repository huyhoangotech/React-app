'use client';

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "@/navigation/RootNavigator";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
/* ================= TYPES ================= */

interface Device {
  id: string;
  name: string;
}

interface Measurement {
  id: string;
  name: string;
  configId?: string;
}



/* ================= SCREEN ================= */

export default function HistoryScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);

  const [selectedByDevice, setSelectedByDevice] = useState<
    Record<string, Measurement[]>
  >({});

  /* =====================================================
     FETCH HISTORY CONFIG → DERIVE DEVICES
  ===================================================== */
  const fetchHistoryConfig = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        "http://192.168.3.232:5000/api/customer/history-config",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      /**
       * measurements: [
       *   {
       *     id,
       *     device_id,
       *     device_name,
       *     measurement_id,
       *     measurement_name
       *   }
       * ]
       */

      const deviceMap: Record<string, Device> = {};
      const grouped: Record<string, Measurement[]> = {};

      for (const row of res.data.measurements ?? []) {
        // device
        if (!deviceMap[row.device_id]) {
          deviceMap[row.device_id] = {
            id: row.device_id,
            name: row.device_name,
          };
        }

        // measurement
        if (!grouped[row.device_id]) {
          grouped[row.device_id] = [];
        }

        grouped[row.device_id].push({
          id: row.measurement_id,
          name: row.measurement_name,
          configId: row.id,
        });
      }

      const deviceList = Object.values(deviceMap);

      setDevices(deviceList);
      setSelectedByDevice(grouped);

      if (deviceList[0]) {
        setExpandedDeviceId(deviceList[0].id);
      }
    } catch (err: any) {
      console.log("[HistoryScreen] fetch error:", err.message);
    }
  };

  /* =====================================================
     REMOVE MEASUREMENT
  ===================================================== */
  const removeMeasurement = async (
    deviceId: string,
    configId?: string
  ) => {
    if (!configId) return;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await axios.delete(
        `http://192.168.3.232:5000/api/customer/devices/${deviceId}/history-config/${configId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedByDevice((prev) => ({
        ...prev,
        [deviceId]: prev[deviceId]?.filter(
          (m) => m.configId !== configId
        ),
      }));
    } catch (err: any) {
      console.log("[HistoryScreen] remove error:", err.message);
    }
  };

  /* =====================================================
     EFFECT
  ===================================================== */
  useEffect(() => {
    fetchHistoryConfig();
  }, []);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>History</Text>
            <Text style={styles.subTitle}>
              Measurements history by device
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("AddHistory")}
          > 
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* EMPTY */}
        {devices.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              No history configured yet
            </Text>
          </View>
        )}

        {/* DEVICE LIST */}
        {devices.map((d) => {
          const expanded = expandedDeviceId === d.id;
          const selected = selectedByDevice[d.id] ?? [];

          return (
            <View key={d.id} style={styles.deviceCard}>
              <TouchableOpacity
                style={styles.deviceHeader}
                onPress={() =>
                  setExpandedDeviceId(expanded ? null : d.id)
                }
              >
                <View style={styles.deviceHeaderContent}>
                  <Text style={styles.deviceName}>{d.name}</Text>
                  <Text style={styles.deviceCount}>
                    {selected.length} measurement
                    {selected.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Ionicons
                  name={expanded ? "chevron-down" : "chevron-forward"}
                  size={18}
                />
              </TouchableOpacity>

              {expanded && (
                <View style={styles.deviceBody}>
                  {selected.map((m) => (
  <TouchableOpacity
    key={`${d.id}-${m.id}`}
    style={styles.selectedRow}
    onPress={() =>
      navigation.navigate("HistoryDetail", {
        deviceId: d.id,
        measurementId: m.id,
      })
    }
  >
    <Text>{m.name}</Text>

    <TouchableOpacity
      onPress={() =>
        removeMeasurement(d.id, m.configId)
      }
    >
      <Ionicons
        name="close"
        size={18}
        color="#ef4444"
      />
    </TouchableOpacity>
  </TouchableOpacity>
))}

                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
     paddingTop: 32,
    padding: 16,
  },

  title: { fontSize: 22, fontWeight: "700" },
  subTitle: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  addText: { color: "#fff", fontWeight: "600" },

  emptyWrap: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
  },

  deviceCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9fafb",
  },

  deviceHeaderContent: { flex: 1 },
  deviceName: { fontWeight: "600", fontSize: 16 },
  deviceCount: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  deviceBody: { padding: 12 },

  selectedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
});
