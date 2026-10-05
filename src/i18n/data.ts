import { RIVALS } from "../game/rival";
import { LUXURY, LUXURY_CATS } from "../game/luxury";
import { RANKS } from "../game/ranks";
import {
  ACHIEVEMENTS,
  ALL_BUSINESSES,
  CHESTS,
  CITIES,
  EXEC_KINDS,
  LIFE,
  MISSIONS,
  OFFICE,
  RARITIES,
  TUTORIAL,
  VIRAL_TITLES,
  type BusinessDef,
} from "../game/data";
import { PRODUCTS } from "../game/shop";
import { lang } from "../i18n";

/**
 * Textos del contenido (negocios, ciudades, misiones…) en inglés. Se aplican una vez al
 * arrancar, sobre los mismos objetos de `data.ts`, así el resto del código no cambia.
 * Los números y el equilibrio no se tocan.
 */

type BizText = Pick<BusinessDef, "name" | "blurb" | "floorName" | "transportName" | "saleName"> & { floorNames?: string[] };

const BUSINESSES_EN: Record<string, BizText> = {
  bike: { name: "Bike delivery", blurb: "This is how it all starts: pick up orders from local restaurants and deliver them by bike.", floorName: "Restaurant", transportName: "Your bike", saleName: "Customers",
    floorNames: ["Burger joint", "Pizzeria", "Sushi bar", "Kebab shop", "Taco stand", "Poke bar", "Bakery", "Ice cream shop"] },
  dropship: { name: "Dropshipping warehouse", blurb: "Your first real business. Online orders that ship themselves.", floorName: "Shelf", transportName: "Forklift", saleName: "Vans" },
  restaurant: { name: "Restaurant", blurb: "Kitchens, waiters and riders. If one fails, everything jams.", floorName: "Kitchen", transportName: "Waiters", saleName: "Riders" },
  tiktok: { name: "TikTok studio", blurb: "Creators filming nonstop and brands paying to be featured.", floorName: "Film set", transportName: "Editors", saleName: "Brands" },
  ai: { name: "AI agency", blurb: "GPUs at full power and clients paying to automate everything.", floorName: "GPU rack", transportName: "Technicians", saleName: "Sales reps" },
  foodtruck: { name: "Food trucks", blurb: "Tacos and smoothies for tourists on the boardwalk.", floorName: "Food truck", transportName: "Skaters", saleName: "Beach stands" },
  beachclub: { name: "Beach club", blurb: "Sun loungers, cocktails and music until sunset.", floorName: "Bar", transportName: "Waiters", saleName: "Promoters" },
  yachts: { name: "Yacht rental", blurb: "Luxury trips around Biscayne Bay.", floorName: "Berth", transportName: "Speedboats", saleName: "Travel agents" },
  realestate: { name: "Real estate", blurb: "Oceanfront penthouses that sell before they're built.", floorName: "Office", transportName: "Managers", saleName: "Agents" },
  crypto: { name: "Crypto exchange", blurb: "Millions of trades per second in the crypto capital.", floorName: "Server", transportName: "Bots", saleName: "Traders" },
  supercars: { name: "Supercar rental", blurb: "Hourly supercar rentals for a spin down Sheikh Zayed Road.", floorName: "Garage", transportName: "Valets", saleName: "Front desk" },
  hotel: { name: "Luxury hotel", blurb: "Butler suites with views over the Gulf.", floorName: "Suite", transportName: "Bellhops", saleName: "Concierges" },
  safari: { name: "Desert safari", blurb: "Dune bashing, camels and dinners under the stars.", floorName: "Camp", transportName: "4x4s", saleName: "Agencies" },
  souk: { name: "Gold souk", blurb: "Gold jewellery by weight in the world's shiniest market.", floorName: "Workshop", transportName: "Guards", saleName: "Jewellers" },
  tower: { name: "Skyscraper", blurb: "Glass towers taller than the clouds.", floorName: "Floor under construction", transportName: "Cranes", saleName: "Investors" },
};

const CITIES_EN: Record<string, { blurb: string; name?: string }> = {
  madrid: { blurb: "Where it all begins: from rider to owner of an AI agency." },
  miami: { blurb: "Sun, beach and tourists: demand comes in waves." },
  dubai: { name: "Dubai", blurb: "Luxury in the desert: sell when gold is expensive." },
};

