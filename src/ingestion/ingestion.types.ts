export interface IngestPayload {
  company: string;
  ticker: string;
  source_url: string;
  text_diff: string;
  snapshot_id: string;
  captured_at: string;
}

export interface EnrichmentAnalysis {
  what_changed: string;
  why_it_matters: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  source_url: string;
  enrichment_provider: 'aiml' | 'local_fallback';
}

export interface FilingAlert extends EnrichmentAnalysis {
  company: string;
  ticker: string;
  captured_at: string;
}
