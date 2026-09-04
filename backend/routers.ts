import { z } from "zod";
import { COOKIE_NAME } from "@common/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { approveScan, countAdmins, createCase, createCrop, createDrugStore, createExpert, createLocalUser, getAdminDrugStores, getAdminExperts, getAdminFarmerInsights, getAdminLocationSummaries, getAdminOverview, getApprovedCases, getApprovedDirectory, getApprovedDrugStores, getFarmerSnapshot, getOwnerCases, getOwnerCrops, getOwnerScans, getUserByEmail, getVerifiedExperts, insertScan, setDrugStoreStatus, setExpertStatus, setFarmerAccountStatus, deleteFarmerAccount, updateLastSignedIn, updateProfile, updateScan, updateCase, updateScanProgress, getActiveRiskPredictions, getRiskPredictionHistory, dismissRiskPrediction, insertRiskPrediction, insertAlertHistory, updateAlertFeedback, getActiveOutbreaks, getAllOutbreaks, resolveOutbreak, escalateOutbreak, upsertRegionalOutbreak, getRiskPredictionStats, getTerritoryRiskData } from "./db";
import { calculateFullRisk, detectRegionalOutbreaks, shouldEscalateToOfficer, type WeatherForecast } from "./riskEngine";
import { seedTestData } from "./seedTestData";
import { storagePut } from "./storage";
import { canCreateLocalAdmin, createLocalSession, hashPassword, LOCAL_SESSION_COOKIE, normalizeLocalEmail, toSafeUser, verifyPassword } from "./localAuth";

type WeatherCurrent = { temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number; wind_speed_10m?: number; weather_code?: number };
type WeatherPayload = { current: WeatherCurrent; units: Record<string, string>; daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[]; precipitation_probability_max?: number[] }; fetchedAt: string; unavailable?: boolean };

