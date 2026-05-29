import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { IngestPayload } from './ingestion.types';

@Injectable()
export class BrightDataService {
  async fetchPage(url: string): Promise<string> {
    const parsedUrl = this.parseUrl(url);
    const token = process.env.BRIGHT_DATA_API_TOKEN;
    const zone = process.env.BRIGHT_DATA_ZONE;

    if (!token) {
      throw new InternalServerErrorException(
        'BRIGHT_DATA_API_TOKEN is not configured',
      );
    }

    if (!zone) {
      throw new InternalServerErrorException(
        'BRIGHT_DATA_ZONE is not configured',
      );
    }

    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zone,
        url: parsedUrl.toString(),
        format: 'raw',
      }),
    });

    const body = await response.text();

    if (!response.ok) {
      throw new BadGatewayException(
        `Bright Data request failed with ${response.status}: ${body.slice(0, 300)}`,
      );
    }

    return body;
  }

  createIngestPayload(url: string, html: string): IngestPayload {
    const parsedUrl = this.parseUrl(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    const textDiff = this.normalizeHtml(html);

    return {
      company: hostname,
      ticker: '',
      source_url: parsedUrl.toString(),
      text_diff: textDiff,
      snapshot_id: parsedUrl.toString(),
      captured_at: new Date().toISOString(),
    };
  }

  normalizeHtml(html: string): string {
    return html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseUrl(url: string): URL {
    if (!url) {
      throw new BadRequestException('Missing required url query parameter');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new BadRequestException('url must be a valid absolute URL');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException('url must use http or https');
    }

    return parsedUrl;
  }
}
