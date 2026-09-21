import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    fullname: v.optional(v.string()),
    bio: v.optional(v.string()),
    followers: v.optional(v.number()),
    following: v.optional(v.number()),
    posts: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_fullname", ["fullname"])
    .index("by_bio", ["bio"])
    .index("by_image", ["image"])
    .index("by_followers", ["followers"])
    .index("by_following", ["following"])
    .index("by_posts", ["posts"]),

  /**
   * users: id | username | fullname | email | bio | image | followers | following | posts |
   *
   * Отримати всіх користувачів:
   * users = await ctx.db.query("users").collect()
   *
   * Отримати користувача за id:
   * user = await ctx.db.get(id)
   *
   * Отримати користувача за email:
   * user = await ctx.db.query("users").filter((q) => q.eq(q.field("email"), "[EMAIL_ADDRESS]")).first()
   *
   * Отримати користувача за username:
   * user = await ctx.db.query("users").filter((q) => q.eq(q.field("username"), "username")).first()
   *
   * Отримати користувача за fullname:
   * user = await ctx.db.query("users").filter((q) => q.eq(q.field("fullname"), "fullname")).first()
   *
   * Отримати користувача за bio:
   * user = await ctx.db.query("users").filter((q) => q.eq(q.field("bio"), "bio")).first()
   *
   * Отримати користувача за image:
   * user = await ctx.db.query("users").filter((q) => q.eq(q.field("image"), "image")).first()
   *
   * Отримати користувача за followers:
   * user = await ctx.db.query("users").filter((q) => q.eq(q.field("followers"), followers)).first()
   *
   * Отримати користувача за following:
   * user = await ctx.db.query("users").filter((q) => q.eq(q.field("following"), following)).first()
   *
   * Отримати користувача за posts:
   * user = await ctx.db.query("users").filter((q) => q.eq(q.field("posts"), posts)).first()
   */

  posts: defineTable({
    userId: v.id("users"),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    caption: v.optional(v.string()),
    likes: v.number(),
    comments: v.number(),
    audioUrl: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),
    videoUrl: v.optional(v.string()),
    videoStorageId: v.optional(v.id("_storage")),
    videoDuration: v.optional(v.number()),
    isVideoNote: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  /**
   * posts: id | userId | imageUrl | storageId | caption | likes | comments |
   *
   * Отримати всі пости:
   * posts = await ctx.db.query("posts").collect()
   *
   * Отримати пост за id:
   * post = await ctx.db.get(id)
   *
   * Отримати всі пости конкретного користувача за userId:
   * posts = await ctx.db.query("posts").filter((q) => q.eq(q.field("userId"), id)).collect()
   */

  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

  /**
   * likes: id | userId | postId |
   *
   * Отримати всі лайки:
   * likes = await ctx.db.query("likes").collect()
   *
   * Отримати лайк за id:
   * like = await ctx.db.get(id)
   *
   * Отримати всі лайки конкретного користувача за userId і postId:
   * likes = await ctx.db.query("likes").filter((q) => q.eq(q.field("userId"), id) && q.eq(q.field("postId"), id)).collect()
   *
   * Отримати всі лайки конкретного поста за postId:
   * likes = await ctx.db.query("likes").filter((q) => q.eq(q.field("postId"), id)).collect()
   */

  comments: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    content: v.string(),
  }).index("by_post", ["postId"]),

  /**
   * comments: id | userId | postId | content |
   *
   * Отримати всі коментарі:
   * comments = await ctx.db.query("comments").collect()
   *
   * Отримати коментар за id:
   * comment = await ctx.db.get(id)
   *
   * Отримати всі коментарі конкретного поста за postId:
   * comments = await ctx.db.query("comments").filter((q) => q.eq(q.field("postId"), id)).collect()
   */

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_both", ["followerId", "followingId"]),

  /**
   * follows: id | followerId | followingId |
   *
   * Отримати всі підписки:
   * follows = await ctx.db.query("follows").collect()
   *
   * Отримати підписку за id:
   * follow = await ctx.db.get(id)
   *
   * Отримати всі підписки конкретного користувача за followerId:
   * follows = await ctx.db.query("follows").filter((q) => q.eq(q.field("followerId"), id)).collect()
   *
   * Отримати всі підписки конкретного користувача за followingId:
   * follows = await ctx.db.query("follows").filter((q) => q.eq(q.field("followingId"), id)).collect()
   */

  notifications: defineTable({
    receiverId: v.id("users"),
    senderId: v.id("users"),
    type: v.union(v.literal("like"), v.literal("comment"), v.literal("follow")),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
  }).index("by_receiver", ["receiverId"]),

  /**
   * notifications: id | receiverId | senderId | type | postId | commentId |
   *
   * Отримати всі сповіщення:
   * notifications = await ctx.db.query("notifications").collect()
   *
   * Отримати сповіщення за id:
   * notification = await ctx.db.get(id)
   *
   * Отримати всі сповіщення конкретного користувача за receiverId:
   * notifications = await ctx.db.query("notifications").filter((q) => q.eq(q.field("receiverId"), id)).collect()
   */

  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_user", ["userId"])
    .index("by_post", ["postId"])
    .index("by_both", ["userId", "postId"]),

  stories: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"),
    expiresAt: v.number(), // Timestamp закінчення дії історії (24 години)
    views: v.number(),     // Кількість переглядів
  })
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"]),
});

/**
 * bookmarks: id | userId | postId |
 *
 * Отримати всі закладки:
 * bookmarks = await ctx.db.query("bookmarks").collect()
 *
 * Отримати закладку за id:
 * bookmark = await ctx.db.get(id)
 *
 * Отримати всі закладки конкретного користувача за userId:
 * bookmarks = await ctx.db.query("bookmarks").filter((q) => q.eq(q.field("userId"), id)).collect()
 *
 * Отримати всі закладки конкретного поста за postId:
 * bookmarks = await ctx.db.query("bookmarks").filter((q) => q.eq(q.field("postId"), id)).collect()
 */
