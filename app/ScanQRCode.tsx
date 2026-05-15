import React, { useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";

export default function ScanQRCode() {
  const navigation = useNavigation<any>();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text>Please grant camera permission</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const extractSerial = (raw: string) => {
    // ✅ case của bạn: /sn=XXXX
    const match = raw.match(/\/sn=([^/]+)/);
    if (match) return match[1];

    return null;
  };

const handleBarcodeScanned = (result: any) => {
  if (scanned) return;   // 🔥 CHẶN LẦN 2

  setScanned(true);

  const raw = result.data;
  console.log("QR RAW:", raw);

  const match = raw.match(/\/sn=([^/]+)/);
  const serial = match ? match[1] : null;

  console.log("PARSED SERIAL:", serial);

  if (!serial) {
    alert("QR không hợp lệ");
    return;
  }

  console.log("➡️ NAVIGATE TO AddDevice WITH:", serial);

  navigation.replace("AddDevice", { serial });
}; 

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {scanned && (
        <Button title="Scan Again" onPress={() => setScanned(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});