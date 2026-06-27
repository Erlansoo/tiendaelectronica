export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Settings</h1>
      <div className="mt-5 rounded-md border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">
          Configure environment variables in Vercel and Supabase. Authentication is intentionally minimal in this MVP and ready to be replaced by Supabase Auth.
        </p>
      </div>
    </div>
  );
}
