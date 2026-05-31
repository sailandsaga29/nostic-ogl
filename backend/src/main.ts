/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend and allow Authorization headers
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // API prefix
  app.setGlobalPrefix('api');
  console.log('AppModule loaded');
  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Nostic Ongole API')
    .setDescription(
      'API documentation for the Ice Cream Franchise backend, including authentication and user management',
    )
    .setVersion('1.0')
    .addTag('Authentication', 'Authentication and token management endpoints')
    .addTag('Users', 'User administration endpoints')
    .addTag('Flavors', 'Flavor management endpoints')
    .addTag('Orders', 'Order management endpoints')
    .addTag('Inventory', 'Inventory management endpoints')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'Authorization',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT || 3000);
  console.log(
    `🍦 Server running on http://localhost:${process.env.PORT || 3000}`,
  );
  console.log(
    `📚 API Docs: http://localhost:${process.env.PORT || 3000}/api/docs`,
  );
}
bootstrap();
