/** Supported personalization tokens. `{{.Company}}` is intentionally excluded. */
export const MERGE_TOKENS = [
  '{{.FirstName}}',
  '{{.LastName}}',
  '{{.Email}}',
  '{{.Position}}',
  '{{.URL}}',
  '{{.ExternalURL}}',
  '{{.UnsubscribeURL}}',
] as const;
export type MergeToken = (typeof MERGE_TOKENS)[number];

export interface MergeContext {
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Position?: string;
  URL?: string;
  ExternalURL?: string;
  UnsubscribeURL?: string;
}
