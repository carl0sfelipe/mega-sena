import { supabase } from '../src/config/database.js';
import { CONFIG } from '../src/config/constants.js';

/**
 * Create initial bolão
 */
async function createBolao() {
  console.log('='.repeat(60));
  console.log('🎲 CREATING BOLÃO');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Check if bolão already exists
    const { data: existing } = await supabase
      .from('bolao')
      .select('id, name')
      .eq('status', CONFIG.BOLAO_STATUS.OPEN)
      .single();

    if (existing) {
      console.log('✅ Bolão already exists:', existing.name);
      console.log('');
      return;
    }

    // Create new bolão
    const { data: bolao, error } = await supabase
      .from('bolao')
      .insert({
        name: 'Bolão Mega da Virada 2026',
        quota_value: 10.00,
        status: CONFIG.BOLAO_STATUS.OPEN
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Bolão created successfully!');
    console.log('');
    console.log('📋 Details:');
    console.log(`   ID: ${bolao.id}`);
    console.log(`   Name: ${bolao.name}`);
    console.log(`   Quota Value: R$ ${bolao.quota_value}`);
    console.log(`   Status: ${bolao.status}`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Run
createBolao();
