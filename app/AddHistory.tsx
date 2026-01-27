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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";

/* ================= TYPES ================= */

interface Device {
  id: string;
  name: string;
}

interface Measurement {
  id: string;
  name: string;
}

type Step = "device-select" | "measurement-select";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "AddHistory"
>;

const MAX_MEASUREMENTS = 30;

/* ================= SCREEN ================= */

export default function AddHistory({ navigation }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [step, setStep] = useState<Step>("device-select");

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [availableMeasurements, setAvailableMeasurements] = useState<Measurement[]>([]);
  const [pending, setPending] = useState<Measurement[]>([]);

  /**
   * historyMap = {
   *   device_id: Set(measurement_id)
   * }
   */
  const [historyMap, setHistoryMap] = useState<
    Record<string, Set<string>>
  >({});

  /* ================= FETCH DEVICES ================= */

  const fetchDevices = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const res = await axios.get(
      "http://192.168.3.232:5000/api/customer/all-devices",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setDevices(
      res.data.devices.map((d: any) => ({
        id: d.id,
        name: d.name,
      }))
    );
  };

  /* ================= FETCH HISTORY CONFIG ================= */

  const fetchHistoryConfig = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const res = await axios.get(
      "http://192.168.3.232:5000/api/customer/history-config",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const map: Record<string, Set<string>> = {};

    for (const row of res.data.measurements ?? []) {
      if (!map[row.device_id]) {
        map[row.device_id] = new Set();
      }
      map[row.device_id].add(row.measurement_id);
    }

    setHistoryMap(map);
  };

  /* ================= FETCH MEASUREMENTS ================= */

  const fetchMeasurements = async (deviceId: string) => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    // parents
    const parentRes = await axios.get(
      `http://192.168.3.232:5000/api/customer/devices/${deviceId}/parent-measurements`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const parents = parentRes.data.measurements.map((m: any) => ({
      id: m.id,
      name: m.name,
    }));

    // children
    const childReqs = parents.map((p: any) =>
      axios.get(
        `http://192.168.3.232:5000/api/customer/devices/${deviceId}/measurements/${p.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    );

    const childRes = await Promise.all(childReqs);

    const children = childRes.flatMap((r) =>
      r.data.measurements.map((m: any) => ({
        id: m.id,
        name: m.name,
      }))
    );

    setAvailableMeasurements([...parents, ...children]);
  };

  /* ================= EFFECT ================= */

  useEffect(() => {
    fetchDevices();
    fetchHistoryConfig();
  }, []);

  /* ================= ACTIONS ================= */

  const addPending = (m: Measurement) => {
    if (pending.find((x) => x.id === m.id)) return;
    if (pending.length >= MAX_MEASUREMENTS) return;

    setPending((prev) => [...prev, m]);
  };

  const removePending = (id: string) => {
    setPending((prev) => prev.filter((m) => m.id !== id));
  };

  const confirmAdd = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token || !selectedDevice) return;

    for (const m of pending) {
      await axios.post(
        `http://192.168.3.232:5000/api/customer/devices/${selectedDevice}/history-config`,
        { measurement_id: m.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    navigation.goBack();
  };

  /* ================= RENDER ================= */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            step === "measurement-select"
              ? setStep("device-select")
              : navigation.goBack()
          }
        >
          <Ionicons name="arrow-back" size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Measurement</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* STEP 1: DEVICE */}
      {step === "device-select" && (
        <ScrollView>
          <Text style={styles.sectionTitle}>Select Device</Text>
          {devices.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={styles.item}
              onPress={async () => {
                setSelectedDevice(d.id);
                await fetchMeasurements(d.id);
                setPending([]);
                setStep("measurement-select");
              }}
            >
              <Text>{d.name}</Text>
              <Ionicons name="chevron-forward" size={18} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* STEP 2: MEASUREMENTS */}
      {step === "measurement-select" && selectedDevice && (
        <>
          <View style={styles.counterRow}>
            <Text style={styles.sectionTitle}>Select Measurements</Text>
            <Text style={styles.counter}>
              {pending.length}/{MAX_MEASUREMENTS}
            </Text>
          </View>

          {pending.length > 0 && (
            <View style={styles.selectedWrap}>
              {pending.map((m) => (
                <View key={m.id} style={styles.selectedChip}>
                  <Text>{m.name}</Text>
                  <TouchableOpacity onPress={() => removePending(m.id)}>
                    <Ionicons name="close" size={14} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <ScrollView>
            <View style={styles.wrap}>
              {availableMeasurements
                .filter(
                  (m) =>
                    !pending.find((x) => x.id === m.id) &&
                    !historyMap[selectedDevice]?.has(m.id)
                )
                .map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.chip}
                    onPress={() => addPending(m)}
                  >
                    <Text>{m.name}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.done,
              pending.length === 0 && styles.doneDisabled,
            ]}
            disabled={pending.length === 0}
            onPress={confirmAdd}
          >
            <Text style={styles.doneText}>
              Add ({pending.length})
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
     paddingTop: 38,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },

  title: { fontSize: 18, fontWeight: "700" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    margin: 16,
  },

  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 16,
  },

  counter: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },

  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },

  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },

  selectedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#bfdbfe",
  },

  done: {
  backgroundColor: "#2563eb",
  paddingVertical: 14,
  alignItems: "center",
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 88,   // 👈 nâng nút lên
  borderRadius: 12,
},


  doneDisabled: {
    backgroundColor: "#d1d5db",
  },

  doneText: {
    color: "#fff",
    fontWeight: "700",
  },
});
