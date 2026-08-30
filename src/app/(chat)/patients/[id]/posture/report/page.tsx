"use client";

import { Suspense, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

function RedirectInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");

  useEffect(() => {
    if (!id) return;
    const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
    router.replace(`/posture-report/${id}${qs}`);
  }, [id, sessionId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Rapor sayfasına yönlendiriliyor...
    </div>
  );
}

/** Legacy route → canonical `/posture-report/[id]` with device-independent PDF. */
export default function LegacyPostureReportRedirect() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Rapor sayfasına yönlendiriliyor...
        </div>
      }
    >
      <RedirectInner />
    </Suspense>
  );
}
