import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { VideoNoteRecorder } from "./VideoNoteRecorder";

interface ChatInputBarProps {
  onSendText: (text: string) => void;
  onSendAudio: (audioUri: string, duration: number) => void;
  onSendVideoNote: (videoUri: string, duration: number) => void;
  disabled?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendText,
  onSendAudio,
  onSendVideoNote,
  disabled,
}) => {
  const [text, setText] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Аудіозапис за допомогою expo-audio
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);

  // Початок запису голосового
  const handleStartAudio = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Дозвіл не надано",
        "Для запису голосових повідомлень потрібен доступ до мікрофона."
      );
      return;
    }

    try {
      setIsRecordingAudio(true);
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error("Помилка старту аудіозапису:", error);
      setIsRecordingAudio(false);
      Alert.alert("Помилка", "Не вдалося розпочати запис аудіо.");
    }
  };

  // Зупинка та надсилання голосового
  const handleStopAudio = async () => {
    try {
      await audioRecorder.stop();
      setIsRecordingAudio(false);
      if (audioRecorder.uri) {
        const durationSec = Math.round(
          (recorderState.durationMillis || 1000) / 1000
        );
        onSendAudio(audioRecorder.uri, Math.max(durationSec, 1));
      }
    } catch (error) {
      console.error("Помилка зупинки аудіозапису:", error);
      setIsRecordingAudio(false);
    }
  };

  const handleSendText = () => {
    if (!text.trim()) return;
    onSendText(text.trim());
    setText("");
  };

  return (
    <View className="px-3 py-2 bg-surface border-t border-surfaceLight flex-row items-center gap-2">
      {/* Кнопка запису круглого відео */}
      <TouchableOpacity
        onPress={() => setShowVideoModal(true)}
        disabled={disabled || isRecordingAudio}
        className="p-2 rounded-full active:opacity-70"
      >
        <Ionicons name="videocam-outline" size={24} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Поле вводу або статус запису голосового */}
      {isRecordingAudio ? (
        <View className="flex-1 flex-row items-center justify-between px-4 py-2 bg-surfaceLight rounded-full">
          <View className="flex-row items-center gap-2">
            <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <Text className="text-white text-sm font-medium">
              Запис голосового...
            </Text>
          </View>
          <TouchableOpacity onPress={handleStopAudio} className="p-1">
            <Ionicons name="checkmark-circle" size={26} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Повідомлення..."
          placeholderTextColor="#71717A"
          className="flex-1 bg-surfaceLight text-white px-4 py-2 rounded-full text-base"
        />
      )}

      {/* Кнопка відправки: або стрілочка вгору для тексту, або мікрофон */}
      {text.trim().length > 0 ? (
        <TouchableOpacity
          onPress={handleSendText}
          disabled={disabled}
          className="w-10 h-10 rounded-full bg-primary items-center justify-center active:opacity-80"
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        !isRecordingAudio && (
          <TouchableOpacity
            onPress={handleStartAudio}
            disabled={disabled}
            className="p-2 rounded-full active:opacity-70"
          >
            <Ionicons name="mic-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )
      )}

      {/* Модальне вікно запису Telegram-відеокружечка */}
      <VideoNoteRecorder
        visible={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onFinishRecording={(uri, duration) => onSendVideoNote(uri, duration)}
      />
    </View>
  );
};
