import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Запит для отримання профілю поточного авторизованого користувача
 *
 * Використання:
 * const user = useQuery(api.users.currentUser)
 *
 * @returns {Object} - user об'єкт
 * @returns {string} - user._id
 * @returns {string} - user.name
 * @returns {string} - user.email
 * @returns {string} - user.image
 * @returns {number} - user.followers
 * @returns {number} - user.following
 * @returns {number} - user.posts
 */

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    // Отримуємо ID користувача із сесії Convex Auth
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    // Завантажуємо документ користувача з таблиці "users"
    return await ctx.db.get(userId);
  },
});

/**
 * Мутація для оновлення профілю користувача
 *
 * Використання:
 * const updateUserProfile = useMutation(api.users.updateUserProfile);
 *
 * updateUserProfile({
 *  username: "@ivanov_ivan",
 *  fullname: "Іванов Іван",
 *  bio: "Біографія користувача",
 * });
 *
 * @param {string} username - Ім'я користувача
 * @param {string} fullname - Повне ім'я користувача
 * @param {string} bio - Біографія користувача
 */

export const updateUserProfile = mutation({
  args: {
    username: v.optional(v.string()),
    fullname: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Користувач не авторизований");
    }

    // Оновлюємо дані користувача в таблиці "users"
    await ctx.db.patch(userId, {
      username: args.username,
      fullname: args.fullname,
      bio: args.bio,
    });
  },
});
