import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as https from 'https';

@Injectable()
export class BrightDataService {
  private readonly logger = new Logger(BrightDataService.name);

  // Read configurations from process.env
  private readonly apiKey = process.env.BRIGHTDATA_SERP_API_KEY;
  private readonly serpZone = process.env.BRIGHTDATA_SERP_ZONE || 'filingpulse_serp';
  private readonly webUnlockerProxy = process.env.BRIGHTDATA_WEB_UNLOCKER_PROXY;

  /**
   * Automatically discovers the IR or filings URL of a company using Bright Data SERP API.
   * Uses the correct POST https://api.brightdata.com/request format with Bearer auth.
   */
  async discoverCompanyUrl(companyName: string, ticker: string): Promise<{ irUrl: string; filingsUrl: string }> {
    const query = `${companyName} ${ticker} investor relations SEC filings`;
    this.logger.log(`Discovering URLs for ${companyName} (${ticker}) using SERP query: "${query}"`);

    if (!this.apiKey) {
      this.logger.warn(`BRIGHTDATA_SERP_API_KEY is not set. Cannot discover URLs automatically.`);
      return {
        irUrl: '',
        filingsUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(companyName)}&CIK=${ticker}&type=&dateb=&owner=include&count=40&search_text=&action=getcompany`,
      };
    }

    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=us&num=10`;
      
      const response = await axios.post('https://api.brightdata.com/request', {
        zone: this.serpZone,
        url: searchUrl,
        format: 'json',
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 15000,
      });

      this.logger.log(`SERP API response status: ${response.status}`);

      // Parse organic results from the response
      const data = response.data;
      const organicResults = data?.organic || data?.results || [];
      
      if (!Array.isArray(organicResults) || organicResults.length === 0) {
        this.logger.warn(`SERP API returned no organic results. Raw response keys: ${Object.keys(data || {}).join(', ')}`);
        this.logger.warn(`Full response (first 500 chars): ${JSON.stringify(data).substring(0, 500)}`);
      }

      // Extract all links
      const allLinks: string[] = organicResults
        .map((r: any) => r.link || r.url || r.href || '')
        .filter((link: string) => link.length > 0);

      this.logger.log(`Found ${allLinks.length} links from SERP results. Top 5: ${JSON.stringify(allLinks.slice(0, 5))}`);

      // Filter for IR URLs
      const irUrls = allLinks.filter((link: string) =>
        link.toLowerCase().includes('investor') || 
        link.toLowerCase().includes('ir.') || 
        link.toLowerCase().includes('shareholder') ||
        link.toLowerCase().includes('about')
      );

      // Filter for filing/SEC URLs
      const filingsUrls = allLinks.filter((link: string) =>
        link.includes('sec.gov') || link.includes('filing') || link.includes('edgar')
      );

      const irUrl = irUrls[0] || allLinks[0] || '';
      const filingsUrl = filingsUrls[0] || `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=&dateb=&owner=include&count=40&search_text=&action=getcompany`;

      this.logger.log(`Discovered IR URL: ${irUrl}`);
      this.logger.log(`Discovered Filings URL: ${filingsUrl}`);

      return { irUrl, filingsUrl };
    } catch (error) {
      this.logger.error(`SERP API search failed: ${error.message}`);
      if (error.response) {
        this.logger.error(`SERP API response status: ${error.response.status}, data: ${JSON.stringify(error.response.data).substring(0, 300)}`);
      }
      return {
        irUrl: '',
        filingsUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=&dateb=&owner=include&count=40&search_text=&action=getcompany`,
      };
    }
  }

  /**
   * Scrapes the HTML content of a page using Bright Data's Web Unlocker proxy.
   * Falls back to direct HTTP if proxy is not configured.
   */
  async fetchPageContent(url: string): Promise<string> {
    this.logger.log(`Fetching page content from: ${url}`);

    // Skip fetching for empty/placeholder URLs
    if (!url || url.trim() === '') {
      this.logger.warn(`Empty URL provided, skipping fetch.`);
      return '<html><body><p>No URL configured for this source.</p></body></html>';
    }

    // If we have a Web Unlocker proxy configured
    if (this.webUnlockerProxy) {
      this.logger.log(`Using Bright Data Web Unlocker Proxy`);
      try {
        const { HttpsProxyAgent } = require('https-proxy-agent');
        const proxyAgent = new HttpsProxyAgent(this.webUnlockerProxy);
        proxyAgent.options = { ...(proxyAgent.options || {}), rejectUnauthorized: false };
        const response = await axios.get(url, {
          httpsAgent: proxyAgent,
          proxy: false, // Must explicitly disable native proxy to use agent
          headers: {
            'User-Agent': 'FilingPulse admin@filingpulse.com',
          },
          timeout: 30000,
        });
        this.logger.log(`Web Unlocker fetch SUCCESS. Status: ${response.status}, Content length: ${String(response.data).length}`);
        return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      } catch (error) {
        this.logger.error(`Web Unlocker scrape failed: ${error.message}. Trying direct fetch.`);
      }
    }

    // Direct HTTP call as fallback
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'FilingPulse admin@filingpulse.com',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 15000,
      });
      this.logger.log(`Direct fetch SUCCESS. Status: ${response.status}, Content length: ${String(response.data).length}`);
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (error) {
      this.logger.error(`Direct HTTP fetch also failed for ${url}: ${error.message}`);
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }

  /**
   * Parses a proxy URL string into Axios proxy config object.
   */
  private parseProxyUrl(proxyUrl: string) {
    try {
      const parsed = new URL(proxyUrl);
      return {
        protocol: parsed.protocol.replace(':', ''),
        host: parsed.hostname,
        port: parseInt(parsed.port || '33335', 10),
        auth: {
          username: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password),
        },
      };
    } catch (err) {
      this.logger.error(`Error parsing proxy URL: ${err.message}`);
      return undefined;
    }
  }
}
