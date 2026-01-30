'use client';

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { RefreshCcw } from "lucide-react-native";

/* ================= TYPES ================= */

interface MeasurementItem {
  id: string;
  name: string;
  value: string | null;
  unit: string | null;
}

interface MeasurementGroup {
  id: string;
  name: string;
  value: string | null;
  unit: string | null;
  children?: MeasurementItem[];
}

interface Props {
  deviceId: string;
  initialParentId?: string;
}

/* ================= CONFIG ================= */

const API_BASE = "http://192.168.3.232:5000";

/* ================= COMPONENT ================= */

export default function DeviceMeasurementsTab({
  deviceId,
  initialParentId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<MeasurementGroup[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  /* ================= FETCH ================= */

  const refreshAll = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      // 1️⃣ Parent
      const parentRes = await axios.get(
        `${API_BASE}/api/customer/devices/${deviceId}/parent-measurements`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const parentGroups: MeasurementGroup[] =
        parentRes.data.measurements.map((m: any) => ({
          id: m.id,
          name: m.name,
          value: m.value ?? "-",
          unit: m.unit ?? "-",
          children: [],
        }));

      // 2️⃣ Children
      const childRequests = parentGroups.map((g) =>
        axios
          .get(
            `${API_BASE}/api/customer/devices/${deviceId}/measurements/${g.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then((res) => ({
            parentId: g.id,
            children:
              res.data.measurements?.map((m: any) => ({
                id: m.id,
                name: m.name,
                value: m.value ?? "-",
                unit: m.unit ?? "-",
              })) || [],
          }))
      );

      const childrenResults = await Promise.all(childRequests);

      const finalGroups = parentGroups.map((g) => {
        const match = childrenResults.find((c) => c.parentId === g.id);
        return match ? { ...g, children: match.children } : g;
      });

      setGroups(finalGroups);
      setSelected(initialParentId ?? finalGroups[0]?.id ?? null);

      Toast.show({
        type: "success",
        text1: "Refresh successful",
        visibilityTime: 1000,
        topOffset: 40,
      });
    } catch (err) {
      console.error(err);
      Toast.show({
        type: "error",
        text1: "Refresh failed",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    if (deviceId) refreshAll();
  }, [deviceId]);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading measurements...</Text>
      </View>
    );
  }

  /* ================= RENDER ================= */

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
      >
        {groups.map((group) => {
          const isSelected = group.id === selected;

          const rows =
            group.children && group.children.length > 0
              ? group.children
              : [
                  {
                    id: group.id,
                    name: group.name,
                    value: group.value,
                    unit: group.unit,
                  },
                ];

          return (
            <Pressable
              key={group.id}
              onPress={() => setSelected(group.id)}
              style={[
                styles.section,
                isSelected && styles.sectionSelected,
              ]}
            >
              <Text style={styles.sectionTitle}>{group.name}</Text>

              <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.headerCell]}>Name</Text>
                <Text style={[styles.cell, styles.headerCell]}>Value</Text>
                <Text style={[styles.cell, styles.headerCell]}>Unit</Text>
              </View>

              {rows.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.tableRow,
                    idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
                  ]}
                >
                  <Text style={styles.cell}>{item.name}</Text>
                  <Text style={[styles.cell, styles.value]}>
                    {item.value}
                  </Text>
                  <Text style={styles.cell}>{item.unit}</Text>
                </View>
              ))}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 🔽 SMALL FLOATING REFRESH */}
      <Pressable style={styles.refreshFab} onPress={refreshAll}>
        <RefreshCcw size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f8fafc" },

  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 80,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 8,
    color: "#6B7280",
  },

  section: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 1,
  },

  sectionSelected: {
    borderWidth: 2,
    borderColor: "#f59e0b",
    backgroundColor: "#fff7ed",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111827",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    paddingVertical: 6,
    borderRadius: 4,
  },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
  },

  rowEven: { backgroundColor: "#f9fafb" },
  rowOdd: { backgroundColor: "#fff" },

  cell: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    color: "#374151",
  },

  value: {
    fontWeight: "600",
    color: "#111827",
  },

  headerCell: {
    fontWeight: "700",
    color: "#111827",
  },

  /* 🔽 FAB */
  refreshFab: {
    position: "absolute",
    bottom: 18,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});
