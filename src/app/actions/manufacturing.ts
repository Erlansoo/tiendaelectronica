"use server";

import {
  CapabilityStatus,
  CapabilityType,
  DeliveryMode,
  InventoryMovementType,
  InventoryUnit,
  MachineReviewStatus,
  ManufacturingQuality,
  ManufacturingTechnology,
  Prisma,
} from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireStoreAdmin } from "@/lib/admin-auth";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  decimal,
  generateManufacturerCode,
  grantManufacturerAreaAccess,
  hashManufacturerCode,
  requireManufacturerCapability,
  safeCodeMatch,
} from "@/lib/manufacturing";
import { calculateManufacturingEstimate } from "@/lib/manufacturing-calculator";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string };

const applicationSchema = z.object({
  commercialName: z.string().trim().min(2).max(120),
  responsibleName: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  whatsapp: z.string().trim().min(7).max(30),
  experience: z.string().trim().min(30).max(3000),
  technologies: z.array(z.enum(ManufacturingTechnology)).min(1).max(2),
  declaredMachines: z.string().trim().min(3).max(2000),
  deliveryModes: z.array(z.enum(DeliveryMode)).min(1).max(2),
  workLinks: z.array(z.string().url()).max(8),
  applicantNotes: z.string().trim().max(2000).optional(),
});

const evidenceSchema = z.array(z.object({
  name: z.string().trim().min(1).max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
})).min(1).max(5);

