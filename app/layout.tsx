import type { Metadata } from 'next';
import { Fraunces, Amiri, Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { supabaseServer } from '@/lib/supabase/server';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' });
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], display: 'swap' });
const amiri = Amiri({ variable: '--font-amiri', subsets: ['arabic'], weight: ['400', '700'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Quran Quiz',
  description: 'Test your knowledge · strengthen your iman.',
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  let currentStreak: number | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('role, current_streak').eq('id', user.id).single();
    isAdmin = data?.role === 'admin';
    currentStreak = data?.current_streak ?? 0;
  }
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${amiri.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col text-[#1f1410] font-sans"
        style={{
          backgroundImage: "url('/images/bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <Navbar authed={!!user} isAdmin={isAdmin} userEmail={user?.email ?? null} currentStreak={currentStreak} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
