import { integer, pgEnum, pgTable, text, timestamp, varchar, decimal, serial, boolean } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const accountStatusEnum = pgEnum("accountStatus", ["active", "disabled"]);
export const notificationPreferenceEnum = pgEnum("notificationPreference", ["all", "high_risk", "none"]);
export const networkModeEnum = pgEnum("networkMode", ["good", "poor", "offline"]);
export const statusEnum = pgEnum("status", ["healthy", "monitoring", "at_risk"]);
export const scanStatusEnum = pgEnum("scanStatus", ["queued", "analyzing", "complete", "failed"]);
export const riskLevelEnum = pgEnum("riskLevel", ["low", "medium", "high", "critical", "unknown"]);
export const caseStatusEnum = pgEnum("caseStatus", ["open", "reviewing", "resolved"]);
export const expertStatusEnum = pgEnum("expertStatus", ["pending", "verified", "rejected", "suspended"]);
export const drugStoreStatusEnum = pgEnum("drugStoreStatus", ["pending", "approved", "rejected", "suspended"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: roleEnum("role").default("user").notNull(),
  accountStatus: accountStatusEnum("accountStatus").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  region: varchar("region", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  notificationPreference: notificationPreferenceEnum("notificationPreference").default("high_risk").notNull(),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  pinCode: varchar("pinCode", { length: 12 }),
  village: varchar("village", { length: 160 }),
  town: varchar("town", { length: 160 }),
  primaryCrop: varchar("primaryCrop", { length: 120 }),
  farmingExperienceYears: integer("farmingExperienceYears"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  networkMode: networkModeEnum("networkMode").default("good").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const crops = pgTable("crops", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  cropType: varchar("cropType", { length: 80 }).notNull(),
  region: varchar("region", { length: 160 }),
  acreage: decimal("acreage", { precision: 10, scale: 2 }),
  status: statusEnum("status").default("healthy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  cropId: integer("cropId"),
  imageKey: varchar("imageKey", { length: 500 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 1000 }).notNull(),
  status: scanStatusEnum("status").default("queued").notNull(),
  riskLevel: riskLevelEnum("riskLevel").default("unknown").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  disease: varchar("disease", { length: 180 }),
  soilType: varchar("soilType", { length: 120 }),
  soilPh: decimal("soilPh", { precision: 4, scale: 2 }),
  soilMoisture: varchar("soilMoisture", { length: 80 }),
  cropCount: integer("cropCount"),
  landArea: decimal("landArea", { precision: 10, scale: 2 }),
  landUnit: varchar("landUnit", { length: 24 }),
  fieldNotes: text("fieldNotes"),
  recommendationProgress: text("recommendationProgress"),
  symptoms: text("symptoms"),
  assessment: text("assessment"),
  recommendations: text("recommendations"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  scanId: integer("scanId").notNull().unique(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  status: caseStatusEnum("status").default("open").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Crop = typeof crops.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type Case = typeof cases.$inferSelect;

export const experts = pgTable("experts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  profilePhotoUrl: varchar("profilePhotoUrl", { length: 1000 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  qualification: varchar("qualification", { length: 240 }),
  specialization: varchar("specialization", { length: 240 }),
  organization: varchar("organization", { length: 240 }),
  experienceYears: integer("experienceYears"),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  pinCode: varchar("pinCode", { length: 12 }),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  availability: varchar("availability", { length: 160 }),
  status: expertStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const drugStores = pgTable("drugStores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  ownerContact: varchar("ownerContact", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address").notNull(),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  pinCode: varchar("pinCode", { length: 12 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  licenseInfo: text("licenseInfo"),
  supportingDocumentUrl: varchar("supportingDocumentUrl", { length: 1000 }),
  categories: text("categories"),
  openingHours: varchar("openingHours", { length: 160 }),
  status: drugStoreStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const weatherCache = pgTable("weatherCache", {
  id: serial("id").primaryKey(),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  payload: text("payload").notNull(),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type Expert = typeof experts.$inferSelect;
export type DrugStore = typeof drugStores.$inferSelect;
export type WeatherCache = typeof weatherCache.$inferSelect;
