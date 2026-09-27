import React, { useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInputBar } from "@/components/ChatInputBar";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { COLORS } from "@/constants/theme";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const conversationId = id as Id<"conversations">;

  const currentUser = useQuery(api.users.currentUser);
  const messages = useQuery(api.messages.getMessages, { conversationId });
  const conversations = useQuery(api.messages.getConversations);
  const currentConversation = conversations?.find((c) => c._id === conversationId);

  const sendMessage = useMutation(api.messages.sendMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

  const flatListRef = useRef<FlatList>(null);

  // Відправка текстового повідомлення
  const handleSendText = async (text: string) => {
    try {
      await sendMessage({
        conversationId,
        type: "text",
        text,
      });
    } catch (error) {
      console.error("Помилка надсилання тексту:", error);
    }
  };

  // Завантаження файлу в хмарне сховище Convex
  const uploadToStorage = async (fileUri: string, mimeType: string) => {
    const uploadUrl = await generateUploadUrl();
    const file = new File(fileUri);
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: file,
      headers: { "Content-Type": mimeType },
    });
    const result = await response.json();
    return result.storageId as Id<"_storage">;
  };

  // Відправка аудіоповідомлення
  const handleSendAudio = async (audioUri: string, duration: number) => {
    try {
      const storageId = await uploadToStorage(audioUri, "audio/m4a");
      await sendMessage({
        conversationId,
        type: "audio",
        storageId,
        duration,
      });
    } catch (error) {
      console.error("Помилка відправки аудіо:", error);
    }
  };

  // Відправка відеокружечка
  const handleSendVideoNote = async (videoUri: string, duration: number) => {
    try {
      const storageId = await uploadToStorage(videoUri, "video/mp4");
      await sendMessage({
        conversationId,
        type: "video_note",
        storageId,
        duration,
      });
    } catch (error) {
      console.error("Помилка відправки відеокружечка:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-black"
    >
      {/* Шапка чату */}
      <View className="flex-row items-center px-4 py-3 border-b border-surface">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 p-1 active:opacity-70"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {currentConversation?.recipient?.image ? (
          <Image
            source={{ uri: currentConversation.recipient.image }}
            className="w-8 h-8 rounded-full mr-2.5 border border-surfaceLight"
          />
        ) : null}

        <View className="flex-1">
          <Text className="text-lg font-bold text-white" numberOfLines={1}>
            {currentConversation?.recipient?.name || "Чат"}
          </Text>
        </View>
      </View>

      {/* Список повідомлень */}
      {messages === undefined ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMe={item.senderId === currentUser?._id}
            />
          )}
          contentContainerStyle={{ paddingVertical: 12 }}
        />
      )}

      {/* Панель введення */}
      <ChatInputBar
        onSendText={handleSendText}
        onSendAudio={handleSendAudio}
        onSendVideoNote={handleSendVideoNote}
      />
    </KeyboardAvoidingView>
  );
}