const OFFICE_EN: Record<string, { name: string; desc: string }> = {
  brand: { name: "Global brand", desc: "+25% income in every city" },
  team: { name: "Starting team", desc: "Start every city (and every IPO) with the managers of your first business" },
  floors: { name: "Renovated premises", desc: "Start with +1 open station (and its manager) in your first business" },
  suppliers: { name: "Suppliers", desc: "Upgrades cost 8% less" },
  offline: { name: "Night shift", desc: "+2 h of earnings while the app is closed" },
  hustle: { name: "Productivity coach", desc: "Hustle mode lasts +1 h per ad" },
  luck: { name: "Viral marketing", desc: "+1% chance of a viral sale" },
};

const LIFE_EN = [
  "Living with your parents",
  "Shared flat",
  "Rented studio",
  "Your own flat",
  "Downtown penthouse",
  "Villa with a pool",
  "Mansion in Marbella",
  "Luxury yacht",
  "Private island",
  "Trip to Mars",
];

const VIRAL_EN = [
  "Your TikTok went viral",
  "You found a winning product",
  "A client pays you triple",
  "A brand wants to sponsor you",
  "Your LinkedIn post blew up",
];

const RARITIES_EN = ["Common", "Rare", "Epic", "Legendary"];

const EXEC_KINDS_EN = {
  prod: { label: "Production", desc: "more production at the stations" },
  log: { label: "Logistics", desc: "more transport and sales capacity" },
  sale: { label: "Sales", desc: "more money per sale" },
};

const CHESTS_EN = { free: "Free briefcase", normal: "Briefcase", premium: "Golden briefcase" };

const MISSIONS_EN: Record<string, string> = {
  upgrades: "Upgrade any part of a business {n} times",
  sales: "Make {n} sales",
  earned: "Earn ${n}",
  hires: "Hire {n} manager",
  ads: "Watch {n} ads",
  abilities: "Activate {n} executive ability",
  chests: "Open {n} briefcase",
  floors: "Open {n} new station",
};

const ACHIEVEMENTS_EN: Record<string, string> = {
  earn_1k: "Earn $1 K in total",
  earn_1m: "Earn $1 M in total",
  earn_1b: "Earn $1 B in total",
  earn_1t: "Earn $1 T in total",
  earn_aa: "Earn $1 aa in total (a quadrillion)",
  earn_ac: "Earn $1 ac in total",
  biz_2: "Own 2 businesses",
  biz_3: "Own 3 businesses",
  biz_4: "Own 4 businesses",
  floors_4: "Open 4 stations in one business",
  floors_8: "Fill a business with 8 stations",
  hires_5: "Hire 5 managers",
  sales_500: "Make 500 sales",
  execs_5: "Get 5 executives",
  ipo_1: "Go public for the first time",
};

const TUTORIAL_EN = [
  "Tap the Burger joint so they prepare an order",
  "Tap your bike to pick up the orders (hold to pedal faster)",
  "Tap the customer to deliver the orders and get paid",
  "Press the Burger joint's «Level» button and upgrade it",
  "Hire a manager so a part works on its own",
  "Open the Pizzeria, the next stop on your route",
];

const PRODUCTS_EN: Record<string, { name: string; desc: string; price: string; highlight?: string }> = {
  vip: { name: "VIP forever", desc: "No ads: every reward instantly, no videos. And everything you earn, x2 forever.", price: "€4.99", highlight: "Best seller" },
  starter_pack: { name: "Starter pack", desc: "300 💎, an Epic executive and 4 h of hustle mode. One-time purchase.", price: "€1.99", highlight: "One-time offer" },
  gems_200: { name: "200 gems", desc: "For briefcases and cash packs.", price: "€1.99" },
  auto_manager: { name: "Auto manager", desc: "Unlimited «Upgrade all»: one tap and your business upgrades itself with what pays off most. Forever.", price: "€0.99" },
  gems_1200: { name: "1,200 gems", desc: "20% more gems per euro than the small pack.", price: "€9.99" },
};

