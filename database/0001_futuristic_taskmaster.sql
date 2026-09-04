CREATE TYPE "public"."alertType" AS ENUM('push', 'in_app', 'sms');--> statement-breakpoint
CREATE TYPE "public"."growthStage" AS ENUM('seedling', 'vegetative', 'flowering', 'fruiting', 'harvest');--> statement-breakpoint
CREATE TYPE "public"."outbreakLevel" AS ENUM('watch', 'warning', 'outbreak');--> statement-breakpoint
CREATE TABLE "regionalOutbreaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" varchar(100) NOT NULL,
	"district" varchar(100) NOT NULL,
	"threatType" varchar(200) NOT NULL,
	"reportCount" integer DEFAULT 1 NOT NULL,
	"averageRiskScore" integer DEFAULT 0 NOT NULL,
	"outbreakLevel" "outbreakLevel" DEFAULT 'watch' NOT NULL,
	"affectedCropTypes" text,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp,
	"officerNotified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riskAlertHistory" (
	"id" serial PRIMARY KEY NOT NULL,
	"predictionId" integer NOT NULL,
	"ownerId" integer NOT NULL,
	"alertType" "alertType" DEFAULT 'in_app' NOT NULL,
	"readAt" timestamp,
	"actionTaken" varchar(100),
	"feedbackRating" integer,
	"feedbackNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riskPredictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"cropId" integer,
	"riskScore" integer DEFAULT 0 NOT NULL,
	"riskLevel" "riskLevel" DEFAULT 'unknown' NOT NULL,
	"threatType" varchar(200) NOT NULL,
	"threatDetails" text,
	"weatherSnapshot" text,
	"growthStage" "growthStage",
	"validUntil" timestamp NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"triggeredScanId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