export async function startManufacturerApplication(
  rawApplication: unknown,
  rawEvidence: unknown,
): Promise<ActionResult<{ applicationId: string; uploads: Array<{ path: string; token: string }> }>> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Inicia sesión con Google para continuar." };

  const applicationResult = applicationSchema.safeParse(rawApplication);
  const evidenceResult = evidenceSchema.safeParse(rawEvidence);
  if (!applicationResult.success || !evidenceResult.success) {
    return { ok: false, error: "Revisa los datos y adjunta entre 1 y 5 fotos válidas de hasta 10 MB." };
  }

  const existing = await prisma.manufacturerApplication.findFirst({
    where: { accountId: customer.id, status: { in: ["PENDING", "APPROVED"] } },
    select: { status: true },
  });
  if (existing) {
    return {
      ok: false,
      error: existing.status === "APPROVED"
        ? "Tu solicitud ya fue aprobada. Usa el código entregado por Nubel."
        : "Ya tienes una solicitud pendiente de revisión.",
    };
  }

  const application = await prisma.manufacturerApplication.create({
    data: {
      accountId: customer.id,
      ...applicationResult.data,
      status: "DRAFT",
    },
    select: { id: true },
  });

  try {
    const storage = createSupabaseAdminClient().storage.from("manufacturer-evidence");
    const uploads: Array<{ path: string; token: string }> = [];
    const evidenceRows: Prisma.ManufacturerEvidenceCreateManyInput[] = [];

    for (const file of evidenceResult.data) {
      const extension = file.mimeType === "image/png" ? "png" : file.mimeType === "image/webp" ? "webp" : "jpg";
      const path = `${customer.id}/${application.id}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await storage.createSignedUploadUrl(path);
      if (error || !data) throw new Error(error?.message ?? "No se pudo preparar la carga.");
      uploads.push({ path, token: data.token });
      evidenceRows.push({
        applicationId: application.id,
        storagePath: path,
        originalName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      });
    }

    await prisma.manufacturerEvidence.createMany({ data: evidenceRows });
    return { ok: true, data: { applicationId: application.id, uploads } };
  } catch (error) {
    await prisma.manufacturerApplication.delete({ where: { id: application.id } }).catch(() => undefined);
    console.error("Manufacturer evidence upload preparation failed", error);
    return { ok: false, error: "No pudimos preparar la carga privada de evidencias. Intenta nuevamente." };
  }
}

export async function finalizeManufacturerApplication(applicationId: string): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Tu sesión terminó. Inicia sesión nuevamente." };

  const application = await prisma.manufacturerApplication.findFirst({
    where: { id: applicationId, accountId: customer.id, status: "DRAFT" },
    include: { evidence: true },
  });
  if (!application || application.evidence.length < 1 || application.evidence.length > 5) {
    return { ok: false, error: "La solicitud o sus evidencias no son válidas." };
  }

  const storage = createSupabaseAdminClient().storage.from("manufacturer-evidence");
  for (const evidence of application.evidence) {
    const folder = evidence.storagePath.slice(0, evidence.storagePath.lastIndexOf("/"));
    const filename = evidence.storagePath.slice(evidence.storagePath.lastIndexOf("/") + 1);
    const { data, error } = await storage.list(folder, { search: filename, limit: 1 });
    if (error || !data?.some((item) => item.name === filename)) {
      return { ok: false, error: `La evidencia “${evidence.originalName}” no terminó de subir.` };
    }
  }

  await prisma.manufacturerApplication.update({
    where: { id: application.id },
    data: { status: "PENDING", submittedAt: new Date() },
  });
  revalidatePath("/cuenta");
  revalidatePath("/dashboard/manufactura/solicitudes");
  return { ok: true, data: undefined, message: "Solicitud enviada. Nubel verificará la información personalmente." };
}

export async function activateManufacturerCode(rawCode: string): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Inicia sesión con la cuenta Google vinculada al código." };
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z2-9]{20}$/.test(code)) return { ok: false, error: "El código debe tener exactamente 20 caracteres." };

  const invite = await prisma.manufacturerInvite.findFirst({
    where: { accountId: customer.id, email: customer.email.toLowerCase(), status: { in: ["ACTIVE", "USED"] } },
    orderBy: { createdAt: "desc" },
    include: { application: true },
  });
  if (!invite) return { ok: false, error: "No existe un código activo para esta cuenta Google." };

  const now = new Date();
  if (invite.lockedUntil && invite.lockedUntil > now) {
    const minutes = Math.ceil((invite.lockedUntil.getTime() - now.getTime()) / 60000);
    return { ok: false, error: `Demasiados intentos. Intenta nuevamente en ${minutes} min.` };
  }
  if (invite.status === "ACTIVE" && invite.expiresAt <= now) {
    await prisma.manufacturerInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return { ok: false, error: "El código venció. Solicita a Nubel que genere uno nuevo." };
  }

  const candidateHash = hashManufacturerCode(code, customer.email);
  if (!safeCodeMatch(candidateHash, invite.codeHash)) {
    const attempts = invite.failedAttempts + 1;
    await prisma.manufacturerInvite.update({
      where: { id: invite.id },
      data: {
        failedAttempts: attempts >= 5 ? 0 : attempts,
        lockedUntil: attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null,
      },
    });
    return { ok: false, error: attempts >= 5 ? "Se bloqueó el ingreso durante 15 minutos." : `Código incorrecto. Quedan ${5 - attempts} intentos.` };
  }

  let capabilityId: string;
  let activatedNow = false;
  if (invite.status === "ACTIVE") {
    const capability = await prisma.$transaction(async (tx) => {
      const claimed = await tx.manufacturerInvite.updateMany({
        where: { id: invite.id, status: "ACTIVE", usedAt: null, expiresAt: { gt: now } },
        data: { status: "USED", usedAt: now, failedAttempts: 0, lockedUntil: null },
      });
      if (claimed.count !== 1) throw new Error("El código ya no está disponible.");

      const activatedCapability = await tx.accountCapability.upsert({
        where: { accountId_type: { accountId: customer.id, type: CapabilityType.MANUFACTURER } },
        update: { status: CapabilityStatus.ONBOARDING, activatedAt: now, suspendedAt: null },
        create: {
          accountId: customer.id,
          type: CapabilityType.MANUFACTURER,
          status: CapabilityStatus.ONBOARDING,
          activatedAt: now,
        },
      });
      await tx.manufacturerProfile.upsert({
        where: { capabilityId: activatedCapability.id },
        update: {},
        create: {
          capabilityId: activatedCapability.id,
          commercialName: invite.application.commercialName,
          department: invite.application.department,
          city: invite.application.city,
          whatsapp: invite.application.whatsapp,
          deliveryModes: invite.application.deliveryModes,
        },
      });
      return activatedCapability;
    });
    capabilityId = capability.id;
    activatedNow = true;
  } else {
    const capability = await prisma.accountCapability.findUnique({
      where: { accountId_type: { accountId: customer.id, type: CapabilityType.MANUFACTURER } },
      select: { id: true, status: true },
    });
    if (!capability || !["ONBOARDING", "ACTIVE"].includes(capability.status)) {
      return { ok: false, error: "Tu acceso manufacturero no está disponible. Contacta a Nubel." };
    }
    await prisma.manufacturerInvite.update({
      where: { id: invite.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    capabilityId = capability.id;
  }

  await grantManufacturerAreaAccess(customer.id, capabilityId);
  revalidatePath("/cuenta");
  return {
    ok: true,
    data: undefined,
    message: activatedNow
      ? "Acceso activado. Completa tu perfil manufacturero."
      : "Código verificado. Entrando al panel manufacturero.",
  };
}

export async function reviewManufacturerApplication(
  applicationId: string,
  decision: "NEEDS_INFO" | "REJECTED" | "APPROVED",
  adminNotes: string,
): Promise<ActionResult<{ code?: string }>> {
  await requireStoreAdmin();
  const notes = adminNotes.trim();
  if (decision !== "APPROVED" && notes.length < 5) {
    return { ok: false, error: "Incluye una explicación para el solicitante." };
  }

  const application = await prisma.manufacturerApplication.findUnique({
    where: { id: applicationId },
    include: { account: true },
  });
  if (!application || !["PENDING", "NEEDS_INFO", "APPROVED"].includes(application.status)) {
    return { ok: false, error: "La solicitud ya no está disponible para esta acción." };
  }
  const customer = await getCurrentCustomer();
  if (!customer?.isStoreAdmin) return { ok: false, error: "No autorizado." };

  if (decision !== "APPROVED") {
    await prisma.manufacturerApplication.update({
      where: { id: application.id },
      data: {
        status: decision,
        adminNotes: notes,
        reviewedAt: new Date(),
        reviewedByEmail: customer.email,
      },
    });
    revalidatePath("/dashboard/manufactura/solicitudes");
    revalidatePath("/cuenta");
    return { ok: true, data: {} };
  }

  const code = generateManufacturerCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.manufacturerInvite.updateMany({
      where: { accountId: application.accountId, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });
    await tx.manufacturerApplication.update({
      where: { id: application.id },
      data: {
        status: "APPROVED",
        adminNotes: notes || null,
        reviewedAt: new Date(),
        reviewedByEmail: customer.email,
      },
    });
    await tx.manufacturerInvite.create({
      data: {
        applicationId: application.id,
        accountId: application.accountId,
        email: application.account.email.toLowerCase(),
        codeHash: hashManufacturerCode(code, application.account.email),
        expiresAt,
      },
    });
  });
  revalidatePath("/dashboard/manufactura/solicitudes");
  return { ok: true, data: { code }, message: "Código generado. Se mostrará solamente en esta respuesta." };
}

export async function suspendManufacturer(capabilityId: string, suspended: boolean): Promise<ActionResult> {
  await requireStoreAdmin();
  await prisma.accountCapability.update({
    where: { id: capabilityId, type: CapabilityType.MANUFACTURER },
    data: suspended
      ? { status: "SUSPENDED", suspendedAt: new Date() }
      : { status: "ACTIVE", suspendedAt: null },
  });
  updateTag("manufacturing-capacity");
  revalidatePath("/dashboard/manufactura/manufactureros");
  return { ok: true, data: undefined };
}

export async function reviewCustomMachine(machineId: string, approve: boolean): Promise<ActionResult> {
  await requireStoreAdmin();
  const machine = await prisma.manufacturerMachine.findFirst({
    where: { id: machineId, catalogId: null, reviewStatus: "PENDING_REVIEW" },
  });
  if (!machine) return { ok: false, error: "La máquina ya fue revisada o no existe." };
  await prisma.manufacturerMachine.update({
    where: { id: machine.id },
    data: { reviewStatus: approve ? "ACTIVE" : "REJECTED" },
  });
  updateTag("manufacturing-capacity");
  revalidatePath("/dashboard/manufactura/manufactureros");
  revalidatePath("/cuenta/manufactura");
  return { ok: true, data: undefined };
}

export async function saveManufacturerProfile(formData: FormData) {
  const { capability } = await requireManufacturerCapability();
  if (!capability.profile) throw new Error("Perfil manufacturero no encontrado.");
  const commercialName = z.string().trim().min(2).max(120).parse(formData.get("commercialName"));
  const description = z.string().trim().min(30).max(1500).parse(formData.get("description"));
  const department = z.string().trim().min(2).max(80).parse(formData.get("department"));
  const city = z.string().trim().min(2).max(80).parse(formData.get("city"));
  const whatsapp = z.string().trim().min(7).max(30).parse(formData.get("whatsapp"));
  const usualLeadTimeDays = z.coerce.number().int().min(1).max(90).parse(formData.get("usualLeadTimeDays"));
  const deliveryModes = [
    formData.get("localPickup") === "on" ? DeliveryMode.LOCAL_PICKUP : null,
    formData.get("nationalShipping") === "on" ? DeliveryMode.NATIONAL_SHIPPING : null,
  ].filter((value): value is DeliveryMode => value !== null);
  if (deliveryModes.length === 0) throw new Error("Selecciona al menos una modalidad de entrega.");

  const acceptResponsibility = formData.get("acceptResponsibility") === "on";
  await prisma.manufacturerProfile.update({
    where: { id: capability.profile.id },
    data: {
      commercialName,
      description,
      department,
      city,
      whatsapp,
      usualLeadTimeDays,
      deliveryModes,
      responsibilityAcceptedAt: acceptResponsibility
        ? capability.profile.responsibilityAcceptedAt ?? new Date()
        : capability.profile.responsibilityAcceptedAt,
    },
  });
  revalidatePath("/cuenta/manufactura");
}

export async function prepareManufacturerLogoUpload(
  rawFile: unknown,
): Promise<ActionResult<{ path: string; token: string }>> {
  const { customer, capability } = await requireManufacturerCapability();
  if (!capability.profile) return { ok: false, error: "Perfil no encontrado." };
  const fileResult = z.object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().positive().max(2 * 1024 * 1024),
  }).safeParse(rawFile);
  if (!fileResult.success) return { ok: false, error: "Usa JPG, PNG o WebP de hasta 2 MB." };
  const extension = fileResult.data.mimeType === "image/png" ? "png" : fileResult.data.mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${customer.id}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await createSupabaseAdminClient().storage.from("manufacturer-logos").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la carga del logo." };
  return { ok: true, data: { path, token: data.token } };
}

export async function finalizeManufacturerLogo(path: string): Promise<ActionResult<{ publicUrl: string }>> {
  const { customer, capability } = await requireManufacturerCapability();
  if (!capability.profile || !path.startsWith(`${customer.id}/`) || path.includes("..")) {
    return { ok: false, error: "Ruta de logo inválida." };
  }
  const storage = createSupabaseAdminClient().storage.from("manufacturer-logos");
  const folder = path.slice(0, path.lastIndexOf("/"));
  const filename = path.slice(path.lastIndexOf("/") + 1);
  const { data, error } = await storage.list(folder, { search: filename, limit: 1 });
  if (error || !data?.some((item) => item.name === filename)) return { ok: false, error: "El logo no terminó de subir." };
  const { data: publicData } = storage.getPublicUrl(path);
  await prisma.manufacturerProfile.update({ where: { id: capability.profile.id }, data: { logoUrl: publicData.publicUrl } });
  updateTag("manufacturing-capacity");
  revalidatePath("/cuenta/manufactura");
  return { ok: true, data: { publicUrl: publicData.publicUrl } };
}

export async function addManufacturerMachine(formData: FormData) {
  const { capability } = await requireManufacturerCapability();
  if (!capability.profile) throw new Error("Perfil manufacturero no encontrado.");
  const catalogId = z.string().trim().optional().parse(formData.get("catalogId") || undefined);
  const catalog = catalogId
    ? await prisma.printerCatalog.findFirst({ where: { id: catalogId, isActive: true } })
    : null;
  const technology = catalog?.technology ?? z.enum(ManufacturingTechnology).parse(formData.get("technology"));
  const customBrand = catalog ? null : z.string().trim().min(2).max(80).parse(formData.get("customBrand"));
  const customModel = catalog ? null : z.string().trim().min(2).max(100).parse(formData.get("customModel"));
  const width = catalog?.buildWidthMm ?? decimal(z.coerce.number().positive().max(2000).parse(formData.get("buildWidthMm")));
  const depth = catalog?.buildDepthMm ?? decimal(z.coerce.number().positive().max(2000).parse(formData.get("buildDepthMm")));
  const height = catalog?.buildHeightMm ?? decimal(z.coerce.number().positive().max(3000).parse(formData.get("buildHeightMm")));

  await prisma.manufacturerMachine.create({
    data: {
      manufacturerId: capability.profile.id,
      catalogId: catalog?.id,
      customBrand,
      customModel,
      technology,
      buildWidthMm: width,
      buildDepthMm: depth,
      buildHeightMm: height,
      quantity: z.coerce.number().int().min(1).max(100).parse(formData.get("quantity")),
      reviewStatus: catalog ? MachineReviewStatus.ACTIVE : MachineReviewStatus.PENDING_REVIEW,
      purchasePriceBob: decimal(z.coerce.number().min(0).parse(formData.get("purchasePriceBob"))),
      residualValueBob: decimal(z.coerce.number().min(0).parse(formData.get("residualValueBob"))),
      usefulLifeHours: decimal(z.coerce.number().positive().parse(formData.get("usefulLifeHours"))),
      powerWatts: decimal(z.coerce.number().min(0).parse(formData.get("powerWatts"))),
      maintenanceBobPerHour: decimal(z.coerce.number().min(0).parse(formData.get("maintenanceBobPerHour"))),
      qualityProfiles: {
        create: [
          { quality: ManufacturingQuality.FAST, layerHeightMm: technology === "FDM" ? 0.28 : 0.1, throughputCm3PerHour: technology === "FDM" ? 12 : null, secondsPerLayer: technology === "RESIN" ? 7 : null },
          { quality: ManufacturingQuality.BALANCED, layerHeightMm: technology === "FDM" ? 0.2 : 0.05, throughputCm3PerHour: technology === "FDM" ? 8 : null, secondsPerLayer: technology === "RESIN" ? 8 : null },
          { quality: ManufacturingQuality.DETAIL, layerHeightMm: technology === "FDM" ? 0.12 : 0.03, throughputCm3PerHour: technology === "FDM" ? 5 : null, secondsPerLayer: technology === "RESIN" ? 10 : null },
        ],
      },
    },
  });
  updateTag("manufacturing-capacity");
  revalidatePath("/cuenta/manufactura");
}

export async function saveMachineQualityProfile(formData: FormData) {
  const { capability } = await requireManufacturerCapability();
  if (!capability.profile) throw new Error("Perfil no encontrado.");
  const machineId = z.string().min(1).parse(formData.get("machineId"));
  const quality = z.enum(ManufacturingQuality).parse(formData.get("quality"));
  const machine = await prisma.manufacturerMachine.findFirst({
    where: { id: machineId, manufacturerId: capability.profile.id },
  });
  if (!machine) throw new Error("Máquina no encontrada.");
  const layerHeightMm = decimal(z.coerce.number().positive().max(2).parse(formData.get("layerHeightMm")));
  const throughputCm3PerHour = machine.technology === "FDM"
    ? decimal(z.coerce.number().positive().max(1000).parse(formData.get("performance")))
    : null;
  const secondsPerLayer = machine.technology === "RESIN"
    ? decimal(z.coerce.number().positive().max(600).parse(formData.get("performance")))
    : null;
  await prisma.machineQualityProfile.upsert({
    where: { machineId_quality: { machineId, quality } },
    update: { layerHeightMm, throughputCm3PerHour, secondsPerLayer },
    create: { machineId, quality, layerHeightMm, throughputCm3PerHour, secondsPerLayer },
  });
  revalidatePath("/cuenta/manufactura");
}

export async function addMaterialVariant(formData: FormData) {
  const { capability } = await requireManufacturerCapability();
  if (!capability.profile) throw new Error("Perfil manufacturero no encontrado.");
  const materialId = z.string().min(1).parse(formData.get("materialId"));
  const material = await prisma.materialCatalog.findFirst({ where: { id: materialId, isActive: true } });
  if (!material) throw new Error("Material inválido.");
  const available = z.coerce.number().min(0).parse(formData.get("availableQuantity"));
  const variant = await prisma.manufacturerMaterialVariant.create({
    data: {
      manufacturerId: capability.profile.id,
      materialId,
      colorName: z.string().trim().min(2).max(60).parse(formData.get("colorName")),
      colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().parse(formData.get("colorHex") || undefined),
      unit: material.technology === "FDM" ? InventoryUnit.GRAM : InventoryUnit.MILLILITER,
      costPerBaseUnitBob: decimal(z.coerce.number().positive().parse(formData.get("costPerBaseUnitBob"))),
      densityGcm3: material.technology === "FDM"
        ? decimal(z.coerce.number().positive().max(5).parse(formData.get("densityGcm3")))
        : null,
      wastePercent: decimal(z.coerce.number().min(0).max(100).parse(formData.get("wastePercent"))),
      availableQuantity: decimal(available),
    },
  });
  if (available > 0) {
    await prisma.materialInventoryMovement.create({
      data: {
        variantId: variant.id,
        type: InventoryMovementType.IN,
        quantity: decimal(available),
        previousAvailable: 0,
        newAvailable: decimal(available),
        previousReserved: 0,
        newReserved: 0,
        notes: "Inventario inicial",
      },
    });
  }
  updateTag("manufacturing-capacity");
  revalidatePath("/cuenta/manufactura");
}

export async function adjustMaterialInventory(variantId: string, deltaInput: number, notesInput: string): Promise<ActionResult> {
  const { capability } = await requireManufacturerCapability();
  if (!capability.profile) return { ok: false, error: "Perfil no encontrado." };
  const delta = z.number().finite().refine((value) => value !== 0).parse(deltaInput);
  const notes = z.string().trim().min(3).max(300).parse(notesInput);

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.manufacturerMaterialVariant.findFirst({
        where: { id: variantId, manufacturerId: capability.profile!.id },
      });
      if (!before) throw new Error("Variante no encontrada.");
      const updated = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        UPDATE "ManufacturerMaterialVariant"
        SET "availableQuantity" = "availableQuantity" + ${decimal(delta)},
            "updatedAt" = NOW()
        WHERE "id" = ${variantId}
          AND "manufacturerId" = ${capability.profile!.id}
          AND ("availableQuantity" + ${decimal(delta)}) >= "reservedQuantity"
        RETURNING "id"
      `);
      if (updated.length !== 1) throw new Error("El ajuste dejaría inventario disponible por debajo de lo reservado.");
      const after = await tx.manufacturerMaterialVariant.findUniqueOrThrow({ where: { id: variantId } });
      await tx.materialInventoryMovement.create({
        data: {
          variantId,
          type: InventoryMovementType.ADJUSTMENT,
          quantity: decimal(Math.abs(delta)),
          previousAvailable: before.availableQuantity,
          newAvailable: after.availableQuantity,
          previousReserved: before.reservedQuantity,
          newReserved: after.reservedQuantity,
          notes,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo ajustar el inventario." };
  }
  updateTag("manufacturing-capacity");
  revalidatePath("/cuenta/manufactura");
  return { ok: true, data: undefined };
}

export async function savePricingProfile(formData: FormData) {
  const { capability } = await requireManufacturerCapability();
  if (!capability.profile) throw new Error("Perfil no encontrado.");
  const technology = z.enum(ManufacturingTechnology).parse(formData.get("technology"));
  const number = (name: string, max = 1_000_000) =>
    decimal(z.coerce.number().min(0).max(max).parse(formData.get(name)));
  await prisma.manufacturerPricingProfile.upsert({
    where: { manufacturerId_technology: { manufacturerId: capability.profile.id, technology } },
    update: {
      electricityBobKwh: number("electricityBobKwh"),
      laborBobPerHour: number("laborBobPerHour"),
      setupMinutes: z.coerce.number().int().min(0).max(1440).parse(formData.get("setupMinutes")),
      postprocessMinutes: z.coerce.number().int().min(0).max(1440).parse(formData.get("postprocessMinutes")),
      consumablesBob: number("consumablesBob"),
      failureRiskPercent: number("failureRiskPercent", 100),
      marginPercent: number("marginPercent", 500),
      minimumChargeBob: number("minimumChargeBob"),
    },
    create: {
      manufacturerId: capability.profile.id,
      technology,
      electricityBobKwh: number("electricityBobKwh"),
      laborBobPerHour: number("laborBobPerHour"),
      setupMinutes: z.coerce.number().int().min(0).max(1440).parse(formData.get("setupMinutes")),
      postprocessMinutes: z.coerce.number().int().min(0).max(1440).parse(formData.get("postprocessMinutes")),
      consumablesBob: number("consumablesBob"),
      failureRiskPercent: number("failureRiskPercent", 100),
      marginPercent: number("marginPercent", 500),
      minimumChargeBob: number("minimumChargeBob"),
    },
  });
  revalidatePath("/cuenta/manufactura");
}

export async function publishManufacturerProfile(): Promise<ActionResult> {
  const { capability } = await requireManufacturerCapability();
  if (!capability.profile) return { ok: false, error: "Perfil no encontrado." };
  const profile = await prisma.manufacturerProfile.findUnique({
    where: { id: capability.profile.id },
    include: {
      machines: { where: { reviewStatus: "ACTIVE" } },
      materialVariants: { where: { isActive: true } },
      pricingProfiles: true,
    },
  });
  if (!profile?.responsibilityAcceptedAt || !profile.description || profile.machines.length === 0 || profile.materialVariants.length === 0 || profile.pricingProfiles.length === 0) {
    return { ok: false, error: "Completa perfil, declaración, máquina, material e información de costos antes de publicar." };
  }
  await prisma.$transaction([
    prisma.manufacturerProfile.update({ where: { id: profile.id }, data: { isPublic: true } }),
    prisma.accountCapability.update({ where: { id: capability.id }, data: { status: "ACTIVE" } }),
  ]);
  updateTag("manufacturing-capacity");
  revalidatePath("/cuenta");
  revalidatePath("/cuenta/manufactura");
  return { ok: true, data: undefined, message: "Perfil manufacturero publicado." };
}

const quoteModelSchema = z.object({
  name: z.string().trim().min(1).max(180).refine(
    (name) => [".stl", ".obj", ".step", ".stp", ".3mf"].some((extension) => name.toLowerCase().endsWith(extension)),
    "Formato de modelo no permitido.",
  ),
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024),
  position: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }),
  rotation: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }),
  scale: z.object({ x: z.number().positive(), y: z.number().positive(), z: z.number().positive() }),
  copies: z.number().int().min(1).max(12),
  solidVolumeCm3: z.number().positive(),
  envelopeVolumeCm3: z.number().positive(),
  widthMm: z.number().positive(),
  depthMm: z.number().positive(),
  heightMm: z.number().positive(),
});

