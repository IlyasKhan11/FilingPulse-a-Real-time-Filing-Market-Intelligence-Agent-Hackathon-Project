import { Injectable } from '@nestjs/common';

@Injectable()
export class EnrichmentService {
  async analyze(payload: any) {
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
      console.error('API call failed:', err.message);
      return null;
    }

    try {
      const raw = data.choices[0].message.content;
      const clean = raw.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      console.log('Claude analysis:', result);
      return result;
    } catch (err) {
      console.error('Failed to parse response:', err.message);
      console.error('Full response was:', JSON.stringify(data));
      return null;
    }
  }
}