'use client'

import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import React, { useCallback, useRef, useState, useEffect } from "react"
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { Animated, Easing } from "react-native"

const API_BASE = "http://192.168.3.232:5000"

/* ================= CONFIG ================= */

const PAGE_SIZE = 14
const LOADING_DELAY = 1200

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

/* ================= TYPES ================= */

type Alarm = {
  id: number
  device_id: string
  event_type?: string
  description?: string
  severity?: "low" | "medium" | "high"
  triggered_at: string
}

type Cursor = {
  cursor_time: string
  cursor_id: number
}

type Props = {
  deviceId: string
}

/* ================= SPINNER ================= */

const Spinner = () => {
  const rotate = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()
  }, [])

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  return (
    <Animated.View
      style={{
        width: 24,
        height: 24,
        borderWidth: 3,
        borderColor: "#CBD5E1",
        borderTopColor: "#2563EB",
        borderRadius: 12,
        transform: [{ rotate: spin }],
      }}
    />
  )
}

/* ================= COMPONENT ================= */

export default function DeviceAlarms({ deviceId }: Props) {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchingRef = useRef(false)

  /* ================= FETCH ================= */

  const fetchMore = async (isInitial = false) => {
    if (fetchingRef.current) return
    if (!hasMore && !isInitial) return

    fetchingRef.current = true
    isInitial ? setInitialLoading(true) : setLoadingMore(true)

    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) return

      if (!isInitial) {
        await sleep(LOADING_DELAY)
      }

      const res = await axios.get(
        `${API_BASE}/api/customer/devices/${deviceId}/alarms`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            limit: PAGE_SIZE,
            cursor_time: cursor?.cursor_time,
            cursor_id: cursor?.cursor_id,
          },
        }
      )

      const newLogs: Alarm[] = res.data.logs || []

      setAlarms(prev =>
        isInitial ? newLogs : [...prev, ...newLogs]
      )

      setCursor(res.data.nextCursor ?? null)
      setHasMore(res.data.hasMore === true)
    } catch (err) {
      console.log("❌ FETCH ALARMS ERROR:", err)
    } finally {
      fetchingRef.current = false
      setInitialLoading(false)
      setLoadingMore(false)
    }
  }

  /* ================= LOAD WHEN TAB OPEN ================= */

  useFocusEffect(
    useCallback(() => {
      setAlarms([])
      setCursor(null)
      setHasMore(true)
      fetchingRef.current = false

      fetchMore(true)
    }, [deviceId])
  )

  /* ================= RENDER ITEM ================= */

  const renderItem = ({ item }: { item: Alarm }) => {
    const color =
      item.severity === "high"
        ? "#EF4444"
        : item.severity === "medium"
        ? "#FACC15"
        : "#9CA3AF"

    return (
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.content}>
          <Text style={styles.alarmTitle}>
            {item.event_type || item.description || "Alarm"}
          </Text>
          <Text style={styles.time}>
            {new Date(item.triggered_at).toLocaleString("vi-VN")}
          </Text>
        </View>
      </View>
    )
  }

  /* ================= RENDER ================= */

  return (
    <View style={styles.card}>
      <Text style={styles.title}>ALARMS</Text>

      <FlatList
        data={alarms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}

        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={PAGE_SIZE}
        windowSize={3}
        removeClippedSubviews={false}

        // 🔥 BẮT BUỘC – ÉP LIST SCROLL ĐƯỢC
        contentContainerStyle={{ paddingBottom: 80 }}

        onEndReached={() => {
          if (!loadingMore && hasMore && !initialLoading) {
            fetchMore(false)
          }
        }}
        onEndReachedThreshold={0.6}

        // 🔥 FOOTER LUÔN CÓ CHỖ ĐỂ RENDER
        ListFooterComponent={
          <View style={{ minHeight: loadingMore ? 60 : 0 }}>
            {loadingMore && (
              <View style={styles.loadingBox}>
                <Spinner />
                <Text style={styles.loadingText}>
                  Đang tải thêm dữ liệu...
                </Text>
              </View>
            )}
          </View>
        }

        ListEmptyComponent={
          !initialLoading ? (
            <Text style={styles.empty}>
              Không có cảnh báo nào.
            </Text>
          ) : null
        }
      />
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

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  empty: {
    marginTop: 10,
    color: "#6B7280",
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  content: {
    flex: 1,
  },

  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },

  loadingText: {
    fontSize: 13,
    color: "#6B7280",
  },

  alarmTitle: {
    fontSize: 14,
    fontWeight: "600",
  },

  time: {
    fontSize: 12,
    color: "#6B7280",
  },
})
