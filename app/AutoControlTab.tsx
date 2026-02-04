'use client';

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation, useRoute } from "@react-navigation/native";

const API_BASE = "http://192.168.3.232:5000/api";

/* ================= TYPES ================= */

type Device = {
  id: string;
  name: string;
};

type Measurement = {
  id: string;
  name: string;
  unit?: string;
};
type Props = {
  deviceId?: string;
};

export default function AutoControlPage({ deviceId }: Props) {

  const navigation = useNavigation();
  const route = useRoute<any>();
  const passedDeviceId = route.params?.deviceId;

  /* ================= STATE ================= */

  const [devices, setDevices] = useState<Device[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);

  const [isAutoControlEnabled, setIsAutoControlEnabled] = useState(false);
  const [highThreshold, setHighThreshold] = useState("");
  const [lowThreshold, setLowThreshold] = useState("");

  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ================= FETCH DEVICES ================= */

  const fetchDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get<{ devices: Device[] }>(
        `${API_BASE}/customer/all-devices`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const list = res.data.devices ?? [];
      setDevices(list);

      if (!list.length) return;

      // ✅ Auto select device
      setSelectedDeviceId((prev) => {
        if (prev && list.some((d) => d.id === prev)) return prev;

        if (passedDeviceId && list.some((d) => d.id === passedDeviceId)) {
          return passedDeviceId;
        }

        return list[0].id;
      });
    } catch (err) {
      console.error("Fetch devices error:", err);
      Alert.alert("Error", "Failed to load devices");
    } finally {
      setLoadingDevices(false);
    }
  }, [passedDeviceId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  /* ================= RESET WHEN DEVICE CHANGES ================= */

  useEffect(() => {
    if (!selectedDeviceId) return;

    setMeasurements([]);
    setSelectedMeasurementId(null);
    setHighThreshold("");
    setLowThreshold("");
    setIsAutoControlEnabled(false);
  }, [selectedDeviceId]);

  /* ================= FETCH MEASUREMENTS ================= */

  useEffect(() => {
    if (!selectedDeviceId) return;

    const fetchMeasurements = async () => {
      try {
        setLoadingMeasurements(true);

        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const parentRes = await axios.get(
          `${API_BASE}/customer/devices/${selectedDeviceId}/parent-measurements`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const parents = parentRes.data.measurements || [];

        const childrenRequests = parents.map((p: any) =>
          axios
            .get(
              `${API_BASE}/customer/devices/${selectedDeviceId}/measurements/${p.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            .then((res) => ({
              parent: p,
              children: res.data.measurements || [],
            }))
        );

        const results = await Promise.all(childrenRequests);

        const allMeasurements: Measurement[] = results.flatMap((r) => [
          {
            id: r.parent.id,
            name: r.parent.name,
            unit: r.parent.unit,
          },
          ...r.children.map((c: any) => ({
            id: c.id,
            name: c.name,
            unit: c.unit,
          })),
        ]);

        setMeasurements(allMeasurements);
        setSelectedMeasurementId(allMeasurements[0]?.id ?? null);
      } catch (err) {
        console.error("Fetch measurements error:", err);
      } finally {
        setLoadingMeasurements(false);
      }
    };

    fetchMeasurements();
  }, [selectedDeviceId]);

  /* ================= FETCH ALARM ================= */

  useEffect(() => {
    if (!selectedDeviceId || !selectedMeasurementId) return;

    const fetchAlarm = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(
          `${API_BASE}/customer/alarms/device/${selectedDeviceId}/measurement/${selectedMeasurementId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.exists) {
          const alarm = res.data.alarm;

          setHighThreshold(alarm.threshold_high?.toString() || "");
          setLowThreshold(alarm.threshold_low?.toString() || "");
          setIsAutoControlEnabled(alarm.meta?.enable_auto_control ?? false);
        }
      } catch (err) {
        console.error("Fetch alarm error:", err);
      }
    };

    fetchAlarm();
  }, [selectedDeviceId, selectedMeasurementId]);

  /* ================= SAVE ================= */

  const handleSave = async () => {
    if (!selectedDeviceId || !selectedMeasurementId) {
      Alert.alert("Missing data", "Please select device and measurement");
      return;
    }

    try {
      setSaving(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await axios.post(
        `${API_BASE}/customer/alarms`,
        {
          device_id: selectedDeviceId,
          measurement_id: selectedMeasurementId,
          threshold_high: highThreshold ? Number(highThreshold) : null,
          threshold_low: lowThreshold ? Number(lowThreshold) : null,
          meta: {
            enable_auto_control: isAutoControlEnabled,
            type: "range",
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Auto control saved");
    } catch (err) {
      console.error("Save alarm error:", err);
      Alert.alert("Error", "Failed to save auto control");
    } finally {
      setSaving(false);
    }
  };

  /* ================= LOADING ================= */

  if (loadingDevices) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  /* ================= UI ================= */

  return (
    <ScrollView contentContainerStyle={styles.container}>
          {/*
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Auto Control</Text>
      </LinearGradient>

      {/* DEVICE */}

      <View style={styles.card}>
        <Text style={styles.label}>Select Device</Text>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedDeviceId}
            onValueChange={(v) => setSelectedDeviceId(v)}
          >
            {devices.map((d) => (
              <Picker.Item key={d.id} label={d.name} value={d.id} />
            ))}
          </Picker>
        </View>
      </View>

      {/* MEASUREMENT */}

      <View style={styles.card}>
        <Text style={styles.label}>Measurement</Text>

        {loadingMeasurements ? (
          <ActivityIndicator style={{ marginTop: 10 }} />
        ) : (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedMeasurementId}
              onValueChange={(v) => setSelectedMeasurementId(v)}
            >
              {measurements.map((m) => (
                <Picker.Item
                  key={m.id}
                  label={`${m.name}${m.unit ? ` (${m.unit})` : ""}`}
                  value={m.id}
                />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {/* TOGGLE */}
{/* 
      <View style={styles.cardRow}>
    <Text style={styles.label}>Enable Auto Control</Text>

        <TouchableOpacity
          onPress={() => setIsAutoControlEnabled(!isAutoControlEnabled)}
          style={[
            styles.toggleButton,
            isAutoControlEnabled ? styles.toggleOn : styles.toggleOff,
          ]}
        >
          <Text style={styles.toggleText}>
            {isAutoControlEnabled ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* THRESHOLDS */}

      <View style={styles.cardRow}>
        <Text style={styles.label}>High</Text>

        <TextInput
          value={highThreshold}
          onChangeText={setHighThreshold}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.label}>Low</Text>

        <TextInput
          value={lowThreshold}
          onChangeText={setLowThreshold}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      {/* SAVE */}

      <TouchableOpacity activeOpacity={0.8} onPress={handleSave} disabled={saving}>
        <LinearGradient
          colors={["#047857", "#059669", "#10B981"]}
          style={[styles.button, saving && { opacity: 0.6 }]}
        >
          <Text style={styles.buttonText}>{saving ? "SAVING..." : "SAVE"}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 48,
    backgroundColor: "#f8fafc",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },

  backButton: { padding: 8 },

  title: {
    fontSize: 24,
    fontWeight: "700",
    marginLeft: 12,
    color: "#fff",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  cardRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
  },

  pickerWrapper: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginTop: 8,
  },

  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },

  toggleOn: { backgroundColor: "#10B981" },
  toggleOff: { backgroundColor: "#9CA3AF" },

  toggleText: {
    color: "#fff",
    fontWeight: "700",
  },

  input: {
    width: 80,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    textAlign: "center",
  },

  button: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
