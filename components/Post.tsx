import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { formatDistanceToNow } from "date-fns";
import { CommentsModal } from "./CommentsModal";
import { HoldToConfirmButton } from "./HoldToConfirmButton";
import { PostAudioPlayer } from "./PostAudioPlayer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";

export type PostProps = {
  post: {
    _id: Id<"posts">;
    imageUrl: string;
    caption?: string;
    likes: number;
    comments: number;
    _creationTime: number;
    isLiked: boolean;
    isBookmarked: boolean;
    audioUrl?: string;
    audioDuration?: number;
    author: {
      _id?: Id<"users">;
      username: string;
      image: string;
    };
  };
};

export const Post = ({ post }: PostProps) => {
  const router = useRouter();

  // Локальні стани для миттєвого (оптимістичного) оновлення UI
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);

  // Підключення мутацій Convex
  const toggleLike = useMutation(api.likes.toggleLike);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);

  // Авторизований користувач
  const currentUser = useQuery(api.users.currentUser);
  
  // Видалення поста
  const deletePost = useMutation(api.posts.deletePost);

  // Коментарі (локальний стан для модального вікна)
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Перевірка, чи пост належить поточному користувачу
  const isOwner = currentUser?._id === post.author._id;

  const handleUserPress = () => {
    if (!post.author._id) return;
    if (currentUser?._id === post.author._id) {
      router.push("/(tabs)/profile");
    } else {
      router.push(`/user/${post.author._id}`);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deletePost({ postId: post._id });
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Помилка видалення поста:", error);
      Alert.alert("Помилка", "Не вдалося видалити публікацію.");
    }
  };

  // Обробник натискання на лайк з оптимістичним оновленням
  const handleLike = async () => {
    const nextIsLiked = !isLiked;
    const previousLikesCount = likesCount;

    // 1. Миттєво оновлюємо стан на екрані
    setIsLiked(nextIsLiked);
    setLikesCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      // 2. Відправляємо запит на сервер
      const serverIsLiked = await toggleLike({ postId: post._id });

      // 3. Синхронізуємо у разі розбіжності з сервером
      if (serverIsLiked !== nextIsLiked) {
        setIsLiked(serverIsLiked);
        setLikesCount((prev) =>
          serverIsLiked ? prev + 1 : Math.max(0, prev - 1),
        );
      }
    } catch (error) {
      console.error("Помилка оновлення лайка:", error);
      // Відкочуємо стан назад у разі збою
      setIsLiked(post.isLiked);
      setLikesCount(previousLikesCount);
    }
  };

  // Обробник натискання на закладку
  const handleBookmark = async () => {
    const nextIsBookmarked = !isBookmarked;
    setIsBookmarked(nextIsBookmarked);

    try {
      const serverIsBookmarked = await toggleBookmark({ postId: post._id });
      if (serverIsBookmarked !== nextIsBookmarked) {
        setIsBookmarked(serverIsBookmarked);
      }
    } catch (error) {
      console.error("Помилка збереження в закладки:", error);
      setIsBookmarked(post.isBookmarked);
    }
  };

  return (
    <View className="mb-4 bg-black">
      {/* Хедер поста: автор та аватар */}
      <View className="flex-row items-center justify-between p-3">
        <TouchableOpacity
          onPress={handleUserPress}
          activeOpacity={0.8}
          className="flex-row items-center"
        >
          <Image
            source={{ uri: post.author.image }}
            className="w-8 h-8 rounded-full mr-2.5 border border-surfaceLight"
          />
          <Text className="text-white text-sm font-semibold">
            {post.author.username}
          </Text>
        </TouchableOpacity>
        {/* Кнопка меню/видалення */}
        {isOwner && (
          <TouchableOpacity
            onPress={() => setShowDeleteModal(true)}
            className="p-1 active:opacity-70"
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Зображення поста */}
      <Image
        source={{ uri: post.imageUrl }}
        className="w-full aspect-square bg-surface"
        resizeMode="cover"
      />

      {/* Аудіодоріжка публікації (якщо додано) */}
      {post.audioUrl ? (
        <PostAudioPlayer
          audioUrl={post.audioUrl}
          duration={post.audioDuration}
        />
      ) : null}

      {/* Рядок дій (кнопки лайка, коментаря, закладки) */}
      <View className="flex-row items-center justify-between px-3 py-3">
        <View className="flex-row items-center gap-4">
          {/* Кнопка лайка */}
          <TouchableOpacity onPress={handleLike} activeOpacity={0.7}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={24}
              color={isLiked ? "#EF4444" : COLORS.white}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowComments(true)} activeOpacity={0.7}>
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>
        {/* Кнопка закладки */}
        <TouchableOpacity onPress={handleBookmark} activeOpacity={0.7}>
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      {/* Інформація про пост: лічильник лайків та опис */}
      <View className="px-3">
        <Text className="text-white text-sm font-semibold mb-1.5">
          {post.likes > 0
            ? `${post.likes.toLocaleString()} вподобань`
            : "Будьте першим, кому це сподобалося"}
        </Text>

        {post.caption ? (
          <View className="flex-row flex-wrap mb-1.5">
            <Text className="text-white text-sm font-semibold mr-1.5">
              {post.author.username}
            </Text>
            <Text className="text-white text-sm flex-1">{post.caption}</Text>
          </View>
        ) : null}

        {commentsCount > 0 && (
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            className="mt-0.5 mb-1"
          >
            <Text className="text-grey text-sm">
              Переглянути всі {commentsCount} коментарів
            </Text>
          </TouchableOpacity>
        )}

        <Text className="text-grey text-xs mb-2">
          {formatDistanceToNow(post._creationTime, { addSuffix: true })}
        </Text>

        {showComments && (
          <CommentsModal
            postId={post._id}
            visible={showComments}
            onClose={() => setShowComments(false)}
            onCommentsCountChange={setCommentsCount}
          />
        )}
      </View>

      {/* Модальне вікно безпечного видалення публікації */}
      {isOwner && (
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View className="flex-1 bg-black/80 justify-end p-4">
              {/* Фоновий оверлей: натискання закриває модалку */}
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowDeleteModal(false)}
              />

              {/* Контент модального вікна */}
              <View className="bg-surface border border-surfaceLight rounded-3xl p-5 gap-4">
                <View className="items-center">
                  <View className="w-12 h-12 rounded-full bg-red-500/20 items-center justify-center mb-3">
                    <Ionicons name="trash-outline" size={26} color="#EF4444" />
                  </View>
                  <Text className="text-white text-lg font-bold mb-1">
                    Видалити публікацію?
                  </Text>
                  <Text className="text-grey text-xs text-center px-4">
                    Цю дію неможливо скасувати. Для підтвердження затисніть кнопку нижче на 1.2 секунди.
                  </Text>
                </View>

                <HoldToConfirmButton
                  title="Затисніть для видалення"
                  confirmTitle="Видаляємо..."
                  icon="trash-outline"
                  variant="danger"
                  durationMs={1200}
                  onConfirm={handleConfirmDelete}
                />

                <TouchableOpacity
                  onPress={() => setShowDeleteModal(false)}
                  className="py-3 items-center"
                >
                  <Text className="text-grey text-sm font-medium">Скасувати</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GestureHandlerRootView>
        </Modal>
      )}
    </View>
  );
};
