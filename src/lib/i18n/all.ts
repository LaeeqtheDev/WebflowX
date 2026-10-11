// Every dictionary at once. Only tests use this; the app loads languages one at a time through loadLocale().
import { en } from "./en"
import { es } from "./es"
import { fr } from "./fr"
import { de } from "./de"
import { pt } from "./pt"
import { hi } from "./hi"
import type { Key } from "./en"
import type { Locale } from "./index"

export const DICTS: Record<Locale, Record<Key, string>> = { en, es, fr, de, pt, hi }
