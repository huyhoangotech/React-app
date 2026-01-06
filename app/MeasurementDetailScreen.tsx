import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ArrowLeft, RefreshCcw } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

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
  navigation: any;
  route: { params: { deviceId: string; parentId?: string } };
}

export default function MeasurementDetailScreen({ navigation, route }: Props) {
  const { deviceId, parentId } = route.params;
  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<MeasurementGroup[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sectionHeights, setSectionHeights] = useState<number[]>([]);

  const screenHeight = Dimensions.get("window").height;
  const bottomBarHeight = 90;
  const topScrollHeight = screenHeight - bottomBarHeight - 20;

  //=============================================================
  // FETCH PARENTS
  //=============================================================
  const fetchParents = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const parentRes = await axios.get(
        `http://192.168.3.232:5000/api/customer/devices/${deviceId}/parent-measurements`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const parentGroups: MeasurementGroup[] = parentRes.data.measurements.map(
        (m: any) => ({
          id: m.id,
          name: m.name,
          value: m.value ?? "-",
          unit: m.unit ?? "-",
        })
      );

      setGroups(parentGroups);
    } catch (err) {
      console.error("FETCH PARENTS ERROR:", err);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  //=============================================================
  // AUTO LOAD ALL CHILDREN AFTER PARENTS LOADED
  //=============================================================
  useEffect(() => {
    if (!groups.length) return;

    const loadAllChildren = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const promises = groups.map((g) =>
          axios
            .get(
              `http://192.168.3.232:5000/api/customer/devices/${deviceId}/measurements/${g.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            .then((res) => ({
              id: g.id,
              children: res.data.measurements.map((m: any) => ({
                id: m.id,
                name: m.name,
                value: m.value ?? "-",
                unit: m.unit ?? "-",
              })),
            }))
        );

        const results = await Promise.all(promises);

        // gắn children vào groups
        setGroups((prev) =>
          prev.map((g) => {
            const match = results.find((r) => r.id === g.id);
            return match ? { ...g, children: match.children } : g;
          })
        );
      } catch (err) {
        console.error("LOAD ALL CHILDREN ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllChildren();
  }, [groups.length]);

  //=============================================================
  // AUTO SELECT PARENT
  //=============================================================
  useEffect(() => {
    if (!groups.length) return;

    if (parentId) setSelected(parentId);
    else setSelected(groups[0].id);
  }, [groups]);

  //=============================================================
  // AUTO SCROLL TO CENTER OF SELECTED SECTION
  //=============================================================
  useEffect(() => {
    if (!selected || !groups.length || !sectionHeights.length) return;

    const index = groups.findIndex((g) => g.id === selected);
    if (index === -1) return;

    const offsetBefore = sectionHeights
      .slice(0, index)
      .reduce((a, b) => a + b, 0);

    const targetHeight = sectionHeights[index];
    const targetScroll =
      offsetBefore - topScrollHeight / 2 + targetHeight / 2;

    scrollRef.current?.scrollTo({
      y: Math.max(targetScroll, 0),
      animated: true,
    });
  }, [sectionHeights, selected]);

  //=============================================================
  // PRE-COMPUTE HEIGHTS AFTER CHILDREN LOADED
  //=============================================================
  useEffect(() => {
    const heights = groups.map((g) => {
      const childCount = g.children?.length ?? 1;
      return 70 + childCount * 40;
    });
    setSectionHeights(heights);
  }, [groups]);

  //=============================================================
  // LOADING SCREEN
  //=============================================================
  if (loading) {
    return (
      <View style={styles.wrapper}>
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 100 }} />
        <Text style={{ textAlign: "center", marginTop: 8 }}>
          Loading measurements...
        </Text>
      </View>
    );
  }

  //=============================================================
  // MAIN RENDER
  //=============================================================
  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        style={{ maxHeight: topScrollHeight }}
        contentContainerStyle={styles.container}
      >
        {groups.map((group, idx) => {
          const isSelected = group.id === selected;
          const children = group.children ?? [];

          return (
            <TouchableOpacity
              key={group.id}
              onPress={() => setSelected(group.id)}
              activeOpacity={0.85}
              style={[
                styles.section,
                isSelected && {
                  backgroundColor: "#fde68a",
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: "#f59e0b",
                },
              ]}
            >
              <Text style={styles.sectionTitle}>{group.name}</Text>

              <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.headerCell]}>Name</Text>
                <Text style={[styles.cell, styles.headerCell]}>Value</Text>
                <Text style={[styles.cell, styles.headerCell]}>Unit</Text>
              </View>

          {(children.length > 0
  ? children
  : [
      {
        id: group.id,
        name: group.name,
        value: group.value ?? "-",
        unit: group.unit ?? "-",
      },
    ]
).map((item, cIdx) => (
  <View
    key={item.id}
    style={[
      styles.tableRow,
      cIdx % 2 === 0 ? styles.rowEven : styles.rowOdd,
      isSelected && { backgroundColor: "#fef3c7" },
    ]}
  >
    <Text style={styles.cell}>{item.name}</Text>
    <Text style={styles.cell}>{item.value}</Text>
    <Text style={styles.cell}>{item.unit}</Text>
  </View>
))}

             
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: "#E53935" }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={16} color="#fff" />
          <Text style={styles.bottomBtnText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: "#4A90E2" }]}
          onPress={() =>
            Toast.show({
              type: "success",
              text1: "Refresh now!",
              position: "top",
              visibilityTime: 1500,
              topOffset: 50,
            })
          }
        >
          <RefreshCcw size={16} color="#fff" />
          <Text style={styles.bottomBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f8fafc" },
  container: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    paddingVertical: 8,
  },
  tableRow: { flexDirection: "row", paddingVertical: 8 },
  rowEven: { backgroundColor: "#f3f4f6" },
  rowOdd: { backgroundColor: "#fff" },
  cell: { flex: 1, textAlign: "center", fontSize: 14 },
  headerCell: { fontWeight: "600", color: "#111827" },
  bottomBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 45,
    borderRadius: 8,
    overflow: "hidden",
    height: 56,
  },
  bottomBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  bottomBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
