import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express'; 
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; 

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Enable CORS 
  app.enableCors();

  // 2. Serve Static Assets 
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // 3. Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true, 
  }));

  // 4. Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('Belanjain API') 
    .setDescription('Dokumentasi API lengkap untuk Final Project E-commerce Belanjain')
    .setVersion('1.0')
    .addBearerAuth() // Agar bisa input token di dokumentasi
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); 

  await app.listen(3000);
}
bootstrap();