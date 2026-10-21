import type { TranslationKey } from "@/i18n/catalog";

interface RawCategoryIcon {
    readonly key: string;
    readonly name: string;
}

interface RawCategoryIconGroup {
    readonly icons: readonly RawCategoryIcon[];
    readonly titleKey: TranslationKey;
}

const RAW_ICON_GROUPS: readonly RawCategoryIconGroup[] = [
    {
        icons: [
            { key: "Restaurant01", name: "restaurant-01" },
            { key: "Coffee02", name: "coffee-02" },
            { key: "Hamburger01", name: "h-hamburger-01" },
            { key: "Pizza01", name: "p-pizza-01" },
            { key: "BirthdayCake", name: "birthday-cake" },
            { key: "IceCream01", name: "ice-cream-01" },
            { key: "Dish01", name: "dish-01" },
            { key: "SoftDrink01", name: "soft-drink-01" },
            { key: "Drink", name: "drink" },
            { key: "BubbleTea01", name: "b-bubble-tea-01" },
            { key: "Bread01", name: "bread-01" },
            { key: "EggFried", name: "egg-fried" },
            { key: "Apple", name: "apple" },
            { key: "ChefHat", name: "chef-hat" },
            { key: "KitchenUtensils", name: "kitchen-utensils" },
            { key: "Noodles", name: "noodles" },
            { key: "Sushi01", name: "sushi-01" },
            { key: "Cheese", name: "c-cheese" },
            { key: "Cupcake01", name: "cupcake-01" },
            { key: "TeaPod", name: "tea-pod" },
        ],
        titleKey: "icons.section.food",
    },
    {
        icons: [
            { key: "ShoppingCart01", name: "shopping-cart-01" },
            { key: "ShoppingBag01", name: "shopping-bag-01" },
            { key: "ShoppingBasket01", name: "shopping-basket-01" },
            { key: "Store01", name: "store-01" },
            { key: "Gift", name: "gift" },
            { key: "GiftCard", name: "gift-card" },
            { key: "Dress01", name: "dress-01" },
            { key: "Shirt01", name: "shirt-01" },
            { key: "TShirt", name: "t-shirt" },
            { key: "Hanger", name: "hanger" },
            { key: "Sunglasses", name: "sunglasses" },
            { key: "Watch01", name: "watch-01" },
            { key: "Diamond01", name: "diamond-01" },
            { key: "Perfume", name: "perfume" },
            { key: "HandBag01", name: "hand-bag-01" },
            { key: "SaleTag01", name: "sale-tag-01" },
            { key: "Coupon03", name: "coupon-03" },
            { key: "RunningShoes", name: "running-shoes" },
        ],
        titleKey: "icons.section.shopping",
    },
    {
        icons: [
            { key: "Car01", name: "car-01" },
            { key: "Bus01", name: "bus-01" },
            { key: "Taxi", name: "taxi" },
            { key: "Airplane01", name: "airplane-01" },
            { key: "Train01", name: "train-01" },
            { key: "Bicycle01", name: "bicycle-01" },
            { key: "Motorbike01", name: "motorbike-01" },
            { key: "Scooter01", name: "scooter-01" },
            { key: "CargoShip", name: "cargo-ship" },
            { key: "Fuel01", name: "fuel-01" },
            { key: "FuelStation", name: "fuel-station" },
            { key: "ParkingAreaSquare", name: "parking-area-square" },
            { key: "Road01", name: "road-01" },
            { key: "Luggage01", name: "luggage-01" },
            { key: "Beach02", name: "beach-02" },
            { key: "Mountain", name: "mountain" },
            { key: "Tent", name: "tent" },
            { key: "Compass01", name: "compass-01" },
            { key: "Location01", name: "location-01" },
            { key: "Globe", name: "globe" },
        ],
        titleKey: "icons.section.transport",
    },
    {
        icons: [
            { key: "Home01", name: "home-01" },
            { key: "Sofa01", name: "sofa-01" },
            { key: "BedSingle01", name: "bed-single-01" },
            { key: "Bathtub01", name: "bathtub-01" },
            { key: "Door01", name: "d-door-01" },
            { key: "Key01", name: "key-01" },
            { key: "Lamp01", name: "lamp-01" },
            { key: "Flash", name: "flash" },
            { key: "ElectricPlugs", name: "electric-plugs" },
            { key: "Energy", name: "energy" },
            { key: "Wifi01", name: "wifi-01" },
            { key: "GasPipe", name: "gas-pipe" },
            { key: "Tap01", name: "tap-01" },
            { key: "Toilet01", name: "toilet-01" },
            { key: "Fridge", name: "f-fridge" },
            { key: "GasStove", name: "g-gas-stove" },
            { key: "Tools", name: "tools" },
            { key: "Wrench01", name: "wrench-01" },
            { key: "PaintBrush01", name: "paint-brush-01" },
            { key: "Plant01", name: "plant-01" },
            { key: "Tree01", name: "tree-01" },
            { key: "FlowerPot", name: "flower-pot" },
        ],
        titleKey: "icons.section.home",
    },
    {
        icons: [
            { key: "Health", name: "health" },
            { key: "Stethoscope02", name: "stethoscope-02" },
            { key: "FirstAidKit", name: "first-aid-kit" },
            { key: "Medicine01", name: "medicine-01" },
            { key: "Pill", name: "pill" },
            { key: "Injection", name: "injection" },
            { key: "DentalTooth", name: "dental-tooth" },
            { key: "Eye", name: "eye" },
            { key: "Brain", name: "brain" },
            { key: "Dumbbell01", name: "dumbbell-01" },
            { key: "EquipmentGym01", name: "equipment-gym-01" },
            { key: "Yoga01", name: "yoga-01" },
            { key: "Swimming", name: "swimming" },
            { key: "Basketball01", name: "basketball-01" },
            { key: "Football", name: "football" },
            { key: "TennisBall", name: "tennis-ball" },
            { key: "BoxingGlove01", name: "boxing-glove-01" },
            { key: "HeartCheck", name: "heart-check" },
            { key: "Bone01", name: "bone-01" },
            { key: "HairDryer", name: "hair-dryer" },
        ],
        titleKey: "icons.section.health",
    },
    {
        icons: [
            { key: "FilmRoll01", name: "film-roll-01" },
            { key: "Film01", name: "film-01" },
            { key: "Video01", name: "video-01" },
            { key: "Tv01", name: "tv-01" },
            { key: "MusicNote01", name: "music-note-01" },
            { key: "Headphones", name: "headphones" },
            { key: "GameController01", name: "game-controller-01" },
            { key: "Joystick01", name: "joystick-01" },
            { key: "Console", name: "console" },
            { key: "Puzzle", name: "puzzle" },
            { key: "Book01", name: "book-01" },
            { key: "BookOpen01", name: "book-open-01" },
            { key: "Camera02", name: "camera-02" },
            { key: "Mic01", name: "mic-01" },
            { key: "Ticket01", name: "ticket-01" },
            { key: "Dart", name: "dart" },
            { key: "Party", name: "p-party" },
            { key: "Clapping01", name: "clapping-01" },
            { key: "PaintBoard", name: "p-paint-board" },
        ],
        titleKey: "icons.section.leisure",
    },
    {
        icons: [
            { key: "MoneyBag01", name: "money-bag-01" },
            { key: "Wallet01", name: "wallet-01" },
            { key: "Coins01", name: "coins-01" },
            { key: "Cashback", name: "cashback" },
            { key: "Tips", name: "tips" },
            { key: "Savings", name: "savings" },
            { key: "PiggyBank", name: "p-piggy-bank" },
            { key: "Bank", name: "b-bank" },
            { key: "CreditCard", name: "credit-card" },
            { key: "Invoice01", name: "invoice-01" },
            { key: "Taxes", name: "t-taxes" },
            { key: "PercentCircle", name: "percent-circle" },
            { key: "ChartUp", name: "chart-up" },
            { key: "AnalyticsUp", name: "analytics-up" },
            { key: "Briefcase01", name: "briefcase-01" },
            { key: "Laptop", name: "laptop" },
            { key: "Developer", name: "developer" },
            { key: "Building01", name: "building-01" },
            { key: "Target01", name: "target-01" },
            { key: "Agreement01", name: "agreement-01" },
            { key: "Calculator01", name: "calculator-01" },
            { key: "Safe", name: "safe" },
            { key: "MoneyReceive01", name: "money-receive-01" },
            { key: "MoneySend01", name: "money-send-01" },
        ],
        titleKey: "icons.section.money",
    },
    {
        icons: [
            { key: "Kid", name: "kid" },
            { key: "BabyBed01", name: "baby-bed-01" },
            { key: "Mortarboard01", name: "mortarboard-01" },
            { key: "GraduationScroll", name: "graduation-scroll" },
            { key: "PencilEdit01", name: "pencil-edit-01" },
            { key: "Shield01", name: "shield-01" },
            { key: "Umbrella", name: "umbrella" },
            { key: "Repeat", name: "repeat" },
            { key: "Exchange01", name: "exchange-01" },
            { key: "Calendar01", name: "calendar-01" },
            { key: "Clock01", name: "clock-01" },
            { key: "Mail01", name: "mail-01" },
            { key: "Fire", name: "fire" },
            { key: "Star", name: "star" },
            { key: "Favourite", name: "favourite" },
            { key: "BalanceScale", name: "balance-scale" },
            { key: "Church", name: "c-church" },
            { key: "AlAqsaMosque", name: "al-aqsa-mosque" },
            { key: "Earth", name: "earth" },
            { key: "Leaf01", name: "leaf-01" },
        ],
        titleKey: "icons.section.life",
    },
];

