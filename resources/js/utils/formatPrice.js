export function formatPrice(value) {
    if (value == null || value === '') return '';
    const n = Number(value);
    if (Number.isNaN(n)) return '';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export function parsePriceInput(raw) {
    if (raw == null || String(raw).trim() === '') return null;
    const n = parseFloat(String(raw).replace(',', '.'));
    return Number.isNaN(n) || n < 0 ? null : Math.round(n * 100) / 100;
}

export function sumPrices(destinations) {
    return (destinations ?? []).reduce((s, d) => s + (parseFloat(d.price) || 0), 0);
}
