"use client";

import React, { useEffect, useRef, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from "react-native";
import {
  ArrowLeft,
  RefreshCcw,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity,
  Gauge,
  Zap,
  Power,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";
import { AuthContext } from "../contexts/AuthContext";

const { width } = Dimensions.get("window");

/* ================= ROUTES ================= */
type RootStackParamList = {
  Measurement: { deviceId: string; deviceName: string; deviceType: string;canControl?: boolean; };
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
  const nums = children.map((c) => Number(c.value)).filter((v) => !isNaN(v));
  if (nums.length === 0) return "-";
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return avg.toFixed(1);
};

/* ================= ON / OFF SEGMENT ================= */
const OnOffSegment = ({
  value,
  onChange,
  deviceId,
  deviceName,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  deviceId: string;
  deviceName: string;
}) => {

  const navigation = useNavigation<any>();

  return (
    <View style={styles.segmentContainer}>
      
      {/* ON / OFF (đang ẩn) */}
      {/*
      <TouchableOpacity
        style={[styles.segment, !value && styles.segmentOffActive]}
        onPress={() => onChange(false)}
        activeOpacity={0.8}
      >
        <Power width={16} height={16} color={!value ? "#fff" : "#9CA3AF"} />
        <Text style={!value ? styles.textOffActive : styles.textInactive}>
          OFF
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, value && styles.segmentOnActive]}
        onPress={() => onChange(true)}
        activeOpacity={0.8}
      >
        <Power width={16} height={16} color={value ? "#fff" : "#9CA3AF"} />
        <Text style={value ? styles.textOnActive : styles.textInactive}>
          ON
        </Text>
      </TouchableOpacity>
      */}

      {/* ACTION BUTTONS */}
      <View style={styles.actionRow}>
        
        {/* HISTORY */}
        <TouchableOpacity
          style={[styles.segment, styles.historyBtn]}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("HistoryDetail1", {
              deviceId,
            })
          }
        >
          <Activity width={16} height={16} color="#fff" />
          <Text style={styles.actionText}>History</Text>
        </TouchableOpacity>

        {/* ALARM */}
        <TouchableOpacity
          style={[styles.segment, styles.alarmBtn]}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("DeviceAlarms", {
  deviceId,
  deviceName,
})

          }
        >
          <Zap width={16} height={16} color="#fff" />
          <Text style={styles.actionText}>Alarm</Text>
        </TouchableOpacity>
</View>

  </View>
);
};
/* ================= SCREEN ================= */
export default function MeasurementCombinedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProps>();
  const { isLoggedIn } = useContext(AuthContext)!;

    const {
    deviceId,
    deviceName,
    deviceType,
    canControl = false,
  } = route.params ?? {};
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<MeasurementGroup[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [deviceOn, setDeviceOn] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const scrollRef = useRef<ScrollView>(null);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

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
          return p;
        }
        return {
          ...p,
          value: calcAvg(match.children),
          unit: match.children[0]?.unit ?? p.unit,
          children: match.children,
        };
      });

      setGroups(finalGroups);
      setSelected(finalGroups[0]?.id ?? null);
      // Expand first group by default
      if (finalGroups.length > 0) {
        setExpandedGroups(new Set([finalGroups[0].id]));
      }

      Toast.show({ type: "success", text1: "Data refreshed successfully" });
    } catch (e) {
      console.error(e);
      Toast.show({ type: "error", text1: "Failed to refresh data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) refreshAll();
  }, [isLoggedIn]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <LinearGradient
        colors={["#059669", "#10B981", "#34D399"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading measurements...</Text>
      </LinearGradient>
    );
  }

  /* ================= RENDER ================= */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <ArrowLeft width={22} height={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {deviceName}
            </Text>
            <View style={styles.deviceTypeBadge}>
              <Text style={styles.deviceTypeText}>{deviceType}</Text>
            </View>
          </View>

        {canControl && (
  <TouchableOpacity
    onPress={() =>
      navigation.navigate("DeviceDetail", {
        deviceId,
        deviceName,
        deviceType,
      })
    }
    style={styles.settingsBtn}
  >
    <Settings width={22} height={22} color="#fff" />
  </TouchableOpacity>
)}


        </View>

        {/* CONTROL SEGMENT */}
     {/* CONTROL SEGMENT */}
{canControl && (
  <View style={styles.controlContainer}>
<OnOffSegment
  value={deviceOn}
  onChange={setDeviceOn}
  deviceId={deviceId}
   deviceName={deviceName}
/>

  </View>
)}


        {/* SUMMARY CARDS */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrapper, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Gauge width={18} height={18} color="#10B981" />
            </View>
            <Text style={styles.summaryNumber}>{groups.length}</Text>
            <Text style={styles.summaryLabel}>Groups</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrapper, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
              <Activity width={18} height={18} color="#3B82F6" />
            </View>
            <Text style={styles.summaryNumber}>
              {groups.reduce((acc, g) => acc + (g.children?.length || 1), 0)}
            </Text>
            <Text style={styles.summaryLabel}>Parameters</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrapper, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Zap width={18} height={18} color="#F59E0B" />
            </View>
            <Text style={styles.summaryNumber}>{deviceOn ? "ON" : "OFF"}</Text>
            <Text style={styles.summaryLabel}>Status</Text>
          </View>
        </View>
      </LinearGradient>

      {/* CONTENT */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MEASUREMENT GROUPS */}
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
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
            <View key={group.id} style={styles.groupCard}>
              {/* Group Header */}
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(group.id)}
                activeOpacity={0.7}
              >
                <View style={styles.groupHeaderLeft}>
                  <View style={styles.groupIconWrapper}>
                    <Gauge width={20} height={20} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupValue}>
                      {group.value} {group.unit}
                    </Text>
                  </View>
                </View>
                <View style={styles.groupHeaderRight}>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{rows.length}</Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp width={20} height={20} color="#9CA3AF" />
                  ) : (
                    <ChevronDown width={20} height={20} color="#9CA3AF" />
                  )}
                </View>
              </TouchableOpacity>

              {/* Group Content */}
              {isExpanded && (
                <View style={styles.groupContent}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Name</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>
                      Value
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: "right" }]}>
                      Unit
                    </Text>
                  </View>

                  {/* Table Rows */}
                  {rows.map((r, i) => (
                    <View
                      key={r.id}
                      style={[
                        styles.tableRow,
                        i % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                        i === rows.length - 1 && styles.tableRowLast,
                      ]}
                    >
                      <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <View style={[styles.valueBadge, { flex: 1 }]}>
                        <Text style={styles.valueBadgeText}>{r.value}</Text>
                      </View>
                      <Text
                        style={[styles.tableCell, styles.unitCell, { flex: 0.8 }]}
                      >
                        {r.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* REFRESH FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={refreshAll}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#059669", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <RefreshCcw width={22} height={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FDF4",
  },
 actionRow: {
  flexDirection: "row",
  gap: 12,
  width: "100%",
  justifyContent: "center",
},


historyBtn: {
  backgroundColor: "#374151",
},

alarmBtn: {
  backgroundColor: "#e2ad51",
},

actionText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 13,
},

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },

  // Header
  headerGradient: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  deviceTypeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  deviceTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Control Segment
  controlContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
 segmentContainer: {
  flexDirection: "row",
  alignSelf: "center",
},


  segment: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
     
  },
  segmentOffActive: {
    backgroundColor: "#374151",
  },
  segmentOnActive: {
    backgroundColor: "#22C55E",
  },
  textInactive: {
    color: "#9CA3AF",
    fontWeight: "700",
    fontSize: 13,
  },
  textOffActive: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  textOnActive: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  // Summary Cards
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },

  // Group Card
  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  groupIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  groupName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  groupValue: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
  },
  groupHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },

  // Group Content
  groupContent: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableRowEven: {
    backgroundColor: "#fff",
  },
  tableRowOdd: {
    backgroundColor: "#F9FAFB",
  },
  tableRowLast: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  tableCell: {
    fontSize: 13,
    color: "#374151",
  },
  valueBadge: {
    alignItems: "center",
  },
  valueBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  unitCell: {
    textAlign: "right",
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    borderRadius: 28,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
