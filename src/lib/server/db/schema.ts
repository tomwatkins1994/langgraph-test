import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const threads = pgTable("threads", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
});
