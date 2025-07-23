import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: [
      'https://nest-frontend.quijadajosed.duckdns.org',
      'https://spring-frontend.quijadajosed.duckdns.org',
    ],
    credentials: true,
  });

  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
