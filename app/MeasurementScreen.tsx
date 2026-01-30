'use client'

import React, { useEffect, useRef, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { ArrowLeft, RefreshCcw } from "lucide-react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";
import { AuthContext } from "../contexts/AuthContext";

/* ================= ROUTES ================= */
type RootStackParamList = {
  Measurement: { deviceId: string; deviceName: string; deviceType: string };
  AutoControl: { deviceId: string };
};

type RouteProps = RouteProp<RootStackParamList, "Measurement">;

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
const calcAvg = (children: MeasurementItem[]) => {
  const nums = children
    .map(c => Number(c.value))
    .filter(v => !isNaN(v));

  if (nums.length === 0) return "-";

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return avg.toFixed(1);
};

/* ================= ON / OFF SEGMENT ================= */
const OnOffSegment = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <View style={styles.segmentContainer}>
    <TouchableOpacity
      style={[styles.segment, !value && styles.segmentOffActive]}
      onPress={() => onChange(false)}
    >
      <Text style={!value ? styles.textOffActive : styles.textInactive}>OFF</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.segment, value && styles.segmentOnActive]}
      onPress={() => onChange(true)}
    >
      <Text style={value ? styles.textOnActive : styles.textInactive}>ON</Text>
    </TouchableOpacity>
  </View>
);

/* ================= SCREEN ================= */
export default function MeasurementCombinedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProps>();
  const { isLoggedIn } = useContext(AuthContext)!;

  const { deviceId, deviceName, deviceType } = route.params;

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<MeasurementGroup[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [deviceOn, setDeviceOn] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const sectionHeights = useRef<number[]>([]);

  const screenHeight = Dimensions.get("window").height;
  const bottomOffset = 20;
  const maxScrollHeight = screenHeight - bottomOffset;

  /* ================= FETCH ALL ================= */
  const refreshAll = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const parentRes = await axios.get(
        `http://192.168.3.232:5000/api/customer/devices/${deviceId}/parent-measurements`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const parents: MeasurementGroup[] = parentRes.data.measurements.map(
        (m: any) => ({
          id: m.id,
          name: m.name,
          value: m.value ?? "-",
          unit: m.unit ?? "-",
          children: [],
        })
      );

      const childrenRes = await Promise.all(
        parents.map((p) =>
          axios
            .get(
              `http://192.168.3.232:5000/api/customer/devices/${deviceId}/measurements/${p.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            .then((r) => ({
              parentId: p.id,
              children: r.data.measurements.map((m: any) => ({
                id: m.id,
                name: m.name,
                value: m.value ?? "-",
                unit: m.unit ?? "-",
              })),
            }))
        )
      );
const finalGroups: MeasurementGroup[] = parents.map((p) => {
  const match = childrenRes.find((c) => c.parentId === p.id);

  if (!match || match.children.length === 0) {
    // CHA KHÔNG CÓ CON → GIỮ VALUE GỐC
    return p;
  }

  // CHA CÓ CON → TÍNH AVG
  return {
    ...p,
    value: calcAvg(match.children),
    unit: match.children[0]?.unit ?? p.unit,
    children: match.children,
  };
});


      setGroups(finalGroups);
      setSelected(finalGroups[0]?.id ?? null);

      Toast.show({ type: "success", text1: "Refresh successful" });
    } catch (e) {
      console.error(e);
      Toast.show({ type: "error", text1: "Refresh failed" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) refreshAll();
  }, [isLoggedIn]);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    if (!selected || !groups.length) return;

    const index = groups.findIndex((g) => g.id === selected);
    if (index === -1) return;

    const offset = sectionHeights.current
      .slice(0, index)
      .reduce((a, b) => a + b, 0);

    scrollRef.current?.scrollTo({
      y: Math.max(offset - 80, 0),
      animated: true,
    });
  }, [selected]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 8 }}>Loading measurements...</Text>
      </View>
    );
  }

  /* ================= RENDER ================= */
  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        style={{ maxHeight: maxScrollHeight }}
        contentContainerStyle={styles.container}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#111" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {deviceName} - {deviceType}
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("AutoControl", { deviceId })
            }
          >
          <Text style={styles.configText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* ===== CONTROL BAR ===== */}
      <View style={{ alignItems: "center", marginVertical: 16 }}>
  <OnOffSegment value={deviceOn} onChange={setDeviceOn} />
</View>


        {/* ===== PARENT LIST ===== */}
        {groups.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[
              styles.parentRow,
              selected === g.id && styles.parentActive,
            ]}
            onPress={() => setSelected(g.id)}
          >
            <Text style={styles.parentText}>
              {g.name}: {g.value} {g.unit}
            </Text>
          </TouchableOpacity>
        ))}

        {/* ===== DETAIL ===== */}
        {groups.map((group, idx) => {
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

          const height = 70 + rows.length * 40;
          sectionHeights.current[idx] = height;

          return (
            <View
              key={group.id}
              style={[
                styles.section,
                selected === group.id && styles.sectionActive,
              ]}
            >
              <Text style={styles.sectionTitle}>{group.name}</Text>

              <View style={styles.tableHeader}>
                <Text style={styles.cellHeader}>Name</Text>
                <Text style={styles.cellHeader}>Value</Text>
                <Text style={styles.cellHeader}>Unit</Text>
              </View>

              {rows.map((r, i) => (
                <View
                  key={r.id}
                  style={[
                    styles.row,
                    i % 2 === 0 ? styles.rowEven : styles.rowOdd,
                  ]}
                >
                  <Text style={styles.cell}>{r.name}</Text>
                  <Text style={styles.cell}>{r.value}</Text>
                  <Text style={styles.cell}>{r.unit}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={refreshAll}>
  <RefreshCcw size={16} color="#fff" />
</TouchableOpacity>

    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff", paddingTop: 50 },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  container: { paddingHorizontal: 16, paddingBottom: 30 },

  /* HEADER */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
fab: {
  position: "absolute",
  right: 20,
  bottom: 30,
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: "#4A90E2",
  justifyContent: "center",
  alignItems: "center",
  elevation: 4,
},

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },



 configText: { fontSize: 20 },

  /* CONTROL */
  controlBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4A90E2",
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
  },

  refreshText: { color: "#fff", fontWeight: "600" },

  /* SEGMENT */
  segmentContainer: {
    flexDirection: "row",
    width: 200,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },

  segment: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  segmentOffActive: { backgroundColor: "#111" },
  segmentOnActive: { backgroundColor: "#22c55e" },

  textInactive: { color: "#6b7280", fontWeight: "700" },
  textOffActive: { color: "#a4a7ad", fontWeight: "700" },
  textOnActive: { color: "#fff", fontWeight: "700" },

  /* PARENT */
  parentRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },

  parentActive: {
    backgroundColor: "#fde68a",
    borderRadius: 6,
  },

  parentText: { fontSize: 15, fontWeight: "600" },

  /* DETAIL */
  section: { marginTop: 16 },
  sectionActive: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 8,
  },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    paddingVertical: 6,
  },

  row: { flexDirection: "row", paddingVertical: 6 },
  rowEven: { backgroundColor: "#f3f4f6" },
  rowOdd: { backgroundColor: "#fff" },

  cell: { flex: 1, textAlign: "center", fontSize: 14 },
  cellHeader: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
  },
});
