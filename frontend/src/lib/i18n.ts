export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
  { code: "as", label: "অসমীয়া" },
  { code: "bn", label: "বাংলা" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

type Copy = Record<string, string>;

const copy: Record<LanguageCode, Copy> = {
  en: {
    home: "Home", crops: "My Crops", scan: "Scan", cases: "Cases", more: "More", profile: "Profile", experts: "Experts", stores: "Stores", farmers: "Farmers", analytics: "Analytics",
    save: "Save", back: "Back", language: "Language", welcome: "Who are you signing in as?", signIn: "Sign in to CropShield", create: "Create account",
    heroEyebrow: "LOCAL AGRITECH TEST PLATFORM", heroTitle: "Know your crops.", heroAccent: "Grow with confidence.", heroBody: "CropShield brings crop monitoring and actionable health intelligence into one calm, field-ready workspace.", trust: "Local test accounts and private crop records",
    workspaceHint: "Choose your workspace first. We’ll only ask for the details needed to get you started.", farmerRole: "I’m a farmer", farmerDetail: "Monitor crops, scan images, and track cases", adminRole: "I’m an administrator", adminDetail: "Manage approvals, farmers, and field services", existingAccount: "Already have an account? Sign in", changeWorkspace: "Change workspace", createTestAccount: "Create a test account",
    localAccess: "LOCAL TEST ACCESS", setupWorkspace: "Set up your workspace", accountDatabase: "Use an account saved in this test application’s database.", addEssentials: "Add the essentials now. You can complete your profile later.", workspace: "WORKSPACE", fullName: "Full name", primaryCrop: "Primary crop", state: "State", district: "District", pinCode: "PIN code", village: "Village", town: "Town", phone: "Phone", email: "Email", password: "Password", optional: "optional", useGps: "Use my GPS location", detecting: "Detecting location…", gpsCaptured: "GPS location captured", optionalGps: "Optional: use GPS to save your coordinates", pleaseWait: "Please wait…", needAccount: "Need a test account? Sign up",
  },
  hi: {
    home: "होम", crops: "मेरी फसलें", scan: "स्कैन", cases: "केस", more: "और", profile: "प्रोफ़ाइल", experts: "विशेषज्ञ", stores: "दुकानें", farmers: "किसान", analytics: "विश्लेषण", save: "सहेजें", back: "वापस", language: "भाषा", welcome: "आप किस रूप में साइन इन कर रहे हैं?", signIn: "CropShield में साइन इन करें", create: "खाता बनाएं",
    heroEyebrow: "स्थानीय कृषि-तकनीक परीक्षण मंच", heroTitle: "अपनी फसल को जानें।", heroAccent: "आत्मविश्वास से बढ़ें।", heroBody: "CropShield आपके खेत के लिए फसल निगरानी और उपयोगी स्वास्थ्य जानकारी एक शांत, सरल कार्यक्षेत्र में लाता है।", trust: "स्थानीय परीक्षण खाते और निजी फसल रिकॉर्ड",
    workspaceHint: "पहले अपना कार्यक्षेत्र चुनें। शुरुआत के लिए हम केवल आवश्यक जानकारी पूछेंगे।", farmerRole: "मैं किसान हूँ", farmerDetail: "फसल देखें, तस्वीर स्कैन करें और केस ट्रैक करें", adminRole: "मैं प्रशासक हूँ", adminDetail: "अनुमोदन, किसान और कृषि सेवाएं प्रबंधित करें", existingAccount: "पहले से खाता है? साइन इन करें", changeWorkspace: "कार्यस्थल बदलें", createTestAccount: "परीक्षण खाता बनाएं", localAccess: "स्थानीय परीक्षण प्रवेश", setupWorkspace: "अपना कार्यक्षेत्र सेट करें", accountDatabase: "इस परीक्षण ऐप के डेटाबेस में सहेजे खाते का उपयोग करें।", addEssentials: "अभी आवश्यक जानकारी जोड़ें। प्रोफ़ाइल बाद में पूरी कर सकते हैं।", workspace: "कार्यस्थल", fullName: "पूरा नाम", primaryCrop: "मुख्य फसल", state: "राज्य", district: "जिला", pinCode: "पिन कोड", village: "गाँव", town: "शहर", phone: "फ़ोन", email: "ईमेल", password: "पासवर्ड", optional: "वैकल्पिक", useGps: "GPS स्थान का उपयोग करें", detecting: "स्थान खोज रहे हैं…", gpsCaptured: "GPS स्थान दर्ज हो गया", optionalGps: "वैकल्पिक: निर्देशांक सहेजने के लिए GPS का उपयोग करें", pleaseWait: "कृपया प्रतीक्षा करें…", needAccount: "परीक्षण खाता चाहिए? साइन अप करें",
  },
  mr: {
    home: "मुख्यपृष्ठ", crops: "माझी पिके", scan: "स्कॅन", cases: "प्रकरणे", more: "अधिक", profile: "प्रोफाइल", experts: "तज्ज्ञ", stores: "दुकाने", farmers: "शेतकरी", analytics: "विश्लेषण", save: "जतन करा", back: "मागे", language: "भाषा", welcome: "तुम्ही कोण म्हणून साइन इन करत आहात?", signIn: "CropShield मध्ये साइन इन करा", create: "खाते तयार करा",
    heroEyebrow: "स्थानिक कृषी-तंत्रज्ञान चाचणी मंच", heroTitle: "तुमची पिके जाणून घ्या.", heroAccent: "आत्मविश्वासाने वाढवा.", heroBody: "CropShield तुमच्या शेतासाठी पीक निरीक्षण आणि उपयोगी आरोग्य माहिती एका शांत, सोप्या कार्यक्षेत्रात आणते.", trust: "स्थानिक चाचणी खाती आणि खाजगी पीक नोंदी", workspaceHint: "आधी तुमचे कार्यक्षेत्र निवडा. सुरुवातीसाठी आम्ही आवश्यक माहितीच विचारू.", farmerRole: "मी शेतकरी आहे", farmerDetail: "पिके पाहा, प्रतिमा स्कॅन करा आणि प्रकरणे ट्रॅक करा", adminRole: "मी प्रशासक आहे", adminDetail: "मंजुरी, शेतकरी आणि कृषी सेवा व्यवस्थापित करा", existingAccount: "खाते आहे? साइन इन करा", changeWorkspace: "कार्यस्थळ बदला", createTestAccount: "चाचणी खाते तयार करा", localAccess: "स्थानिक चाचणी प्रवेश", setupWorkspace: "तुमचे कार्यक्षेत्र सेट करा", accountDatabase: "या चाचणी अॅपच्या डेटाबेसमध्ये जतन केलेले खाते वापरा.", addEssentials: "आवश्यक माहिती आता भरा. प्रोफाइल नंतर पूर्ण करू शकता.", workspace: "कार्यस्थळ", fullName: "पूर्ण नाव", primaryCrop: "मुख्य पीक", state: "राज्य", district: "जिल्हा", pinCode: "पिन कोड", village: "गाव", town: "शहर", phone: "फोन", email: "ईमेल", password: "पासवर्ड", optional: "ऐच्छिक", useGps: "GPS स्थान वापरा", detecting: "स्थान शोधत आहे…", gpsCaptured: "GPS स्थान नोंदवले", optionalGps: "ऐच्छिक: निर्देशांक जतन करण्यासाठी GPS वापरा", pleaseWait: "कृपया थांबा…", needAccount: "चाचणी खाते हवे? साइन अप करा",
  },
  as: {
    home: "হোম", crops: "মোৰ শস্য", scan: "স্কেন", cases: "কেছ", more: "অধিক", profile: "প্ৰফাইল", experts: "বিশেষজ্ঞ", stores: "দোকান", farmers: "কৃষক", analytics: "বিশ্লেষণ", save: "সংৰক্ষণ", back: "উভতি যাওক", language: "ভাষা", welcome: "আপুনি কোন হিচাপে ছাইন ইন কৰিছে?", signIn: "CropShield-ত ছাইন ইন কৰক", create: "একাউণ্ট সৃষ্টি কৰক",
    heroEyebrow: "স্থানীয় কৃষি-প্ৰযুক্তি পৰীক্ষা মঞ্চ", heroTitle: "আপোনাৰ শস্যক জানক।", heroAccent: "আত্মবিশ্বাসেৰে বৃদ্ধি কৰক।", heroBody: "CropShield-এ আপোনাৰ খেতিৰ বাবে শস্য নিৰীক্ষণ আৰু ব্যৱহাৰিক স্বাস্থ্য তথ্য এটা শান্ত, সহজ কৰ্মক্ষেত্ৰত আনে।", trust: "স্থানীয় পৰীক্ষা একাউণ্ট আৰু ব্যক্তিগত শস্য ৰেকৰ্ড", workspaceHint: "প্ৰথমে আপোনাৰ কৰ্মক্ষেত্ৰ বাছক। আৰম্ভ কৰিবলৈ প্ৰয়োজনীয় তথ্যহে সোধা হ’ব।", farmerRole: "মই কৃষক", farmerDetail: "শস্য নিৰীক্ষণ, ছবি স্কেন আৰু কেছ অনুসৰণ কৰক", adminRole: "মই প্ৰশাসক", adminDetail: "অনুমোদন, কৃষক আৰু কৃষি সেৱা পৰিচালনা কৰক", existingAccount: "ইতিমধ্যে একাউণ্ট আছে? ছাইন ইন কৰক", changeWorkspace: "কৰ্মক্ষেত্ৰ সলনি কৰক", createTestAccount: "পৰীক্ষা একাউণ্ট সৃষ্টি কৰক", localAccess: "স্থানীয় পৰীক্ষা প্ৰৱেশ", setupWorkspace: "আপোনাৰ কৰ্মক্ষেত্ৰ সাজু কৰক", accountDatabase: "এই পৰীক্ষা এপৰ ডেটাবেছত সঞ্চিত একাউণ্ট ব্যৱহাৰ কৰক।", addEssentials: "এতিয়া প্ৰয়োজনীয় তথ্য দিয়ক। প্ৰফাইল পিছত সম্পূৰ্ণ কৰিব পাৰিব।", workspace: "কৰ্মক্ষেত্ৰ", fullName: "সম্পূৰ্ণ নাম", primaryCrop: "মুখ্য শস্য", state: "ৰাজ্য", district: "জিলা", pinCode: "পিন কোড", village: "গাঁও", town: "চহৰ", phone: "ফোন", email: "ইমেইল", password: "পাছৱৰ্ড", optional: "ঐচ্ছিক", useGps: "GPS স্থান ব্যৱহাৰ কৰক", detecting: "স্থান বিচাৰি আছে…", gpsCaptured: "GPS স্থান সংগ্ৰহ কৰা হ’ল", optionalGps: "ঐচ্ছিক: স্থানাংক সংৰক্ষণ কৰিবলৈ GPS ব্যৱহাৰ কৰক", pleaseWait: "অনুগ্ৰহ কৰি অপেক্ষা কৰক…", needAccount: "পৰীক্ষা একাউণ্ট লাগে? ছাইন আপ কৰক",
  },
  bn: {
    home: "হোম", crops: "আমার ফসল", scan: "স্ক্যান", cases: "কেস", more: "আরও", profile: "প্রোফাইল", experts: "বিশেষজ্ঞ", stores: "দোকান", farmers: "কৃষক", analytics: "বিশ্লেষণ", save: "সংরক্ষণ", back: "পিছনে", language: "ভাষা", welcome: "আপনি কী হিসেবে সাইন ইন করছেন?", signIn: "CropShield-এ সাইন ইন করুন", create: "অ্যাকাউন্ট তৈরি করুন",
    heroEyebrow: "স্থানীয় কৃষি-প্রযুক্তি পরীক্ষামঞ্চ", heroTitle: "আপনার ফসলকে জানুন।", heroAccent: "আত্মবিশ্বাসের সঙ্গে বাড়ুন।", heroBody: "CropShield আপনার খেতের জন্য ফসল পর্যবেক্ষণ এবং কার্যকর স্বাস্থ্য তথ্য একটি শান্ত, সহজ কর্মক্ষেত্রে নিয়ে আসে।", trust: "স্থানীয় পরীক্ষামূলক অ্যাকাউন্ট ও ব্যক্তিগত ফসলের রেকর্ড", workspaceHint: "প্রথমে আপনার কর্মক্ষেত্র বেছে নিন। শুরু করার জন্য শুধু প্রয়োজনীয় তথ্যই চাওয়া হবে।", farmerRole: "আমি একজন কৃষক", farmerDetail: "ফসল পর্যবেক্ষণ, ছবি স্ক্যান ও কেস ট্র্যাক করুন", adminRole: "আমি একজন প্রশাসক", adminDetail: "অনুমোদন, কৃষক ও কৃষি পরিষেবা পরিচালনা করুন", existingAccount: "ইতিমধ্যে অ্যাকাউন্ট আছে? সাইন ইন করুন", changeWorkspace: "কর্মক্ষেত্র বদলান", createTestAccount: "পরীক্ষামূলক অ্যাকাউন্ট তৈরি করুন", localAccess: "স্থানীয় পরীক্ষা প্রবেশ", setupWorkspace: "আপনার কর্মক্ষেত্র সেট আপ করুন", accountDatabase: "এই পরীক্ষামূলক অ্যাপের ডেটাবেসে সংরক্ষিত অ্যাকাউন্ট ব্যবহার করুন।", addEssentials: "এখন প্রয়োজনীয় তথ্য দিন। প্রোফাইল পরে সম্পূর্ণ করতে পারবেন।", workspace: "কর্মক্ষেত্র", fullName: "পুরো নাম", primaryCrop: "প্রধান ফসল", state: "রাজ্য", district: "জেলা", pinCode: "পিন কোড", village: "গ্রাম", town: "শহর", phone: "ফোন", email: "ইমেল", password: "পাসওয়ার্ড", optional: "ঐচ্ছিক", useGps: "GPS অবস্থান ব্যবহার করুন", detecting: "অবস্থান খোঁজা হচ্ছে…", gpsCaptured: "GPS অবস্থান সংগ্রহ করা হয়েছে", optionalGps: "ঐচ্ছিক: স্থানাঙ্ক সংরক্ষণ করতে GPS ব্যবহার করুন", pleaseWait: "অনুগ্রহ করে অপেক্ষা করুন…", needAccount: "পরীক্ষামূলক অ্যাকাউন্ট দরকার? সাইন আপ করুন",
  },
};

export function getStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  const value = window.localStorage.getItem("cropshield-language") as LanguageCode | null;
  return value && copy[value] ? value : "en";
}

export function setStoredLanguage(language: LanguageCode) {
  window.localStorage.setItem("cropshield-language", language);
  document.documentElement.lang = language;
}

export function translate(language: LanguageCode, key: string) {
  return copy[language][key] ?? copy.en[key] ?? key;
}
