import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const companies = [
  { name: 'Super Micro Computer', ticker: 'SMCI', irUrl: 'https://ir.supermicro.com' },
  { name: 'MicroStrategy', ticker: 'MSTR', irUrl: 'https://www.microstrategy.com/investor-relations' },
  { name: 'Unilever', ticker: 'UL', irUrl: 'https://www.unilever.com/investor-relations' },
  { name: 'Boeing', ticker: 'BA', irUrl: 'https://investors.boeing.com' },
  { name: 'Carvana', ticker: 'CVNA', irUrl: 'https://investors.carvana.com' },
  { name: 'Tesla', ticker: 'TSLA', irUrl: 'https://ir.tesla.com' },
  { name: 'Palantir', ticker: 'PLTR', irUrl: 'https://investors.palantir.com' },
  { name: 'JPMorgan Chase', ticker: 'JPM', irUrl: 'https://www.jpmorganchase.com/ir' },
];

async function main() {
  console.log('Seeding demo watchlist...');
  
  for (const company of companies) {
    const existing = await prisma.company.findUnique({ where: { ticker: company.ticker } });
    if (!existing) {
      await prisma.company.create({
        data: {
          name: company.name,
          ticker: company.ticker,
          irUrl: company.irUrl,
          filingsUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.ticker}&type=&dateb=&owner=include&count=40&search_text=&action=getcompany`,
        }
      });
      console.log(`Added ${company.ticker} - ${company.name}`);
    } else {
      console.log(`Skipped ${company.ticker} (Already exists)`);
    }
  }
  
  console.log('Seed complete! Check your frontend Watchlist.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
