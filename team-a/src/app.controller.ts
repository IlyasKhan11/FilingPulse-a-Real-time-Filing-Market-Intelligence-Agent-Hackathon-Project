import { Controller, Get, Post, Body, Param, Query, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PipelineService } from './pipeline/pipeline.service';
import { BrightDataService } from './pipeline/bright-data.service';
import { AlertGateway } from './pipeline/alert.gateway';

@Controller('api')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: PipelineService,
    private readonly scraper: BrightDataService,
    private readonly alertGateway: AlertGateway,
  ) {}

  // ==========================================
  // WATCHLIST MANAGEMENT (COMPANIES)
  // ==========================================

  @Get('companies')
  async getCompanies() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { snapshots: true, alerts: true },
        },
      },
    });
  }

  @Post('companies')
  async createCompany(
    @Body() body: { name: string; ticker: string; irUrl?: string; filingsUrl?: string },
  ) {
    if (!body.name || !body.ticker) {
      throw new BadRequestException('Company name and ticker are required.');
    }

    const tickerUpper = body.ticker.toUpperCase().trim();
    const nameTrimmed = body.name.trim();

    // Check if company already exists
    const existing = await this.prisma.company.findUnique({
      where: { ticker: tickerUpper },
    });

    if (existing) {
      throw new BadRequestException(`Company with ticker ${tickerUpper} is already in the watchlist.`);
    }

    let irUrl = body.irUrl?.trim();
    let filingsUrl = body.filingsUrl?.trim();

    // If IR or filings URLs are not provided, run Bright Data SERP API discovery!
    if (!irUrl || !filingsUrl) {
      this.logger.log(`URLs not provided for ${tickerUpper}. Firing Bright Data SERP API discovery...`);
      const discovered = await this.scraper.discoverCompanyUrl(nameTrimmed, tickerUpper);
      if (!irUrl) irUrl = discovered.irUrl;
      if (!filingsUrl) filingsUrl = discovered.filingsUrl;
    }

    // Save company to Database
    const company = await this.prisma.company.create({
      data: {
        name: nameTrimmed,
        ticker: tickerUpper,
        irUrl,
        filingsUrl,
      },
    });

    this.logger.log(`Successfully added ${nameTrimmed} (${tickerUpper}) to watchlist.`);
    return company;
  }

  // ==========================================
  // SCAN ORCHESTRATION
  // ==========================================

  @Post('companies/:id/scan')
  async scanCompany(@Param('id') id: string) {
    try {
      const scanSummary = await this.pipeline.scanCompany(id);
      return {
        success: true,
        message: `Successfully executed scan for ${scanSummary.companyName}.`,
        data: scanSummary,
      };
    } catch (err) {
      this.logger.error(`Error scanning company ${id}: ${err.message}`);
      return {
        success: false,
        message: err.message,
      };
    }
  }

  /**
   * Demo trigger: inject a material change and run the full real pipeline
   * (Team A -> Team B -> back to Team A -> live feed).
   */
  @Post('companies/:id/simulate-change')
  async simulateChange(@Param('id') id: string) {
    try {
      const result = await this.pipeline.simulateChange(id);
      return { success: true, message: `Simulated change dispatched for ${result.ticker}.`, data: result };
    } catch (err) {
      this.logger.error(`Error simulating change for ${id}: ${err.message}`);
      return { success: false, message: err.message };
    }
  }

  // ==========================================
  // ALERTS (INTEGRATION WITH TEAM B)
  // ==========================================

  @Get('alerts')
  async getAlerts(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 25;
    return this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        company: true,
      },
    });
  }

  /**
   * REST Endpoint where Team B POSTs their synthesized material alerts.
   * Persists alert to database and streams it via Socket.io instantly to the client UI.
   */
  @Post('alerts')
  async receiveTeamBAlert(
    @Body()
    body: {
      companyId: string;
      title: string;
      summary: string;
      whatChanged: string;
      whyItMatters: string;
      confidence: number;
      severity: string;
      sourceLink: string;
    },
  ) {
    this.logger.log(`Received incoming alert from Team B: "${body.title}" for Company ID ${body.companyId}`);

    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: body.companyId },
    });

    if (!company) {
      throw new BadRequestException(`Company with ID ${body.companyId} not found.`);
    }

    // Save alert to SQLite / Postgres Database
    const alert = await this.prisma.alert.create({
      data: {
        companyId: body.companyId,
        title: body.title || 'Filing Update Alert',
        summary: body.summary || '',
        whatChanged: body.whatChanged || '',
        whyItMatters: body.whyItMatters || '',
        confidence: body.confidence !== undefined ? parseFloat(body.confidence as any) : 1.0,
        severity: (body.severity || 'INFO').toUpperCase(),
        sourceLink: body.sourceLink || company.irUrl || '',
      },
      include: {
        company: true,
      },
    });

    // Stream the new alert to the React UI in real-time
    this.alertGateway.broadcastAlert(alert);

    return {
      success: true,
      alertId: alert.id,
      message: 'Alert processed and broadcasted successfully.',
    };
  }
}
