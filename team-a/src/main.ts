import * as dotenv from 'dotenv';
dotenv.config();

// Bypass self-signed certificate issues caused by Bright Data proxy SSL decryption
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS globally so frontend clients (e.g. Vite running on 5173) can access the API
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  console.log(`FilingPulse Backend started. Listening on http://localhost:${port}`);
  await app.listen(port);
}
bootstrap();
