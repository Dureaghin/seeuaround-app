import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

export type AgeStatus = "adult" | "under" | "declined" | "unavailable" | "unknown";
export type AgeSource = "apple" | "google" | "attested";

type NativeAge = {
  requestAdult: () => Promise<{ status?: string }>;
};

/** Ask the phone. Web and older systems have no age-range API. */
export async function requestDeclaredAge(): Promise<{ status: AgeStatus; source: AgeSource }> {
  if (Platform.OS === "web") {
    return { status: "unavailable", source: "attested" };
  }

  const native = requireOptionalNativeModule<NativeAge>("DeclaredAgeRange");
  if (!native) return { status: "unavailable", source: "attested" };

  try {
    const result = await native.requestAdult();
    const source: AgeSource = Platform.OS === "ios" ? "apple" : "google";
    if (result?.status === "adult" || result?.status === "under" || result?.status === "declined") {
      return { status: result.status, source };
    }
    if (result?.status === "unknown") return { status: "unknown", source };
    return { status: "unavailable", source: "attested" };
  } catch {
    return { status: "unavailable", source: "attested" };
  }
}
