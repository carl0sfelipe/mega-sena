import { supabase } from '../src/config/database.js';

/**
 * Reset database - Clear all tables except historical_draws
 */
async function resetDatabase() {
  console.log('='.repeat(60));
  console.log('🔄 RESETTING DATABASE');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Delete in correct order (respecting foreign keys)
    console.log('🗑️  Deleting data...');

    // Delete final_bets
    const { error: betsError } = await supabase
      .from('final_bets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (betsError) {
      console.log('⚠️  No final_bets to delete or error:', betsError.message);
    } else {
      console.log('✅ Deleted final_bets');
    }

    // Delete number_scores
    const { error: scoresError } = await supabase
      .from('number_scores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (scoresError) {
      console.log('⚠️  No number_scores to delete or error:', scoresError.message);
    } else {
      console.log('✅ Deleted number_scores');
    }

    // Delete number_selections
    const { error: selectionsError } = await supabase
      .from('number_selections')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (selectionsError) {
      console.log('⚠️  No number_selections to delete or error:', selectionsError.message);
    } else {
      console.log('✅ Deleted number_selections');
    }

    // Delete participations
    const { error: participationsError } = await supabase
      .from('participations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (participationsError) {
      console.log('⚠️  No participations to delete or error:', participationsError.message);
    } else {
      console.log('✅ Deleted participations');
    }

    // Delete bolao
    const { error: bolaoError } = await supabase
      .from('bolao')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (bolaoError) {
      console.log('⚠️  No bolao to delete or error:', bolaoError.message);
    } else {
      console.log('✅ Deleted bolao');
    }

    // Delete non-admin users (keep Carlos as admin)
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('is_admin', false);

    if (usersError) {
      console.log('⚠️  No users to delete or error:', usersError.message);
    } else {
      console.log('✅ Deleted non-admin users');
    }

    console.log('');
    console.log('✅ Database reset completed!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Restart the server');
    console.log('   2. A new bolao will be created automatically on first access');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Run reset
resetDatabase();