const quoteSchema = z.object({
  technology: z.enum(ManufacturingTechnology),
  materialName: z.string().trim().min(2).max(80),
  colorName: z.string().trim().min(2).max(60),
  quality: z.enum(ManufacturingQuality),
  infillPercent: z.number().min(0).max(100).optional(),
  copies: z.number().int().min(1).max(60),
  workspaceWidthMm: z.number().positive().max(2000),
  workspaceDepthMm: z.number().positive().max(2000),
  workspaceHeightMm: z.number().positive().max(3000),
  deliveryMode: z.enum(DeliveryMode),
  destinationCity: z.string().trim().min(2).max(80),
  configuration: z.record(z.string(), z.unknown()),
});

export async function startManufacturingQuote(
  rawQuote: unknown,
  rawModels: unknown,
): Promise<ActionResult<{ quoteId: string; uploads: Array<{ path: string; token: string }> } & { authRequired?: false }>> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "AUTH_REQUIRED" };
  const quoteResult = quoteSchema.safeParse(rawQuote);
  const modelsResult = z.array(quoteModelSchema).min(1).max(5).safeParse(rawModels);
  if (!quoteResult.success || !modelsResult.success) {
    return { ok: false, error: "La configuración o las métricas de los modelos no son válidas." };
  }
  const quoteStorage = createSupabaseAdminClient().storage.from("manufacturing-quotes");
  const { data: bucket } = await createSupabaseAdminClient().storage.getBucket("manufacturing-quotes");
  const activeStorageLimit = bucket?.file_size_limit ?? 100 * 1024 * 1024;
  if (modelsResult.data.some((model) => model.sizeBytes > activeStorageLimit)) {
    return {
      ok: false,
      error: `El proyecto Supabase admite actualmente ${(activeStorageLimit / 1024 / 1024).toFixed(0)} MB por archivo. Sube su límite a 100 MB para enviar este modelo.`,
    };
  }

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const quoteData = quoteResult.data;
  const quote = await prisma.manufacturingQuote.create({
    data: {
      customerId: customer.id,
      technology: quoteData.technology,
      materialName: quoteData.materialName,
      colorName: quoteData.colorName,
      quality: quoteData.quality,
      infillPercent: quoteData.infillPercent,
      copies: quoteData.copies,
      workspaceWidthMm: quoteData.workspaceWidthMm,
      workspaceDepthMm: quoteData.workspaceDepthMm,
      workspaceHeightMm: quoteData.workspaceHeightMm,
      deliveryMode: quoteData.deliveryMode,
      destinationCity: quoteData.destinationCity,
      configuration: quoteData.configuration as Prisma.InputJsonValue,
      status: "DRAFT",
      expiresAt,
    },
  });

  try {
    const uploads: Array<{ path: string; token: string }> = [];
    for (const model of modelsResult.data) {
      const extension = model.name.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${customer.id}/${quote.id}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await quoteStorage.createSignedUploadUrl(path);
      if (error || !data) throw new Error(error?.message ?? "No se pudo preparar el archivo.");
      uploads.push({ path, token: data.token });
      await prisma.manufacturingQuoteModel.create({
        data: {
          quoteId: quote.id,
          storagePath: path,
          originalName: model.name,
          mimeType: model.mimeType || "application/octet-stream",
          sizeBytes: model.sizeBytes,
          position: model.position,
          rotation: model.rotation,
          scale: model.scale,
          copies: model.copies,
          solidVolumeCm3: decimal(model.solidVolumeCm3),
          envelopeVolumeCm3: decimal(model.envelopeVolumeCm3),
          widthMm: decimal(model.widthMm),
          depthMm: decimal(model.depthMm),
          heightMm: decimal(model.heightMm),
        },
      });
    }
    return { ok: true, data: { quoteId: quote.id, uploads } };
  } catch (error) {
    await prisma.manufacturingQuote.delete({ where: { id: quote.id } }).catch(() => undefined);
    console.error("Quote upload preparation failed", error);
    return { ok: false, error: "No pudimos preparar la carga privada de los modelos." };
  }
}

