'use client';
export function SelectAll() {
  return (
    <label className="text-sm text-gray-600 flex items-center gap-2">
      <input
        type="checkbox"
        onChange={(e) => {
          const inputs = document.querySelectorAll<HTMLInputElement>('input[name="id"]');
          inputs.forEach((i) => { if (!i.disabled) i.checked = (e.target as HTMLInputElement).checked; });
        }}
      /> select all on page
    </label>
  );
}
