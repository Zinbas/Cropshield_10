import { getDb } from "./db";
import { users, profiles, crops, scans, experts, drugStores, regionalOutbreaks, riskPredictions, riskAlertHistory } from "../database/schema";

const INDIAN_LOCATIONS = [
  { state: "Maharashtra", districts: ["Pune", "Nashik", "Nagpur", "Aurangabad"], lat: 18.5204, lng: 73.8567 },
  { state: "Karnataka", districts: ["Bangalore Rural", "Mysuru", "Belgaum", "Dharwad"], lat: 12.9716, lng: 77.5946 },
  { state: "Uttar Pradesh", districts: ["Lucknow", "Varanasi", "Agra", "Kanpur"], lat: 26.8467, lng: 80.9462 },
  { state: "Punjab", districts: ["Ludhiana", "Amritsar", "Patiala", "Jalandhar"], lat: 30.9010, lng: 75.8573 },
  { state: "Tamil Nadu", districts: ["Coimbatore", "Madurai", "Salem", "Trichy"], lat: 11.0168, lng: 76.9558 },
  { state: "Andhra Pradesh", districts: ["Guntur", "Krishna", "Kurnool", "Anantapur"], lat: 16.3067, lng: 80.4365 },
  { state: "Madhya Pradesh", districts: ["Bhopal", "Indore", "Jabalpur", "Gwalior"], lat: 23.2599, lng: 77.4126 },
  { state: "Rajasthan", districts: ["Jaipur", "Jodhpur", "Udaipur", "Kota"], lat: 26.9124, lng: 75.7873 },
  { state: "Assam", districts: ["Guwahati", "Dibrugarh", "Jorhat", "Tezpur"], lat: 26.1445, lng: 91.7362 },
];

const CROP_TYPES = ["Rice", "Wheat", "Cotton", "Tomato", "Potato", "Sugarcane", "Maize", "Soybean", "Groundnut", "Grapes", "Mango", "Onion", "Chilli", "Banana", "Mustard"];
const DISEASES = ["Leaf Blight", "Downy Mildew", "Powdery Mildew", "Bacterial Wilt", "Aphid Infestation", "Whitefly Attack", "Stem Borer", "Root Rot", "Flea Beetle Damage", "Fruit Fly", "Anthracnose", "Rust", "Late Blight", "Mosaic Virus", "Leaf Curl"];
const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
const EXPERT_NAMES = ["Dr. Ramesh Patel", "Dr. Sunita Sharma", "Dr. Anil Kumar", "Dr. Priya Nair", "Dr. Vijay Singh"];
const EXPERT_SPECS = ["Plant Pathology", "Entomology", "Soil Science", "Crop Science", "Integrated Pest Management"];
const STORE_NAMES = ["AgroChem Solutions", "Kisan Agro Store", "Green Fields Pesticides", "Rural Agri Center", "FarmCare Supplies"];

function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(base: number, range: number) { return +(base + (Math.random() - 0.5) * range).toFixed(6); }