/** Synonyms only: an icon's own name tokens always match implicitly. */
const KEYWORDS_BY_NAME = new Map<string, readonly string[]>([
    ["agreement-01", ["contract", "document", "deal", "signature"]],
    ["airplane-01", ["flight", "plane", "travel", "trip"]],
    ["al-aqsa-mosque", ["mosque", "religion", "islam", "worship"]],
    ["analytics-up", ["investment", "stocks", "growth", "chart"]],
    ["apple", ["fruit", "healthy", "food"]],
    ["b-bank", ["banking", "finance", "institution", "interest"]],
    ["b-bubble-tea-01", ["boba", "beverage", "drink"]],
    ["baby-bed-01", ["crib", "baby", "nursery", "child"]],
    ["balance-scale", ["legal", "justice", "law", "lawyer"]],
    ["basketball-01", ["sport", "ball", "game"]],
    ["bathtub-01", ["bath", "bathroom", "shower"]],
    ["beach-02", ["vacation", "holiday", "palm", "summer"]],
    ["bed-single-01", ["bedroom", "sleep", "furniture"]],
    ["bicycle-01", ["bike", "cycling", "ride"]],
    ["birthday-cake", ["dessert", "party", "celebration", "sweet"]],
    ["bone-01", ["pet", "dog", "animal", "vet"]],
    ["book-01", ["reading", "library", "study"]],
    ["book-open-01", ["reading", "library", "study"]],
    ["boxing-glove-01", ["boxing", "sport", "fight", "gym"]],
    ["brain", ["mind", "mental", "psychology", "therapy"]],
    ["bread-01", ["bakery", "loaf", "toast", "food"]],
    ["briefcase-01", ["work", "job", "business", "office"]],
    ["building-01", ["office", "business", "company", "city"]],
    ["bus-01", ["transit", "public transport", "commute"]],
    ["c-cheese", ["dairy", "food"]],
    ["c-church", ["religion", "worship", "faith", "donation"]],
    ["calculator-01", ["math", "accounting", "budget", "finance"]],
    ["calendar-01", ["date", "schedule", "event", "planner"]],
    ["camera-02", ["photo", "photography", "picture"]],
    ["car-01", ["vehicle", "drive", "auto", "automobile"]],
    ["cargo-ship", ["boat", "ferry", "sea", "shipping"]],
    ["cashback", ["refund", "money back", "return", "rebate"]],
    ["chart-up", ["investment", "stocks", "growth", "profit"]],
    ["chef-hat", ["cooking", "kitchen", "chef", "restaurant"]],
    ["clapping-01", ["clapperboard", "movie", "action", "applause"]],
    ["clock-01", ["time", "hour", "schedule", "deadline"]],
    ["coffee-02", ["cafe", "drink", "cup", "espresso", "tea"]],
    ["coins-01", ["money", "cash", "change", "tips"]],
    ["compass-01", ["navigation", "direction", "explore"]],
    ["console", ["gaming", "videogames", "play"]],
    ["coupon-03", ["voucher", "discount", "deal"]],
    ["credit-card", ["payment", "debit", "visa", "mastercard"]],
    ["cupcake-01", ["dessert", "muffin", "sweet", "bakery"]],
    ["d-door-01", ["entrance", "house"]],
    ["dart", ["target", "game", "goal", "bullseye"]],
    ["dental-tooth", ["dentist", "teeth", "dental"]],
    ["developer", ["programming", "code", "freelance", "work"]],
    ["diamond-01", ["jewelry", "gem", "luxury", "ring"]],
    ["dish-01", ["plate", "meal", "food", "dinner", "serving"]],
    ["dress-01", ["fashion", "clothes", "clothing", "wardrobe"]],
    ["drink", ["beverage", "cocktail", "glass", "bar", "alcohol"]],
    ["dumbbell-01", ["gym", "workout", "fitness", "weights", "exercise"]],
    ["earth", ["planet", "world", "globe", "environment"]],
    ["egg-fried", ["breakfast", "food", "cooking"]],
    ["electric-plugs", ["plug", "socket", "power", "electricity"]],
    ["energy", ["power", "electricity", "utilities"]],
    ["equipment-gym-01", ["gym", "workout", "fitness", "machine"]],
    ["exchange-01", ["swap", "transfer", "convert", "currency"]],
    ["eye", ["vision", "optometry", "glasses", "sight"]],
    ["f-fridge", ["refrigerator", "kitchen", "appliance"]],
    ["favourite", ["heart", "love", "like", "favorite"]],
    ["film-01", ["movie", "cinema", "entertainment"]],
    ["film-roll-01", ["movie", "cinema", "entertainment"]],
    ["fire", ["flame", "hot", "heat", "trending"]],
    ["first-aid-kit", ["medical", "emergency", "medicine", "health"]],
    ["flash", ["bolt", "lightning", "electric", "electricity", "power", "energy", "utilities"]],
    ["flower-pot", ["garden", "plant", "decoration"]],
    ["football", ["soccer", "sport", "ball", "game"]],
    ["fuel-01", ["gas", "gasoline", "petrol", "station"]],
    ["fuel-station", ["gas", "gasoline", "petrol", "pump"]],
    ["g-gas-stove", ["stove", "cooking", "kitchen", "appliance"]],
    ["game-controller-01", ["gaming", "videogames", "console", "play"]],
    ["gas-pipe", ["gas", "utilities", "pipeline"]],
    ["gift", ["present", "box", "birthday", "surprise"]],
    ["gift-card", ["voucher", "coupon", "present"]],
    ["globe", ["world", "earth", "international", "travel"]],
    ["graduation-scroll", ["education", "diploma", "degree", "school"]],
    ["h-hamburger-01", ["burger", "fast food", "food"]],
    ["hair-dryer", ["hair", "salon", "grooming", "beauty"]],
    ["hand-bag-01", ["purse", "bag", "fashion", "accessories"]],
    ["hanger", ["clothes", "closet", "wardrobe", "laundry"]],
    ["headphones", ["music", "audio", "listening"]],
    ["health", ["heart", "pulse", "medical", "wellness"]],
    ["heart-check", ["health", "cardio", "checkup", "love"]],
    ["home-01", ["house", "rent", "mortgage", "property"]],
    ["ice-cream-01", ["dessert", "sweet", "gelato"]],
    ["injection", ["syringe", "vaccine", "shot", "medical"]],
    ["invoice-01", ["bill", "receipt", "taxes", "document"]],
    ["joystick-01", ["gaming", "arcade", "videogames"]],
    ["key-01", ["lock", "house", "access", "rent"]],
    ["kid", ["child", "children", "family", "baby"]],
    ["kitchen-utensils", ["cooking", "cutlery", "fork", "spoon"]],
    ["lamp-01", ["light", "furniture", "lighting"]],
    ["laptop", ["computer", "work", "freelance", "tech"]],
    ["leaf-01", ["nature", "eco", "green", "environment"]],
    ["location-01", ["pin", "map", "place", "gps"]],
    ["luggage-01", ["suitcase", "baggage", "travel", "trip"]],
    ["mail-01", ["email", "letter", "envelope", "post"]],
    ["medicine-01", ["pills", "drugs", "pharmacy", "medication"]],
    ["mic-01", ["microphone", "podcast", "karaoke", "audio"]],
    ["money-bag-01", ["cash", "salary", "paycheck", "income", "wealth"]],
    ["money-receive-01", ["income", "payment", "deposit", "receive"]],
    ["money-send-01", ["payment", "transfer", "send", "expense"]],
    ["mortarboard-01", ["education", "graduation", "school", "university", "student"]],
    ["motorbike-01", ["motorcycle", "bike"]],
    ["mountain", ["hiking", "outdoors", "nature", "adventure"]],
    ["music-note-01", ["song", "audio", "concert"]],
    ["noodles", ["ramen", "pasta", "food", "asian"]],
    ["p-paint-board", ["art", "painting", "palette", "hobby"]],
    ["p-party", ["celebration", "confetti", "event", "fun"]],
    ["p-piggy-bank", ["savings", "money", "save", "deposit"]],
    ["p-pizza-01", ["food", "slice", "italian"]],
    ["paint-brush-01", ["paint", "decorate", "renovation", "art"]],
    ["parking-area-square", ["park", "garage", "car"]],
    ["pencil-edit-01", ["writing", "edit", "school", "stationery"]],
    ["percent-circle", ["interest", "percentage", "discount", "rate"]],
    ["perfume", ["fragrance", "cologne", "beauty", "cosmetics"]],
    ["pill", ["medicine", "capsule", "pharmacy", "medication"]],
    ["plant-01", ["garden", "green", "nature", "flower"]],
    ["puzzle", ["game", "hobby", "pieces"]],
    ["repeat", ["subscription", "recurring", "loop", "renewal"]],
    ["restaurant-01", ["dining", "eat", "food", "meal"]],
    ["road-01", ["highway", "street", "route"]],
    ["running-shoes", ["sneakers", "shoes", "footwear", "sport"]],
    ["safe", ["vault", "security", "money", "deposit"]],
    ["sale-tag-01", ["discount", "price", "offer", "deal", "label"]],
    ["savings", ["piggy bank", "money", "save", "deposit"]],
    ["scooter-01", ["moped", "ride"]],
    ["shield-01", ["insurance", "protection", "security", "safety"]],
    ["shirt-01", ["clothes", "clothing", "fashion", "top"]],
    ["shopping-bag-01", ["purchase", "buy", "retail", "store"]],
    ["shopping-basket-01", ["groceries", "market", "buy"]],
    ["shopping-cart-01", ["groceries", "market", "buy", "trolley"]],
    ["sofa-01", ["couch", "furniture", "living room"]],
    ["soft-drink-01", ["soda", "beverage", "juice"]],
    ["star", ["favorite", "rating", "bookmark"]],
    ["stethoscope-02", ["doctor", "medical", "checkup", "clinic"]],
    ["store-01", ["shop", "storefront", "retail", "market", "business"]],
    ["sunglasses", ["glasses", "accessories", "summer"]],
    ["sushi-01", ["japanese", "food", "fish"]],
    ["swimming", ["pool", "swim", "sport", "water"]],
    ["t-shirt", ["clothes", "clothing", "casual", "fashion"]],
    ["t-taxes", ["tax", "government", "finance"]],
    ["tap-01", ["water", "faucet", "plumbing", "utilities"]],
    ["target-01", ["goal", "bonus", "aim", "objective"]],
    ["taxi", ["cab", "ride"]],
    ["tea-pod", ["teapot", "kettle", "drink", "brew"]],
    ["tennis-ball", ["sport", "ball", "game"]],
    ["tent", ["camping", "outdoors", "adventure"]],
    ["ticket-01", ["event", "cinema", "concert", "admission"]],
    ["tips", ["gratuity", "money", "hand", "coin"]],
    ["toilet-01", ["bathroom", "wc", "restroom"]],
    ["tools", ["repair", "fix", "maintenance", "hardware"]],
    ["train-01", ["railway", "metro", "subway", "commute"]],
    ["tree-01", ["garden", "nature", "park"]],
    ["tv-01", ["television", "streaming", "screen"]],
    ["umbrella", ["rain", "insurance", "protection", "weather"]],
    ["video-01", ["movie", "recording", "camera"]],
    ["wallet-01", ["money", "cash", "purse", "payment"]],
    ["watch-01", ["time", "wrist", "accessories"]],
    ["wifi-01", ["internet", "network", "connection", "router"]],
    ["wrench-01", ["repair", "fix", "maintenance", "tool"]],
    ["yoga-01", ["meditation", "wellness", "stretch", "exercise"]],
]);

