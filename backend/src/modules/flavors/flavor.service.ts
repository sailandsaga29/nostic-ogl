/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import pool from '../../config/db';

export const createFlavor = async (flavor: any) => {
  const query = `
    INSERT INTO flavors (
      name,
      description,
      category,
      emoji,
      image_url,
      price,
      stock,
      low_stock_threshold,
      is_seasonal
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9
    )
    RETURNING *;
  `;

  const values = [
    flavor.name,
    flavor.description,
    flavor.category,
    flavor.emoji,
    flavor.image_url,
    flavor.price,
    flavor.stock,
    flavor.low_stock_threshold,
    flavor.is_seasonal,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

export const getAllFlavors = async () => {
  const result = await pool.query(`
      SELECT *
      FROM flavors
      ORDER BY created_at DESC
    `);

  return result.rows;
};

export const getFlavorById = async (id: string) => {
  const result = await pool.query(
    `
      SELECT *
      FROM flavors
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0];
};

export const updateFlavor = async (id: string, flavor: any) => {
  const query = `
    UPDATE flavors
    SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      emoji = COALESCE($4, emoji),
      image_url = COALESCE($5, image_url),
      price = COALESCE($6, price),
      stock = COALESCE($7, stock),
      low_stock_threshold = COALESCE($8, low_stock_threshold),
      is_seasonal = COALESCE($9, is_seasonal)
    WHERE id = $10
    RETURNING *;
  `;

  const values = [
    flavor.name,
    flavor.description,
    flavor.category,
    flavor.emoji,
    flavor.image_url,
    flavor.price,
    flavor.stock,
    flavor.low_stock_threshold,
    flavor.is_seasonal,
    id,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

export const deleteFlavor = async (id: string) => {
  await pool.query(
    `
      DELETE FROM flavors
      WHERE id = $1
    `,
    [id],
  );
};

export const getLowStockFlavors = async () => {
  const result = await pool.query(`
      SELECT *
      FROM flavors
      WHERE status = 'low_stock'
    `);

  return result.rows;
};

export const getAvailableFlavors = async () => {
  const result = await pool.query(`
      SELECT *
      FROM flavors
      WHERE status = 'available'
      AND is_active = true
    `);

  return result.rows;
};

export const getActiveFlavors = async () => {
  const result = await pool.query(`
      SELECT *
      FROM flavors
      WHERE is_active = true
    `);

  return result.rows;
};

export const updateFlavorStock = async (id: string, quantity: number) => {
  const result = await pool.query(
    `
      UPDATE flavors
      SET stock = stock + $1
      WHERE id = $2
      RETURNING *;
      `,
    [quantity, id],
  );

  return result.rows[0];
};
