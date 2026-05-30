import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  // Team B runs on 4000 so it doesn't clash with Team A (3000).
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`FilingPulse Team B (AI core) listening on http://localhost:${port}`);
}
bootstrap();