const LUXURY_EN: Record<string, string> = {
  tracksuit: "Rider tracksuit", hoodie: "Designer hoodie", suit: "Tailored suit", designer: "Designer suit", goldtux: "Gold tuxedo", neonsuit: "Neon suit (exclusive)",
  digital: "Digital watch", luxwatch: "Luxury watch", goldchain: "Gold chain", diamondring: "Diamond ring", crown: "Diamond crown (exclusive)",
  deliverybike: "Delivery scooter", scooter: "Electric kick scooter", motorbike: "Sports bike", sportscar: "Sports car", supercar: "Supercar", limo: "Limousine", goldcar: "Gold sports car (exclusive)",
  parents: "Your parents' house", flat: "Rented flat", penthouse: "City penthouse", villa: "Villa with pool", mansion: "Mansion", island: "Private island",
  cat: "Cat", dog: "Dog", parrot: "Parrot", tiger: "White tiger", penguin: "Penguin (exclusive)",
  yacht: "Yacht", jet: "Private jet", rocket: "Rocket",
  vampire: "Vampire costume", skullring: "Skull ring", hearse: "Hearse", haunted: "Haunted mansion", pumpkin: "Pet pumpkin",
};
const LUXURY_CATS_EN: Record<string, string> = { outfit: "Clothes", jewel: "Watches & jewellery", car: "Garage", home: "Homes", pet: "Pets", extreme: "Extreme luxury" };

const RIVALS_EN = ["Corner kebab shop", "Nail salon", "Used car lot", "Specialty coffee shop", "Neapolitan pizzeria", "Phone shop", "Construction company", "Clothing store"];

const RANKS_EN = ["Bronze", "Silver", "Gold", "Diamond", "Legend"];

let done = false;

export function localizeData(): void {
  if (lang === "es" || done) return;
  done = true;
  for (const b of ALL_BUSINESSES) Object.assign(b, BUSINESSES_EN[b.id] ?? {});
  for (const c of CITIES) Object.assign(c, CITIES_EN[c.id] ?? {});
  for (const o of OFFICE) Object.assign(o, OFFICE_EN[o.id] ?? {});
  LIFE.forEach((l, i) => (l.name = LIFE_EN[i] ?? l.name));
  VIRAL_TITLES.splice(0, VIRAL_TITLES.length, ...VIRAL_EN);
  RARITIES.forEach((r, i) => (r.name = RARITIES_EN[i] ?? r.name));
  RANKS.forEach((r, i) => (r.name = RANKS_EN[i] ?? r.name));
  RIVALS.forEach((r, i) => (r.biz = RIVALS_EN[i] ?? r.biz));
  for (const i of LUXURY) i.name = LUXURY_EN[i.id] ?? i.name;
  for (const c of LUXURY_CATS) c.name = LUXURY_CATS_EN[c.id] ?? c.name;
  for (const k of Object.keys(EXEC_KINDS) as (keyof typeof EXEC_KINDS)[]) Object.assign(EXEC_KINDS[k], EXEC_KINDS_EN[k]);
  for (const k of Object.keys(CHESTS) as (keyof typeof CHESTS)[]) CHESTS[k].name = CHESTS_EN[k];
  for (const k of Object.keys(MISSIONS) as (keyof typeof MISSIONS)[]) MISSIONS[k].text = MISSIONS_EN[k] ?? MISSIONS[k].text;
  for (const a of ACHIEVEMENTS) a.text = ACHIEVEMENTS_EN[a.id] ?? a.text;
  TUTORIAL.forEach((s, i) => (s.text = TUTORIAL_EN[i] ?? s.text));
  for (const p of PRODUCTS) Object.assign(p, PRODUCTS_EN[p.id] ?? {});
}

/** Para el test de cobertura: que no falte ningún elemento del contenido. */
export const EN_DATA = { RIVALS_EN, LUXURY_EN, LUXURY_CATS_EN, RANKS_EN, BUSINESSES_EN, CITIES_EN, OFFICE_EN, LIFE_EN, VIRAL_EN, RARITIES_EN, MISSIONS_EN, ACHIEVEMENTS_EN, TUTORIAL_EN, PRODUCTS_EN };
