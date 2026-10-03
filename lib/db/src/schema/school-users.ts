import { pgEnum, pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { branchesTable } from "./branches";

export const schoolRoleEnum = pgEnum("school_role", [
  "admin",
  "teacher",
  "printer",
]);

export const schoolUsersTable = pgTable("school_users", {
  clerkId: text("clerk_id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: schoolRoleEnum("role").notNull().default("teacher"),
  branchId: integer("branch_id").references(() => branchesTable.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});