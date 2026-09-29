import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
export const household = sqliteTable("household", {
  id: text("id").primaryKey(),
  ownerName: text("owner_name").notNull().default("Li"),
  partnerName: text("partner_name").notNull().default("Partner"),
  partnerEmail: text("partner_email").notNull().default(""),
});
export const places = sqliteTable("places", {
  id: text("id").primaryKey(),
  country: text("country").notNull(),
  city: text("city").notNull().default(""),
  month: text("month").notNull().default(""),
  traveler: text("traveler").notNull(),
  status: text("status").notNull(),
  note: text("note").notNull().default(""),
  createdBy: text("created_by").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => ({ byUpdatedAt: index("idx_places_updated_at").on(table.updatedAt) }));
export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
}, table => ({ byPlace: index("idx_photos_place_id").on(table.placeId) }));