export async function fetchOpenMeteoWeather(latitude: number, longitude: number, fetcher: typeof fetch = fetch): Promise<WeatherPayload> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&hourly=precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&forecast_days=7&timezone=auto`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetcher(url, { signal: controller.signal });
  } catch (error) {
    console.warn("[Weather] Upstream request unavailable:", error);
    return { current: {}, units: {}, fetchedAt: new Date().toISOString(), unavailable: true as const };
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error("Weather service unavailable");
  const json = await response.json() as { current?: WeatherCurrent; current_units?: Record<string, string>; daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[]; precipitation_probability_max?: number[] } };
  return { current: json.current ?? {}, units: json.current_units ?? {}, daily: json.daily, fetchedAt: new Date().toISOString() };
}

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new Error("Administrator access required");
  const territory = { state: ctx.user.assignedState ?? null, district: ctx.user.assignedDistrict ?? null };
  return next({ ctx: { ...ctx, territory } });
});

const optionalText = (schema: z.ZodString) => z.union([schema, z.literal("")]).optional().transform((value) => value || undefined);

const fieldContextSchema = z.object({
  soilType: z.string().trim().max(120).optional(),
  soilPh: z.number().min(0).max(14).optional(),
  soilMoisture: z.enum(["dry", "balanced", "wet"]).optional(),
  cropCount: z.number().int().min(1).max(1_000_000).optional(),
  landArea: z.number().positive().max(1_000_000).optional(),
  landUnit: z.enum(["acres", "hectares"]).optional(),
  fieldNotes: z.string().trim().max(1000).optional(),
}).optional();

const analysisSchema = {
  type: "object",
  properties: {
    cropType: { type: "string" },
    riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    symptoms: { type: "array", items: { type: "string" } },
    assessment: { type: "string" },
    disease: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
  },
  required: ["cropType", "riskLevel", "confidence", "symptoms", "assessment", "disease", "recommendations"],
  additionalProperties: false,
} as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    signup: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(8).max(128), role: z.enum(["user", "admin"]), phone: z.string().trim().max(40).optional(), region: z.string().trim().max(160).optional(), state: z.string().trim().max(100).optional(), district: z.string().trim().max(100).optional(), pinCode: z.string().trim().max(12).optional(), village: z.string().trim().max(160).optional(), town: z.string().trim().max(160).optional(), primaryCrop: optionalText(z.string().trim().min(2).max(120)), farmingExperienceYears: z.number().int().min(0).max(100).optional(), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional() })).mutation(async ({ ctx, input }) => {
      const email = normalizeLocalEmail(input.email);
      if (await getUserByEmail(email)) throw new Error("An account with this email already exists");
      if (input.role === "admin" && !canCreateLocalAdmin(email, await countAdmins())) throw new Error("Administrator signup is reserved for the configured owner account and only one account is allowed");
      const user = await createLocalUser({ name: input.name.trim(), email, passwordHash: await hashPassword(input.password), role: input.role });
      await updateProfile(user.id, { displayName: input.name.trim(), phone: input.phone, region: input.region, state: input.state, district: input.district, pinCode: input.pinCode, village: input.village, town: input.town, primaryCrop: input.primaryCrop, farmingExperienceYears: input.farmingExperienceYears, latitude: input.latitude, longitude: input.longitude });
      const token = await createLocalSession(user.openId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
      return { user: toSafeUser(user), sessionToken: token } as const;
    }),
    signin: publicProcedure.input(z.object({ email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(normalizeLocalEmail(input.email));
      if (!user?.passwordHash || user.accountStatus === "disabled" || !(await verifyPassword(input.password, user.passwordHash))) throw new Error(user?.accountStatus === "disabled" ? "This farmer account is disabled. Contact an administrator." : "Email or password is incorrect");
      await updateLastSignedIn(user.id);
      const token = await createLocalSession(user.openId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
      return { user: toSafeUser(user), sessionToken: token } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  farmer: router({
    snapshot: protectedProcedure.query(({ ctx }) => getFarmerSnapshot(ctx.user.id)),
    analytics: protectedProcedure.query(async ({ ctx }) => {
      const snapshot = await getFarmerSnapshot(ctx.user.id);
      const profile = snapshot.profile;
      return getAdminOverview(profile?.state ? { state: profile.state, district: profile.district ?? undefined } : undefined);
    }),
    crops: protectedProcedure.query(({ ctx }) => getOwnerCrops(ctx.user.id)),
    scans: protectedProcedure.query(({ ctx }) => getOwnerScans(ctx.user.id)),
    verifiedExperts: protectedProcedure.input(z.object({ state: z.string().max(100).optional(), district: z.string().max(100).optional() }).optional()).query(({ input }) => getVerifiedExperts(input)),
    approvedDrugStores: protectedProcedure.input(z.object({ state: z.string().max(100).optional(), district: z.string().max(100).optional() }).optional()).query(({ input }) => getApprovedDrugStores(input)),
    createCrop: protectedProcedure.input(z.object({ name: z.string().min(2).max(120), cropType: z.string().min(2).max(80), region: z.string().max(160).optional() })).mutation(({ ctx, input }) => createCrop({ ownerId: ctx.user.id, ...input })),
    cases: protectedProcedure.query(({ ctx }) => getOwnerCases(ctx.user.id)),
    updateCase: protectedProcedure.input(z.object({ id: z.number(), reference: z.string().optional(), status: z.enum(["open", "resolved"]).optional() })).mutation(async ({ input }) => { await updateCase(input.id, input); return { success: true }; }),
    updateScanProgress: protectedProcedure.input(z.object({ scanId: z.number(), progress: z.string() })).mutation(async ({ input }) => { await updateScanProgress(input.scanId, input.progress); return { success: true }; }),
    updateProfile: protectedProcedure.input(z.object({ displayName: z.string().min(2).max(160), region: z.string().max(160).optional(), phone: z.string().max(40).optional(), state: z.string().max(100).optional(), district: z.string().max(100).optional(), pinCode: z.string().max(12).optional(), village: z.string().max(160).optional(), town: z.string().max(160).optional(), primaryCrop: optionalText(z.string().trim().min(2).max(120)), farmingExperienceYears: z.number().int().min(0).max(100).optional(), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional() })).mutation(({ ctx, input }) => updateProfile(ctx.user.id, input)),
    analyzeScan: protectedProcedure.input(z.object({ imageBase64: z.string().min(32).max(12_000_000), mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/), cropId: z.number().int().positive().optional(), fileName: z.string().min(1).max(180), fieldContext: fieldContextSchema })).mutation(async ({ ctx, input }) => {
      const key = `farmer-${ctx.user.id}/scans/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const buffer = Buffer.from(input.imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
      let stored: { key: string; url: string } | undefined;
      let scanId: number | undefined;

      // A scan is only successful when its image and initial database record are both saved.
      try {
        stored = await storagePut(key, buffer, input.mimeType);
        scanId = await insertScan({ ownerId: ctx.user.id, cropId: input.cropId, imageKey: stored.key, imageUrl: stored.url, status: "analyzing", riskLevel: "unknown", soilType: input.fieldContext?.soilType, soilPh: input.fieldContext?.soilPh?.toString(), soilMoisture: input.fieldContext?.soilMoisture, cropCount: input.fieldContext?.cropCount, landArea: input.fieldContext?.landArea?.toString(), landUnit: input.fieldContext?.landUnit, fieldNotes: input.fieldContext?.fieldNotes, recommendationProgress: JSON.stringify([]) });
      } catch (persistenceError) {
        console.error("[Scan] Storage/database unavailable before AI analysis:", persistenceError);
        throw new Error("The scan could not be saved. Please check your connection and try again.");
      }

      try {
        let weatherContextStr = "";
        try {
          const snapshot = await getFarmerSnapshot(ctx.user.id);
          const profile = snapshot.profile;
          if (profile?.latitude && profile?.longitude) {
            const weatherData = await fetchOpenMeteoWeather(Number(profile.latitude), Number(profile.longitude));
            weatherContextStr = `\nRecent Weather: ${weatherData.current.temperature_2m}°C, ${weatherData.current.relative_humidity_2m}% humidity, ${weatherData.current.precipitation}mm precipitation.`;
          }
        } catch (err) {
          console.warn("[Scan] Could not fetch weather for context:", err);
        }

        const contextSummary = ([
          input.fieldContext?.soilType && `Soil type: ${input.fieldContext.soilType}`,
          input.fieldContext?.soilPh !== undefined && `Soil pH: ${input.fieldContext.soilPh}`,
          input.fieldContext?.soilMoisture && `Soil moisture: ${input.fieldContext.soilMoisture}`,
          input.fieldContext?.cropCount !== undefined && `Number of crops/plants represented: ${input.fieldContext.cropCount}`,
          input.fieldContext?.landArea !== undefined && `Land area: ${input.fieldContext.landArea} ${input.fieldContext.landUnit ?? "units"}`,
          input.fieldContext?.fieldNotes && `Farmer notes: ${input.fieldContext.fieldNotes}`,
        ].filter(Boolean).join("\n") || "No optional field context was supplied. Base the result on the image only.") + weatherContextStr;
        const messages = [
          { role: "system" as const, content: "You are CropShield's crop-health assessment service. Analyze the actual crop image conservatively. Do not claim certainty; return only the requested structured JSON. Use farmer-supplied field context as supporting evidence, explain when image evidence is limited, and make recommendations practical, safe, and specific to the crop and context." },
          { role: "user" as const, content: [{ type: "text" as const, text: `Assess this crop image for visible health concerns. Identify likely crop type, risk level, confidence from 0 to 100, visible symptoms, concise assessment, and practical recommendations. Return treatment, prevention, and monitoring actions where appropriate.\n\nOptional farmer field context (may be incomplete):\n${contextSummary}` }, { type: "image_url" as const, image_url: { url: `data:${input.mimeType};base64,${input.imageBase64.replace(/^data:[^;]+;base64,/, "")}` } }] },
        ];
        let response;
        try {
          response = await invokeLLM({
            model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
            messages,
            response_format: { type: "json_schema", json_schema: { name: "crop_health_assessment", strict: true, schema: analysisSchema } },
          });
        } catch (structuredError) {
          console.warn("[Scan] Structured AI response failed; retrying with JSON object format:", structuredError);
          response = await invokeLLM({
            model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
            messages,
            response_format: { type: "json_object" },
          });
        }
        const rawContent = response.choices?.[0]?.message?.content;
        const content = Array.isArray(rawContent)
          ? rawContent.filter((part) => part.type === "text").map((part) => part.text).join("")
          : rawContent;
        console.log("[Scan] Raw LLM content:", content);
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");
        const rawConf = parsed.confidence ?? parsed.confidence_score;
        const confidence = Number.isFinite(Number(rawConf)) ? Number(rawConf) : 0;
        
        const rawRiskVal = parsed.riskLevel ?? parsed.risk_level;
        let rawRisk = typeof rawRiskVal === "string" ? rawRiskVal.toLowerCase() : "unknown";
        if (!["low", "medium", "high", "critical"].includes(rawRisk)) { rawRisk = "unknown"; }
        const riskLevel = rawRisk as "low" | "medium" | "high" | "critical" | "unknown";
        
        const rawCropType = parsed.cropType ?? parsed.crop_type;
        const cropType = typeof rawCropType === "string" ? rawCropType : "Unknown";

        const rawDisease = parsed.disease ?? parsed.cropType ?? parsed.crop_type;
        const disease = typeof rawDisease === "string" ? rawDisease : "Unknown";
        
        const assessment = typeof parsed.assessment === "string" ? parsed.assessment : "Assessment could not be generated.";
        
        const rawSymptoms = parsed.symptoms ?? parsed.visible_symptoms;
        const symptoms = Array.isArray(rawSymptoms) ? rawSymptoms : (typeof rawSymptoms === "string" ? [rawSymptoms] : []);
        
        let recommendations: string[] = [];
        if (Array.isArray(parsed.recommendations)) {
          recommendations = parsed.recommendations;
        } else if (typeof parsed.recommendations === "object" && parsed.recommendations !== null) {
          recommendations = Object.values(parsed.recommendations).flat().filter(x => typeof x === "string") as string[];
        }

        if (scanId) {
          await updateScan(scanId, ctx.user.id, { status: "complete", riskLevel, confidence: confidence.toFixed(2), disease, symptoms: JSON.stringify(symptoms), assessment, recommendations: JSON.stringify(recommendations), recommendationProgress: JSON.stringify(recommendations.map((step: string) => ({ step, completed: false }))) });
        } else {
          console.warn("[Scan] AI succeeded, but no persistent scan record was created.");
        }

        if (riskLevel === "high" || riskLevel === "critical") {
          try { await notifyOwner({ title: "High-risk CropShield scan", content: `A new high-risk crop scan was analyzed for farmer ${ctx.user.name ?? ctx.user.id}. Review the approved workflow before system-wide publication.` }); }
          catch (notificationError) { console.warn("[Scan] Notification failed after successful analysis:", notificationError); }
        }
        return { scanId: scanId ?? 0, imageUrl: stored?.url ?? "", fieldContext: input.fieldContext ?? null, recommendationProgress: recommendations.map((step: string) => ({ step, completed: false })), cropType, disease, assessment, symptoms, recommendations, riskLevel, confidence };
      } catch (error) {
        if (scanId) {
          try { await updateScan(scanId, ctx.user.id, { status: "failed" }); }
          catch (persistenceError) { console.error("[Scan] Could not mark failed scan:", persistenceError); }
        }
        console.error("[Scan] analyzeScan failed:", error);
        throw error;
      }
    }),
    updateRecommendationProgress: protectedProcedure.input(z.object({ scanId: z.number().int().positive(), progress: z.array(z.object({ step: z.string().trim().min(1).max(600), completed: z.boolean() })).max(30) })).mutation(async ({ ctx, input }) => {
      await updateScan(input.scanId, ctx.user.id, { recommendationProgress: JSON.stringify(input.progress) });
      return { success: true } as const;
    }),
    reportThreat: protectedProcedure.input(z.object({
      threatType: z.string().trim().min(2).max(200),
      riskScore: z.number().int().min(0).max(100),
      riskLevel: z.enum(["low", "medium", "high", "critical"]),
      notes: z.string().trim().max(1000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const snapshot = await getFarmerSnapshot(ctx.user.id);
      const profile = snapshot.profile;
      if (profile?.state && profile?.district) {
        await upsertRegionalOutbreak({
          state: profile.state,
          district: profile.district,
          threatType: input.threatType,
          reportCount: 1,
          averageRiskScore: input.riskScore,
          outbreakLevel: input.riskLevel === "critical" || input.riskLevel === "high" ? "warning" : "watch",
        });
      }
      return { success: true, message: "Thank you for reporting this threat. Your report has been added to the regional outbreak tracker." } as const;
    }),
  }),
  weather: router({
    current: publicProcedure.input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })).query(({ input }) => fetchOpenMeteoWeather(input.latitude, input.longitude)),
  }),
  risk: router({
    predict: protectedProcedure.input(z.object({ cropId: z.number().int().positive().optional(), growthStage: z.enum(["seedling", "vegetative", "flowering", "fruiting", "harvest"]).optional() })).mutation(async ({ ctx, input }) => {
      const snapshot = await getFarmerSnapshot(ctx.user.id);
      const profile = snapshot.profile;
      const crop = input.cropId ? snapshot.crops.find(c => c.id === input.cropId) : snapshot.crops[0];
      const cropType = crop?.cropType ?? profile?.primaryCrop ?? "general crop";
      const latitude = Number(profile?.latitude ?? 20.5937);
      const longitude = Number(profile?.longitude ?? 78.9629);
      const weatherData = await fetchOpenMeteoWeather(latitude, longitude);
      const weatherForecast: WeatherForecast = { current: weatherData.current, daily: weatherData.daily };
      const result = await calculateFullRisk(
        ctx.user.id, crop?.id ?? null, cropType, input.growthStage ?? null,
        { state: profile?.state, district: profile?.district, region: profile?.region },
        weatherForecast,
      );
      // Store predictions in DB
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 10);
      for (const threat of result.threats) {
        const predictionId = await insertRiskPrediction({
          ownerId: ctx.user.id,
          cropId: crop?.id ?? null,
          riskScore: threat.riskScore,
          riskLevel: threat.riskLevel,
          threatType: threat.threatType,
          threatDetails: JSON.stringify({ explanation: threat.explanation, outlook: threat.outlook, preventiveActions: threat.preventiveActions, factors: threat.factors }),
          weatherSnapshot: JSON.stringify(result.weatherSnapshot),
          growthStage: input.growthStage ?? null,
          validUntil,
        });
        await insertAlertHistory({ predictionId, ownerId: ctx.user.id, alertType: "in_app" });
      }
      // Update regional outbreaks if applicable
      if (profile?.state && profile?.district) {
        const outbreaks = await detectRegionalOutbreaks(profile.state, profile.district);
        for (const ob of outbreaks.outbreaks) {
          await upsertRegionalOutbreak({
            state: profile.state, district: profile.district,
            threatType: ob.threatType, reportCount: ob.reportCount,
            averageRiskScore: ob.avgScore, outbreakLevel: ob.level,
          });
        }
      }
      return result;
    }),
    active: protectedProcedure.query(({ ctx }) => getActiveRiskPredictions(ctx.user.id)),
    history: protectedProcedure.query(({ ctx }) => getRiskPredictionHistory(ctx.user.id)),
    dismiss: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => dismissRiskPrediction(input.id, ctx.user.id)),
    feedback: protectedProcedure.input(z.object({ predictionId: z.number().int().positive(), rating: z.number().int().min(1).max(5), notes: z.string().max(500).optional(), actionTaken: z.string().max(100).optional() })).mutation(({ ctx, input }) =>
      updateAlertFeedback(input.predictionId, ctx.user.id, { feedbackRating: input.rating, feedbackNotes: input.notes, actionTaken: input.actionTaken })
    ),
    outbreaks: protectedProcedure.input(z.object({ state: z.string().max(100).optional(), district: z.string().max(100).optional() }).optional()).query(({ input }) =>
      getActiveOutbreaks(input)
    ),
    allOutbreaks: protectedProcedure.query(() => getAllOutbreaks()),
  }),
  admin: router({
    overview: adminProcedure.query(({ ctx }) => getAdminOverview(ctx.territory)),
    directory: adminProcedure.query(({ ctx }) => getApprovedDirectory(ctx.territory)),
    farmerInsights: adminProcedure.query(({ ctx }) => getAdminFarmerInsights(ctx.territory)),
    setFarmerStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), accountStatus: z.enum(["active", "disabled"]) })).mutation(({ input }) => setFarmerAccountStatus(input.id, input.accountStatus)),
    deleteFarmer: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteFarmerAccount(input.id)),
    locationSummaries: adminProcedure.query(({ ctx }) => getAdminLocationSummaries(ctx.territory)),
    cases: adminProcedure.query(({ ctx }) => getApprovedCases(ctx.territory)),
    approveScan: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => approveScan(input.id)),
    experts: adminProcedure.query(() => getAdminExperts()),
    createExpert: adminProcedure.input(z.object({ name: z.string().min(2).max(160), phone: z.string().max(40).optional(), email: z.string().email().optional(), qualification: z.string().max(240).optional(), specialization: z.string().max(240).optional(), organization: z.string().max(240).optional(), state: z.string().max(100).optional(), district: z.string().max(100).optional(), availability: z.string().max(160).optional() })).mutation(({ input }) => createExpert(input)),
    setExpertStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "verified", "rejected", "suspended"]) })).mutation(({ input }) => setExpertStatus(input.id, input.status)),
    drugStores: adminProcedure.query(() => getAdminDrugStores()),
    createDrugStore: adminProcedure.input(z.object({ name: z.string().min(2).max(200), address: z.string().min(4), phone: z.string().max(40).optional(), email: z.string().email().optional(), state: z.string().max(100).optional(), district: z.string().max(100).optional(), pinCode: z.string().max(12).optional(), licenseInfo: z.string().max(2000).optional(), categories: z.string().max(500).optional(), openingHours: z.string().max(160).optional() })).mutation(({ input }) => createDrugStore(input)),
    setDrugStoreStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "approved", "rejected", "suspended"]) })).mutation(({ input }) => setDrugStoreStatus(input.id, input.status)),
    regionalOutbreaks: adminProcedure.query(() => getAllOutbreaks()),
    riskOverview: adminProcedure.query(({ ctx }) => getRiskPredictionStats(ctx.territory)),
    territoryRisks: adminProcedure.query(({ ctx }) => getTerritoryRiskData(ctx.territory)),
    escalateOutbreak: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => escalateOutbreak(input.id)),
    resolveOutbreak: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => resolveOutbreak(input.id)),
    seedTestData: adminProcedure.mutation(async () => {
      const result = await seedTestData();
      return { success: true, message: `Seeded ${result.farmers} farmers, ${result.scans} scans, ${result.predictions} predictions, ${result.outbreaks} outbreaks, ${result.experts} experts, ${result.stores} stores.`, ...result };
    }),
  }),
  cases: router({
    create: protectedProcedure.input(z.object({ scanId: z.number().int().positive(), reference: z.string().min(3).max(32), notes: z.string().max(2000).optional() })).mutation(({ ctx, input }) => createCase({ ownerId: ctx.user.id, scanId: input.scanId, reference: input.reference, notes: input.notes })),
  }),
});

export type AppRouter = typeof appRouter;
