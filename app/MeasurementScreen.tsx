// MeasurementScreen.tsx
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";

// ================= ROUTES =================
export type RootStackParamList = {
  Home: undefined;
  Measurement: { deviceId: string; deviceName: string; deviceType: string };
  MeasurementDetail: { parentId: string; deviceId: string };
  AutoControl: { deviceId: string };
};

type MeasurementScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Measurement"
>;
type MeasurementScreenRouteProp = RouteProp<
  RootStackParamList,
  "Measurement"
>;

type Measurement = {
  id: string;
  name: string;
  unit: string;
  value: string | number | null;
};

// ================= SEGMENT SWITCH =================
const OnOffSegment = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) => {
  return (
    <View style={styles.segmentContainer}>
      {/* OFF */}
      <TouchableOpacity
        style={[
          styles.segment,
          !value ? styles.segmentOffActive : styles.segmentInactive,
        ]}
        onPress={() => onChange(false)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.segmentText,
            !value ? styles.textOffActive : styles.textInactive,
          ]}
        >
          OFF
        </Text>
      </TouchableOpacity>

      {/* ON */}
      <TouchableOpacity
        style={[
          styles.segment,
          value ? styles.segmentOnActive : styles.segmentInactive,
        ]}
        onPress={() => onChange(true)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.segmentText,
            value ? styles.textOnActive : styles.textInactive,
          ]}
        >
          ON
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ================= SCREEN =================
export default function MeasurementScreen() {
  const navigation = useNavigation<MeasurementScreenNavigationProp>();
  const route = useRoute<MeasurementScreenRouteProp>();
  const { isLoggedIn } = useContext(AuthContext)!;
  const { deviceId, deviceName, deviceType } = route.params;

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceOn, setDeviceOn] = useState(false);

  useEffect(() => {
    const fetchMeasurements = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(
          `http://192.168.3.232:5000/api/customer/devices/${deviceId}/parent-measurements`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setMeasurements(res.data.measurements);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) fetchMeasurements();
  }, [deviceId, isLoggedIn]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft size={24} color="#080808ff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerWrapper}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {deviceName} - {deviceType}
            </Text>

            <TouchableOpacity
              style={styles.configBtn}
              onPress={() => navigation.navigate("AutoControl", { deviceId })}
            >
              <Text style={styles.configText}>Config</Text>
            </TouchableOpacity>
          </View>

          {/* 🔘 ON / OFF SEGMENT */}
          <View style={styles.switchRow}>
            <OnOffSegment value={deviceOn} onChange={setDeviceOn} />
          </View>
        </View>

        {/* ===== MEASUREMENTS GRID ===== */}
        <View style={styles.grid}>
          {measurements.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("MeasurementDetail", {
                  parentId: m.id,
                  deviceId: deviceId,
                })
              }
            >
              <Text style={styles.label}>{m.name}</Text>
              <Text style={styles.value}>
                {m.value !== null && m.value !== undefined
                  ? `${m.value} ${m.unit}`
                  : "N/A"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff", paddingTop: 60 },
  backBtn: { position: "absolute", top: 40, left: 16, zIndex: 10 },
  container: { paddingHorizontal: 16, paddingBottom: 20 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerWrapper: { marginBottom: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "600" },

  configBtn: {
    backgroundColor: "#E53935",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  configText: { color: "#fff", fontWeight: "500" },

  switchRow: {
    marginTop: 14,
    alignItems: "center",
  },

  // ===== SEGMENT SWITCH =====
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

  segmentInactive: {
    backgroundColor: "#ffffff",
  },

  segmentOffActive: {
    backgroundColor: "#111111ff", // xám OFF
  },

  segmentOnActive: {
    backgroundColor: "#22c55e", // xanh ON
  },

  segmentText: {
    fontSize: 15,
    fontWeight: "700",
  },

  textInactive: {
    color: "#6b7280",
  },

  textOffActive: {
    color: "#a4a7adff",
  },

  textOnActive: {
    color: "#ffffff",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "#E5DADA",
    paddingVertical: 20,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },

  label: { fontSize: 15, fontWeight: "500", marginBottom: 8 },
  value: { fontSize: 16, fontWeight: "600" },
});
