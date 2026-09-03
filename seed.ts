import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import {
  users,
  profiles,
  crops,
  scans,
  cases,
  experts,
  drugStores,
} from "./database/schema";
import { hashPassword } from "./backend/localAuth";

// Ensure DATABASE_URL is present
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

// --------------------------------------------------------------------------
// Realistic Indian Agricultural Location Hubs (Centroids for clustering)
// --------------------------------------------------------------------------
interface RegionHub {
  state: string;
  district: string;
  region: string;
  lat: number;
  lng: number;
  crops: { name: string; type: string }[];
  soilType: string;
  soilPh: number;
}

const REGIONAL_HUBS: RegionHub[] = [
  {
    state: "Punjab",
    district: "Ludhiana",
    region: "Northern Wheat-Rice Plain",
    lat: 30.901,
    lng: 75.8573,
    crops: [
      { name: "Sharbati Wheat", type: "Wheat" },
      { name: "Basmati Paddy", type: "Rice" },
      { name: "Yellow Mustard", type: "Mustard" },
    ],
    soilType: "Alluvial Clay Loam",
    soilPh: 7.2,
  },
  {
    state: "Punjab",
    district: "Amritsar",
    region: "Majha Plains",
    lat: 31.634,
    lng: 74.8723,
    crops: [
      { name: "HD-2967 Wheat", type: "Wheat" },
      { name: "Pusa 1121 Rice", type: "Rice" },
    ],
    soilType: "Sandy Loam",
    soilPh: 7.1,
  },
  {
    state: "Haryana",
    district: "Karnal",
    region: "Indo-Gangetic Agro-Zone",
    lat: 29.6857,
    lng: 76.9905,
    crops: [
      { name: "Karnal Bunt Resistant Wheat", type: "Wheat" },
      { name: "Sugarcane Co-0238", type: "Sugarcane" },
    ],
    soilType: "Alluvial Loam",
    soilPh: 7.4,
  },
  {
    state: "Haryana",
    district: "Hisar",
    region: "Western Semi-Arid Belt",
    lat: 29.1492,
    lng: 75.7217,
    crops: [
      { name: "Bt Cotton", type: "Cotton" },
      { name: "Pearl Millet (Bajra)", type: "Millet" },
    ],
    soilType: "Silty Clay Loam",
    soilPh: 7.8,
  },
  {
    state: "Uttar Pradesh",
    district: "Varanasi",
    region: "Eastern Gangetic Plain",
    lat: 25.3176,
    lng: 82.9739,
    crops: [
      { name: "Kashi Lalima Okra", type: "Vegetables" },
      { name: "Sonam Rice", type: "Rice" },
      { name: "Early Mustard", type: "Mustard" },
    ],
    soilType: "Fine Alluvial",
    soilPh: 6.8,
  },
  {
    state: "Uttar Pradesh",
    district: "Meerut",
    region: "Upper Doab Cane Belt",
    lat: 28.9845,
    lng: 77.7064,
    crops: [
      { name: "High-Yield Sugarcane", type: "Sugarcane" },
      { name: "Kufri Potato", type: "Potato" },
    ],
    soilType: "Rich Loam",
    soilPh: 7.0,
  },
  {
    state: "Maharashtra",
    district: "Nashik",
    region: "Western Ghats Rainshadow",
    lat: 19.9975,
    lng: 73.7898,
    crops: [
      { name: "Red Lasalgaon Onion", type: "Onion" },
      { name: "Abhinav Tomato", type: "Tomato" },
      { name: "Thompson Seedless Grapes", type: "Grapes" },
    ],
    soilType: "Medium Black Soil",
    soilPh: 6.9,
  },
  {
    state: "Maharashtra",
    district: "Pune",
    region: "Deccan Plateau",
    lat: 18.5204,
    lng: 73.8567,
    crops: [
      { name: "Pusa Ruby Tomato", type: "Tomato" },
      { name: "Sweet Corn", type: "Maize" },
      { name: "Pomegranate Bhagwa", type: "Pomegranate" },
    ],
    soilType: "Black Basaltic Loam",
    soilPh: 7.3,
  },
  {
    state: "Gujarat",
    district: "Rajkot",
    region: "Saurashtra Groundnut Belt",
    lat: 22.3039,
    lng: 70.8022,
    crops: [
      { name: "GG-20 Groundnut", type: "Groundnut" },
      { name: "Hybrid Bt Cotton", type: "Cotton" },
      { name: "Cumin GC-4", type: "Cumin" },
    ],
    soilType: "Deep Black Clay",
    soilPh: 7.6,
  },
  {
    state: "Gujarat",
    district: "Anand",
    region: "Charotar Tobacco & Dairy Belt",
    lat: 22.5645,
    lng: 72.9289,
    crops: [
      { name: "Calcutta Tobacco", type: "Tobacco" },
      { name: "Banana Robusta", type: "Banana" },
    ],
    soilType: "Sandy Goradu",
    soilPh: 7.2,
  },
  {
    state: "Andhra Pradesh",
    district: "Guntur",
    region: "Krishna Delta Spice Zone",
    lat: 16.3067,
    lng: 80.4365,
    crops: [
      { name: "Guntur Teja Chilli", type: "Chilli" },
      { name: "BPT 5204 Samba Masuri Rice", type: "Rice" },
      { name: "American Long-Staple Cotton", type: "Cotton" },
    ],
    soilType: "Deep Black Cotton Soil",
    soilPh: 7.5,
  },
  {
    state: "Telangana",
    district: "Warangal",
    region: "Northern Telangana Agro Belt",
    lat: 17.9689,
    lng: 79.5941,
    crops: [
      { name: "Dryland Cotton", type: "Cotton" },
      { name: "Red Gram (Tur)", type: "Pulses" },
      { name: "Yellow Maize", type: "Maize" },
    ],
    soilType: "Red Chalkas & Black Soil",
    soilPh: 6.7,
  },
  {
    state: "Karnataka",
    district: "Shimoga",
    region: "Malnad Plantation Basin",
    lat: 13.9299,
    lng: 75.5681,
    crops: [
      { name: "South Arecanut", type: "Arecanut" },
      { name: "Robusta Coffee", type: "Coffee" },
      { name: "Finger Millet (Ragi)", type: "Millet" },
    ],
    soilType: "Laterite Red Soil",
    soilPh: 6.1,
  },
  {
    state: "Karnataka",
    district: "Belagavi",
    region: "Northern Transitional Zone",
    lat: 15.8497,
    lng: 74.4977,
    crops: [
      { name: "Co-86032 Sugarcane", type: "Sugarcane" },
      { name: "Soybean JS-335", type: "Soybean" },
    ],
    soilType: "Clay Loam",
    soilPh: 7.1,
  },
  {
    state: "Tamil Nadu",
    district: "Coimbatore",
    region: "Western Kongu Basin",
    lat: 11.0168,
    lng: 76.9558,
    crops: [
      { name: "Coconut West Coast Tall", type: "Coconut" },
      { name: "Erode Turmeric", type: "Turmeric" },
      { name: "Tomato Shivam", type: "Tomato" },
    ],
    soilType: "Red Gravelly Loam",
    soilPh: 6.6,
  },
  {
    state: "Madhya Pradesh",
    district: "Indore",
    region: "Malwa Black Plateau",
    lat: 22.7196,
    lng: 75.8577,
    crops: [
      { name: "Malwa Golden Wheat", type: "Wheat" },
      { name: "Yellow Soybean JS-9560", type: "Soybean" },
      { name: "Kabuli Chickpea", type: "Gram" },
    ],
    soilType: "Deep Vertisol Black Soil",
    soilPh: 7.7,
  },
  {
    state: "West Bengal",
    district: "Burdwan",
    region: "Rice Bowl of Bengal",
    lat: 23.2324,
    lng: 87.8615,
    crops: [
      { name: "Govindabhog Rice", type: "Rice" },
      { name: "Tossa Jute", type: "Jute" },
      { name: "Jyoti Potato", type: "Potato" },
    ],
    soilType: "Deltaic Alluvium",
    soilPh: 6.4,
  },
  {
    state: "Rajasthan",
    district: "Kota",
    region: "Hadoti Irrigation Belt",
    lat: 25.2138,
    lng: 75.8648,
    crops: [
      { name: "Soybean Poshak", type: "Soybean" },
      { name: "Durum Wheat", type: "Wheat" },
      { name: "Coriander Super", type: "Coriander" },
    ],
    soilType: "Black Clay Soil",
    soilPh: 7.6,
  },
];

