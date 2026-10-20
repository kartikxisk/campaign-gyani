'use client';
import { use, useEffect, useState } from 'react';

export default function LandingViewPage({ params }: { params: Promise<{ rid: string }> }) {
  const { rid } = use(params);
  const [html, setHtml] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/t/view/${rid}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d: { html: string }) => setHtml(d.html)).catch(() => setMissing(true));
  }, [rid]);

  if (missing) return <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Page not found.</main>;
  if (html === null) return <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</main>;
  // The landing page is admin-authored; its forms post to the tracking submit
  // endpoint and the browser follows the redirect. Rendered full-bleed so the
  // simulated page looks real.
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
