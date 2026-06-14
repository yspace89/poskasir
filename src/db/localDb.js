import Dexie from 'dexie';

export const db = new Dexie('KassaLocalDB');

db.version(1).stores({
  products: 'id, org_id, store_id, sku, name, category_id, is_active, updated_at', // Indexed fields
  categories: 'id, org_id, name, updated_at',
  sync_queue: '++id, type, payload, created_at, status' // type: 'transaction', status: 'pending'
});

export async function clearLocalDB() {
  await db.products.clear();
  await db.categories.clear();
  await db.sync_queue.clear();
}
