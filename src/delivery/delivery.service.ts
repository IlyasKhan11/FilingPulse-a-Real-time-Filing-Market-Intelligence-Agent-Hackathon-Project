import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class DeliveryService {
  private server: Server;

  // Team A's REST endpoint that persists alerts + broadcasts them to the dashboard.
  private readonly teamAAlertUrl =
    process.env.TEAM_A_ALERT_URL ?? 'http://localhost:3000/api/alerts';

  setServer(server: Server) {
    this.server = server;
  }

  async sendAlert(alert: any) {
    // Local Socket.io emit (kept for any direct Team B subscribers).
    if (this.server) {
      this.server.emit('new_alert', alert);
    }

    // Map the enriched alert into Team A's B -> A contract and POST it back.
    const payload = {
      companyId: alert.companyId,
      title: this.headline(alert),
      summary: alert.why_it_matters || alert.what_changed || '',
      whatChanged: alert.diff || alert.what_changed || '',
      whyItMatters: alert.why_it_matters || '',
      confidence: alert.confidence ?? 0.8,
      severity: (alert.severity || 'low').toUpperCase(),
      sourceLink: alert.sourceUrl || alert.source_url || '',
    };

    try {
      const res = await fetch(this.teamAAlertUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log(
        `Alert delivered to Team A (${this.teamAAlertUrl}): ${res.status} — ${alert.ticker}`,
      );
    } catch (err) {
      console.error(`Failed to POST alert to Team A: ${err.message}`);
    }
  }

  private headline(alert: any): string {
    const what = (alert.what_changed || 'Filing change detected').toString();
    return what.length > 80 ? what.slice(0, 77) + '...' : what;
  }
}