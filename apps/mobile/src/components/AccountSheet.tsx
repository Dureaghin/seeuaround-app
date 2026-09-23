import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { api } from "../lib/api";
import { signOut } from "../lib/auth-session";
import { clearStoredInviteUrl } from "../lib/invite-store";
import { useApp } from "../context/AppContext";
import { colors, fonts, radius, spacing } from "../lib/theme";
import { Actions, Button, Eyebrow, Headline, OtpInput, Sub } from "./ui";

type Step = "main" | "delete";

export function TabEyebrow({ children, lamp }: { children: React.ReactNode; lamp?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={styles.tabEyebrow}>
        <Eyebrow lamp={lamp}>{children}</Eyebrow>
        <Pressable
          onPress={() => setOpen(true)}
          style={styles.accountHit}
          accessibilityRole="button"
          accessibilityLabel="Account"
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Circle cx={12} cy={8} r={3.2} fill="none" stroke={colors.dim} strokeWidth={1.6} />
            <Path
              d="M5.2 19.2c.9-3.2 3.5-4.8 6.8-4.8s5.9 1.6 6.8 4.8"
              fill="none"
              stroke={colors.dim}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      </View>
      <AccountSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AccountSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { me, setMe } = useApp();
  const [rotating, setRotating] = useState(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [step, setStep] = useState<Step>("main");
  const [signingOut, setSigningOut] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep("main");
      setCode("");
      setCodeError(false);
      setCodeSent(false);
      setSendingCode(false);
      setDeleting(false);
      setSigningOut(false);
      setRotating(false);
    }
  }, [visible]);

  function rotateCode() {
    const run = async () => {
      setRotating(true);
      try {
        const state = await api.rotateShortCode();
        setMe(state);
      } finally {
        setRotating(false);
      }
    };
    const message = "Your old code stops working. Anyone who has it will need the new one.";
    if (Platform.OS === "web") {
      if (window.confirm(message)) void run();
      return;
    }
    Alert.alert("New code?", message, [
      { text: "Keep this one", style: "cancel" },
      { text: "New code", style: "destructive", onPress: () => void run() },
    ]);
  }

  useEffect(() => {
    if (!visible || step !== "delete" || codeSent || sendingCode) return;
    setSendingCode(true);
    api
      .sendDeleteCode()
      .then(() => setCodeSent(true))
      .catch(() => setCodeSent(false))
      .finally(() => setSendingCode(false));
  }, [visible, step, codeSent, sendingCode]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      setMe(null);
      onClose();
      router.replace("/(auth)/email");
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDelete() {
    if (code.length !== 6) return;
    setDeleting(true);
    setCodeError(false);
    try {
      await api.deleteAccount(code);
      await clearStoredInviteUrl();
      await signOut();
      setMe(null);
      onClose();
      router.replace("/(auth)/email");
    } catch {
      setCodeError(true);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close account" />
        <View
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.88,
              paddingBottom: Math.max(insets.bottom, spacing.screenBottom),
            },
          ]}
        >
          {step === "main" ? (
            <>
              <Text style={styles.eyebrow}>Account</Text>
              <Headline>Your account</Headline>
              <Sub style={{ maxWidth: undefined, marginTop: 13 }}>
                Signing out keeps everything. You'll sign back in with an email code.
              </Sub>
              {me?.user?.shortCode ? (
                <Text style={styles.note}>Your code is {me.user.shortCode}.</Text>
              ) : null}

              <Actions>
                <Button
                  label={rotating ? "Making a new code…" : "New code"}
                  variant="ghost"
                  onPress={rotateCode}
                  loading={rotating}
                />
                <Button
                  label="Sign out"
                  variant="ghost"
                  onPress={handleSignOut}
                  loading={signingOut}
                />
                <Button
                  label="Delete account"
                  variant="danger"
                  onPress={() => setStep("delete")}
                />
                <Button label="Close" variant="ghost" onPress={onClose} />
              </Actions>
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>Delete account</Text>
              <Headline>Delete everything?</Headline>
              <Sub style={{ maxWidth: undefined, marginTop: 13 }}>
                Your account, your people, your week — gone straight away. No grace period, no
                reactivation email.
              </Sub>
              <Text style={styles.note}>
                We'll email you a code first, so a borrowed phone can't do this.
              </Text>

              {codeSent ? (
                <Text style={styles.sent}>Check your inbox for a six-digit code.</Text>
              ) : sendingCode ? (
                <Text style={styles.sent}>Sending code…</Text>
              ) : (
                <Pressable
                  onPress={() => {
                    setSendingCode(true);
                    api
                      .sendDeleteCode()
                      .then(() => setCodeSent(true))
                      .finally(() => setSendingCode(false));
                  }}
                >
                  <Text style={styles.resend}>Send code again</Text>
                </Pressable>
              )}

              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setCodeError(false);
                }}
                error={codeError}
              />
              {codeError ? (
                <Text style={styles.err}>That code didn't work. Try again.</Text>
              ) : null}

              <Actions>
                <Button
                  label="Delete account"
                  variant="danger"
                  onPress={handleDelete}
                  loading={deleting}
                  disabled={code.length !== 6}
                />
                <Button label="Cancel" variant="ghost" onPress={() => setStep("main")} />
              </Actions>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.screenX,
    paddingTop: 28,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.68,
    textTransform: "uppercase",
    color: colors.dim,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.dim,
    marginTop: 18,
  },
  sent: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.chalk,
    marginTop: 20,
  },
  resend: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.lamp,
    marginTop: 20,
    textDecorationLine: "underline",
  },
  err: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.danger,
    marginTop: 14,
  },
  tabEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  accountHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
