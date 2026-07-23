import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_SERIALIZATION_RETRIES = 3;

export async function runSerializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

      if (!isSerializationConflict || attempt === MAX_SERIALIZATION_RETRIES - 1) {
        throw error;
      }
    }
  }

  throw new Error("Inventory transaction could not be completed.");
}
