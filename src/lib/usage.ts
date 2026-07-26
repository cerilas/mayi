import { prisma } from "./prisma";

export interface UsageStatus {
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
  isExceeded: boolean;
}

/** Returns a safe Date object — falls back to `now` if the input is invalid/null. */
function safeDate(value: Date | string | null | undefined): Date {
  if (!value) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

/** Returns the next weekly reset date starting from `base`, guaranteed to be in the future. */
function nextWeeklyReset(base: Date): Date {
  const now = new Date();
  const next = new Date(base.getTime());

  // If base is invalid or in the far past, start fresh from now
  if (isNaN(next.getTime()) || next.getTime() < now.getTime() - 365 * 24 * 60 * 60 * 1000) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  // Advance by 7-day increments until we are in the future
  while (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 7);
  }

  return next;
}

/**
 * Checks a user's usage, automatically resetting it if the weekly cycle has passed.
 * Returns the up-to-date usage status.
 */
export async function checkAndUpdateUsage(userId: string): Promise<UsageStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      usageLimit: true,
      usageUsed: true,
      usageResetAt: true,
    },
  });

  if (!user) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  const isAdmin = user.role === "admin";
  const limit = isAdmin ? Infinity : (user.usageLimit ?? 15);
  const used = user.usageUsed ?? 0;
  const resetAt = safeDate(user.usageResetAt);
  const now = new Date();

  if (isAdmin) {
    return {
      limit: Infinity,
      used,
      remaining: Infinity,
      resetAt,
      isExceeded: false,
    };
  }

  // If we are past the reset date, reset usage and schedule next reset
  if (now >= resetAt) {
    const newResetAt = nextWeeklyReset(resetAt);

    // Final safety check — should never be needed but protects against edge cases
    if (isNaN(newResetAt.getTime())) {
      throw new Error("Sıfırlama tarihi hesaplanamadı. Lütfen tekrar deneyin.");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        usageUsed: 0,
        usageResetAt: newResetAt,
      },
      select: {
        usageLimit: true,
        usageUsed: true,
        usageResetAt: true,
      },
    });

    const updatedLimit = updatedUser.usageLimit ?? 15;
    const updatedUsed = updatedUser.usageUsed ?? 0;
    const updatedResetAt = safeDate(updatedUser.usageResetAt);

    return {
      limit: updatedLimit,
      used: updatedUsed,
      remaining: Math.max(0, updatedLimit - updatedUsed),
      resetAt: updatedResetAt,
      isExceeded: updatedUsed >= updatedLimit,
    };
  }

  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt,
    isExceeded: used >= limit,
  };
}

/**
 * Increments the used usage count for a user by 1.
 */
export async function incrementUsage(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      usageUsed: {
        increment: 1,
      },
    },
  });
}
