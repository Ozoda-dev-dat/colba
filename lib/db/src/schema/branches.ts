import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const branchesTable = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});