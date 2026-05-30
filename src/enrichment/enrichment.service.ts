import { Injectable } from '@nestjs/common';

@Injectable()
export class EnrichmentService {
  async analyze(payload: any) {
    // No key configured → skip the expensive call and synthesize locally so the
    // pipeline still produces a structured alert. Set AIML_API_KEY to use real Claude.
    if (!process.env.AIML_API_KEY) {
      console.log('AIML_API_KEY not set — using local synthesizer fallback.');
      return this.synthesize(payload);
    }

    console.log('Calling AI/ML API...');

    let data: any;

    try {
      const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AIML_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [
            {
              role: 'system',
              content: 'You are a compliance analyst. Always respond with valid JSON only. No markdown, no explanation, just the JSON object.',
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
      });

      data = await response.json();
      console.log('Raw API response:', JSON.stringify(data));

    } catch (err) {
      console.error('API call failed:', err.message, '— falling back to local synthesizer.');
      return this.synthesize(payload);
    }

    try {
      const raw = data.choices[0].message.content;
      const clean = raw.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      console.log('Claude analysis:', result);
      return result;
    } catch (err) {
      console.error('Failed to parse response:', err.message, '— falling back to local synthesizer.');
      return this.synthesize(payload);
    }
  }

  /**
   * Deterministic, keyless fallback. Classifies the diff by keywords and returns the
   * same structured shape Claude would, so the pipeline keeps flowing without an API key.
   */
  private synthesize(payload: any) {
    const diff: string = (payload.text_diff || '').toString();
    const d = diff.toLowerCase();
    const ticker = payload.ticker || '';

    let what_changed = `Content change detected on ${ticker} monitored page.`;
    let why_it_matters =
      'Continuous monitoring flagged a substantive change on a watchlisted regulatory/IR page.';
    let severity: 'low' | 'medium' | 'high' = 'low';
    let confidence = 0.7;

    if (/appoint|resign|departure|ceo|cfo|director|board|executive/.test(d)) {
      what_changed = 'Leadership / board change detected in the filing or IR disclosure.';
      why_it_matters =
        'Executive and board changes often precede shifts in strategy or operational focus and are material to investors.';
      severity = 'high';
      confidence = 0.94;
    } else if (/revenue|earnings|guidance|billion|million|quarter|dividend|buyback/.test(d)) {
      what_changed = 'Financial / earnings-related disclosure was updated.';
      why_it_matters =
        'Changes to financial figures or guidance directly affect valuation and risk models.';
      severity = 'medium';
      confidence = 0.9;
    } else if (/lawsuit|investigation|sec|litigation|recall|breach/.test(d)) {
      what_changed = 'Potential legal / regulatory risk disclosure detected.';
      why_it_matters =
        'Legal or regulatory developments can carry significant financial and reputational impact.';
      severity = 'high';
      confidence = 0.88;
    }

    return {
      what_changed,
      why_it_matters,
      confidence,
      severity,
      source_url: payload.source_url,
    };
  }
}