// Names for generating realistic profiles
const FIRST_NAMES = [
  "Ramesh", "Suresh", "Rajesh", "Mukesh", "Mahesh", "Dinesh", "Kailash",
  "Prakash", "Anil", "Sunil", "Manoj", "Sanjay", "Ajay", "Vijay", "Vinod",
  "Santosh", "Ashok", "Jagdish", "Harish", "Gopal", "Mohan", "Krishna",
  "Ram", "Shyam", "Balram", "Shiv", "Dev", "Narayan", "Govind", "Raghu",
  "Gurpreet", "Harpreet", "Manpreet", "Jaswinder", "Balwinder", "Kuldeep",
  "Satnam", "Amrik", "Lakhwinder", "Davinder", "Tarsem", "Gurnam",
  "Anand", "Balu", "Chandra", "Ganesh", "Gopinath", "Jayaram", "Karthik",
  "Murugan", "Muthu", "Naveen", "Palanisamy", "Prabhu", "Rangarajan",
  "Saravanan", "Selvam", "Senthil", "Sundaram", "Venkatesh", "Vignesh",
  "Baban", "Eknath", "Namdev", "Pandurang", "Tukaram", "Vitthal", "Dnyaneshwar",
  "Kisan", "Nivruti", "Sambhaji", "Santaji", "Tanaji", "Yashwant",
  "Sunita", "Anita", "Geeta", "Sita", "Radha", "Lakshmi", "Parvati",
  "Kavita", "Saroj", "Kamla", "Manju", "Urmila", "Sharda", "Rekha",
];

const LAST_NAMES = [
  "Patel", "Sharma", "Verma", "Singh", "Yadav", "Kumar", "Choudhary",
  "Reddy", "Rao", "Naidu", "Goud", "Chowdary", "Patil", "Deshmukh",
  "Kadam", "Shinde", "Jadhav", "Pawar", "Bhosale", "Gaikwad", "More",
  "Grewal", "Dhillon", "Sandhu", "Sidhu", "Brar", "Gill", "Cheema",
  "Deol", "Mann", "Randhawa", "Pannu", "Gounder", "Thevar", "Chettiar",
  "Mudaliar", "Nadar", "Pillai", "Iyer", "Iyengar", "Mishra", "Pandey",
  "Tiwari", "Dubey", "Shukla", "Upadhyay", "Tripathi", "Goswami", "Joshi",
];

