CREATE TYPE "public"."accountStatus" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."caseStatus" AS ENUM('open', 'reviewing', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."drugStoreStatus" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."expertStatus" AS ENUM('pending', 'verified', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."networkMode" AS ENUM('good', 'poor', 'offline');--> statement-breakpoint
CREATE TYPE "public"."notificationPreference" AS ENUM('all', 'high_risk', 'none');--> statement-breakpoint
CREATE TYPE "public"."riskLevel" AS ENUM('low', 'medium', 'high', 'critical', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."scanStatus" AS ENUM('queued', 'analyzing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('healthy', 'monitoring', 'at_risk');--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"scanId" integer NOT NULL,
	"reference" varchar(32) NOT NULL,
	"status" "caseStatus" DEFAULT 'open' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cases_scanId_unique" UNIQUE("scanId"),
	CONSTRAINT "cases_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "crops" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"cropType" varchar(80) NOT NULL,
	"region" varchar(160),
	"acreage" numeric(10, 2),
	"status" "status" DEFAULT 'healthy' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drugStores" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"ownerContact" varchar(160),
	"phone" varchar(40),
	"email" varchar(320),
	"address" text NOT NULL,
	"state" varchar(100),
	"district" varchar(100),
	"pinCode" varchar(12),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"licenseInfo" text,
	"supportingDocumentUrl" varchar(1000),
	"categories" text,
	"openingHours" varchar(160),
	"status" "drugStoreStatus" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"profilePhotoUrl" varchar(1000),
	"phone" varchar(40),
	"email" varchar(320),
	"qualification" varchar(240),
	"specialization" varchar(240),
	"organization" varchar(240),
	"experienceYears" integer,
	"state" varchar(100),
	"district" varchar(100),
	"pinCode" varchar(12),
	"address" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"availability" varchar(160),
	"status" "expertStatus" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"displayName" varchar(160) NOT NULL,
	"region" varchar(160),
	"phone" varchar(40),
	"notificationPreference" "notificationPreference" DEFAULT 'high_risk' NOT NULL,
	"state" varchar(100),
	"district" varchar(100),
	"pinCode" varchar(12),
	"village" varchar(160),
	"town" varchar(160),
	"primaryCrop" varchar(120),
	"farmingExperienceYears" integer,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"networkMode" "networkMode" DEFAULT 'good' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"cropId" integer,
	"imageKey" varchar(500) NOT NULL,
	"imageUrl" varchar(1000) NOT NULL,
	"status" "scanStatus" DEFAULT 'queued' NOT NULL,
	"riskLevel" "riskLevel" DEFAULT 'unknown' NOT NULL,
	"confidence" numeric(5, 2),
	"disease" varchar(180),
	"soilType" varchar(120),
	"soilPh" numeric(4, 2),
	"soilMoisture" varchar(80),
	"cropCount" integer,
	"landArea" numeric(10, 2),
	"landUnit" varchar(24),
	"fieldNotes" text,
	"recommendationProgress" text,
	"symptoms" text,
	"assessment" text,
	"recommendations" text,
	"approvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"passwordHash" varchar(255),
	"role" "role" DEFAULT 'user' NOT NULL,
	"accountStatus" "accountStatus" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "weatherCache" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" varchar(100),
	"district" varchar(100),
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"payload" text NOT NULL,
	"fetchedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL
);
