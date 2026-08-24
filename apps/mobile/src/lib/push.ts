import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return null;

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;

  await api.registerPush(token, Platform.OS === "ios" ? "ios" : "android");
  return token;
}

export function setupPushListeners(
  onNavigate: (path: string) => void,
) {
  const received = Notifications.addNotificationReceivedListener((n) => {
    const id = n.request.content.data?.notificationId;
    if (typeof id === "string") {
      api.pushReceived(id, Platform.OS === "ios" ? "ios" : "android").catch(() => {});
    }
  });

  const response = Notifications.addNotificationResponseReceivedListener((r) => {
    const data = r.notification.request.content.data ?? {};
    if (data.overlapId) onNavigate(`/overlap/${data.overlapId}`);
    else if (data.threadId) onNavigate(`/thread/${data.threadId}`);
    else if (data.route === "sunday") onNavigate("/sunday");
  });

  return () => {
    received.remove();
    response.remove();
  };
}