const EXPERT_SPECIALIZATIONS = [
  "Plant Pathology & Foliar Diseases",
  "Integrated Pest Management (IPM)",
  "Entomology & Vector Control",
  "Soil Health, Nutrients & Micro-Irrigation",
  "Fungal Blight & Rust Management",
  "Bacterial Wilt & Systemic Infection Defense",
  "Organic Crop Protection & Biologicals",
  "Horticulture & Greenhouse Management",
];

const EXPERT_ORGANIZATIONS = [
  "ICAR - Indian Agricultural Research Institute",
  "Punjab Agricultural University (PAU)",
  "Tamil Nadu Agricultural University (TNAU)",
  "Krishi Vigyan Kendra (KVK)",
  "Dr. PDKV Akola Agricultural Extension",
  "Acharya N.G. Ranga Agricultural University",
  "Chaudhary Charan Singh Haryana Agricultural University",
  "State Department of Agriculture & Farmers Welfare",
];

const STORE_CATEGORIES = [
  "Bio-fungicides, Micronutrients, Neem Oils",
  "Certified Hybrid Seeds, Bio-Stimulants, Organic Manures",
  "Systemic Fungicides, Copper Oxychloride, Pheromone Traps",
  "Water Soluble Fertilizers (19:19:19), Soil Conditioners",
  "Drip Irrigation Filters, Knapsack Sprayers, Sticky Cards",
  "Insecticides, Herbicides, Plant Growth Regulators (PGR)",
];

// Disease libraries for the 3 risk categories
const HEALTHY_DISEASES = [
  {
    disease: "No disease identified (Healthy Tissue)",
    symptoms: ["Uniform deep green foliage", "Vigorous turgid leaf canopy", "Absence of lesions or necrosis"],
    assessment: "Crop foliage displays optimal vigor, vigorous cellular structure, and clean leaf surface.",
    recommendations: ["Maintain current scheduled drip fertigation", "Routine scouting every 3-5 days", "Keep weed-free perimeter buffers"],
  },
  {
    disease: "No disease identified (Healthy Growth)",
    symptoms: ["Healthy apical shoot growth", "Balanced chlorophyll coloration", "No pest or pathogen signature"],
    assessment: "Plant is actively photosynthesizing with balanced stem-to-leaf ratio and zero detectable fungal mycelia.",
    recommendations: ["Ensure timely morning irrigation", "Apply scheduled balanced NPK dosage", "Inspect lower canopy after rainfall"],
  },
];

const MONITORING_DISEASES = [
  {
    disease: "Early Blight (Alternaria solani)",
    symptoms: ["Concentric ring brown spots on lower leaves", "Mild chlorotic halos", "Localized target-board lesions"],
    assessment: "Initial Alternaria lesions observed on older foliage. Has not progressed to secondary canopy.",
    recommendations: ["Prune affected bottom leaves to improve airflow", "Apply Mancozeb 75% WP @ 2.5g/L preventive spray", "Avoid overhead sprinkler wetting"],
  },
  {
    disease: "Powdery Mildew (Erysiphe cichoracearum)",
    symptoms: ["White talcum-powder like patches on upper leaf", "Slight leaf curling", "Chlorosis under fungal patches"],
    assessment: "Superficial powdery mildew fungal mycelia spreading on mid-canopy under dry, warm conditions.",
    recommendations: ["Spray Wettable Sulfur 80% WDG @ 3g/L", "Alternate with Azoxystrobin 23% SC", "Ensure adequate row spacing"],
  },
  {
    disease: "Leaf Spot & Aphid Nymph Activity",
    symptoms: ["Small circular brown necrotic spots", "Light leaf curling with sticky honeydew traces"],
    assessment: "Minor leaf spot formation accompanied by early sap-feeding nymph colonies on leaf underside.",
    recommendations: ["Deploy yellow sticky cards (15 traps/acre)", "Apply Neem Oil 10,000 ppm formulation @ 3ml/L", "Recheck boundary rows within 48h"],
  },
  {
    disease: "Iron & Zinc Deficiency Chlorosis",
    symptoms: ["Interveinal yellowing on new juvenile leaves", "Green veins with pale lamina", "Stunted vegetative tips"],
    assessment: "Micronutrient deficiency induced by alkaline soil conditions limiting zinc/iron uptake.",
    recommendations: ["Foliar spray of Chelated Zinc (Zn-EDTA 12%) @ 1g/L", "Apply Ferrous Sulphate foliar mix in early morning"],
  },
];

