import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export default function MessagesIndexScreen() {
  const router = useRouter();
  const conversations = useQuery(api.messages.getConversations);

  return (
    <View className="flex-1 bg-black">
      {/* Хедер списку повідомлень */}
      <View className="flex-row items-center px-4 py-3 border-b border-surface">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1 active:opacity-70">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Повідомлення</Text>
      </View>

      {/* Стан завантаження */}
      {conversations === undefined ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : conversations.length === 0 ? (
        /* Порожній стан */
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="chatbubbles-outline" size={56} color={COLORS.grey} />
          <Text className="text-white text-lg font-semibold mt-3">
            Діалогів ще немає
          </Text>
          <Text className="text-grey text-sm text-center mt-1">
            Відкрийте профіль користувача, на якого ви підписані, та надішліть перше повідомлення.
          </Text>
        </View>
      ) : (
        /* Список активних діалогів */
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/messages/${item._id}`)}
              className="flex-row items-center px-4 py-3 border-b border-surface active:bg-surface/50"
            >
              {item.recipient.image ? (
                <Image
                  source={{ uri: item.recipient.image }}
                  className="w-12 h-12 rounded-full mr-3 border border-surfaceLight"
                />
              ) : (
                <View className="w-12 h-12 rounded-full bg-surface items-center justify-center mr-3 border border-surfaceLight">
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
              )}

              <View className="flex-1">
                <Text className="text-white font-semibold text-base">
                  {item.recipient.name}
                </Text>
                <Text numberOfLines={1} className="text-grey text-sm mt-0.5">
                  {item.lastMessage || "Натисніть для перегляду"}
                </Text>
              </View>

              <Text className="text-[11px] text-grey ml-2">
                {new Date(item.lastMessageTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
