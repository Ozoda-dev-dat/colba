import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { branchesTable } from "./branches";
import { schoolUsersTable } from "./school-users";

export const requestStatusEnum = pgEnum("print_request_status", [
  "queued",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
]);

export const printRequestsTable = pgTable("print_requests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  copies: integer("copies").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  note: text("note"),
  status: requestStatusEnum("status").notNull().default("queued"),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branchesTable.id, { onDelete: "restrict" }),
  requestedByUserId: text("requested_by_user_id")
    .notNull()
    .references(() => schoolUsersTable.clerkId, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});