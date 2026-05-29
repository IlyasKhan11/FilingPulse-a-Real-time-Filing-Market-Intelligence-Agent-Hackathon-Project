import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [
    PrismaModule,
    PipelineModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
