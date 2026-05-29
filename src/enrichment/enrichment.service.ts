import { Injectable } from '@nestjs/common';
import {
  EnrichmentAnalysis,
  IngestPayload,
} from '../ingestion/ingestion.types';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class EnrichmentService {
  async analyze(payload: IngestPayload): Promise<EnrichmentAnalysis> {
    console.log('Calling AI/ML API...');

    let data: unknown;

    try {
      const response = await fetch(
        'https://api.aimlapi.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.AIML_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.AIML_MODEL ?? 'claude-sonnet-4-5',
            max_tokens: 1000,
            messages: [
              {
                role: 'system',
                content:
                  'You are a compliance analyst. Always respond with valid JSON only. No markdown, no explanation, just the JSON object.',
              },
              {
                role: 'user',
                content: `Analyze this regulatory page change.

TEXT DIFF:
${payload.text_diff}

SOURCE URL: ${payload.source_url}
COMPANY: ${payload.company}

Respond ONLY with this JSON structure:
{
  "what_changed": "concise description of what changed",
  "why_it_matters": "compliance and investor relevance",
  "confidence": 0.85,
  "severity": "low or medium or high",
  "source_url": "${payload.source_url}"
}`,
              },
            ],
          }),
        },
      );

      data = (await response.json()) as unknown;
      console.log('Raw API response:', JSON.stringify(data));
      if (!response.ok) {
        console.error('AI/ML API returned an error:', response.status);
        return this.localAnalysis(payload);
      }
    } catch (err: unknown) {
      console.error('API call failed:', this.errorMessage(err));
      return this.localAnalysis(payload);
    }

    try {
      const raw = this.extractMessageContent(data);
      if (!raw) {
        throw new Error('Missing AI message content');
      }

      const clean = raw.replace(/```json|```/g, '').trim();
      const result = this.parseAnalysis(clean, payload.source_url);
      console.log('Claude analysis:', result);
      return result;
    } catch (err: unknown) {
      console.error('Failed to parse response:', this.errorMessage(err));
      console.error('Full response was:', JSON.stringify(data));
      return this.localAnalysis(payload);
    }
  }

  private parseAnalysis(raw: string, sourceUrl: string): EnrichmentAnalysis {
    const parsed = JSON.parse(raw) as unknown;
    const record = this.asRecord(parsed);

    if (!record) {
      throw new Error('AI response was not a JSON object');
    }

    return {
      what_changed: this.stringValue(
        record.what_changed,
        'Page content changed.',
      ),
      why_it_matters: this.stringValue(
        record.why_it_matters,
        'The update may be relevant for compliance or investor monitoring.',
      ),
      confidence: this.numberValue(record.confidence, 0.5),
      severity: this.severityValue(record.severity),
      source_url: this.stringValue(record.source_url, sourceUrl),
      enrichment_provider: 'aiml',
    };
  }

  private extractMessageContent(data: unknown): string | null {
    const record = this.asRecord(data);
    const choices = record?.choices;

    if (!Array.isArray(choices)) {
      return null;
    }

    const firstChoice = this.asRecord(choices[0]);
    const message = this.asRecord(firstChoice?.message);
    const content = message?.content;

    return typeof content === 'string' ? content : null;
  }

  private localAnalysis(payload: IngestPayload): EnrichmentAnalysis {
    const summary = this.summarizeChange(payload.text_diff);
    const severity = this.estimateSeverity(payload.text_diff);

    return {
      what_changed: summary,
      why_it_matters: this.localRationale(severity, payload.company),
      confidence: severity === 'low' ? 0.55 : 0.62,
      severity,
      source_url: payload.source_url,
      enrichment_provider: 'local_fallback',
    };
  }

  private summarizeChange(textDiff: string): string {
    const clean = textDiff.replace(/\s+/g, ' ').trim();

    if (!clean) {
      return 'The monitored page changed, but no readable body text remained after normalization.';
    }

    const sentence = clean.match(/[^.!?]+[.!?]/)?.[0] ?? clean;
    return this.truncate(sentence.trim(), 220);
  }

  private estimateSeverity(textDiff: string): EnrichmentAnalysis['severity'] {
    const diff = textDiff.toLowerCase();

    const highSignals = [
      'bankruptcy',
      'class action',
      'delist',
      'fraud',
      'going concern',
      'investigation',
      'material weakness',
      'restatement',
      'sec investigation',
      'subpoena',
    ];

    if (highSignals.some((signal) => diff.includes(signal))) {
      return 'high';
    }

    const mediumSignals = [
      '8-k',
      '10-k',
      '10-q',
      'board',
      'dividend',
      'earnings',
      'filing',
      'guidance',
      'investor',
      'revenue',
      'risk factor',
      'shareholder',
    ];

    return mediumSignals.some((signal) => diff.includes(signal))
      ? 'medium'
      : 'low';
  }

  private localRationale(
    severity: EnrichmentAnalysis['severity'],
    company: string,
  ): string {
    if (severity === 'high') {
      return `${company} has a change containing high-signal regulatory or investor-risk language, so it should be reviewed immediately.`;
    }

    if (severity === 'medium') {
      return `${company} has a change touching filing, financial, governance, or investor-facing language that may affect compliance monitoring.`;
    }

    return `${company} has a captured page change that appears low severity, but it is still useful as a verified Bright Data ingestion event for the watchlist.`;
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3).trimEnd()}...`;
  }

  private asRecord(value: unknown): JsonRecord | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }

    return value as JsonRecord;
  }

  private stringValue(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private numberValue(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  private severityValue(value: unknown): EnrichmentAnalysis['severity'] {
    return value === 'medium' || value === 'high' ? value : 'low';
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
