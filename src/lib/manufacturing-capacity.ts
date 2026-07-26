import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type PublicManufacturingBed = {
  technology: "fdm" | "resin";
  label: string;
  x: number;
  y: number;
  z: number;
  providerCount: number;
};

export const getPublicManufacturingCapacity = unstable_cache(
  async (): Promise<PublicManufacturingBed[]> => {
    const profiles = await prisma.manufacturerProfile.findMany({
      where: { isPublic: true, capability: { type: "MANUFACTURER", status: "ACTIVE" } },
      select: {
        id: true,
        machines: {
          where: { reviewStatus: "ACTIVE" },
          select: { technology: true, buildWidthMm: true, buildDepthMm: true, buildHeightMm: true },
        },
      },
    });
    const grouped = new Map<string, { technology: "fdm" | "resin"; x: number; y: number; z: number; providers: Set<string> }>();
    for (const profile of profiles) {
      for (const machine of profile.machines) {
        const technology = machine.technology === "FDM" ? "fdm" : "resin";
        const x = Number(machine.buildWidthMm);
        const y = Number(machine.buildDepthMm);
        const z = Number(machine.buildHeightMm);
        const key = `${technology}:${x}:${y}:${z}`;
        const item = grouped.get(key) ?? { technology, x, y, z, providers: new Set<string>() };
        item.providers.add(profile.id);
        grouped.set(key, item);
      }
    }
    return Array.from(grouped.values())
      .map((item) => ({
        technology: item.technology,
        x: item.x,
        y: item.y,
        z: item.z,
        providerCount: item.providers.size,
        label: `${item.x} × ${item.y} × ${item.z} mm · ${item.providers.size} proveedor${item.providers.size === 1 ? "" : "es"}`,
      }))
      .sort((a, b) => a.technology.localeCompare(b.technology) || a.x * a.y * a.z - b.x * b.y * b.z);
  },
  ["manufacturing-capacity"],
  { revalidate: 120, tags: ["manufacturing-capacity"] },
);

