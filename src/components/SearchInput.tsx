import { Search } from "lucide-react";

export function SearchInput({
  defaultValue,
  placeholder = "Search products",
}: {
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <form className="relative w-full" action="/productos">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
      <input
        className="h-12 w-full rounded-md border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </form>
  );
}
