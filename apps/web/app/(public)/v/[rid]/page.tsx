'use client';
import { use, useEffect, useState } from 'react';

const TOKEN = /^[A-Za-z0-9_-]+$/;

export default function LandingViewPage({ params }: { params: Promise<{ rid: string }> }) {
  const { rid } = use(params);
  const [html, setHtml] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!TOKEN.test(rid)) { setMissing(true); return; }
    fetch(`/api/t/view/${encodeURIComponent(rid)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { html: string }) => setHtml(d.html))
      .catch(() => setMissing(true));
  }, [rid]);

  if (missing) return <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Page not found.</main>;
  if (html === null) return <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</main>;

  // The landing page is untrusted HTML; render it in a locked-down iframe with
  // NO allow-scripts and NO allow-same-origin, so it cannot touch the console's
  // origin or cookies. allow-forms lets its form post to the tracking endpoint;
  // allow-top-navigation lets the post-submit redirect navigate the top window.
  return (
    <iframe
      title="Page"
      sandbox="allow-forms allow-top-navigation"
      srcDoc={html}
      style={{ border: 0, width: '100vw', height: '100vh', display: 'block' }}
    />
  );
}
