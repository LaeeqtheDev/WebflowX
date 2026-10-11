// Stripe sends amounts as whole numbers of a currency's smallest unit: 2900 is $29.00, but ¥2900 is already 2900 yen.
const NO_DECIMALS = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"])
const THREE_DECIMALS = new Set(["bhd", "jod", "kwd", "omr", "tnd"])

export const formatStripeAmount = (amount: number, currency: string, locale?: string) => {
    const code = currency.toLowerCase()
    const value = NO_DECIMALS.has(code) ? amount : amount / (THREE_DECIMALS.has(code) ? 1000 : 100)
    try {
        return new Intl.NumberFormat(locale, { style: "currency", currency: code.toUpperCase() }).format(value)
    } catch {
        // a currency code this browser doesn't know
        return `${value} ${code.toUpperCase()}`
    }
}
