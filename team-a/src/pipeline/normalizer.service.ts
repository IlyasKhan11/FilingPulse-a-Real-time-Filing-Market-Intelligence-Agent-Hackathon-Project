import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';

@Injectable()
export class NormalizerService {
  /**
   * Cleans raw HTML and returns a sanitized, stripped-down text content.
   */
  normalizeHtml(html: string): string {
    if (!html) return '';

    // Load HTML using Cheerio
    const $ = cheerio.load(html);

    // 1. Remove non-semantic/utility blocks
    $('script, style, noscript, iframe, svg, form, head, link, meta').remove();
    $('header, footer, nav, aside, [role="banner"], [role="navigation"], [role="contentinfo"]').remove();
    
    // Remove typical overlay banners, cookie prompts, and popups
    $('.cookie-consent, #cookie-banner, .modal, .popup, .ads, .ad-container').remove();

    // 2. Extract text from the remaining body
    let text = $('body').text() || $('html').text() || '';

    // 3. Normalize whitespace (tabs, consecutive newlines, etc.)
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    // 4. Scrub transient/cosmetic strings (timestamps, stock ticket prices)
    // E.g., "As of 11:32 PM EDT", "AAPL $180.20 (+0.5%)", "Copyright 2026", etc.
    text = this.scrubTransientContent(text);

    return text;
  }

  /**
   * Generates a SHA-256 fingerprint for a given text.
   */
  generateHash(text: string): string {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  }

  /**
   * Generates a simple, clean, unified-like diff between previous and current text.
   */
  calculateDiff(prevText: string, currText: string): string {
    const prevLines = prevText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const currLines = currText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const diffLines: string[] = [];
    
    // We can use a simple LCS-based or a simpler line-by-line scanner for a lightweight, robust diff
    // Let's implement a clean line-by-line scanner that highlights additions and deletions
    let p = 0;
    let c = 0;

    while (p < prevLines.length || c < currLines.length) {
      if (p < prevLines.length && c < currLines.length) {
        if (prevLines[p] === currLines[c]) {
          // Line matches, skip or add minor context if desired (for brevity, we only show changes)
          p++;
          c++;
        } else {
          // Look ahead to check if current line was added or previous line was removed
          const nextMatchC = currLines.indexOf(prevLines[p], c);
          const nextMatchP = prevLines.indexOf(currLines[c], p);

          if (nextMatchC !== -1 && (nextMatchP === -1 || (nextMatchC - c) < (nextMatchP - p))) {
            // Lines were inserted in current
            for (let i = c; i < nextMatchC; i++) {
              diffLines.push(`+ ${currLines[i]}`);
            }
            c = nextMatchC;
          } else if (nextMatchP !== -1 && (nextMatchC === -1 || (nextMatchP - p) <= (nextMatchC - c))) {
            // Lines were deleted from previous
            for (let i = p; i < nextMatchP; i++) {
              diffLines.push(`- ${prevLines[i]}`);
            }
            p = nextMatchP;
          } else {
            // Replacement
            diffLines.push(`- ${prevLines[p]}`);
            diffLines.push(`+ ${currLines[c]}`);
            p++;
            c++;
          }
        }
      } else if (p < prevLines.length) {
        // Remaining previous lines deleted
        diffLines.push(`- ${prevLines[p]}`);
        p++;
      } else if (c < currLines.length) {
        // Remaining current lines added
        diffLines.push(`+ ${currLines[c]}`);
        c++;
      }
    }

    return diffLines.join('\n');
  }

  /**
   * Helper to scrub dynamic/time-sensitive/cosmetic data to reduce hash false positives.
   */
  private scrubTransientContent(text: string): string {
    return text
      // Remove standard copyright clauses
      .replace(/©\s*(?:\d{4}-)?\d{4}\s+[^.\n]+/gi, '')
      // Remove dynamic market stats / stock indicators
      .replace(/\b[A-Z]{1,5}\s+\$\d+(?:\.\d{2})?\s*\([+-]\d+(?:\.\d{2})?%\)/g, '[STOCK_QUOTE]')
      // Remove time stamps (e.g. 10:24 PM, 14:32:00)
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/gi, '[TIME]')
      // Remove standard dynamic timezone labels
      .replace(/\b(EST|EDT|PST|PDT|UTC|GMT|PST)\b/g, '[TZ]')
      // Remove standard "As of [date]" dynamic texts
      .replace(/as of \w+ \d{1,2},? \d{4}/gi, 'as of [DATE]')
      // Replace dynamic numbers that might change dynamically like "Last updated"
      .replace(/last updated:?\s*\w+\s+\d{1,2},\s*\d{4}/gi, 'last updated: [DATE]');
  }
}