const HIGH_RISK_DISEASES = [
  {
    disease: "Yellow Rust / Stripe Rust (Puccinia striiformis)",
    symptoms: ["Bright yellow linear stripes of powdery urediniospores", "Rapid chlorosis of active flag leaf", "Early leaf drying"],
    assessment: "Active systemic yellow rust infestation threatening flag leaf photosynthetic capacity. Spore density is high.",
    recommendations: ["Immediately isolate infected field blocks", "Apply Propiconazole 25% EC @ 1ml/L immediately", "Notify district agricultural officer and neighboring farms"],
  },
  {
    disease: "Chilli Black Thrips (Thrips parvispinus) & Curl",
    symptoms: ["Severe upward cupping of leaves", "Silvery discoloration with bronze scarred tissue", "Floral bud drop"],
    assessment: "Heavy invasive thrips feeding pressure coupled with early begomovirus transmission risks.",
    recommendations: ["Install blue & yellow sticky traps @ 30/acre", "Rotate Spinetoram 11.7% SC with Acetamiprid 20% SP", "Spray during early twilight when thrips are active"],
  },
  {
    disease: "Bacterial Leaf Blight (Xanthomonas oryzae)",
    symptoms: ["Water-soaked to yellowish-white wavy stripes from leaf margins", "Milky bacterial ooze beads on dew mornings"],
    assessment: "Severe vascular bacterial blight infection with high transmission risk through water droplets.",
    recommendations: ["Drain excess standing water immediately", "Spray Copper Hydroxide 53.8% DF + Streptomycin Sulfate", "Suspend nitrogen application until infection halts"],
  },
  {
    disease: "Fall Armyworm (Spodoptera frugiperda)",
    symptoms: ["Ragged feeding holes in central whorl leaves", "Abundant sawdust-like frass inside whorl", "Damaged growing tips"],
    assessment: "Aggressive larval infestation inside whorls requiring urgent targeted intervention.",
    recommendations: ["Apply Chlorantraniliprole 18.5% SC directed into whorls", "Place pheromone traps (5/acre) to monitor adult moth flight"],
  },
  {
    disease: "Late Blight (Phytophthora infestans)",
    symptoms: ["Dark water-soaked necrotic lesions", "White fungal down on underside during humid morning", "Foul odor from decaying leaves"],
    assessment: "Fast-spreading Late Blight under high humidity (>85%). Urgent chemical barrier required.",
    recommendations: ["Apply Cymoxanil 8% + Mancozeb 64% WP immediately", "Ensure rigorous drainage in field furrows", "Destroy severely blighted foliage safely"],
  },
];

