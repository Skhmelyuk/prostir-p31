import React from "react";
import { View, Text } from "react-native";
import { PostAudioPlayer } from "./PostAudioPlayer";
import { VideoNotePlayer } from "./VideoNotePlayer";

export interface MessageItem {
  _id: string;
  senderId: string;
  type: "text" | "audio" | "video_note";
  text?: string;
  mediaUrl?: string | null;
  duration?: number;
  _creationTime: number;
}

interface MessageBubbleProps {
  message: MessageItem;
  isMe: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe }) => {
  return (
    <View className={`my-1.5 px-3 flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      <View
        className={`max-w-[80%] rounded-2xl p-3 ${
          isMe ? "bg-primary rounded-br-none" : "bg-surface rounded-bl-none border border-surfaceLight"
        }`}
      >
        {/* 1. Текст */}
        {message.type === "text" && (
          <Text className="text-white text-base leading-5">{message.text}</Text>
        )}

        {/* 2. Голосове повідомлення */}
        {message.type === "audio" && message.mediaUrl && (
          <View className="w-56 py-1">
            <PostAudioPlayer
              audioUrl={message.mediaUrl}
              duration={message.duration || 0}
            />
          </View>
        )}

        {/* 3. Відеокружечок */}
        {message.type === "video_note" && message.mediaUrl && (
          <View className="items-center py-1">
            <VideoNotePlayer
              videoUrl={message.mediaUrl}
              duration={message.duration || 0}
              size={200}
            />
          </View>
        )}

        {/* Час відправки */}
        <Text
          className={`text-[10px] mt-1 text-right ${
            isMe ? "text-white/60" : "text-grey"
          }`}
        >
          {new Date(message._creationTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
};
