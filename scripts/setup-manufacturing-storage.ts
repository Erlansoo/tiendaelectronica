import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const buckets = [
  {
    id: "manufacturer-evidence",
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    id: "manufacturing-quotes",
    fileSizeLimit: 100 * 1024 * 1024,
    allowedMimeTypes: [
      "application/octet-stream",
      "model/stl",
      "application/sla",
      "model/obj",
      "model/3mf",
      "text/plain",
      "application/step",
      "application/x-step",
      "model/step",
      "application/vnd.ms-package.3dmanufacturing-3dmodel+xml",
      "application/vnd.ms-pki.stl",
    ],
  },
];

async function main() {
  for (const bucket of buckets) {
    const { data } = await supabase.storage.getBucket(bucket.id);
    const options = {
      public: false,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
    };
    const result = data
      ? await supabase.storage.updateBucket(bucket.id, options)
      : await supabase.storage.createBucket(bucket.id, options);
    if (result.error && bucket.id === "manufacturing-quotes" && result.error.statusCode === "413") {
      const projectLimitOptions = { ...options, fileSizeLimit: 50 * 1024 * 1024 };
      const fallback = data
        ? await supabase.storage.updateBucket(bucket.id, projectLimitOptions)
        : await supabase.storage.createBucket(bucket.id, projectLimitOptions);
      if (fallback.error) throw fallback.error;
      console.warn("manufacturing-quotes: el proyecto Supabase limita objetos a 50 MB; sube el límite del plan y vuelve a ejecutar este script para habilitar 100 MB.");
      continue;
    }
    if (result.error) throw result.error;
    console.log(`${bucket.id}: privado y configurado`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
