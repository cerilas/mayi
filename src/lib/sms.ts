import { prisma } from "@/lib/prisma";

const NETGSM_USERCODE = process.env.NETGSM_USERCODE || "3423411000";
const NETGSM_PASSWORD = process.env.NETGSM_PASSWORD || "Dnz.24232423";

/** Normalizes Turkish mobile numbers to NetGSM's 10-digit 5xxxxxxxxx form; returns null if invalid. */
export function toNetgsmNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 && digits.startsWith("5") ? digits : null;
}

export async function sendNetgsmSms(phones: string[], message: string): Promise<{ ok: boolean; code?: string }> {
  const numbers = [...new Set(phones.map(toNetgsmNumber).filter((n): n is string => n !== null))];
  if (!numbers.length) return { ok: false, code: "no_valid_numbers" };

  const headerSetting = await prisma.setting.findFirst({
    where: { key: "netgsm_active_header" },
    orderBy: { updatedAt: "desc" },
  });

  const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${NETGSM_USERCODE}:${NETGSM_PASSWORD}`).toString("base64")}`,
    },
    body: JSON.stringify({
      msgheader: headerSetting?.value || process.env.NETGSM_HEADER || "3423411000",
      messages: numbers.map((no) => ({ msg: message, no })),
      encoding: "TR",
      iysfilter: "0",
      appname: "Cerilas AI",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => null);
  return { ok: data?.code === "00", code: data?.code };
}
