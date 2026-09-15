import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

interface HadithRow {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  reference?: { book: number; hadith: number };
}

interface EditionFile {
  metadata: { name: string; section: Record<string, string> };
  hadiths: HadithRow[];
}

let cachedEng: EditionFile | null = null;
let cachedAra: EditionFile | null = null;

async function loadEdition(file: string): Promise<EditionFile> {
  const p = path.join(process.cwd(), 'data', 'hadith', file);
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw) as EditionFile;
}

export async function GET() {
  try {
    if (!cachedEng) cachedEng = await loadEdition('eng-bukhari.min.json');
    if (!cachedAra) cachedAra = await loadEdition('ara-bukhari.min.json');

    const englishOnly = cachedEng.hadiths.filter((h) => h.text && h.text.trim().length > 40 && h.text.trim().length < 500);
    if (englishOnly.length === 0) throw new Error('no hadith available');
    const pick = englishOnly[Math.floor(Math.random() * englishOnly.length)];

    const arabic = cachedAra.hadiths.find((h) => h.hadithnumber === pick.hadithnumber);
    return NextResponse.json({
      book: cachedEng.metadata.name,
      hadithNumber: pick.hadithnumber,
      english: pick.text,
      arabic: arabic?.text ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}
