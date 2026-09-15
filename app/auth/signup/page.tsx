import { signupAction } from './actions';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex-grow max-w-md mx-auto px-6 py-16 w-full">
      <div className="content-shell rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-[#8B0D2B] mb-6 text-center" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Sign up</h1>
        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">{error}</p>
        )}
        <form action={signupAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input name="name" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0D2B]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" required className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0D2B]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password (min 6)</label>
            <input name="password" type="password" required minLength={6} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0D2B]" />
          </div>
          <button type="submit" className="w-full bg-[#8B0D2B] text-[#FFD700] font-bold py-2 rounded hover:opacity-90 transition-opacity">
            Create account
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Have an account? <a href="/auth/login" className="highlight hover:underline">Log in</a>
        </p>
      </div>
    </main>
  );
}
