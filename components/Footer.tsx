export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto flex items-center justify-center text-white px-6 py-3 shadow bg-[#8B0D2B]">
      <p className="text-sm italic text-[#FFD700]">
        &copy; {year} Quran Quiz. All Rights Reserved.
      </p>
    </footer>
  );
}
