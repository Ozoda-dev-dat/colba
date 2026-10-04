import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { branchesTable } from "./branches";

export const printerAccountsTable = pgTable("printer_accounts", {
  username: text("username").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull().default("Bosmaxona xodimi"),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branchesTable.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});