// Helper to pick random item
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
// Helper for random in range
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number, decimals = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// Chunk array for batch inserts
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// --------------------------------------------------------------------------
// Main Seed Routine
// --------------------------------------------------------------------------
async function seedDatabase() {
  console.log("🌱 ==========================================================");
  console.log("🌱 CropShield Supabase Database Seeding Engine (Massive Dataset)");
  console.log("🌱 Target: Exactly 500 Users (430 Farmers, 40 Experts, 30 Stores)");
  console.log("🌱 Analytics Distribution: 70% Healthy, 20% Monitoring, 10% At Risk");
  console.log("🌱 ==========================================================\n");

  const startTime = Date.now();

  try {
    // 1. Clean previous seeded records to ensure 100% idempotent clean state
    console.log("🧹 [1/7] Cleaning previous seeded mock records...");
    await db.execute(sql`
      DELETE FROM "cases" WHERE "reference" LIKE 'CS-CASE-%';
      DELETE FROM "scans" WHERE "imageKey" LIKE 'seed/%';
      DELETE FROM "crops" WHERE "region" IS NOT NULL AND "ownerId" IN (SELECT "id" FROM "users" WHERE "openId" LIKE 'seed:%');
      DELETE FROM "profiles" WHERE "userId" IN (SELECT "id" FROM "users" WHERE "openId" LIKE 'seed:%');
      DELETE FROM "experts" WHERE "email" LIKE '%@cropshield.expert' OR "name" LIKE 'Dr.%' OR "name" LIKE 'Prof.%';
      DELETE FROM "drugStores" WHERE "email" LIKE '%@cropshield.store' OR "name" LIKE '%Agro%' OR "name" LIKE '%Kisan%';
      DELETE FROM "users" WHERE "openId" LIKE 'seed:%';
    `);
    console.log("   ✅ Cleaned previous seeded data successfully.\n");

    // 2. Precompute default password hash for high-speed batch insertion
    console.log("🔐 [2/7] Generating credential security hashes...");
    const defaultPasswordHash = await hashPassword("CropShield2026!");
    console.log("   ✅ Password hash computed (Default test password: CropShield2026!)\n");

    // 3. Prepare Exactly 500 Users:
    //    - 430 Farmers (role: "user")
    //    - 40 Agricultural Experts (role: "user")
    //    - 30 Agro Store Owners (role: "user")
    console.log("👥 [3/7] Generating user records (Target: Exactly 500 users)...");
    const totalUsers = 500;
    const farmerCount = 430;
    const expertCount = 40;
    const storeCount = 30;

    const userInserts = [];
    const now = new Date();

    // 430 Farmers
    for (let i = 1; i <= farmerCount; i++) {
      const fName = pick(FIRST_NAMES);
      const lName = pick(LAST_NAMES);
      const openId = `seed:farmer-${String(i).padStart(4, "0")}@cropshield.org`;
      const email = `farmer.${String(i).padStart(4, "0")}@cropshield.org`;
      // Stagger signup timestamps over the last 90 days
      const daysAgo = randInt(1, 90);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      userInserts.push({
        openId,
        name: `${fName} ${lName}`,
        email,
        loginMethod: "local-test",
        passwordHash: defaultPasswordHash,
        role: "user" as const,
        accountStatus: "active" as const,
        createdAt,
        updatedAt: createdAt,
        lastSignedIn: new Date(createdAt.getTime() + randInt(1, 10) * 3600 * 1000),
      });
    }

    // 40 Agricultural Experts
    for (let i = 1; i <= expertCount; i++) {
      const fName = pick(FIRST_NAMES);
      const lName = pick(LAST_NAMES);
      const prefix = i % 2 === 0 ? "Dr." : "Prof.";
      const openId = `seed:expert-${String(i).padStart(3, "0")}@cropshield.org`;
      const email = `expert.${String(i).padStart(3, "0")}@cropshield.expert`;
      const daysAgo = randInt(10, 120);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      userInserts.push({
        openId,
        name: `${prefix} ${fName} ${lName}`,
        email,
        loginMethod: "local-test",
        passwordHash: defaultPasswordHash,
        role: "user" as const,
        accountStatus: "active" as const,
        createdAt,
        updatedAt: createdAt,
        lastSignedIn: new Date(now.getTime() - randInt(1, 48) * 3600 * 1000),
      });
    }

    // 30 Store Owners
    for (let i = 1; i <= storeCount; i++) {
      const fName = pick(FIRST_NAMES);
      const lName = pick(LAST_NAMES);
      const openId = `seed:store-${String(i).padStart(3, "0")}@cropshield.org`;
      const email = `store.${String(i).padStart(3, "0")}@cropshield.store`;
      const daysAgo = randInt(15, 150);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      userInserts.push({
        openId,
        name: `${fName} ${lName}`,
        email,
        loginMethod: "local-test",
        passwordHash: defaultPasswordHash,
        role: "user" as const,
        accountStatus: "active" as const,
        createdAt,
        updatedAt: createdAt,
        lastSignedIn: new Date(now.getTime() - randInt(2, 72) * 3600 * 1000),
      });
    }

    console.log(`   Prepared ${userInserts.length} users. Inserting into Supabase in batches...`);
    const insertedUsers: { id: number; openId: string; name: string | null; email: string | null }[] = [];
    
    // Batch insert users in chunks of 100
    for (const chunk of chunkArray(userInserts, 100)) {
      const res = await db.insert(users).values(chunk).returning({
        id: users.id,
        openId: users.openId,
        name: users.name,
        email: users.email,
      });
      insertedUsers.push(...res);
    }
    console.log(`   ✅ Successfully inserted exactly ${insertedUsers.length} users into Supabase!\n`);

    // Separate inserted users by category
    const farmerUsers = insertedUsers.slice(0, farmerCount);
    const expertUsers = insertedUsers.slice(farmerCount, farmerCount + expertCount);
    const storeUsers = insertedUsers.slice(farmerCount + expertCount);

    // 4. Generate Profiles for all 500 users with realistic Indian geolocations
    console.log("📍 [4/7] Generating and inserting user profiles with geolocations...");
    const profileInserts = [];

    // Profiles for Farmers
    for (let idx = 0; idx < farmerUsers.length; idx++) {
      const u = farmerUsers[idx];
      const hub = REGIONAL_HUBS[idx % REGIONAL_HUBS.length];
      const primaryCrop = pick(hub.crops).name;
      // Add realistic geodetic dispersion (±0.02 to 0.08 deg ≈ 2-9 km around hub)
      const latJitter = randFloat(-0.065, 0.065, 6);
      const lngJitter = randFloat(-0.065, 0.065, 6);
      const netMode = Math.random() < 0.8 ? "good" : Math.random() < 0.85 ? "poor" : "offline";

      profileInserts.push({
        userId: u.id,
        displayName: u.name || `Farmer ${u.id}`,
        region: hub.region,
        phone: `+91 ${randInt(91000, 99999)} ${randInt(10000, 99999)}`,
        notificationPreference: Math.random() > 0.3 ? ("high_risk" as const) : ("all" as const),
        state: hub.state,
        district: hub.district,
        pinCode: String(randInt(110001, 850000)),
        village: `${hub.district} Rural Sector ${randInt(1, 14)}`,
        town: hub.district,
        primaryCrop,
        farmingExperienceYears: randInt(3, 38),
        latitude: (hub.lat + latJitter).toFixed(7),
        longitude: (hub.lng + lngJitter).toFixed(7),
        networkMode: netMode as "good" | "poor" | "offline",
      });
    }

    // Profiles for Experts
    for (let idx = 0; idx < expertUsers.length; idx++) {
      const u = expertUsers[idx];
      const hub = REGIONAL_HUBS[(idx * 2) % REGIONAL_HUBS.length];
      profileInserts.push({
        userId: u.id,
        displayName: u.name || `Expert ${u.id}`,
        region: hub.region,
        phone: `+91 ${randInt(94000, 98999)} ${randInt(10000, 99999)}`,
        notificationPreference: "all" as const,
        state: hub.state,
        district: hub.district,
        pinCode: String(randInt(110001, 850000)),
        village: `${hub.district} Agronomy Center`,
        town: hub.district,
        primaryCrop: "Agricultural Research",
        farmingExperienceYears: randInt(8, 30),
        latitude: hub.lat.toFixed(7),
        longitude: hub.lng.toFixed(7),
        networkMode: "good" as const,
      });
    }

    // Profiles for Store Owners
    for (let idx = 0; idx < storeUsers.length; idx++) {
      const u = storeUsers[idx];
      const hub = REGIONAL_HUBS[(idx * 3) % REGIONAL_HUBS.length];
      profileInserts.push({
        userId: u.id,
        displayName: u.name || `Store Owner ${u.id}`,
        region: hub.region,
        phone: `+91 ${randInt(93000, 97999)} ${randInt(10000, 99999)}`,
        notificationPreference: "high_risk" as const,
        state: hub.state,
        district: hub.district,
        pinCode: String(randInt(110001, 850000)),
        village: `${hub.district} Market Yard`,
        town: hub.district,
        primaryCrop: "Agrochemicals & Inputs",
        farmingExperienceYears: randInt(5, 25),
        latitude: hub.lat.toFixed(7),
        longitude: hub.lng.toFixed(7),
        networkMode: "good" as const,
      });
    }

    for (const chunk of chunkArray(profileInserts, 100)) {
      await db.insert(profiles).values(chunk);
    }
    console.log(`   ✅ Inserted ${profileInserts.length} profiles successfully.\n`);

    // 5. Generate Crops for Farmers (~550 crops)
    console.log("🌾 [5/7] Creating crops for farmer users...");
    const cropInserts = [];
    for (let idx = 0; idx < farmerUsers.length; idx++) {
      const u = farmerUsers[idx];
      const hub = REGIONAL_HUBS[idx % REGIONAL_HUBS.length];
      
      // Farmer gets primary crop
      const primary = hub.crops[0];
      cropInserts.push({
        ownerId: u.id,
        name: primary.name,
        cropType: primary.type,
        region: hub.region,
        acreage: String(randFloat(2.5, 35.0, 2)),
        status: "healthy" as const,
      });

      // 40% of farmers have a secondary crop
      if (Math.random() < 0.4 && hub.crops.length > 1) {
        const secondary = hub.crops[1];
        cropInserts.push({
          ownerId: u.id,
          name: secondary.name,
          cropType: secondary.type,
          region: hub.region,
          acreage: String(randFloat(1.5, 18.0, 2)),
          status: "healthy" as const,
        });
      }
    }

    const insertedCrops: { id: number; ownerId: number; name: string; cropType: string }[] = [];
    for (const chunk of chunkArray(cropInserts, 100)) {
      const res = await db.insert(crops).values(chunk).returning({
        id: crops.id,
        ownerId: crops.ownerId,
        name: crops.name,
        cropType: crops.cropType,
      });
      insertedCrops.push(...res);
    }
    console.log(`   ✅ Inserted ${insertedCrops.length} crops across farmers.\n`);

    // Map crops by ownerId for easy association
    const cropsByOwner = new Map<number, typeof insertedCrops>();
    for (const c of insertedCrops) {
      const list = cropsByOwner.get(c.ownerId) || [];
      list.push(c);
      cropsByOwner.set(c.ownerId, list);
    }

    // 6. Generate Massive Scans Dataset with Exact Analytics Distribution:
    //    Total Scans: 700
    //    - 70% Healthy (490 scans): riskLevel = "low"
    //    - 20% Monitoring (140 scans): riskLevel = "medium"
    //    - 10% At Risk (70 scans): riskLevel = "high" (56) / "critical" (14)
    //
    //    Weekly History Distribution (4 buckets):
    //    - 3 weeks ago (21-27 days): 140 scans (14 High, 28 Moderate, 98 Healthy)
    //    - 2 weeks ago (14-20 days): 160 scans (16 High, 32 Moderate, 112 Healthy)
    //    - 1 week ago  (7-13 days):  190 scans (19 High, 38 Moderate, 133 Healthy)
    //    - This week   (0-6 days):   210 scans (21 High, 42 Moderate, 147 Healthy)
    //    Totals: 70 High (10%), 140 Moderate (20%), 490 Healthy (70%) = 700 scans total!
    console.log("🔬 [6/7] Generating 700 crop scans with calibrated 70/20/10 analytics distribution...");

    const weeklyQuotas = [
      { week: 3, minDays: 21, maxDays: 27, high: 14, med: 28, low: 98 },
      { week: 2, minDays: 14, maxDays: 20, high: 16, med: 32, low: 112 },
      { week: 1, minDays: 7, maxDays: 13, high: 19, med: 38, low: 133 },
      { week: 0, minDays: 0, maxDays: 6, high: 21, med: 42, low: 147 },
    ];

    const scanInserts = [];
    const sampleImages = [
      "/manus-storage/corn-field-wikimedia_2ae8906e.jpg",
      "/manus-storage/cover-crop-field-wikimedia_304c34cc.jpg",
    ];

    let scanSeq = 1;

    for (const quota of weeklyQuotas) {
      // High/Critical risk scans for this week
      for (let h = 0; h < quota.high; h++) {
        const farmer = pick(farmerUsers);
        const farmerCrops = cropsByOwner.get(farmer.id) || [];
        const crop = farmerCrops.length > 0 ? pick(farmerCrops) : null;
        const diseaseInfo = pick(HIGH_RISK_DISEASES);
        const daysAgo = randInt(quota.minDays, quota.maxDays);
        const hoursAgo = randInt(0, 23);
        const scanDate = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 3600 * 1000);
        const isCritical = h % 4 === 0; // 25% of high risk are critical

        scanInserts.push({
          ownerId: farmer.id,
          cropId: crop ? crop.id : null,
          imageKey: `seed/scans/scan-${String(scanSeq++).padStart(5, "0")}.jpg`,
          imageUrl: pick(sampleImages),
          status: "complete" as const,
          riskLevel: (isCritical ? "critical" : "high") as "critical" | "high",
          confidence: randFloat(88.0, 98.5, 2).toString(),
          disease: diseaseInfo.disease,
          soilType: pick(["Alluvial Clay Loam", "Deep Black Cotton Soil", "Laterite Soil"]),
          soilPh: randFloat(6.2, 7.8, 1).toString(),
          soilMoisture: pick(["dry", "balanced", "wet"] as const),
          cropCount: randInt(15, 300),
          landArea: randFloat(2.0, 30.0, 1).toString(),
          landUnit: "acres",
          fieldNotes: `Scouted block sector ${randInt(1, 8)}. Visible symptoms spreading along row edges.`,
          symptoms: JSON.stringify(diseaseInfo.symptoms),
          assessment: diseaseInfo.assessment,
          recommendations: JSON.stringify(diseaseInfo.recommendations),
          recommendationProgress: JSON.stringify(
            diseaseInfo.recommendations.map((step) => ({ step, completed: Math.random() > 0.65 }))
          ),
          approvedAt: new Date(scanDate.getTime() + 1000 * 60 * 25), // Approved 25 mins later
          createdAt: scanDate,
          updatedAt: scanDate,
        });
      }

      // Moderate risk scans for this week
      for (let m = 0; m < quota.med; m++) {
        const farmer = pick(farmerUsers);
        const farmerCrops = cropsByOwner.get(farmer.id) || [];
        const crop = farmerCrops.length > 0 ? pick(farmerCrops) : null;
        const diseaseInfo = pick(MONITORING_DISEASES);
        const daysAgo = randInt(quota.minDays, quota.maxDays);
        const hoursAgo = randInt(0, 23);
        const scanDate = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 3600 * 1000);

        scanInserts.push({
          ownerId: farmer.id,
          cropId: crop ? crop.id : null,
          imageKey: `seed/scans/scan-${String(scanSeq++).padStart(5, "0")}.jpg`,
          imageUrl: pick(sampleImages),
          status: "complete" as const,
          riskLevel: "medium" as const,
          confidence: randFloat(82.0, 94.0, 2).toString(),
          disease: diseaseInfo.disease,
          soilType: pick(["Medium Black Soil", "Sandy Loam", "Clay Loam"]),
          soilPh: randFloat(6.5, 7.5, 1).toString(),
          soilMoisture: "balanced" as const,
          cropCount: randInt(20, 450),
          landArea: randFloat(1.5, 25.0, 1).toString(),
          landUnit: "acres",
          fieldNotes: `Early inspection during morning walkthrough. Noted minor leaf discoloration.`,
          symptoms: JSON.stringify(diseaseInfo.symptoms),
          assessment: diseaseInfo.assessment,
          recommendations: JSON.stringify(diseaseInfo.recommendations),
          recommendationProgress: JSON.stringify(
            diseaseInfo.recommendations.map((step) => ({ step, completed: Math.random() > 0.4 }))
          ),
          approvedAt: new Date(scanDate.getTime() + 1000 * 60 * 30),
          createdAt: scanDate,
          updatedAt: scanDate,
        });
      }

      // Healthy (Low Risk) scans for this week
      for (let l = 0; l < quota.low; l++) {
        const farmer = pick(farmerUsers);
        const farmerCrops = cropsByOwner.get(farmer.id) || [];
        const crop = farmerCrops.length > 0 ? pick(farmerCrops) : null;
        const diseaseInfo = pick(HEALTHY_DISEASES);
        const daysAgo = randInt(quota.minDays, quota.maxDays);
        const hoursAgo = randInt(0, 23);
        const scanDate = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 3600 * 1000);

        scanInserts.push({
          ownerId: farmer.id,
          cropId: crop ? crop.id : null,
          imageKey: `seed/scans/scan-${String(scanSeq++).padStart(5, "0")}.jpg`,
          imageUrl: pick(sampleImages),
          status: "complete" as const,
          riskLevel: "low" as const,
          confidence: randFloat(93.0, 99.4, 2).toString(),
          disease: diseaseInfo.disease,
          soilType: pick(["Alluvial Loam", "Black Basaltic Loam", "Deep Black Clay"]),
          soilPh: randFloat(6.8, 7.4, 1).toString(),
          soilMoisture: "balanced" as const,
          cropCount: randInt(30, 600),
          landArea: randFloat(2.0, 40.0, 1).toString(),
          landUnit: "acres",
          fieldNotes: `Routine crop monitoring scan. Foliage clean and vigorous.`,
          symptoms: JSON.stringify(diseaseInfo.symptoms),
          assessment: diseaseInfo.assessment,
          recommendations: JSON.stringify(diseaseInfo.recommendations),
          recommendationProgress: JSON.stringify(
            diseaseInfo.recommendations.map((step) => ({ step, completed: true }))
          ),
          approvedAt: new Date(scanDate.getTime() + 1000 * 60 * 15),
          createdAt: scanDate,
          updatedAt: scanDate,
        });
      }
    }

    console.log(`   Prepared ${scanInserts.length} scans. Inserting into Supabase in batches...`);
    const insertedScans: { id: number; ownerId: number; riskLevel: string }[] = [];
    for (const chunk of chunkArray(scanInserts, 100)) {
      const res = await db.insert(scans).values(chunk).returning({
        id: scans.id,
        ownerId: scans.ownerId,
        riskLevel: scans.riskLevel,
      });
      insertedScans.push(...res);
    }
    console.log(`   ✅ Successfully inserted ${insertedScans.length} approved scans!\n`);

    // 7. Generate Cases for high-risk and moderate-risk scans (~160 cases)
    console.log("📋 [7/7] Generating agricultural cases, verified experts, and drug stores...");
    const caseEligible = insertedScans.filter(
      (s) => s.riskLevel === "high" || s.riskLevel === "critical" || s.riskLevel === "medium"
    );

    const caseInserts = [];
    let caseSeq = 1001;
    for (const s of caseEligible) {
      // 100% of high/critical get cases, 60% of medium get cases
      if (s.riskLevel !== "medium" || Math.random() < 0.6) {
        const caseStatus = Math.random() < 0.45 ? "open" : Math.random() < 0.75 ? "reviewing" : "resolved";
        caseInserts.push({
          ownerId: s.ownerId,
          scanId: s.id,
          reference: `CS-CASE-${caseSeq++}`,
          status: caseStatus as "open" | "reviewing" | "resolved",
          notes:
            caseStatus === "resolved"
              ? "Treatment completed with recommended biological & chemical spray. Crop stabilized."
              : caseStatus === "reviewing"
              ? "Expert reviewed diagnosis; farmer instructed to isolate affected rows and schedule foliar spray."
              : "New case flagged by automatic risk analysis. Pending initial expert callback.",
        });
      }
    }

    for (const chunk of chunkArray(caseInserts, 100)) {
      await db.insert(cases).values(chunk);
    }
    console.log(`   ✅ Inserted ${caseInserts.length} active and reviewed cases.`);

    // 8. Insert 40 Verified Agricultural Experts
    const expertInserts = [];
    for (let idx = 0; idx < expertUsers.length; idx++) {
      const u = expertUsers[idx];
      const hub = REGIONAL_HUBS[(idx * 2) % REGIONAL_HUBS.length];
      expertInserts.push({
        name: u.name || `Dr. Agronomist ${idx + 1}`,
        profilePhotoUrl: null,
        phone: `+91 ${randInt(94000, 98999)} ${randInt(10000, 99999)}`,
        email: u.email,
        qualification: idx % 3 === 0 ? "Ph.D. in Plant Pathology (IARI)" : "M.Sc. in Agricultural Entomology",
        specialization: pick(EXPERT_SPECIALIZATIONS),
        organization: pick(EXPERT_ORGANIZATIONS),
        experienceYears: randInt(7, 28),
        state: hub.state,
        district: hub.district,
        pinCode: String(randInt(110001, 850000)),
        address: `${hub.district} Agronomy Research Station, ${hub.state}`,
        latitude: hub.lat.toFixed(7),
        longitude: hub.lng.toFixed(7),
        availability: pick(["Mon-Sat 9:00 AM - 5:00 PM", "Daily 8:00 AM - 7:00 PM", "Immediate Field Call-out"]),
        status: "verified" as const,
      });
    }

    for (const chunk of chunkArray(expertInserts, 50)) {
      await db.insert(experts).values(chunk);
    }
    console.log(`   ✅ Inserted ${expertInserts.length} verified agricultural experts.`);

    // 9. Insert 30 Approved Agro Input & Drug Stores
    const storeInserts = [];
    const storePrefixes = [
      "Kisan Agro Seva Kendra",
      "Bharat Krishi Seva Center",
      "Greenfield Agrochemicals & Seeds",
      "Annadata Crop Inputs",
      "Jai Kisan Fertilizer & Pesticides",
      "Gramin Krishi Vikas Kendra",
    ];

    for (let idx = 0; idx < storeUsers.length; idx++) {
      const u = storeUsers[idx];
      const hub = REGIONAL_HUBS[(idx * 3) % REGIONAL_HUBS.length];
      const storeName = `${pick(storePrefixes)} - ${hub.district}`;
      storeInserts.push({
        name: storeName,
        ownerContact: u.name || `Proprietor`,
        phone: `+91 ${randInt(93000, 97999)} ${randInt(10000, 99999)}`,
        email: u.email,
        address: `Shop No. ${randInt(12, 88)}, Main Mandi Road, ${hub.district}, ${hub.state}`,
        state: hub.state,
        district: hub.district,
        pinCode: String(randInt(110001, 850000)),
        latitude: (hub.lat + randFloat(-0.02, 0.02, 6)).toFixed(7),
        longitude: (hub.lng + randFloat(-0.02, 0.02, 6)).toFixed(7),
        licenseInfo: `Retail Agrochemical License: AGR-INP-${randInt(2021, 2025)}-${randInt(1000, 9999)}`,
        categories: pick(STORE_CATEGORIES),
        openingHours: "8:00 AM - 8:30 PM (Mon-Sun)",
        status: "approved" as const,
      });
    }

    for (const chunk of chunkArray(storeInserts, 50)) {
      await db.insert(drugStores).values(chunk);
    }
    console.log(`   ✅ Inserted ${storeInserts.length} approved agrochemical stores.\n`);

    // 10. Summary verification
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("🎉 ==========================================================");
    console.log(`🎉 Supabase Database Seeding Completed in ${duration}s!`);
    console.log("🎉 ==========================================================");
    console.log(`   👤 Total Users Created:     500 (430 Farmers, 40 Experts, 30 Stores)`);
    console.log(`   📍 Total Profiles Created:  ${profileInserts.length}`);
    console.log(`   🌾 Total Crops Created:     ${insertedCrops.length}`);
    console.log(`   🔬 Total Scans Created:     ${insertedScans.length}`);
    console.log(`      • 70% Healthy:           490 scans (70.0%)`);
    console.log(`      • 20% Monitoring:        140 scans (20.0%)`);
    console.log(`      • 10% At Risk (High):     70 scans (10.0%)`);
    console.log(`   📋 Total Cases Created:     ${caseInserts.length}`);
    console.log(`   🩺 Verified Experts:        ${expertInserts.length}`);
    console.log(`   🏬 Approved Drug Stores:    ${storeInserts.length}`);
    console.log(`   🗺️ Geographic Coverage:     18 Major Agricultural Clusters across India`);
    console.log("==========================================================\n");

  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDatabase().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
