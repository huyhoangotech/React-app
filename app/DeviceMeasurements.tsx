'use client'

import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

const API_BASE = "http://192.168.3.232:5000"

/* ================= PROPS ================= */

type Props = {
  deviceId: string
}

/* ================= COMPONENT ================= */

export default function DeviceMeasurements({ deviceId }: Props) {
  const [measurements, setMeasurements] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [measureTime, setMeasureTime] = useState("")

  /* ================= TIME ================= */
  useEffect(() => {
    const now = new Date()
    const formatted = `${now
      .getDate()
      .toString()
      .padStart(2, "0")}/${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${now.getFullYear()} ${now
      .getHours()
      .toString()
      .padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${now
      .getSeconds()
      .toString()
      .padStart(2, "0")}`

    setMeasureTime(formatted)
  }, [])

  /* ================= FETCH ================= */
  useEffect(() => {
    if (deviceId) fetchMeasurements()
  }, [deviceId])

  const fetchMeasurements = async () => {
    setLoading(true)
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) return

      // 1️⃣ Parent measurements
      const parentRes = await axios.get(
        `${API_BASE}/api/customer/devices/${deviceId}/parent-measurements`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const parents = parentRes.data?.measurements || []

      // 2️⃣ Children
      const requests = parents.map((p: any) =>
        axios
          .get(
            `${API_BASE}/api/customer/devices/${deviceId}/measurements/${p.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then((res) => ({
            parent: p,
            children: res.data.measurements || [],
          }))
      )

      const results = await Promise.all(requests)

      // 3️⃣ Flatten
      const flat: any[] = []

      results.forEach((r) => {
        if (r.children.length > 0) {
          r.children.forEach((m: any) =>
            flat.push({
              id: m.id,
              name: m.name,
              value: m.value ?? "-",
              unit: m.unit ?? "-",
            })
          )
        } else {
          flat.push({
            id: r.parent.id,
            name: r.parent.name,
            value: r.parent.value ?? "-",
            unit: r.parent.unit ?? "-",
          })
        }
      })

      setMeasurements(flat)
    } catch (err) {
      console.log("❌ FETCH MEASUREMENTS ERROR:", err)
      setMeasurements([])
    } finally {
      setLoading(false)
    }
  }

  /* ================= RENDER ================= */

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>MEASUREMENTS</Text>
        <Text style={styles.time}>{measureTime}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 4 }}
        nestedScrollEnabled
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : measurements.length === 0 ? (
          <Text style={styles.empty}>Không có dữ liệu đo.</Text>
        ) : (
          measurements.map((m, i) => (
            <View key={`${m.id}-${i}`} style={styles.row}>
              <Text style={styles.label}>
                {m.name}
                {m.unit !== "-" ? ` (${m.unit})` : ""}
              </Text>
              <Text style={styles.value}>{m.value}</Text>
            </View>
          ))
        )}
      </ScrollView>
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

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },

  title: { fontSize: 18, fontWeight: "700", color: "#111" },
  time: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  scroll: { maxHeight: 260 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  label: { fontSize: 13, color: "#374151" },
  value: { fontSize: 13, fontWeight: "600", color: "#111827" },

  empty: { marginTop: 10, color: "#6B7280" },
})