export async function finalizeManufacturingQuote(quoteId: string): Promise<ActionResult<{ offerCount: number; quoteId: string }>> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Tu sesión terminó. Los archivos siguen en tu navegador; vuelve a ingresar." };
  const quote = await prisma.manufacturingQuote.findFirst({
    where: { id: quoteId, customerId: customer.id, status: "DRAFT" },
    include: { models: true },
  });
  if (!quote) return { ok: false, error: "La cotización no existe o ya fue procesada." };

  const storage = createSupabaseAdminClient().storage.from("manufacturing-quotes");
  for (const model of quote.models) {
    const folder = model.storagePath.slice(0, model.storagePath.lastIndexOf("/"));
    const filename = model.storagePath.slice(model.storagePath.lastIndexOf("/") + 1);
    const { data, error } = await storage.list(folder, { search: filename, limit: 1 });
    if (error || !data?.some((item) => item.name === filename)) {
      return { ok: false, error: `El modelo “${model.originalName}” no terminó de subir.` };
    }
  }

  const manufacturers = await prisma.manufacturerProfile.findMany({
    where: {
      isPublic: true,
      capability: { type: "MANUFACTURER", status: "ACTIVE" },
      deliveryModes: { has: quote.deliveryMode },
    },
    include: {
      machines: {
        where: {
          technology: quote.technology,
          reviewStatus: "ACTIVE",
          buildWidthMm: { gte: quote.workspaceWidthMm },
          buildDepthMm: { gte: quote.workspaceDepthMm },
          buildHeightMm: { gte: quote.workspaceHeightMm },
        },
        include: { qualityProfiles: true },
      },
      materialVariants: {
        where: {
          isActive: true,
          material: { technology: quote.technology, name: { equals: quote.materialName, mode: "insensitive" } },
        },
        include: { material: true },
      },
      pricingProfiles: { where: { technology: quote.technology } },
    },
  });

  const solidVolume = quote.models.reduce((sum, model) => sum + Number(model.solidVolumeCm3) * model.copies, 0);
  const envelopeVolume = quote.models.reduce((sum, model) => sum + Number(model.envelopeVolumeCm3) * model.copies, 0);
  const maxHeight = Math.max(...quote.models.map((model) => Number(model.heightMm)));
  const offers: Prisma.ManufacturingOfferCreateManyInput[] = [];

  for (const manufacturer of manufacturers) {
    const pricing = manufacturer.pricingProfiles[0];
    if (!pricing) continue;
    let cheapest: Prisma.ManufacturingOfferCreateManyInput | null = null;
    for (const machine of manufacturer.machines) {
      const quality = machine.qualityProfiles.find((profile) => profile.quality === quote.quality);
      if (!quality) continue;
      for (const variant of manufacturer.materialVariants) {
        if (quote.colorName && variant.colorName.toLowerCase() !== quote.colorName.toLowerCase()) continue;
        const estimate = calculateManufacturingEstimate({
          technology: quote.technology,
          solidVolumeCm3: solidVolume,
          envelopeVolumeCm3: envelopeVolume,
          maxHeightMm: maxHeight,
          copies: quote.copies,
          infillPercent: Number(quote.infillPercent ?? 20),
          densityGcm3: Number(variant.densityGcm3 ?? variant.material.defaultDensityGcm3 ?? 1),
          wastePercent: Number(variant.wastePercent),
          materialCostPerBaseUnitBob: Number(variant.costPerBaseUnitBob),
          powerWatts: Number(machine.powerWatts),
          purchasePriceBob: Number(machine.purchasePriceBob),
          residualValueBob: Number(machine.residualValueBob),
          usefulLifeHours: Number(machine.usefulLifeHours),
          maintenanceBobPerHour: Number(machine.maintenanceBobPerHour),
          electricityBobKwh: Number(pricing.electricityBobKwh),
          laborBobPerHour: Number(pricing.laborBobPerHour),
          setupMinutes: pricing.setupMinutes,
          postprocessMinutes: pricing.postprocessMinutes,
          consumablesBob: Number(pricing.consumablesBob),
          failureRiskPercent: Number(pricing.failureRiskPercent),
          marginPercent: Number(pricing.marginPercent),
          minimumChargeBob: Number(pricing.minimumChargeBob),
          throughputCm3PerHour: Number(quality.throughputCm3PerHour ?? 8),
          layerHeightMm: Number(quality.layerHeightMm),
          secondsPerLayer: Number(quality.secondsPerLayer ?? 8),
          resinSupportPercent: Number((quote.configuration as Record<string, unknown>).resinSupportPercent ?? 12),
          hollowPercent: Number((quote.configuration as Record<string, unknown>).hollowPercent ?? 0),
        });
        const usableStock = Number(variant.availableQuantity) - Number(variant.reservedQuantity);
        if (usableStock < estimate.materialQuantity) continue;
        const candidate: Prisma.ManufacturingOfferCreateManyInput = {
          quoteId: quote.id,
          manufacturerId: manufacturer.id,
          machineId: machine.id,
          materialVariantId: variant.id,
          estimatedMaterialQty: decimal(estimate.materialQuantity),
          estimatedHours: decimal(estimate.printHours),
          totalBob: decimal(estimate.totalBob),
          costBreakdown: estimate.breakdown,
          leadTimeDays: manufacturer.usualLeadTimeDays,
          validUntil: quote.expiresAt,
        };
        if (!cheapest || Number(candidate.totalBob) < Number(cheapest.totalBob)) cheapest = candidate;
      }
    }
    if (cheapest) offers.push(cheapest);
  }

  await prisma.$transaction([
    prisma.manufacturingOffer.createMany({ data: offers, skipDuplicates: true }),
    prisma.manufacturingQuote.update({
      where: { id: quote.id },
      data: { status: offers.length ? "OPEN" : "QUOTING" },
    }),
  ]);
  revalidatePath("/cuenta");
  return { ok: true, data: { quoteId: quote.id, offerCount: offers.length }, message: offers.length ? "Cotizaciones calculadas." : "Guardamos la solicitud, pero aún no hay manufactureros compatibles." };
}

