import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../src/lib/resolveRoute";
import {
  codeFromScan,
  connectWithFriendCode,
  isValidFriendCode,
  normalizeFriendCode,
  resolveFriendCodeParam,
} from "../src/lib/friend-code";
import { useApp } from "../src/context/AppContext";
import { colors, fonts } from "../src/lib/theme";
import {
  Actions,
  Button,
  ErrText,
  Eyebrow,
  Headline,
  Screen,
  Spacer,
  Sub,
  TextField,
} from "../src/components/ui";

export default function AddByCodeScreen() {
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const presetCode = resolveFriendCodeParam(params.code);
  const router = useRouter();
  const { refresh } = useApp();
  const [code, setCode] = useState(presetCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);

  useEffect(() => {
    if (presetCode) setCode(presetCode);
  }, [presetCode]);

  async function onConnect() {
    setLoading(true);
    setError("");
    try {
      await connectWithFriendCode(code);
      const state = await refresh();
      router.replace(routeToPath(state!) as never);
    } catch (err) {
      if (err instanceof Error && err.message === "invalid_format") {
        setError("Enter a code like SU-XXXX-XXXX.");
      } else {
        setError("That code didn't work. Check it and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function openScanner() {
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        setError("Camera access is needed to scan a code.");
        return;
      }
    }
    scanned.current = false;
    setScanning(true);
  }

  function onBarcode(data: string) {
    if (scanned.current) return;
    scanned.current = true;
    const next = codeFromScan(data);
    setScanning(false);
    if (!isValidFriendCode(next)) {
      setError("That QR isn't a See U Around code.");
      return;
    }
    setError("");
    setCode(next);
  }

  return (
    <Screen>
      <Eyebrow>Add someone</Eyebrow>
      <Headline>Enter their code.</Headline>
      <Sub style={{ maxWidth: undefined }}>
        You connect with them — not their whole circle. Nothing happens until you both accept.
      </Sub>

      <TextField
        value={code}
        onChangeText={(v) => {
          setCode(normalizeFriendCode(v));
          setError("");
        }}
        placeholder="SU-XXXX-XXXX"
        autoCapitalize="characters"
        maxLength={12}
      />
      {error ? <ErrText>{error}</ErrText> : null}

      <Spacer />
      <Actions>
        <Button label="Scan a code" variant="ghost" onPress={openScanner} />
        <Button
          label="Connect"
          onPress={onConnect}
          loading={loading}
          disabled={code.replace(/[^A-Z0-9]/g, "").length < 10}
        />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </Actions>

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={styles.scan}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => onBarcode(data)}
          />
          <Pressable style={styles.scanClose} onPress={() => setScanning(false)}>
            <Text style={styles.scanCloseText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scan: { flex: 1, backgroundColor: colors.night },
  scanClose: {
    position: "absolute",
    top: 56,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(9,8,7,0.72)",
  },
  scanCloseText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.chalk,
  },
});
