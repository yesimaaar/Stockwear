export const PRODUCT_COLORS = [
  { name: "Negro", hex: "#000000", class: "bg-black" },
  { name: "Blanco", hex: "#FFFFFF", class: "bg-white border border-gray-200" },
  { name: "Rojo", hex: "#EF4444", class: "bg-red-500" },
  { name: "Azul", hex: "#3B82F6", class: "bg-blue-500" },
  { name: "Verde", hex: "#22C55E", class: "bg-green-500" },
  { name: "Amarillo", hex: "#EAB308", class: "bg-yellow-500" },
  { name: "Naranja", hex: "#F97316", class: "bg-orange-500" },
  { name: "Morado", hex: "#A855F7", class: "bg-purple-500" },
  { name: "Rosa", hex: "#EC4899", class: "bg-pink-500" },
  { name: "Gris", hex: "#6B7280", class: "bg-gray-500" },
  { name: "Beige", hex: "#F5F5DC", class: "bg-[#F5F5DC] border border-gray-200" },
  { name: "Marron", hex: "#78350F", class: "bg-amber-900" },
  { name: "Multicolor", hex: "multi", class: "bg-gradient-to-r from-red-500 via-green-500 to-blue-500" }
] as const;

export type ProductColorName = typeof PRODUCT_COLORS[number]["name"];
