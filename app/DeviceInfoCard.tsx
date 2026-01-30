'use client'

import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import React, { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { RootStackParamList } from "@/navigation/RootNavigator"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native";
const API_BASE = "http://192.168.3.232:5000"

/* ================= TYPES ================= */

type Props = {
  deviceId: string
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    "DeviceDetail"
  >
}

type HistoryMeasurement = {
  id: string
  name: string
  checked: boolean
  configId?: string
}

/* ================= COMPONENT ================= */

export default function DeviceInfoCard({ deviceId }: Props) {
  const [device, setDevice] = useState<any>(null)
const navigation =
  useNavigation<NativeStackNavigationProp<RootStackParamList>>()


  /* rename */
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState("")
  const [savingName, setSavingName] = useState(false)

  /* history setting */
  const [historyMeasurements, setHistoryMeasurements] =
    useState<HistoryMeasurement[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savingHistory, setSavingHistory] = useState(false)

  /* ================= FETCH ================= */

  useEffect(() => {
    if (deviceId) {
      fetchDevice()
      fetchHistorySetting()
    }
  }, [deviceId])

  const fetchDevice = async () => {
    const token = await AsyncStorage.getItem("token")
    if (!token) return

    const res = await axios.get(
      `${API_BASE}/api/customer/devices/${deviceId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    setDevice(res.data)
    setNewName(res.data?.name || "")
  }

  /* ================= HISTORY SETTING ================= */

  const fetchHistorySetting = async () => {
    setLoadingHistory(true)
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) return

      /* 1️⃣ all measurements */
      const parentRes = await axios.get(
        `${API_BASE}/api/customer/devices/${deviceId}/parent-measurements`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const parents = parentRes.data?.measurements || []

      const childrenRes = await Promise.all(
        parents.map((p: any) =>
          axios.get(
            `${API_BASE}/api/customer/devices/${deviceId}/measurements/${p.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      )

    const allMeasurements: { id: string; name: string }[] = []

parents.forEach((parent: any, index: number) => {
  const children = childrenRes[index]?.data?.measurements || []

  if (children.length > 0) {
    // 🔹 parent có con → lấy con
    children.forEach((c: any) => {
      allMeasurements.push({
        id: String(c.id),
        name: c.name,
      })
    })
  } else {
    // 🔹 parent không có con → lấy chính parent
    allMeasurements.push({
      id: String(parent.id),
      name: parent.name,
    })
  }
})


      /* 2️⃣ history-config */
      const historyRes = await axios.get(
        `${API_BASE}/api/customer/history-config`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const historyForDevice = (historyRes.data.measurements || []).filter(
        (h: any) => String(h.device_id) === String(deviceId)
      )

      const historyMap = new Map<string, string>(
        historyForDevice.map((h: any) => [
          String(h.measurement_id),
          String(h.id),
        ])
      )

      /* 3️⃣ merge */
      setHistoryMeasurements(
        allMeasurements.map((m) => ({
          id: m.id,
          name: m.name,
          checked: historyMap.has(m.id),
          configId: historyMap.get(m.id),
        }))
      )
    } catch (err) {
      console.log("❌ fetchHistorySetting error:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const toggleHistory = (id: string) => {
    setHistoryMeasurements((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, checked: !m.checked } : m
      )
    )
  }
 const checkedCount = useMemo(
    () => historyMeasurements.filter((m) => m.checked).length,
    [historyMeasurements]
  )
  const sortedHistoryMeasurements = useMemo(() => {
  return [...historyMeasurements].sort((a, b) => {
    // checked = true lên trước
    if (a.checked === b.checked) return 0
    return a.checked ? -1 : 1
  })
}, [historyMeasurements])

  /* ================= CHANGE DETECT ================= */

  const hasChanged = useMemo(
    () =>
      historyMeasurements.some(
        (m) =>
          (m.checked && !m.configId) ||
          (!m.checked && m.configId)
      ),
    [historyMeasurements]
  )

  const confirmSaveHistory = () => {
    Alert.alert(
      "Confirm",
      "Do you want to save history settings?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Save", onPress: saveHistorySetting },
      ]
    )
  }

  const saveHistorySetting = async () => {
    try {
      setSavingHistory(true)
      const token = await AsyncStorage.getItem("token")
      if (!token) return

      const toAdd = historyMeasurements.filter(
        (m) => m.checked && !m.configId
      )

      const toRemove = historyMeasurements.filter(
        (m) => !m.checked && m.configId
      )

      await Promise.all(
        toAdd.map((m) =>
          axios.post(
            `${API_BASE}/api/customer/devices/${deviceId}/history-config`,
            { measurement_id: m.id },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      )

      await Promise.all(
        toRemove.map((m) =>
          axios.delete(
            `${API_BASE}/api/customer/history-config/${m.configId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      )

      fetchHistorySetting()
    } catch (err) {
      console.log("❌ saveHistorySetting error:", err)
    } finally {
      setSavingHistory(false)
    }
  }

  /* ================= RENAME ================= */

  const saveName = async () => {
    if (!newName.trim()) return
    try {
      setSavingName(true)
      const token = await AsyncStorage.getItem("token")
      if (!token) return

      await axios.put(
        `${API_BASE}/api/customer/devices/${deviceId}/rename`,
        { name: newName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setDevice((d: any) => ({ ...d, name: newName.trim() }))
      setEditing(false)
    } finally {
      setSavingName(false)
    }
  }

  if (!device) return null

  /* ================= RENDER ================= */

  return (
    <View>
      {/* ================= DEVICE INFO ================= */}
      <View style={styles.card}>
        <Row label="Thiết bị">
          {editing ? (
            <View style={{ alignItems: "flex-end" }}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                style={styles.input}
                autoFocus
              />
              <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                <TouchableOpacity onPress={saveName} disabled={savingName}>
                  <Text style={styles.primary}>
                    {savingName ? "Đang lưu..." : "Lưu"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditing(false)}>
                  <Text style={styles.gray}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.value}>
                {device.name} | {device.device_type_name}
              </Text>
            </TouchableOpacity>
          )}
        </Row>

        <Row label="Serial" value={device.serial_number} />
        <Row label="IP" value={device.ip_address} />
        <Row label="Model" value={device.model} />
        <Row label="Site" value={device.site_name} />
      </View>

      {/* ================= HISTORY SETTING ================= */}
    <View style={styles.card}>
        <View style={styles.historyHeader}>
          <Text style={styles.section}>
            History setting ({checkedCount})
          </Text>
          <Ionicons
            name="bar-chart-outline"
            size={20}
            color="#8c8c8c"
          />
        </View>

        {loadingHistory ? (
          <ActivityIndicator />
        ) : (
          <ScrollView style={{ maxHeight: 260 }}>
        {sortedHistoryMeasurements.map((m) => (

              <TouchableOpacity
                key={m.id}
                style={styles.historyRow}
                onPress={() => toggleHistory(m.id)}
              >
                <Text style={styles.historyName}>{m.name}</Text>
                <Text style={styles.check}>{m.checked ? "☑" : "☐"}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {hasChanged && (
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={confirmSaveHistory}
            disabled={savingHistory}
          >
            <Text style={styles.saveText}>
              {savingHistory ? "Đang lưu..." : "Save"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
  style={styles.viewHistoryBtn}
  onPress={() =>
    navigation.navigate("HistoryDetail1", {
      deviceId,
    })
  }
>
  <Ionicons
    name="time-outline"
    size={16}
    color="#2563EB"
  />
  <Text style={styles.viewHistoryText}>
    View history detail
  </Text>
</TouchableOpacity>
    </View>
  )
}

/* ================= SUB ================= */

function Row({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      {children ?? <Text style={styles.value}>{value || "-"}</Text>}
    </View>
  )
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
viewHistoryBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#2563EB",
  backgroundColor: "#EFF6FF",
  marginBottom: 16,
},

viewHistoryText: {
  fontSize: 13,
  fontWeight: "600",
  color: "#2563EB",
},

  label: { fontSize: 13, color: "#374151" },
  value: { fontSize: 13, fontWeight: "600", color: "#111827" },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#2563EB",
    fontSize: 13,
    minWidth: 160,
    textAlign: "right",
  },

  section: {
    fontSize: 14,
    fontWeight: "700",
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  historyName: { fontSize: 13 },
  check: { fontSize: 16 },

  saveBtn: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#2563EB",
    borderRadius: 6,
    alignItems: "center",
  },

  saveText: { color: "#fff", fontWeight: "600" },

  primary: { color: "#2563EB", fontWeight: "600" },
  gray: { color: "#6B7280" },
})
