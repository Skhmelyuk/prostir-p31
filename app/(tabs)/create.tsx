import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { PostAudioPlayer } from "@/components/PostAudioPlayer";

export default function CreateScreen() {
  const router = useRouter();

  // Отримуємо поточного користувача з Convex Auth
  const currentUser = useQuery(api.users.currentUser);

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  const [caption, setCaption] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Хуки для запису аудіосповіщення через expo-audio
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);

  // Функція вибору зображення з галереї
  const pickImageFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Функція створення фото з камери
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Дозвіл відхилено",
        "Для створення знімку потрібен доступ до камери.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Керування аудіозаписом
  const startRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Дозвіл відхилено",
        "Для запису голосового сповіщення потрібен доступ до мікрофона.",
      );
      return;
    }

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error("Помилка старту запису:", error);
      Alert.alert("Помилка", "Не вдалося розпочати запис аудіо.");
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      if (audioRecorder.uri) {
        setRecordedAudioUri(audioRecorder.uri);
        setRecordedDuration(Math.round((recorderState.durationMillis || 0) / 1000));
      }
    } catch (error) {
      console.error("Помилка зупинки запису:", error);
    }
  };

  const removeRecordedAudio = () => {
    setRecordedAudioUri(null);
    setRecordedDuration(0);
  };

  // Головна функція для вибору способу додавання зображення
  const pickImage = () => {
    Alert.alert("Оберіть дію", "Оберіть джерело для додавання зображення", [
      {
        text: "Зробити фото",
        onPress: takePhoto,
      },
      {
        text: "Обрати з галереї",
        onPress: pickImageFromLibrary,
      },
      {
        text: "Скасувати",
        style: "cancel",
      },
    ]);
  };

  // Завантаження зображення у Convex Storage та публікація поста
  const handleShare = async () => {
    if (!selectedImage) return;

    try {
      setIsSharing(true);

      // 1. Отримуємо одноразове посилання для завантаження зображення
      const imageUploadUrl = await generateUploadUrl();
      const imageFile = new File(selectedImage);

      // 2. Завантажуємо зображення через expo/fetch API
      const imageUploadResult = await fetch(imageUploadUrl, {
        method: "POST",
        body: imageFile,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });

      if (!imageUploadResult.ok) throw new Error("Помилка завантаження зображення");
      const { storageId } = await imageUploadResult.json();

      // 3. Якщо записано аудіо — завантажуємо аудіофайл у Storage
      let audioStorageId: Id<"_storage"> | undefined = undefined;
      if (recordedAudioUri) {
        const audioUploadUrl = await generateUploadUrl();
        const audioFile = new File(recordedAudioUri);

        const audioUploadResult = await fetch(audioUploadUrl, {
          method: "POST",
          body: audioFile,
          headers: {
            "Content-Type": "audio/m4a",
          },
        });

        if (!audioUploadResult.ok) {
          throw new Error("Помилка завантаження аудіофайлу");
        }

        const audioData = await audioUploadResult.json();
        audioStorageId = audioData.storageId;
      }

      // 4. Створюємо пост із посиланням на файли у БД
      await createPost({
        storageId,
        caption,
        audioStorageId,
        audioDuration: recordedDuration > 0 ? Math.round(recordedDuration) : undefined,
      });

      // 5. Очищаємо форму та перенаправляємо на головний екран
      setSelectedImage(null);
      setCaption("");
      setRecordedAudioUri(null);
      setRecordedDuration(0);
      router.push("/(tabs)");
      Alert.alert("Успіх", "Публікацію успішно створено!");
    } catch (error) {
      console.error("Error sharing post:", error);
      Alert.alert(
        "Помилка",
        "Не вдалося завантажити зображення або створити пост.",
      );
    } finally {
      setIsSharing(false);
    }
  };

  // Якщо картинка ще не обрана, показуємо екран вибору
  if (!selectedImage) {
    return (
      <View className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={26} color={COLORS.primary} />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Новий пост</Text>
          <View className="w-7" />
        </View>

        <TouchableOpacity
          className="flex-1 justify-center items-center gap-3 p-6"
          onPress={pickImage}
          activeOpacity={0.8}
        >
          <View className="w-20 h-20 rounded-full bg-surface border border-surfaceLight items-center justify-center">
            <Ionicons name="image-outline" size={40} color={COLORS.grey} />
          </View>
          <Text className="text-grey text-base font-medium">
            Натисніть, щоб обрати фото
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Екран заповнення опису та відправки поста
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-black"
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View className="flex-1">
        {/* Хедер */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
          <TouchableOpacity
            onPress={() => {
              setSelectedImage(null);
              setCaption("");
              setRecordedAudioUri(null);
              setRecordedDuration(0);
            }}
            disabled={isSharing}
          >
            <Ionicons
              name="close-outline"
              size={28}
              color={isSharing ? COLORS.grey : "#FFFFFF"}
            />
          </TouchableOpacity>

          <Text className="text-white text-lg font-semibold">Новий пост</Text>

          <TouchableOpacity
            className={`px-3 py-1.5 min-w-[70px] items-center justify-center rounded-xl bg-primary active:opacity-90 ${
              isSharing || !selectedImage ? "opacity-50" : ""
            }`}
            disabled={isSharing || !selectedImage}
            onPress={handleShare}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white text-sm font-bold">Опублікувати</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className={`flex-1 ${isSharing ? "opacity-70" : ""}`}>
            {/* Секція зображення */}
            <View className="w-full aspect-square bg-surface relative justify-center items-center">
              <Image
                source={{ uri: selectedImage }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <TouchableOpacity
                className="absolute bottom-4 right-4 bg-black/75 flex-row items-center px-3 py-2 rounded-xl gap-1.5"
                onPress={pickImage}
                disabled={isSharing}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={18} color="#FFFFFF" />
                <Text className="text-white text-xs font-semibold">
                  Змінити
                </Text>
              </TouchableOpacity>
            </View>

            {/* Секція опису */}
            <View className="p-4 flex-1">
              <View className="flex-row items-start">
                {currentUser?.image ? (
                  <Image
                    source={{ uri: currentUser.image }}
                    className="w-10 h-10 rounded-full mr-3 border border-surfaceLight"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full mr-3 bg-surface border border-surfaceLight items-center justify-center">
                    <Ionicons name="person" size={20} color={COLORS.primary} />
                  </View>
                )}
                <TextInput
                  className="flex-1 text-white text-base pt-2 min-h-[44px]"
                  placeholder="Напишіть опис до публікації..."
                  placeholderTextColor={COLORS.grey}
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  editable={!isSharing}
                />
              </View>

              {/* Блок аудіосповіщення */}
              <View className="mt-4 p-3 rounded-2xl bg-surface border border-surfaceLight">
                <Text className="text-grey text-xs font-semibold uppercase mb-2 tracking-wider">
                  Аудіосповіщення до публікації
                </Text>

                {recordedAudioUri ? (
                  <View className="gap-2">
                    <PostAudioPlayer
                      audioUrl={recordedAudioUri}
                      duration={recordedDuration}
                    />
                    <TouchableOpacity
                      onPress={removeRecordedAudio}
                      className="flex-row items-center justify-center gap-1.5 py-1"
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text className="text-red-500 text-xs font-medium">
                        Видалити аудіо
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View
                        className={`w-3 h-3 rounded-full ${
                          recorderState.isRecording
                            ? "bg-red-500"
                            : "bg-grey"
                        }`}
                      />
                      <Text className="text-white text-sm">
                        {recorderState.isRecording
                          ? `Запис: ${Math.floor((recorderState.durationMillis || 0) / 1000)} с`
                          : "Додати голосове сповіщення"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={
                        recorderState.isRecording ? stopRecording : startRecording
                      }
                      className={`px-4 py-2 rounded-xl flex-row items-center gap-1.5 ${
                        recorderState.isRecording ? "bg-red-600" : "bg-primary"
                      }`}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={recorderState.isRecording ? "stop" : "mic"}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text className="text-white text-xs font-semibold">
                        {recorderState.isRecording ? "Зупинити" : "Записати"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
