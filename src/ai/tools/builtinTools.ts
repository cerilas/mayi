// ─── Tool declarations (Gemini'ye göndereceğimiz şema) ─────────────────────

export const toolDeclarations = [
  {
    name: "get_current_datetime",
    description:
      "Şu anki tarih ve saati döndürür. Türkiye saatiyle (Europe/Istanbul) çalışır. " +
      "Kullanıcı 'bugün', 'şu an', 'tarih', 'saat', 'gün', 'hafta' gibi zaman ifadeleri " +
      "kullandığında ya da randevu veya plan önerisi yapılacağında bu fonksiyonu çağır.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "calculate_bmi",
    description:
      "Vücut kitle indeksini (VKİ / BMI) hesaplar ve yorumlar. " +
      "Kullanıcı ağırlık ve boy değerlerini verdiğinde bu fonksiyonu çağır.",
    parameters: {
      type: "object",
      properties: {
        weight_kg: {
          type: "number",
          description: "Vücut ağırlığı kilogram cinsinden (örn. 75)",
        },
        height_cm: {
          type: "number",
          description: "Boy santimetre cinsinden (örn. 170)",
        },
      },
      required: ["weight_kg", "height_cm"],
    },
  },
  {
    name: "calculate_ideal_weight",
    description:
      "Boya göre ideal kilo aralığını hesaplar. " +
      "Kullanıcı 'ideal kilom ne olmalı', 'kaç kilo olmalıyım' gibi sorular sorduğunda " +
      "ya da kilo hedefi tartışılırken bu fonksiyonu çağır.",
    parameters: {
      type: "object",
      properties: {
        height_cm: {
          type: "number",
          description: "Boy santimetre cinsinden (örn. 170)",
        },
        gender: {
          type: "string",
          enum: ["male", "female"],
          description: "Cinsiyet: 'male' (erkek) veya 'female' (kadın)",
        },
      },
      required: ["height_cm", "gender"],
    },
  },
];

// ─── Tool implementasyonları ────────────────────────────────────────────────

export function get_current_datetime(): Record<string, unknown> {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  const formatted = new Intl.DateTimeFormat("tr-TR", options).format(now);
  const isoTR = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return {
    formatted,
    iso: isoTR,
    timestamp: now.toISOString(),
    timezone: "Europe/Istanbul (UTC+3)",
  };
}

export function calculate_bmi(args: {
  weight_kg: number;
  height_cm: number;
}): Record<string, unknown> {
  const { weight_kg, height_cm } = args;
  const heightM = height_cm / 100;
  const bmi = weight_kg / (heightM * heightM);
  const bmiRounded = Math.round(bmi * 10) / 10;

  let category: string;
  let recommendation: string;

  if (bmi < 18.5) {
    category = "Zayıf (Düşük Kilolu)";
    recommendation =
      "Kilo almanız önerilir. Dengeli beslenme ve düzenli egzersiz ile sağlıklı kilo kazanabilirsiniz.";
  } else if (bmi < 25) {
    category = "Normal (Sağlıklı)";
    recommendation =
      "Kilonuz sağlıklı aralıkta. Düzenli egzersiz ve dengeli beslenmeye devam edin.";
  } else if (bmi < 30) {
    category = "Fazla Kilolu (Pre-obez)";
    recommendation =
      "Hafif kilo fazlası mevcut. Düzenli fiziksel aktivite ve beslenme düzenlemesi önerilir.";
  } else if (bmi < 35) {
    category = "Obez (Derece 1)";
    recommendation =
      "Obezite Derece 1. Bir fizyoterapist veya beslenme uzmanına danışmanız önerilir.";
  } else if (bmi < 40) {
    category = "Obez (Derece 2)";
    recommendation =
      "Obezite Derece 2. Tıbbi destek ve uzman takibi önemlidir.";
  } else {
    category = "Morbid Obez (Derece 3)";
    recommendation =
      "Morbid obezite. Mutlaka bir sağlık uzmanıyla görüşülmelidir.";
  }

  return {
    bmi: bmiRounded,
    category,
    recommendation,
    weight_kg,
    height_cm,
  };
}

export function calculate_ideal_weight(args: {
  height_cm: number;
  gender: "male" | "female";
}): Record<string, unknown> {
  const { height_cm, gender } = args;

  // Devine formülü
  const heightInches = (height_cm - 152.4) / 2.54;
  let devineIdeal: number;
  if (gender === "male") {
    devineIdeal = 50 + 2.3 * Math.max(0, heightInches);
  } else {
    devineIdeal = 45.5 + 2.3 * Math.max(0, heightInches);
  }

  // WHO / BMI 18.5–24.9 aralığı
  const heightM = height_cm / 100;
  const bmiMin = Math.round(18.5 * heightM * heightM * 10) / 10;
  const bmiMax = Math.round(24.9 * heightM * heightM * 10) / 10;

  return {
    height_cm,
    gender: gender === "male" ? "Erkek" : "Kadın",
    devine_ideal_kg: Math.round(devineIdeal * 10) / 10,
    bmi_range_kg: { min: bmiMin, max: bmiMax },
    note:
      "Devine formülünden hesaplanmıştır. Kas kütlesi, kemik yapısı ve yaşa göre değişkenlik gösterebilir.",
  };
}

// ─── Dispatcher: fonksiyon adına göre çalıştır ──────────────────────────────

type ToolArgs = Record<string, unknown>;

export function executeToolCall(
  name: string,
  args: ToolArgs
): Record<string, unknown> {
  switch (name) {
    case "get_current_datetime":
      return get_current_datetime();
    case "calculate_bmi":
      return calculate_bmi(args as { weight_kg: number; height_cm: number });
    case "calculate_ideal_weight":
      return calculate_ideal_weight(
        args as { height_cm: number; gender: "male" | "female" }
      );
    default:
      return { error: `Bilinmeyen fonksiyon: ${name}` };
  }
}
