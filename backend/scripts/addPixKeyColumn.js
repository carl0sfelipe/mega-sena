import { supabase } from '../src/config/database.js';

/**
 * Add pix_key column to users table
 */
async function addPixKeyColumn() {
  try {
    console.log('============================================================');
    console.log('🔧 ADDING PIX_KEY COLUMN');
    console.log('============================================================\n');

    console.log('📝 Run this SQL in Supabase SQL Editor:\n');
    console.log('-- Add pix_key column to users table');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key TEXT;');
    console.log('\n-- Make pix_key unique (optional but recommended)');
    console.log('CREATE UNIQUE INDEX IF NOT EXISTS users_pix_key_idx ON users(pix_key) WHERE pix_key IS NOT NULL;');
    console.log('\n============================================================');
    console.log('✅ After running the SQL, users will be able to set their PIX key');
    console.log('============================================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addPixKeyColumn();
