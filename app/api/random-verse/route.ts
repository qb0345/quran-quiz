import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Aal-i-Imran', 4: 'An-Nisa', 5: 'Al-Maidah',
  6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Rad', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Muminun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shuara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiya',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqiah', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saff', 62: 'Al-Jumuah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-Ala', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qariah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas',
};

// Sahih International translation cache (populated lazily from api.quran.com).
// Keyed by "surah:ayah". Never invalidated — Quran text and translation are stable.
const translationCache = new Map<string, string>();

async function fetchTranslation(surah: number, ayah: number): Promise<string | null> {
  const key = `${surah}:${ayah}`;
  const cached = translationCache.get(key);
  if (cached) return cached;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 900);
    // translations=20 = Saheeh International (English).
    const res = await fetch(
      `https://api.quran.com/api/v4/verses/by_key/${key}?language=en&translations=20`,
      { signal: controller.signal, cache: 'no-store' },
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    const raw = j?.verse?.translations?.[0]?.text as string | undefined;
    if (!raw) return null;
    // API includes HTML <sup foot_note="..."></sup> refs — strip them.
    const clean = raw.replace(/<[^>]+>/g, '').trim();
    translationCache.set(key, clean);
    return clean;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const supabase = supabaseService();
    // Bias toward short surahs (Juz 30) for readability in a carousel card
    const juzWeight = Math.random() < 0.7 ? 30 : Math.floor(Math.random() * 30) + 1;
    const { data: rows, error } = await supabase
      .from('verses')
      .select('ayah_key, surah, ayah, text')
      .eq('juz', juzWeight)
      .limit(200);
    if (error) throw error;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'no verses' }, { status: 500 });
    }
    const short = rows.filter((r) => r.text && r.text.length < 240);
    const pool = short.length > 0 ? short : rows;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const translation = await fetchTranslation(pick.surah, pick.ayah);
    return NextResponse.json({
      ayahKey: pick.ayah_key,
      surahNumber: pick.surah,
      surahName: SURAH_NAMES[pick.surah] ?? `Surah ${pick.surah}`,
      ayahNumber: pick.ayah,
      arabic: pick.text,
      translation,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}
