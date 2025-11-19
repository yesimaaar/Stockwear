export function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)
}

export function createWhatsAppLink(
  items: { id: string; name: string; price: number; qty: number }[],
  total: number,
  phone: string
) {
  const lines = items.map(i => `${i.qty} x ${i.name} — ${formatCurrency(i.price * i.qty)}`)
  const text = `Hola, quiero hacer un pedido:\n\n${lines.join("\n")}\n\nTotal: ${formatCurrency(total)}\n\nGracias.`
  // phone must be digits, no plus, no spaces. ej: 521XXXXXXXXXX
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
