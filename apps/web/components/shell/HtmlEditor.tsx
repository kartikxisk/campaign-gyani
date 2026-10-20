'use client';
import { useState } from 'react';
import { Tabs, Textarea, Button } from '@cg/ui';
import { MERGE_TOKENS } from '@cg/shared';
import { PreviewFrame } from './PreviewFrame';

export function HtmlEditor({ value, onChange, withTokens = true }: { value: string; onChange: (v: string) => void; withTokens?: boolean }) {
  const [tab, setTab] = useState('html');
  const insert = (token: string) => onChange(`${value}${token}`);
  return (
    <div>
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          {
            value: 'html',
            label: 'HTML',
            content: (
              <div className="space-y-2">
                {withTokens && (
                  <div className="flex flex-wrap gap-1.5">
                    {MERGE_TOKENS.map((t) => (
                      <button key={t} type="button" onClick={() => insert(t)}
                        className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-xs text-ink-soft hover:border-primary hover:text-primary">
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={16} spellCheck={false} />
              </div>
            ),
          },
          { value: 'preview', label: 'Preview', content: <PreviewFrame html={value} /> },
        ]}
      />
    </div>
  );
}
