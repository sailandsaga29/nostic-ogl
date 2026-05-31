import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { FlavorsService } from './modules/flavors/flavors.service';
import { DataSource } from 'typeorm';
import { FlavorMonthly } from './modules/flavors/entities/flavor-monthly.entity';
import { Flavor } from './modules/flavors/entities/flavor.entity';
import { Role } from './common/enums/role.enum';
import * as bcrypt from 'bcrypt';

async function seed() {
  console.log('🚀 Starting database seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const flavorsService = app.get(FlavorsService);

  const users = [
    {
      name: 'Super Admin',
      email: 'admin@nosticogl.com',
      phone: '9999999991',
      password: 'Admin@123',
      role: Role.SUPER_ADMIN,
      branchCode: 'HQ',
    },
    {
      name: 'Manager',
      email: 'manager@nosticogl.com',
      phone: '9999999992',
      password: 'Manager@123',
      role: Role.MANAGER,
      branchCode: 'BR001',
    },
    {
      name: 'Staff',
      email: 'staff@nosticogl.com',
      phone: '9999999993',
      password: 'Staff@123',
      role: Role.STAFF,
      branchCode: 'BR001',
    },
  ];

  for (const userData of users) {
    const existingUser = await usersService.findByEmail(userData.email);

    if (existingUser) {
      console.log(`⚠️ User already exists: ${userData.email}`);

      continue;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    await usersService.create({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: hashedPassword,
      role: userData.role,
      branchCode: userData.branchCode,
      isActive: true,
    });

    console.log(`✅ Created ${userData.role}`);

    console.log(`   Email: ${userData.email}`);

    console.log(`   Password: ${userData.password}`);
  }

  type SeedFlavor = {
    name: string;
    category?: string;
    description?: string;
    price?: number;
    stock?: number;
    minStock?: number;
    image?: string | null;
    isActive?: boolean;
    isSeasonal?: boolean;
  };

  const flavors: SeedFlavor[] = [
    // Popsicles
    {
      name: 'Honey Dates (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 40,
      stock: 50,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Jack Fruit (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 35,
      stock: 37,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Blue Berry (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 40,
      stock: 91,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Avacado (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 35,
      stock: 48,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Watermelon (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 25,
      stock: 52,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Snickers (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 35,
      stock: 76,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Mixed Fruit (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 35,
      stock: 138,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Pista (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 70,
      stock: 97,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Mango (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 40,
      stock: 63,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Kitkat (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 35,
      stock: 57,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Milky Guava (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 30,
      stock: 61,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Strawberry (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 35,
      stock: 66,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Tinder Coco (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 40,
      stock: 88,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Mojito (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 25,
      stock: 57,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Dragon Fruit (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 40,
      stock: 33,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'COCO Coffee (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 40,
      stock: 41,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Lotus (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 50,
      stock: 3,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Hazul nut (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 70,
      stock: 70,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Oreo (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 35,
      stock: 2,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Pine apple chilli (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 25,
      stock: 2,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Chilli Guava (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 35,
      stock: 17,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Grapes (Popsicles)',
      category: 'Popsicles',
      description: '',
      price: 25,
      stock: 5,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },

    // Sugar Free
    {
      name: 'Jack Fruit (Sugar Free)',
      category: 'Sugar Free',
      description: '',
      price: 60,
      stock: 15,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Chocolate (Sugar Free)',
      category: 'Sugar Free',
      description: '',
      price: 60,
      stock: 4,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Sithapal (Sugar Free)',
      category: 'Sugar Free',
      description: '',
      price: 60,
      stock: 11,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Avacado (Sugar Free)',
      category: 'Sugar Free',
      description: '',
      price: 60,
      stock: 4,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Tinder Coco (Sugar Free)',
      category: 'Sugar Free',
      description: '',
      price: 60,
      stock: 2,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },

    // 100 ML
    {
      name: 'Snickers (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 36,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Jack Fruit (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 44,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Honey Dates (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 13,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Chocolate (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 12,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Avacado (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 10,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Malai (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 21,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Blue berry (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 20,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'coockies (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 13,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Chicoo (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 7,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Spanish Delight (100 ML)',
      category: '100 ML',
      description: '',
      price: 69,
      stock: 10,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },

    // SIP Ups
    {
      name: 'Strawberry (SIP Ups)',
      category: 'SIP Ups',
      description: '',
      price: 20,
      stock: 8,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Mango (SIP Ups)',
      category: 'SIP Ups',
      description: '',
      price: 20,
      stock: 2,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Chocolate (SIP Ups)',
      category: 'SIP Ups',
      description: '',
      price: 20,
      stock: 3,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Jack Fruit (SIP Ups)',
      category: 'SIP Ups',
      description: '',
      price: 20,
      stock: 40,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },

    // Cones
    {
      name: 'Sithapal (Cones)',
      category: 'Cones',
      description: '',
      price: 80,
      stock: 3,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Mango (Cones)',
      category: 'Cones',
      description: '',
      price: 80,
      stock: 24,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Blueberry (Cones)',
      category: 'Cones',
      description: '',
      price: 80,
      stock: 22,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Strawberry (Cones)',
      category: 'Cones',
      description: '',
      price: 80,
      stock: 24,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },

    // 4 Ltrs
    {
      name: 'Tinder Coco (4 Ltrs)',
      category: '4 Ltrs',
      description: '',
      price: 1699,
      stock: 2,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Mango (4 Ltrs)',
      category: '4 Ltrs',
      description: '',
      price: 1699,
      stock: 2,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Spanish Delight (4 Ltrs)',
      category: '4 Ltrs',
      description: '',
      price: 1699,
      stock: 1,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Sithapal (4 Ltrs)',
      category: '4 Ltrs',
      description: '',
      price: 1699,
      stock: 3,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Red Velvet (4 Ltrs)',
      category: '4 Ltrs',
      description: '',
      price: 1699,
      stock: 2,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Pista (4 Ltrs)',
      category: '4 Ltrs',
      description: '',
      price: 1699,
      stock: 1,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },

    // 500 ML
    {
      name: 'Strawberry (500 ML)',
      category: '500 ML',
      description: '',
      price: 245,
      stock: 5,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Strawberry Cheese Cake (500 ML)',
      category: '500 ML',
      description: '',
      price: 245,
      stock: 2,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Vennila (500 ML)',
      category: '500 ML',
      description: '',
      price: 175,
      stock: 5,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Coockie and Cream (500 ML)',
      category: '500 ML',
      description: '',
      price: 245,
      stock: 3,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Chocolate (500 ML)',
      category: '500 ML',
      description: '',
      price: 225,
      stock: 3,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Honey Dates (500 ML)',
      category: '500 ML',
      description: '',
      price: 245,
      stock: 5,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Avacado (500 ML)',
      category: '500 ML',
      description: '',
      price: 245,
      stock: 2,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Chicco (500 ML)',
      category: '500 ML',
      description: '',
      price: 245,
      stock: 1,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Mango (500 ML)',
      category: '500 ML',
      description: '',
      price: 245,
      stock: 4,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Red Velvet (500 ML)',
      category: '500 ML',
      description: '',
      price: 245,
      stock: 3,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
    {
      name: 'Jack Fruit (500 ML)',
      category: '500 ML',
      description: '',
      price: 245,
      stock: 6,
      minStock: 15,
      image: null,
      isActive: true,
      isSeasonal: false,
    },
  ];

  for (const flavorData of flavors) {
    const payload: Partial<Flavor> = {
      name: flavorData.name,
      category: flavorData.category,
      description: flavorData.description,
      price: flavorData.price,
      stock: flavorData.stock,
      minStock: flavorData.minStock ,
      image: flavorData.image ?? undefined,
      isActive: flavorData.isActive,
      isSeasonal: flavorData.isSeasonal,
    };

    const existingFlavor = await flavorsService.findByName(flavorData.name);
    if (existingFlavor) {
      await flavorsService.update(existingFlavor.id, payload);
      console.log(`🔄 Updated flavor: ${flavorData.name}`);
      continue;
    }

    await flavorsService.create(payload);
    console.log(`✅ Created flavor: ${flavorData.name}`);
  }

  // Create monthly tracking records for current month/year
  try {
    const dataSource = app.get(DataSource);
    const monthlyRepo = dataSource.getRepository(FlavorMonthly);
    const persistedFlavors = await flavorsService.findAll();
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    for (const f of persistedFlavors) {
      const quantity = Number(f.stock ?? 0);
      const rate = Number(f.price ?? 0);
      const cost = quantity * rate;

      const existing = await monthlyRepo.findOne({
        where: { flavorId: f.id, month, year },
      });
      if (existing) {
        existing.quantity = quantity;
        existing.rate = rate;
        existing.cost = cost;
        existing.category = f.category;
        await monthlyRepo.save(existing);
        console.log(
          `🔁 Updated monthly record for ${f.name} (${month}/${year})`,
        );
        continue;
      }

      const rec = monthlyRepo.create({
        flavor: f,
        flavorId: f.id,
        month,
        year,
        quantity,
        rate,
        cost,
        category: f.category,
      });
      await monthlyRepo.save(rec);
      console.log(`🗓️ Created monthly record for ${f.name} (${month}/${year})`);
    }
  } catch (err) {
    if (err instanceof Error) {
      console.warn('Could not create monthly records:', err.message);
    } else {
      console.warn('Could not create monthly records:', String(err));
    }
  }

  console.log('🎉 Database seeding completed!');

  await app.close();
}

seed().catch((error) => {
  console.error('❌ Error while seeding:', error);
});