export interface CategoryIconGroup {
    keys: readonly string[];
    titleKey: TranslationKey;
}

export const CATEGORY_ICON_GROUPS: readonly CategoryIconGroup[] = RAW_ICON_GROUPS.map((group) => ({
    keys: group.icons.map((icon) => icon.key),
    titleKey: group.titleKey,
}));

export interface CategoryEmojiGroup {
    emoji: readonly string[];
    titleKey: TranslationKey;
}

/** Variation selectors are preserved verbatim. */
export const CATEGORY_EMOJI_GROUPS: readonly CategoryEmojiGroup[] = [
    {
        emoji: ["🍎", "🍞", "🥐", "🍔", "🍕", "🌮", "🍣", "🥗", "🍜", "🍦", "🍰", "☕️", "🍺", "🍷", "🥤", "🛒"],
        titleKey: "icons.section.food",
    },
    {
        emoji: ["🛍️", "👕", "👗", "👟", "👜", "💄", "💍", "🎁", "📦", "🧾"],
        titleKey: "icons.section.shopping",
    },
    {
        emoji: ["🚗", "🚕", "🚌", "🚆", "🚲", "🛵", "✈️", "⛽️", "🅿️", "🚢", "🧳", "🗺️", "🏖️", "🏝️", "🎒"],
        titleKey: "icons.section.transport",
    },
    {
        emoji: ["🏠", "🏡", "🔑", "🛋️", "🛏️", "🚿", "🧹", "🧺", "💡", "🔌", "🔥", "💧", "📶", "🛠️", "🪴"],
        titleKey: "icons.section.home",
    },
    {
        emoji: ["💊", "🩺", "🏥", "🦷", "👓", "🧘", "🏋️", "🏃", "⚽️", "🚴", "🧴", "💇"],
        titleKey: "icons.section.health",
    },
    {
        emoji: ["🎬", "🎮", "🎧", "🎵", "📚", "🎨", "🎤", "🎭", "📺", "🎲", "🎪", "📸"],
        titleKey: "icons.section.leisure",
    },
    {
        emoji: ["💰", "💵", "💳", "🏦", "📈", "📉", "💼", "🧑‍💻", "🏢", "🧮", "🪙", "🤝", "📊", "🎓", "✏️", "🏫"],
        titleKey: "icons.section.money",
    },
    {
        emoji: ["🐶", "🐱", "🐾", "👶", "👨‍👩‍👧", "❤️", "🎉", "🎂", "⭐️", "🌍", "☂️", "🔔", "📱", "💻", "✉️", "❓"],
        titleKey: "icons.section.life",
    },
];

