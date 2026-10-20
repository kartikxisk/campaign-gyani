'use client';
export function PreviewFrame({ html, title = 'Preview' }: { html: string; title?: string }) {
  return (
    <iframe
      title={title}
      sandbox=""
      srcDoc={html || '<p style="font-family:sans-serif;color:#888;padding:1rem">Nothing to preview yet.</p>'}
      className="h-96 w-full rounded-cg-sm border border-line bg-white"
    />
  );
}
