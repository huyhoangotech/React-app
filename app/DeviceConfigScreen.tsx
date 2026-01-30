import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";

/* ================= TYPES ================= */

type ConfigDevice = {
  deviceId: string;
  name: string;
  type?: string;
  location: string;
  is_visible: boolean;
};

/* ================= CHECKBOX ================= */

const Checkbox = ({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) => (
  <TouchableOpacity
    onPress={onToggle}
    style={[styles.checkbox, checked && styles.checkboxChecked]}
  >
    {checked && <Text style={styles.checkboxTick}>✓</Text>}
  </TouchableOpacity>
);

/* ================= SCREEN ================= */

export default function DeviceConfigScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [devices, setDevices] = useState<ConfigDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDevicesWithConfig();
  }, []);

  /* ================= FETCH ALL + CONFIG ================= */

 const fetchDevicesWithConfig = async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const [allRes, configRes] = await Promise.all([
      axios.get(
        "http://192.168.3.232:5000/api/customer/all-devices",
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      axios.get(
        "http://192.168.3.232:5000/api/customer/user-devices",
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ]);

    /**
     * ⚠️ API getUserDevices trả về:
     * {
     *   success: true,
     *   data: [...]
     * }
     */
    const configMap = new Map<string, boolean>();

    configRes.data?.data?.forEach((c: any) => {
      configMap.set(
        c.device_id,
        c.is_visible === 1
      );
    });

    const merged: ConfigDevice[] = allRes.data.devices.map((d: any) => ({
      deviceId: d.id,
      name: d.name,
      type: d.type,
      location: d.location,

      // ⭐ LOGIC CHUẨN:
      // - có config → dùng config
      // - chưa có → default TRUE (check)
      is_visible: configMap.has(d.id)
        ? configMap.get(d.id)!
        : true,
    }));

    setDevices(merged);
  } catch (err) {
    console.error("❌ fetchDevicesWithConfig error:", err);
  } finally {
    setLoading(false);
  }
};
  /* ================= SAVE ================= */

  const saveConfig = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await Promise.all(
        devices.map((d) =>
          axios.post(
            "http://192.168.3.232:5000/api/customer/config",
            {
              deviceId: d.deviceId,
              is_visible: d.is_visible ? 1 : 0,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      Alert.alert("✅ Success", "Config saved successfully", [
      {
        text: "OK",
        onPress: () => navigation.goBack(), // ⬅️ quay về Home
      },
    ]);
    } catch (err) {
      console.error("❌ saveConfig error:", err);
      Alert.alert("❌ Error", "Save failed");
    } finally {
      setSaving(false);
    }
  };

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
      <Text style={styles.title}>Favorite Devices</Text>

      <FlatList
        data={devices}
        keyExtractor={(i) => i.deviceId}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.type} · {item.location}
              </Text>
            </View>

            <Checkbox
              checked={item.is_visible}
              onToggle={() =>
                setDevices((prev) =>
                  prev.map((d) =>
                    d.deviceId === item.deviceId
                      ? { ...d, is_visible: !d.is_visible }
                      : d
                  )
                )
              }
            />
          </View>
        )}
      />

      <View style={styles.saveBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={saveConfig}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving..." : "Save changes"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 16 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 35,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: "#E5E7EB",
  },

  name: { fontWeight: "700", fontSize: 14 },
  meta: { fontSize: 11, color: "#6B7280" },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  checkboxTick: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  saveBar: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#F9FAFB",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
});