interface IconMatchEntry {
    readonly key: string;
    readonly normalizedTerms: readonly string[];
}

function normalizeToken(value: string): string {
    return value
        .normalize("NFD")
        .replaceAll(/\p{Diacritic}/gu, "")
        .toLowerCase();
}

const ICON_MATCH_ENTRIES: readonly IconMatchEntry[] = RAW_ICON_GROUPS.flatMap((group) =>
    group.icons.map((icon) => {
        const nameTokens = icon.name.split("-");
        const keywords = KEYWORDS_BY_NAME.get(icon.name) ?? [];
        return {
            key: icon.key,
            normalizedTerms: [...nameTokens, ...keywords].map(normalizeToken),
        };
    })
);

/** Mirrors Swift `CategoryIconCatalog.icons(matching:)`, case- and diacritic-insensitive. */
export function iconKeysMatching(query: string): string[] {
    const needle = query.trim() === "" ? "" : normalizeToken(query.trim());
    const seen = new Set<string>();
    const result: string[] = [];

    for (const entry of ICON_MATCH_ENTRIES) {
        const isMatch = needle === "" || entry.normalizedTerms.some((term) => term.includes(needle));
        if (isMatch && !seen.has(entry.key)) {
            seen.add(entry.key);
            result.push(entry.key);
        }
    }

    return result;
}
