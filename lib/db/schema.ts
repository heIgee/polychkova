import { sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { ListBoard, ListVisibility } from "../list-board";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Uploaded icon. Provider URLs stay in image. One small file stays on the row.
  avatar: bytea("avatar"),
  avatarType: text("avatarType"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const lists = pgTable(
  "list",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    visibility: text("visibility").$type<ListVisibility>().notNull().default("unlisted"),
    board: jsonb("board").$type<ListBoard>().notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (list) => [
    index("list_userId_updatedAt_idx").on(list.userId, list.updatedAt),
    check("list_visibility_check", sql`${list.visibility} in ('unlisted', 'public')`),
  ],
);
