import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing database...')
  await prisma.reservation.deleteMany()
  await prisma.stockLevel.deleteMany()
  await prisma.product.deleteMany()
  await prisma.warehouse.deleteMany()

  console.log('Creating warehouses...')
  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: 'Main Warehouse - Bangalore',
        location: 'Bangalore, Karnataka',
      },
    }),
    prisma.warehouse.create({
      data: {
        name: 'North Hub - Delhi',
        location: 'Gurugram, NCR',
      },
    }),
    prisma.warehouse.create({
      data: {
        name: 'West Depot - Mumbai',
        location: 'Navi Mumbai, Maharashtra',
      },
    }),
  ])

  console.log('Creating products...')
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'iPhone 15 Pro',
        description: 'Titanium design, A17 Pro chip, customizable Action button, and a powerful 3x Zoom camera system.',
        price: 13490000, // INR 1,34,900 in paise
        sku: 'IPHONE-15PRO-128',
        imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80',
      },
    }),
    prisma.product.create({
      data: {
        name: 'MacBook Pro M3 Max',
        description: 'The ultimate pro laptop. Featuring a 14-core CPU, 30-core GPU, and up to 128GB of unified memory.',
        price: 24990000, // INR 2,49,900 in paise
        sku: 'MACBOOK-M3MAX-16',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
      },
    }),
    prisma.product.create({
      data: {
        name: 'AirPods Pro 2',
        description: 'Up to 2x more Active Noise Cancellation, plus Adaptive Audio and Transparency mode.',
        price: 2490000, // INR 24,900 in paise
        sku: 'AIRPODS-PRO-2',
        imageUrl: 'https://images.unsplash.com/photo-1588449668365-d15e397f6787?auto=format&fit=crop&w=600&q=80',
      },
    }),
    prisma.product.create({
      data: {
        name: 'iPad Air M2',
        description: 'Fresh design, 11-inch Liquid Retina display, the incredibly fast Apple M2 chip, and all-day battery.',
        price: 5990000, // INR 59,900 in paise
        sku: 'IPAD-AIR-M2',
        imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80',
      },
    }),
  ])

  console.log('Populating stock levels...')
  // Stock levels configuration: [totalUnits, reservedUnits]
  const stockMap: Record<string, [number, number][]> = {
    'IPHONE-15PRO-128': [[15, 0], [5, 0], [2, 0]],
    'MACBOOK-M3MAX-16': [[8, 0], [2, 0], [0, 0]],
    'AIRPODS-PRO-2': [[30, 0], [15, 0], [10, 0]],
    'IPAD-AIR-M2': [[12, 0], [0, 0], [4, 0]],
  }

  for (const product of products) {
    const stocks = stockMap[product.sku]
    for (let i = 0; i < warehouses.length; i++) {
      const [total, reserved] = stocks[i] || [0, 0]
      await prisma.stockLevel.create({
        data: {
          productId: product.id,
          warehouseId: warehouses[i].id,
          totalUnits: total,
          reservedUnits: reserved,
        },
      })
    }
  }

  console.log('Database successfully seeded! 🌱')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
