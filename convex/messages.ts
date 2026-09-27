import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Генерує URL для завантаження файлів у Convex Storage
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Unauthorized: Неавторизований доступ");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Отримує існуючий діалог або створює новий між двома користувачами
 */
export const getOrCreateConversation = mutation({
  args: {
    recipientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Unauthorized: Неавторизований доступ");
    }

    if (userId === args.recipientId) {
      throw new ConvexError("Не можна створити діалог із самим собою");
    }

    // Шукаємо діалог, де присутні обидва користувачі
    const allConversations = await ctx.db.query("conversations").collect();
    const existingConversation = allConversations.find(
      (c) =>
        c.participantIds.includes(userId) &&
        c.participantIds.includes(args.recipientId)
    );

    if (existingConversation) {
      return existingConversation._id;
    }

    // Створюємо новий діалог
    return await ctx.db.insert("conversations", {
      participantIds: [userId, args.recipientId],
      lastMessageTime: Date.now(),
      lastMessage: "Діалог створено",
      lastSenderId: userId,
    });
  },
});

/**
 * Отримує всі діалоги поточного користувача з даними співрозмовника
 */
export const getConversations = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const conversations = await ctx.db.query("conversations").collect();

    // Фільтруємо діалоги поточного користувача та сортуємо за часом
    const userConversations = conversations
      .filter((c) => c.participantIds.includes(userId))
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    // Доповнюємо даними співрозмовника
    return await Promise.all(
      userConversations.map(async (conv) => {
        const otherUserId = conv.participantIds.find((id) => id !== userId)!;
        const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

        return {
          ...conv,
          recipient: {
            _id: otherUser?._id,
            name:
              otherUser?.fullname ??
              otherUser?.username ??
              otherUser?.name ??
              "Користувач",
            username: otherUser?.username,
            image: otherUser?.image,
          },
        };
      })
    );
  },
});

/**
 * Отримує всі повідомлення діалогу разом з посиланнями на медіа
 */
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    return await Promise.all(
      messages.map(async (msg) => {
        let mediaUrl: string | null = null;
        if (msg.storageId) {
          mediaUrl = await ctx.storage.getUrl(msg.storageId);
        }
        return {
          ...msg,
          mediaUrl,
        };
      })
    );
  },
});

/**
 * Відправляє повідомлення (текст, аудіо або відеокружечок)
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    type: v.union(v.literal("text"), v.literal("audio"), v.literal("video_note")),
    text: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Unauthorized: Неавторизований доступ");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new ConvexError("Діалог не знайдено");
    }

    let preview = args.text || "";
    if (args.type === "audio") preview = "Голосове повідомлення 🎤";
    if (args.type === "video_note") preview = "Відеокружечок 📹";

    // 1. Зберігаємо повідомлення
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      type: args.type,
      text: args.text,
      storageId: args.storageId,
      duration: args.duration,
    });

    // 2. Оновлюємо останнє повідомлення діалогу
    await ctx.db.patch(args.conversationId, {
      lastMessage: preview,
      lastMessageTime: Date.now(),
      lastSenderId: userId,
    });

    // 3. Відправляємо Push-сповіщення співрозмовнику
    const recipientId = conversation.participantIds.find((id) => id !== userId);
    if (recipientId) {
      const recipient = await ctx.db.get(recipientId);
      const sender = await ctx.db.get(userId);

      if (recipient?.pushToken && sender) {
        const senderName =
          sender.fullname ?? sender.username ?? sender.name ?? "Хтось";

        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendPushNotification,
          {
            pushToken: recipient.pushToken,
            title: senderName,
            body: preview,
            data: {
              type: "direct_message",
              conversationId: args.conversationId,
            },
          }
        );
      }
    }

    return messageId;
  },
});
