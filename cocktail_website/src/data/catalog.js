import { publicUrl } from "../lib/format";
import { ingredientImage } from "../services/cocktailDb";

import reverseCherryManhattan from "../assets/images/reverseCherryManhattan.png";
import mojito from "../assets/images/mojito.webp";
import oldFashioned from "../assets/images/old_fashioned.webp";
import aviation from "../assets/images/aviation.webp";
import nuttyAlexander from "../assets/images/nuttyAlexander.webp";
import boulevardier from "../assets/images/boulevardier.webp";
import jigger from "../assets/images/jigger.svg";

/* ───────────── This week's favourites (carousel) ───────────── */
export const FAVOURITES = [
  { id: "reverse-cherry-manhattan", title: "Reverse Cherry Manhattan", image: reverseCherryManhattan, ingredients: ["2 oz Rye Whiskey", "1 oz Sweet Vermouth", "½ oz Cherry Liqueur", "2 dashes Angostura", "Maraschino Cherry"] },
  { id: "mojito", title: "Mojito", image: mojito, ingredients: ["2 oz White Rum", "1 oz Lime Juice", "2 tsp Sugar", "Mint Leaves", "Club Soda"] },
  { id: "old-fashioned", title: "Old Fashioned", image: oldFashioned, ingredients: ["2 oz Bourbon or Rye", "1 Sugar Cube", "2 dashes Angostura", "Orange Peel"] },
  { id: "aviation", title: "Aviation", image: aviation, ingredients: ["2 oz Gin", "½ oz Maraschino", "½ oz Crème de Violette", "¾ oz Lemon Juice"] },
  { id: "nutty-alexander", title: "Nutty Alexander", image: nuttyAlexander, ingredients: ["1 oz Cognac", "1 oz Crème de Cacao", "1 oz Heavy Cream", "Grated Nutmeg"] },
  { id: "boulevardier", title: "Boulevardier", image: boulevardier, ingredients: ["1 oz Bourbon", "1 oz Campari", "1 oz Sweet Vermouth", "Orange Peel"] },
];

/* ───────────── House signatures (own creations, recipe kept secret) ───────────── */
const signature = (id, name, glass, look) => ({
  id,
  name,
  glass,
  look,
  image: publicUrl(`images/signatures/${id}.jpg`),
});

export const SIGNATURES = [
  signature("crimson_voyage", "Crimson Voyage", "Martini glass", "Ruby red, finished with an orange spiral and a cherry."),
  signature("golden_hour", "Golden Hour", "Coupe", "Velvety foam crown dusted with warm spice."),
  signature("blackbird", "Blackbird", "Martini glass", "Deep, dark cherry hue with a single cherry."),
  signature("after_sunset", "After Sunset", "Rocks glass", "Sparkling amber over ice with a dried orange wheel."),
  signature("afterburn", "Afterburn", "Nick & Nora", "Amber-red and spirit-forward, orange peel on the rim."),
  signature("crosswind", "Crosswind", "Martini glass", "Pale gold shimmer with an orange twist and a cherry."),
  signature("horizon_breeze", "Horizon Breeze", "Hurricane glass", "Layered ocean blue into sunshine yellow."),
  signature("layover_lemonade", "Layover Lemonade", "Flute", "Bright and green with lime and fresh mint."),
  signature("mayday", "Mayday", "Tiki highball", "Long tiki drink with lime, mint and ginger."),
  signature("indigo_shot", "Indigo Shot", "Shot glass", "Layered blue, violet and cream."),
];

/* ───────────── Classic recipes (live from TheCocktailDB) ───────────── */
export const CLASSIC_IDS = [
  "11007", // Margarita
  "11000", // Mojito
  "11001", // Old Fashioned
  "11003", // Negroni
  "11006", // Daiquiri
  "17197", // French 75
  "12196", // Sidecar
  "17180", // Aviation
];

/** Shown when the API is unreachable (offline, blocked, rate limited). */
export const FALLBACK_CLASSICS = [
  {
    id: "local-aviation",
    name: "Aviation",
    category: "Cocktail",
    glass: "Cocktail glass",
    image: publicUrl("images/aviation.jpg"),
    ingredients: ["2 oz Gin", "½ oz Maraschino Liqueur", "¼ oz Crème de Violette", "¾ oz Lemon Juice"],
    instructions: "Shake all ingredients hard with ice and fine-strain into a chilled cocktail glass.",
  },
  {
    id: "local-french-75",
    name: "French 75",
    category: "Cocktail",
    glass: "Flute",
    image: publicUrl("images/french_75.jpg"),
    ingredients: ["1 oz Gin", "½ oz Lemon Juice", "½ oz Simple Syrup", "Champagne to top"],
    instructions: "Shake gin, lemon and syrup with ice, strain into a flute and top with champagne.",
  },
  {
    id: "local-sidecar",
    name: "Sidecar",
    category: "Cocktail",
    glass: "Cocktail glass",
    image: publicUrl("images/sidecar.jpg"),
    ingredients: ["2 oz Cognac", "¾ oz Cointreau", "¾ oz Lemon Juice"],
    instructions: "Shake with ice and strain into a chilled, optionally sugar-rimmed, cocktail glass.",
  },
];

/* ───────────── Webshop catalogue ───────────── */
export const CATEGORIES = [
  { id: "beverages", label: "Beverages", icon: "ri-goblet-line" },
  { id: "essentials", label: "Bar essentials", icon: "ri-knife-line" },
];

const localTool = (file) => publicUrl(`images/tools/${file}`);

export const PRODUCTS = [
  { id: "absolut", category: "beverages", name: "Absolut Vodka", detail: "Swedish vodka · 70 cl", price: 8, image: localTool("absolut.jpg") },
  { id: "campari", category: "beverages", name: "Campari", detail: "Italian bitter aperitivo · 70 cl", price: 10, image: localTool("campari.jpg") },
  { id: "grey-goose", category: "beverages", name: "Grey Goose", detail: "French vodka · 70 cl", price: 9, image: localTool("grey_goose.jpg") },
  { id: "aperol", category: "beverages", name: "Aperol", detail: "Orange aperitivo · 70 cl", price: 9, image: ingredientImage("Aperol") },
  { id: "cointreau", category: "beverages", name: "Cointreau", detail: "Orange liqueur · 70 cl", price: 12, image: ingredientImage("Cointreau") },
  { id: "lillet-blanc", category: "beverages", name: "Lillet Blanc", detail: "Aromatised wine · 75 cl", price: 10, image: ingredientImage("Lillet Blanc") },
  { id: "maraschino", category: "beverages", name: "Maraschino Liqueur", detail: "Cherry liqueur · 50 cl", price: 11, image: ingredientImage("Maraschino Liqueur") },
  { id: "angostura", category: "beverages", name: "Angostura Bitters", detail: "Aromatic bitters · 20 cl", price: 7, image: ingredientImage("Angostura Bitters") },
  { id: "old-fashioned-glass", category: "essentials", name: "Old Fashioned Glass", detail: "Heavy-base crystal tumbler", price: 25, image: localTool("old_fashioned_glass.jpg") },
  { id: "muddler", category: "essentials", name: "Muddler", detail: "Wooden, 23 cm", price: 12, image: localTool("muddler.jpg") },
  { id: "jigger", category: "essentials", name: "Jigger", detail: "Japanese style · 30 / 45 ml", price: 8, image: jigger },
];
