import { VernacularPhrase } from '../types';

export const VERNACULAR_LANGUAGES = [
  { code: 'so', label: 'Af-Soomaali', flag: '🇸🇴', nativeName: 'Soomaali' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹', nativeName: 'Amharic' },
  { code: 'en', label: 'English', flag: '🇬🇧', nativeName: 'English' },
] as const;

export type SupportedLanguage = 'so' | 'am' | 'en';

export const VERNACULAR_PHRASES: VernacularPhrase[] = [
  // --- CUSTOMER TO RIDER / RUNNER PHRASES ---
  {
    id: 'cust-arr-1',
    category: 'arrival',
    targetRole: 'CUSTOMER',
    so: 'Waan soo gaadhay albaabka hore, halkan ayaan kugu sugayaa.',
    am: 'ደጃፉ ጋ ነኝ፣ እዚህ እየጠበቅሁዎት ነው።',
    en: 'I am right at the main front gate waiting for you.',
  },
  {
    id: 'cust-arr-2',
    category: 'arrival',
    targetRole: 'CUSTOMER',
    so: 'Fadlan waxaad iigu timaadaa wadada weyn ee laamiga ah.',
    am: 'እባክዎን ወደ ዋናው የአስፋልት መንገድ ይምጡ።',
    en: 'Please meet me at the main asphalt road.',
  },
  {
    id: 'cust-arr-3',
    category: 'arrival',
    targetRole: 'CUSTOMER',
    so: 'Fadlan taleefanka ii soo garaac markaad albaabka timaaddo.',
    am: 'እባክዎ በር ላይ ሲደርሱ ስልክ ይደውሉልኝ።',
    en: 'Please call my phone when you arrive at the gate.',
  },
  {
    id: 'cust-pay-1',
    category: 'payment',
    targetRole: 'CUSTOMER',
    so: 'Lacagtii Telebirr waan soo diray, fariintii ma heshay?',
    am: 'ክፍያውን በቴሌብር ልኬያለሁ፣ መልእክቱ ደርሶዎታል?',
    en: 'I sent the payment via Telebirr, did you receive confirmation?',
  },
  {
    id: 'cust-pay-2',
    category: 'payment',
    targetRole: 'CUSTOMER',
    so: 'Lacagtii Zaad / Sahal ayaan kuugu wareejiyey.',
    am: 'ክፍያውን በዛድ / ሳሃል አስተላልፌያለሁ።',
    en: 'I have transferred the payment via Zaad / Sahal.',
  },
  {
    id: 'cust-pay-3',
    category: 'payment',
    targetRole: 'CUSTOMER',
    so: 'Lacag caddaan ah (Cash) oo sax ah ayaan gacanta ku hayaa.',
    am: 'ትክክለኛውን ጥሬ ገንዘብ (Cash) በእጄ ይዣለሁ።',
    en: 'I have the exact cash ready for cash on delivery.',
  },
  {
    id: 'cust-inst-1',
    category: 'instruction',
    targetRole: 'CUSTOMER',
    so: 'Fadlan baakada si taxadar leh u qabo (wax jajabaya ayaa ku jira).',
    am: 'እባክዎን እቃውን በጥንቃቄ ይያዙ (ተሰባሪ ነገር አለበት)።',
    en: 'Please handle the package with extra care (fragile contents).',
  },
  {
    id: 'cust-inst-2',
    category: 'instruction',
    targetRole: 'CUSTOMER',
    so: 'Haddii aanan taleefanka qaban, ilaalada dhismaha uga tag.',
    am: 'ስልክ የማላነሳ ከሆነ ለህንፃው ጥበቃ ይተዉት።',
    en: 'If I do not pick up, please leave with building security.',
  },
  {
    id: 'cust-inst-3',
    category: 'instruction',
    targetRole: 'CUSTOMER',
    so: 'Guriga albaabka cagaaran ee masaajidka ku xiga.',
    am: 'ቤቱ ከመስጂዱ አጠገብ ያለው አረንጓዴ በር ነው።',
    en: 'The house with the green gate next to the mosque.',
  },

  // --- RIDER TO CUSTOMER PHRASES ---
  {
    id: 'rid-arr-1',
    category: 'arrival',
    targetRole: 'RIDER',
    so: 'Waan soo dhowaaday, qiyaastii 5 daqiiqo ayaan kuugu imanayaa.',
    am: 'እየደረስኩ ነው፣ በ5 ደቂቃ አካባቢ እደርሳለሁ።',
    en: 'I am arriving shortly, approximately 5 minutes away.',
  },
  {
    id: 'rid-arr-2',
    category: 'arrival',
    targetRole: 'RIDER',
    so: 'Waan taaganahay albaabkaaga hore, fadlan soo bax.',
    am: 'ደጃፍዎ ላይ ደርሼ ቆሜያለሁ፣ እባክዎ ይውጡ።',
    en: 'I have arrived at your front gate, please come out.',
  },
  {
    id: 'rid-arr-3',
    category: 'delay',
    targetRole: 'RIDER',
    so: 'Waddada ayaa ciriiri yar ah, wax yar ayaan soo daahayaa.',
    am: 'መንገድ ላይ ትንሽ የትራፊክ መጨናነቅ አለ፣ ትንሽ እዘገያለሁ።',
    en: 'Slight traffic congestion on the route, arriving in a few moments.',
  },
  {
    id: 'rid-inst-1',
    category: 'instruction',
    targetRole: 'RIDER',
    so: 'Taleefankaaga ayaan wacay laakiin ma helin, fadlan soo celi.',
    am: 'ስልክዎን ደውዬ ነበር አልተነሳም፣ እባክዎን መልሰው ይደውሉ።',
    en: 'I called your phone but it was not answered, please call back.',
  },
  {
    id: 'rid-inst-2',
    category: 'instruction',
    targetRole: 'RIDER',
    so: 'Fadlan ii sheeg calaamad (Landmark) caan ah oo kuu dhow.',
    am: 'እባክዎን በአቅራቢያዎ ያለ ታዋቂ መለያ ምልክት ይንገሩኝ።',
    en: 'Please share a prominent nearby landmark or building.',
  },
  {
    id: 'rid-pay-1',
    category: 'payment',
    targetRole: 'RIDER',
    so: 'Haddii aad lacag caddaan ah bixinayso, baddal (change) waan hayaa.',
    am: 'ጥሬ ገንዘብ የሚከፍሉ ከሆነ መልስ (change) አለኝ።',
    en: 'I have change available if paying in cash.',
  },

  // --- RUNNER PHRASES ---
  {
    id: 'run-ver-1',
    category: 'verification',
    targetRole: 'RUNNER',
    so: 'Baakada si buuxda ayaa loo hubiyey, shaabadda ilaalintana waa la saaray.',
    am: 'እቃው ሙሉ በሙሉ ተፈትሾ የደህንነት ማህተም ተደርጎበታል።',
    en: 'Package has passed physical quality inspection and tamper seal applied.',
  },
  {
    id: 'run-ver-2',
    category: 'verification',
    targetRole: 'RUNNER',
    so: 'Dalabka waxaa lagu wareejiyey darawalka (Rider) si dhakhso ah loogu keeno.',
    am: 'ትዕዛዙ በፍጥነት እንዲደርስዎ ለአሽከርካሪው ተላልፎ ተሰጥቷል።',
    en: 'Order has been handed over to express delivery courier.',
  }
];

export const INITIAL_ORDER_CHATS: Record<string, import('../types').ChatMessage[]> = {
  'ord-andualem-04': [
    {
      id: 'msg-seed-1',
      orderId: 'ord-andualem-04',
      senderRole: 'RUNNER',
      senderName: 'Kenenisa Runner',
      text: 'Baakada si buuxda ayaa loo hubiyey, shaabadda ilaalintana waa la saaray.',
      transcript: 'Item checked & quality sealed at Taiwan Market depot. Verified cooking instruction: well done.',
      timestamp: '10:04 AM',
      language: 'so',
      status: 'READ'
    },
    {
      id: 'msg-seed-2',
      orderId: 'ord-andualem-04',
      senderRole: 'RIDER',
      senderName: 'Dawit Rider',
      text: 'Waan soo dhowaaday, qiyaastii 5 daqiiqo ayaan kuugu imanayaa.',
      transcript: 'I am on the road with your order, approaching Mansoor Hotel in ~5 mins.',
      timestamp: '10:12 AM',
      language: 'so',
      status: 'READ'
    },
    {
      id: 'msg-seed-3',
      orderId: 'ord-andualem-04',
      senderRole: 'RIDER',
      senderName: 'Dawit Rider',
      text: 'Voice note (0:07s) · Voice update from courier Dawit',
      transcript: 'Asalaamu calaykum Andualem, waddada weyn ayaan marayaa, haddii albaabku xidhan yahay taleefanka iga qabo fadlan.',
      timestamp: '10:14 AM',
      isVoiceNote: true,
      voiceDurationSeconds: 7,
      language: 'so',
      status: 'READ'
    },
    {
      id: 'msg-seed-4',
      orderId: 'ord-andualem-04',
      senderRole: 'CUSTOMER',
      senderName: 'Andualem Awraris',
      text: 'Waan soo gaadhay albaabka hore, halkan ayaan kugu sugayaa.',
      transcript: 'I am waiting right by the front gate.',
      timestamp: '10:16 AM',
      language: 'so',
      status: 'DELIVERED'
    }
  ],
  'ord-parcel-01': [
    {
      id: 'msg-seed-p1',
      orderId: 'ord-parcel-01',
      senderRole: 'RUNNER',
      senderName: 'Kenenisa Runner',
      text: 'Shaabadda ilaalinta (TAG-SEAL-88319) baakada dukumentiyada waa lagu xidhay.',
      transcript: 'Tamper seal TAG-SEAL-88319 secured on urgent certificate envelope.',
      timestamp: '09:30 AM',
      language: 'so',
      status: 'READ'
    }
  ]
};
