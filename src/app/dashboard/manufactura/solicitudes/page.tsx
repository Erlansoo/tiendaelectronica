import { ManufacturerApplicationReview } from "@/components/ManufacturerApplicationReview";
import { requireStoreAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function ManufacturerApplicationsPage() {
  await requireStoreAdmin();
  const applications = await prisma.manufacturerApplication.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    include: { account: { select: { email: true } }, evidence: true },
  });
  const storage = createSupabaseAdminClient().storage.from("manufacturer-evidence");
  const signed = new Map<string, string>();
  await Promise.all(applications.flatMap((application) => application.evidence.map(async (evidence) => {
    const { data } = await storage.createSignedUrl(evidence.storagePath, 10 * 60);
    if (data?.signedUrl) signed.set(evidence.id, data.signedUrl);
  })));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Manufactura 3D</p><h1 className="mt-1 text-3xl font-semibold text-slate-950">Solicitudes de acceso</h1></div>
        <p className="text-sm text-slate-500">{applications.length} solicitudes</p>
      </div>
      <div className="mt-6 grid gap-5">
        {applications.map((application) => (
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm" key={application.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{application.commercialName}</h2>
                <p className="mt-1 text-sm text-slate-500">{application.account.email} · {application.responsibleName}</p>
                <p className="text-sm text-slate-500">{application.city}, {application.department} · WhatsApp {application.whatsapp}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{application.status}</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Info title="Experiencia" value={application.experience} />
              <Info title="Máquinas declaradas" value={application.declaredMachines} />
              <Info title="Tecnologías" value={application.technologies.join(", ")} />
              <Info title="Entrega" value={application.deliveryModes.join(", ")} />
            </div>
            {application.workLinks.length ? <div className="mt-4"><h3 className="text-sm font-semibold">Trabajos</h3><div className="mt-1 flex flex-wrap gap-2">{application.workLinks.map((url) => <a className="text-sm text-blue-700 underline" href={url} key={url} rel="noreferrer" target="_blank">{url}</a>)}</div></div> : null}
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Evidencias privadas</h3>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {application.evidence.map((evidence) => signed.get(evidence.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={signed.get(evidence.id)} target="_blank" rel="noreferrer" key={evidence.id}><img className="aspect-square w-full rounded-md border object-cover" src={signed.get(evidence.id)} alt={evidence.originalName} /></a>
                ) : null)}
              </div>
            </div>
            <ManufacturerApplicationReview applicationId={application.id} status={application.status} />
          </article>
        ))}
        {applications.length === 0 ? <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-slate-500">No hay solicitudes todavía.</p> : null}
      </div>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return <div><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{value}</p></div>;
}

