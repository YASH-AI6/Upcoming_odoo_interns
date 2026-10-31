import { Prisma, PrismaClient } from "@prisma/client";

export const getNextSequenceNumber = async (
  tx: PrismaClient | Prisma.TransactionClient,
  prefix: "SUB" | "INV",
  padLength = 4
): Promise<string> => {
  const tracker = await tx.sequenceTracker.upsert({
    where: { prefix },
    update: { currentValue: { increment: 1 } },
    create: { id: prefix, prefix, currentValue: 1 }
  });

  const paddedNum = String(tracker.currentValue).padStart(padLength, "0");
  return `${prefix}-${paddedNum}`;
};
