'use client';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface NavLink { key: string; href: string; label: string }

const HOME_LINK: NavLink = { key: '', href: '/', label: 'Home' };

const guestLinks: NavLink[] = [
  HOME_LINK,
  { key: 'auth', href: '/auth/login', label: 'Log in' },
  { key: 'signup', href: '/auth/signup', label: 'Sign up' },
];

const authedLinks: NavLink[] = [
  HOME_LINK,
  { key: 'leaderboard', href: '/leaderboard', label: 'Leaderboard' },
  { key: 'profile', href: '/profile', label: 'Profile' },
];

interface Props {
  authed: boolean;
  isAdmin: boolean;
  userEmail?: string | null;
  currentStreak?: number | null;
}

export function Navbar({ authed, isAdmin, userEmail, currentStreak }: Props) {
  const pathname = usePathname() ?? '/';
  const activeKey = pathname === '/' ? '' : pathname.split('/')[1];
  const links = authed ? [...authedLinks, ...(isAdmin ? [{ key: 'admin', href: '/admin', label: 'Admin' }] : [])] : guestLinks;

  return (
    <header
      className="text-[#FFD700] flex items-center justify-between px-4 md:px-6 py-3 shadow-lg border-b-[3px] border-[#FFD700]"
      style={{ background: 'linear-gradient(135deg, #8B0D2B 0%, #6B0821 100%)' }}
    >
      <a href="/" className="flex items-center gap-3 no-underline text-inherit hover:opacity-90 transition-opacity">
        <Image
          src="/images/logo.png"
          alt="Quran Quiz logo"
          width={48}
          height={48}
          priority
          className="h-11 w-11 rounded-xl object-contain"
        />
        <div className="hidden sm:block">
          <div className="text-lg md:text-xl font-extrabold tracking-wider" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
            QURAN QUIZ
          </div>
          <div className="text-[0.68rem] opacity-80 italic">Test your knowledge · strengthen your iman</div>
        </div>
      </a>
      <nav className="flex items-center gap-4 md:gap-6 text-sm md:text-base font-medium">
        {links.map((link) => {
          const active = activeKey === link.key || (link.key === 'auth' && activeKey === 'auth');
          return (
            <a
              key={link.key}
              href={link.href}
              className={active ? 'text-[#FFD700] font-bold relative' : 'text-[#FFD700]/70 hover:text-[#FFD700] transition-colors'}
            >
              {link.label}
              {active && <span className="absolute -bottom-[.55rem] left-0 right-0 h-[2px] bg-[#FFD700] rounded" />}
            </a>
          );
        })}
        {authed && (
          <>
            {typeof currentStreak === 'number' && currentStreak > 0 && (
              <span
                className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
                style={{ background: 'rgba(255,215,0,0.15)', borderColor: 'rgba(255,215,0,0.4)' }}
              >
                <strong className="text-[#FFD700]">{currentStreak}-day</strong>&nbsp;streak
              </span>
            )}
            <form action="/auth/logout" method="post" className="inline">
              <button
                type="submit"
                className="text-[#FFD700]/70 hover:text-[#FFD700] transition-colors cursor-pointer text-sm md:text-base"
                title={userEmail ?? ''}
              >
                Log out
              </button>
            </form>
          </>
        )}
      </nav>
    </header>
  );
}
