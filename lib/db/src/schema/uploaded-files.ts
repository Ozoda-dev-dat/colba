import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { printRequestsTable } from "./print-requests";
import { schoolUsersTable } from "./school-users";

export const uploadedFilesTable = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  objectPath: text("object_path").notNull().unique(),
  ownerClerkId: text("owner_clerk_id")
    .notNull()
    .references(() => schoolUsersTable.clerkId, { onDelete: "cascade" }),
  requestId: integer("request_id").references(() => printRequestsTable.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});