// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// import prisma from '../config/prisma';

// export const createFlavor = async (data: any) => {
//   return prisma.flavor.create({
//     data,
//   });
// };

// export const getAllFlavors = async () => {
//   return prisma.flavor.findMany({
//     orderBy: {
//       createdAt: 'desc',
//     },
//   });
// };

// export const getAvailableFlavors = async () => {
//   return prisma.flavor.findMany({
//     where: {
//       stock: {
//         gt: 0,
//       },
//       isActive: true,
//     },
//   });
// };

// export const getActiveFlavors = async () => {
//   return prisma.flavor.findMany({
//     where: {
//       isActive: true,
//     },
//   });
// };

// export const getLowStockFlavors = async () => {
//   return prisma.flavor.findMany({
//     where: {
//       stock: {
//         lte: prisma.flavor.fields.minStock,
//       },
//     },
//   });
// };

// export const getFlavorById = async (id: string) => {
//   return prisma.flavor.findUnique({
//     where: {
//       id,
//     },
//   });
// };

// export const updateFlavor = async (id: string, data: any) => {
//   return prisma.flavor.update({
//     where: {
//       id,
//     },
//     data,
//   });
// };

// export const updateFlavorStock = async (id: string, stock: number) => {
//   return prisma.flavor.update({
//     where: {
//       id,
//     },
//     data: {
//       stock,
//     },
//   });
// };

// export const deleteFlavor = async (id: string) => {
//   return prisma.flavor.delete({
//     where: {
//       id,
//     },
//   });
// };
