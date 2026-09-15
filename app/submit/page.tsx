import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { SubmitClient } from './submit-client';

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

const SURAH_LIST = Object.entries(SURAH_NAMES).map(([n, name]) => ({ num: Number(n), name }));

export default async function SubmitPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/submit');

  // Show the user's recent pending submissions
  const { data: recent } = await supabase
    .from('questions')
    .select('id, prompt, ayah_key, is_approved, created_at')
    .eq('source', 'user')
    .eq('submitted_by', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <main className="flex-grow max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <div className="content-shell rounded-2xl shadow-lg p-6 md:p-8 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#8B0D2B] mb-2" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
          Submit a question
        </h1>
        <p className="text-sm text-[#6b5d44] mb-6">
          Pick a surah + ayah, then click a word to blank out. Enter 3 wrong-answer distractors.
          Admin will review before it lands in the community pool.
        </p>
        <SubmitClient surahList={SURAH_LIST} />
      </div>

      {recent && recent.length > 0 && (
        <div className="content-shell rounded-2xl shadow p-5 md:p-6">
          <h2 className="text-lg font-bold text-[#8B0D2B] mb-3" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Your submissions</h2>
          <div className="space-y-2">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-[#faf7ee] border border-[#e5dcc2] rounded-lg px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[#6b5d44] mr-2 font-mono">{r.ayah_key}</span>
                  <span dir="rtl" lang="ar" className="truncate inline-block max-w-[400px] align-middle" style={{ fontFamily: 'var(--font-amiri), serif' }}>{r.prompt}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold ml-3 ${r.is_approved ? 'bg-[#eaf7ea] text-[#2f9e44]' : 'bg-[#fff3d6] text-[#f08c00]'}`}>
                  {r.is_approved ? 'Approved' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
