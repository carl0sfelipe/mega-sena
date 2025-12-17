import { supabase } from '../src/config/database.js';

/**
 * Add quota_quantity column to participations table
 */
async function addQuotaQuantity() {
  console.log('='.repeat(60));
  console.log('🔧 ADDING QUOTA_QUANTITY COLUMN');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Note: Supabase doesn't support ALTER TABLE via the JS client
    // You need to run this SQL in the Supabase SQL Editor:

    const sql = `
-- Add quota_quantity column to participations table
ALTER TABLE participations
ADD COLUMN IF NOT EXISTS quota_quantity INTEGER DEFAULT 1 NOT NULL;

-- Add constraint to ensure quota_quantity is at least 1
ALTER TABLE participations
DROP CONSTRAINT IF EXISTS quota_quantity_positive;

ALTER TABLE participations
ADD CONSTRAINT quota_quantity_positive CHECK (quota_quantity > 0);

-- Update existing records to have quota_quantity = 1
UPDATE participations
SET quota_quantity = 1
WHERE quota_quantity IS NULL;
`;

    console.log('📋 Please run this SQL in your Supabase SQL Editor:');
    console.log('');
    console.log(sql);
    console.log('');
    console.log('💡 Instructions:');
    console.log('   1. Go to https://supabase.com/dashboard/project/vauwcvfashipzxfjnejg/sql');
    console.log('   2. Copy the SQL above');
    console.log('   3. Paste and run it');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Run
addQuotaQuantity();
