import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savePushToken = useMutation(api.users.savePushToken);
  const router = useRouter();

  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    if (data.postId || data.type === "like" || data.type === "comment") {
      router.push(`/post/${data.postId}` as any);
    } else if (data.userId || data.type === "follow") {
      router.push(`/user/${data.userId}` as any);
    } else {
      router.push("/(tabs)/notifications" as any);
    }
  };

  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastNotificationResponse.notification.request.content.data;
      handleNotificationNavigation(data);
    }
  }, [lastNotificationResponse]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        savePushToken({ pushToken: token }).catch((err) => {
          console.error("Помилка збереження pushToken у Convex:", err);
        });
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("🔔 Foreground notification:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, isLoading]);
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#208AEF",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenData.data;
  } catch (error) {
    console.error("Не вдалося отримати pushToken:", error);
    return null;
  }
}