export async function seedTestData(): Promise<{ farmers: number; scans: number; predictions: number; outbreaks: number; experts: number; stores: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const farmerIds: number[] = [];
  const cropIds: number[] = [];
  let scanCount = 0;
  let predictionCount = 0;
  let outbreakCount = 0;

  // Create ~50 farmers across 8 states
  for (const loc of INDIAN_LOCATIONS) {
    const farmersPerState = randomInt(5, 8);
    for (let i = 0; i < farmersPerState; i++) {
      const district = randomPick(loc.districts);
      const cropType = randomPick(CROP_TYPES);
      const email = `farmer_${loc.state.toLowerCase().replace(/\s/g, "")}_${i}_${Date.now()}@test.cropshield.dev`;
      const openId = `seed_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      // Create user
      const [user] = await db.insert(users).values({
        openId,
        name: `Test Farmer ${loc.state} ${i + 1}`,
        email,
        loginMethod: "local",
        passwordHash: "$2b$10$seedtestdatahashneverused000000000000000000",
        role: "user",
      }).returning({ id: users.id });

      farmerIds.push(user.id);

      // Create profile
      await db.insert(profiles).values({
        userId: user.id,
        displayName: `Farmer ${district} ${i + 1}`,
        state: loc.state,
        district,
        primaryCrop: cropType,
        latitude: randomFloat(loc.lat, 2).toString(),
        longitude: randomFloat(loc.lng, 2).toString(),
        region: `${district}, ${loc.state}`,
      });

      // Create 1-3 crops per farmer
      const numCrops = randomInt(1, 3);
      for (let c = 0; c < numCrops; c++) {
        const ct = c === 0 ? cropType : randomPick(CROP_TYPES);
        const [crop] = await db.insert(crops).values({
          ownerId: user.id,
          name: `My ${ct} Field`,
          cropType: ct,
          region: `${district}, ${loc.state}`,
        }).returning({ id: crops.id });
        cropIds.push(crop.id);
      }

      // Create 2-6 scans per farmer
      const numScans = randomInt(2, 6);
      for (let s = 0; s < numScans; s++) {
        const riskLevel = randomPick(RISK_LEVELS);
        const disease = randomPick(DISEASES);
        const confidence = randomInt(45, 95);
        const daysAgo = randomInt(0, 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);

        await db.insert(scans).values({
          ownerId: user.id,
          cropId: cropIds.length > 0 ? randomPick(cropIds.filter(() => Math.random() > 0.3)) || cropIds[0] : undefined,
          imageKey: `seed/scan_${Date.now()}_${s}.jpg`,
          imageUrl: `https://placehold.co/400x400?text=${encodeURIComponent(disease)}`,
          status: "complete",
          riskLevel,
          confidence: confidence.toFixed(2),
          disease,
          assessment: `AI detected signs consistent with ${disease} on ${cropType}. ${riskLevel === "high" || riskLevel === "critical" ? "Immediate attention recommended." : "Monitor over the next few days."}`,
          symptoms: JSON.stringify([`${disease} symptoms visible`, "Discoloration on leaves", "Minor tissue damage"]),
          recommendations: JSON.stringify([
            "Inspect surrounding plants for spread",
            "Apply recommended treatment if confirmed",
            "Consult a local agricultural expert",
          ]),
          recommendationProgress: JSON.stringify([]),
          createdAt,
        });
        scanCount++;
      }
    }
  }

  // Create ~30 risk predictions spread across farmers
  const predictionFarmers = farmerIds.sort(() => Math.random() - 0.5).slice(0, 30);
  for (const farmerId of predictionFarmers) {
    const threatType = randomPick(DISEASES);
    const riskScore = randomInt(20, 90);
    const riskLevel = riskScore >= 75 ? "critical" : riskScore >= 55 ? "high" : riskScore >= 35 ? "medium" : "low";
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 10);
    const daysAgo = randomInt(0, 5);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const [pred] = await db.insert(riskPredictions).values({
      ownerId: farmerId,
      riskScore,
      riskLevel: riskLevel as typeof RISK_LEVELS[number],
      threatType,
      threatDetails: JSON.stringify({
        explanation: `Weather conditions and regional data suggest elevated risk of ${threatType}.`,
        outlook: "Monitor closely over the next 7-15 days.",
        preventiveActions: ["Improve air circulation", "Avoid overhead irrigation", "Inspect leaves regularly"],
        factors: [{ factor: "High humidity", contribution: riskScore, description: "Current humidity levels favor pathogen growth." }],
      }),
      validUntil,
      createdAt,
    }).returning({ id: riskPredictions.id });

    await db.insert(riskAlertHistory).values({
      predictionId: pred.id,
      ownerId: farmerId,
      alertType: "in_app",
      createdAt,
    });

    predictionCount++;
  }

  // Create ~10 regional outbreaks across different states
  const outbreakStates = INDIAN_LOCATIONS;
  for (const loc of outbreakStates) {
    const numOutbreaks = randomInt(1, 3);
    for (let o = 0; o < numOutbreaks; o++) {
      const threat = randomPick(DISEASES);
      const district = randomPick(loc.districts);
      const reportCount = randomInt(3, 15);
      const avgScore = randomInt(40, 85);
      const level = reportCount >= 8 ? "outbreak" : reportCount >= 5 ? "warning" : "watch";
      const daysAgo = randomInt(0, 14);
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - daysAgo);

      await db.insert(regionalOutbreaks).values({
        state: loc.state,
        district,
        threatType: threat,
        reportCount,
        averageRiskScore: avgScore,
        outbreakLevel: level as "watch" | "warning" | "outbreak",
        affectedCropTypes: JSON.stringify([randomPick(CROP_TYPES), randomPick(CROP_TYPES)]),
        startedAt,
        officerNotified: level === "outbreak",
      });
      outbreakCount++;
    }
  }

  // Create 5 verified experts
  for (let i = 0; i < EXPERT_NAMES.length; i++) {
    const loc = INDIAN_LOCATIONS[i % INDIAN_LOCATIONS.length];
    await db.insert(experts).values({
      name: EXPERT_NAMES[i],
      phone: `+91 ${randomInt(70000, 99999)}${randomInt(10000, 99999)}`,
      email: `${EXPERT_NAMES[i].toLowerCase().replace(/[^a-z]/g, "")}_${Date.now()}@test.cropshield.dev`,
      qualification: "Ph.D. in Agricultural Sciences",
      specialization: EXPERT_SPECS[i],
      organization: `${loc.state} Agricultural University`,
      experienceYears: randomInt(5, 25),
      state: loc.state,
      district: randomPick(loc.districts),
      latitude: randomFloat(loc.lat, 1).toString(),
      longitude: randomFloat(loc.lng, 1).toString(),
      availability: "Mon-Fri, 9 AM - 5 PM",
      status: "verified",
    });
  }

  // Create 5 approved drug stores
  for (let i = 0; i < STORE_NAMES.length; i++) {
    const loc = INDIAN_LOCATIONS[(i + 3) % INDIAN_LOCATIONS.length];
    const district = randomPick(loc.districts);
    await db.insert(drugStores).values({
      name: STORE_NAMES[i],
      ownerContact: `Owner ${i + 1}`,
      phone: `+91 ${randomInt(70000, 99999)}${randomInt(10000, 99999)}`,
      email: `${STORE_NAMES[i].toLowerCase().replace(/\s/g, "")}_${Date.now()}@test.cropshield.dev`,
      address: `Main Market Road, ${district}, ${loc.state}`,
      state: loc.state,
      district,
      latitude: randomFloat(loc.lat, 1).toString(),
      longitude: randomFloat(loc.lng, 1).toString(),
      categories: JSON.stringify(["Pesticides", "Fertilizers", "Seeds", "Bio-products"]),
      openingHours: "8:00 AM - 8:00 PM",
      status: "approved",
    });
  }

  return {
    farmers: farmerIds.length,
    scans: scanCount,
    predictions: predictionCount,
    outbreaks: outbreakCount,
    experts: EXPERT_NAMES.length,
    stores: STORE_NAMES.length,
  };
}
