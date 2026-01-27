'use client'

import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native"

const API_BASE = "http://192.168.3.232:5000"

/* ================= TYPES ================= */

type Props = {
  deviceId: string
}

/* ================= COMPONENT ================= */

export default function DeviceAlarms({ deviceId }: Props) {
  const [alarms, setAlarms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAlarms()
  }, [deviceId])

  const fetchAlarms = async () => {
    setLoading(true)
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) return

      const res = await axios.get(
        `${API_BASE}/api/customer/alarms/logs`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const filtered = (res.data?.logs || []).filter(
        (l: any) => String(l.device_id) === String(deviceId)
      )

      setAlarms(
        filtered.map((l: any) => ({
          title: l.event_type || l.name || "Alarm",
          time: l.triggered_at
            ? new Date(l.triggered_at).toLocaleString("vi-VN")
            : "-",
          color:
            l.severity === "high"
              ? "#EF4444"
              : l.severity === "medium"
              ? "#FACC15"
              : "#9CA3AF",
        }))
      )
    } catch (err) {
      console.log("❌ FETCH ALARMS ERROR:", err)
      setAlarms([])
    } finally {
      setLoading(false)
    }
  }

  /* ================= RENDER ================= */

  return (
    <View style={styles.card}>
      <Text style={styles.title}>ALARMS</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : alarms.length === 0 ? (
        <Text style={styles.empty}>Không có cảnh báo nào.</Text>
      ) : (
        alarms.map((a, i) => (
          <View key={i} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: a.color }]} />
            <View style={styles.content}>
              <Text style={styles.alarmTitle}>{a.title}</Text>
              <Text style={styles.time}>{a.time}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  )
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
  },

  title: { fontSize: 18, fontWeight: "700", color: "#111" },

  empty: { marginTop: 10, color: "#6B7280" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  dot: { width: 12, height: 12, borderRadius: 6 },

  content: { flex: 1 },

  alarmTitle: { fontSize: 14, fontWeight: "600" },
  time: { fontSize: 12, color: "#6B7280" },
})