export async function selectManufacturingOffer(offerId: string): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Inicia sesión para seleccionar una oferta." };
  try {
    await prisma.$transaction(async (tx) => {
      const offer = await tx.manufacturingOffer.findFirst({
        where: { id: offerId, quote: { customerId: customer.id, status: "OPEN" }, status: "ESTIMATED", validUntil: { gt: new Date() } },
        include: { quote: true, materialVariant: true },
      });
      if (!offer) throw new Error("La oferta venció o ya fue seleccionada.");
      const quantity = offer.estimatedMaterialQty;
      const reserved = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        UPDATE "ManufacturerMaterialVariant"
        SET "reservedQuantity" = "reservedQuantity" + ${quantity},
            "updatedAt" = NOW()
        WHERE "id" = ${offer.materialVariantId}
          AND ("availableQuantity" - "reservedQuantity") >= ${quantity}
        RETURNING "id"
      `);
      if (reserved.length !== 1) throw new Error("El material dejó de estar disponible. Solicita una nueva estimación.");
      const after = await tx.manufacturerMaterialVariant.findUniqueOrThrow({ where: { id: offer.materialVariantId } });
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await tx.inventoryReservation.create({ data: { offerId: offer.id, variantId: offer.materialVariantId, quantity, expiresAt } });
      await tx.materialInventoryMovement.create({
        data: {
          variantId: offer.materialVariantId,
          type: "RESERVE",
          quantity,
          previousAvailable: offer.materialVariant.availableQuantity,
          newAvailable: after.availableQuantity,
          previousReserved: offer.materialVariant.reservedQuantity,
          newReserved: after.reservedQuantity,
          referenceType: "MANUFACTURING_OFFER",
          referenceId: offer.id,
        },
      });
      await tx.manufacturingOffer.update({ where: { id: offer.id }, data: { status: "SELECTED", selectedAt: new Date() } });
      await tx.manufacturingQuote.update({ where: { id: offer.quoteId }, data: { status: "SELECTED", selectedOfferId: offer.id } });
      await tx.manufacturingOffer.updateMany({ where: { quoteId: offer.quoteId, id: { not: offer.id } }, data: { status: "DECLINED" } });
      await tx.manufacturingOrder.create({
        data: { offerId: offer.id, agreedTotalBob: offer.totalBob, agreedLeadTimeDays: offer.leadTimeDays },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo reservar el material." };
  }
  revalidatePath("/cuenta");
  revalidatePath("/cuenta/manufactura");
  return { ok: true, data: undefined, message: "Oferta seleccionada y material reservado por 24 horas." };
}

export async function respondToSelectedOffer(
  offerId: string,
  response: "CONFIRM" | "REVISE",
  newTotalInput?: number,
  newLeadTimeInput?: number,
  reasonInput?: string,
): Promise<ActionResult> {
  const { capability } = await requireManufacturerCapability(["ACTIVE"]);
  if (!capability.profile) return { ok: false, error: "Perfil no encontrado." };
  const offer = await prisma.manufacturingOffer.findFirst({
    where: { id: offerId, manufacturerId: capability.profile.id, status: "SELECTED" },
    include: { order: true },
  });
  if (!offer?.order) return { ok: false, error: "La oferta ya no espera una respuesta." };

  if (response === "CONFIRM") {
    await prisma.$transaction([
      prisma.manufacturingOffer.update({ where: { id: offer.id }, data: { status: "CONFIRMED", confirmedAt: new Date() } }),
      prisma.manufacturingOrder.update({
        where: { offerId: offer.id },
        data: { status: "AGREED", providerAcceptedAt: new Date(), agreedTotalBob: offer.totalBob, agreedLeadTimeDays: offer.leadTimeDays },
      }),
    ]);
  } else {
    const total = z.number().positive().max(1_000_000).parse(newTotalInput);
    const leadTime = z.number().int().min(1).max(180).parse(newLeadTimeInput);
    const reason = z.string().trim().min(10).max(800).parse(reasonInput);
    await prisma.$transaction([
      prisma.manufacturingOffer.update({
        where: { id: offer.id },
        data: { status: "REVISED", totalBob: decimal(total), leadTimeDays: leadTime, revisionReason: reason },
      }),
      prisma.manufacturingOrder.update({
        where: { offerId: offer.id },
        data: { status: "AWAITING_CUSTOMER", agreedTotalBob: decimal(total), agreedLeadTimeDays: leadTime, revisionReason: reason },
      }),
    ]);
  }
  revalidatePath("/cuenta/manufactura");
  revalidatePath(`/cuenta/cotizaciones/${offer.quoteId}`);
  return { ok: true, data: undefined, message: response === "CONFIRM" ? "Trabajo confirmado." : "Cambio enviado al cliente para nueva aceptación." };
}

export async function acceptRevisedManufacturingOffer(offerId: string): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Inicia sesión nuevamente." };
  const offer = await prisma.manufacturingOffer.findFirst({
    where: { id: offerId, status: "REVISED", quote: { customerId: customer.id, status: "SELECTED" } },
    include: { order: true },
  });
  if (!offer?.order) return { ok: false, error: "La revisión ya no está disponible." };
  await prisma.$transaction([
    prisma.manufacturingOffer.update({ where: { id: offer.id }, data: { status: "ACCEPTED", confirmedAt: new Date() } }),
    prisma.manufacturingOrder.update({
      where: { offerId: offer.id },
      data: { status: "AGREED", customerAcceptedAt: new Date(), agreedTotalBob: offer.totalBob, agreedLeadTimeDays: offer.leadTimeDays },
    }),
  ]);
  revalidatePath(`/cuenta/cotizaciones/${offer.quoteId}`);
  revalidatePath("/cuenta/manufactura");
  return { ok: true, data: undefined, message: "Nuevo precio y plazo aceptados." };
}
