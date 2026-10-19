import { prisma } from "@/lib/prisma";

/** Normalizes Turkish mobile numbers to the 10-digit 5xxxxxxxxx form; returns null if invalid. */
export function toLocalMobile(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 && digits.startsWith("5") ? digits : null;
}

type SmsResult = { ok: boolean; provider: "netgsm" | "cerilas" | "none"; detail?: string };

async function sendViaNetgsm(numbers: string[], message: string, usercode: string, password: string): Promise<SmsResult> {
  const headerSetting = await prisma.setting.findFirst({
    where: { key: "netgsm_active_header" },
    orderBy: { updatedAt: "desc" },
  });
  const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${usercode}:${password}`).toString("base64")}`,
    },
    body: JSON.stringify({
      msgheader: headerSetting?.value || process.env.NETGSM_HEADER || usercode,
      messages: numbers.map((no) => ({ msg: message, no })),
      encoding: "TR",
      iysfilter: "0",
      appname: "Cerilas AI",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => null);
  return { ok: data?.code === "00", provider: "netgsm", detail: data?.code };
}

async function sendViaCerilas(numbers: string[], message: string, email: string, password: string): Promise<SmsResult> {
  const authRes = await fetch("https://cerilas.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15_000),
  });
  const token = authRes.ok ? (await authRes.json().catch(() => null))?.token : null;
  if (!token) return { ok: false, provider: "cerilas", detail: `login ${authRes.status}` };

  const results = await Promise.all(numbers.map(async (no) => {
    const res = await fetch("https://cerilas.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ msg: message, no }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    return res?.ok ? null : `${no}:${res?.status ?? "network"}`;
  }));
  const failed = results.filter(Boolean);
  return { ok: failed.length === 0, provider: "cerilas", detail: failed.join(",") || undefined };
}

/** Uses NetGSM when its credentials are configured, otherwise the Cerilas SMS API. */
export async function sendSms(phones: string[], message: string): Promise<SmsResult> {
  const numbers = [...new Set(phones.map(toLocalMobile).filter((n): n is string => n !== null))];
  if (!numbers.length) return { ok: false, provider: "none", detail: "no_valid_numbers" };

  const netgsmUser = process.env.NETGSM_USERCODE?.trim();
  const netgsmPass = process.env.NETGSM_PASSWORD?.trim();
  if (netgsmUser && netgsmPass) return sendViaNetgsm(numbers, message, netgsmUser, netgsmPass);

  const cerilasEmail = process.env.CERILAS_API_EMAIL?.trim();
  const cerilasPass = process.env.CERILAS_API_PASSWORD?.trim();
  if (cerilasEmail && cerilasPass) return sendViaCerilas(numbers, message, cerilasEmail, cerilasPass);

  return { ok: false, provider: "none", detail: "sms_env_missing" };
}
