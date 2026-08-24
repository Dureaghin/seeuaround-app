import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "../lib/api";
import { signOut } from "../lib/auth-session";
import { useApp } from "../context/AppContext";
import { colors, fonts, radius, spacing } from "../lib/theme";
import { Actions, Button, Headline, OtpInput, Sub } from "./ui";

type Step = "main" | "delete";

export function AccountSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { setMe } = useApp();
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
    }
  }, [visible]);

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
                You'll need a new code to get back in. Nothing is deleted when you sign out.
              </Sub>

              <Actions>
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
              </Actions>
              <Button label="Close" variant="ghost" onPress={onClose} />
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
});
