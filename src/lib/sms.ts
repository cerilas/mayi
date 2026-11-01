import { prisma } from "@/lib/prisma";

export const NETGSM_USERCODE = process.env.NETGSM_USERCODE?.trim() || "3423411000";
export const NETGSM_PASSWORD = process.env.NETGSM_PASSWORD?.trim() || "Dnz.24232423";

/** Normalizes Turkish mobile numbers to the 10-digit 5xxxxxxxxx form; returns null if invalid. */
export function toLocalMobile(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits.length === 10 && digits.startsWith("5") ? digits : null;
}

export type SmsResult = {
  ok: boolean;
  provider: "netgsm" | "none";
  header?: string;
  jobId?: string;
  code?: string;
  description?: string;
  detail?: string;
  sentCount?: number;
};

/**
 * Resolves the active NetGSM sender header selected in Settings (`netgsm_active_header`),
 * reading from the primary admin record (matching `/api/settings`) first.
 */
export async function getActiveNetgsmHeader(): Promise<string> {
  const primaryAdmin = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (primaryAdmin) {
    const primarySetting = await prisma.setting.findUnique({
      where: {
        userId_key: {
          userId: primaryAdmin.id,
          key: "netgsm_active_header",
        },
      },
    });
    if (primarySetting?.value?.trim()) {
      return primarySetting.value.trim();
    }
  }

  const latestSetting = await prisma.setting.findFirst({
    where: { key: "netgsm_active_header" },
    orderBy: { updatedAt: "desc" },
  });
  if (latestSetting?.value?.trim()) {
    return latestSetting.value.trim();
  }

  return process.env.NETGSM_HEADER?.trim() || "MAHMUTYUCEL";
}

/** Sends SMS directly via NetGSM REST v2 using the active header selected in Settings. */
export async function sendSms(phones: string[], message: string): Promise<SmsResult> {
  const numbers = [...new Set(phones.map(toLocalMobile).filter((n): n is string => n !== null))];
  if (!numbers.length) {
    return { ok: false, provider: "none", detail: "no_valid_numbers", sentCount: 0 };
  }

  const activeHeader = await getActiveNetgsmHeader();
  const basicAuth = Buffer.from(`${NETGSM_USERCODE}:${NETGSM_PASSWORD}`).toString("base64");

  const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify({
      msgheader: activeHeader,
      messages: numbers.map((no) => ({ msg: message, no })),
      encoding: "TR",
      iysfilter: "0",
      appname: "MYFizyo",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const data = await res.json().catch(() => null);
  const ok = data?.code === "00";

  return {
    ok,
    provider: "netgsm",
    header: activeHeader,
    jobId: data?.jobid,
    code: data?.code,
    description: data?.description,
    detail: data?.code
      ? `${data.code}${data?.description ? ` - ${data.description}` : ""}`
      : `http_${res.status}`,
    sentCount: ok ? numbers.length : 0,
  };
}
