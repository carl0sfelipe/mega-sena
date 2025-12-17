import XLSX from 'xlsx';
import { supabase } from '../src/config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

// Excel file path
const EXCEL_FILE = path.join(projectRoot, 'Mega-Sena.xlsx');

/**
 * Parse Brazilian date format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
 * @param {string} dateStr - Date in DD/MM/YYYY format
 * @returns {string} Date in YYYY-MM-DD format
 */
function parseBrazilianDate(dateStr) {
  if (!dateStr) throw new Error('Date string is required');

  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  // Return ISO format
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Transform Excel row to database format
 * @param {object} row - Excel row object
 * @returns {object} Database-formatted record
 */
function transformRow(row) {
  try {
    return {
      contest_number: parseInt(row.Concurso),
      draw_date: parseBrazilianDate(row['Data do Sorteio']),
      number_1: parseInt(row.Bola1),
      number_2: parseInt(row.Bola2),
      number_3: parseInt(row.Bola3),
      number_4: parseInt(row.Bola4),
      number_5: parseInt(row.Bola5),
      number_6: parseInt(row.Bola6)
    };
  } catch (error) {
    console.error('Error transforming row:', row);
    throw error;
  }
}

/**
 * Validate transformed record
 * @param {object} record - Transformed record
 * @returns {boolean} True if valid
 */
function validateRecord(record) {
  // Check contest number
  if (!record.contest_number || record.contest_number < 1) {
    return false;
  }

  // Check date format
  if (!record.draw_date || !/^\d{4}-\d{2}-\d{2}$/.test(record.draw_date)) {
    return false;
  }

  // Check all numbers are valid (1-60)
  for (let i = 1; i <= 6; i++) {
    const num = record[`number_${i}`];
    if (!num || num < 1 || num > 60) {
      return false;
    }
  }

  return true;
}

/**
 * Insert records in batches to Supabase
 * @param {Array} records - Array of records to insert
 * @param {number} batchSize - Batch size for insert
 */
async function batchInsert(records, batchSize = 100) {
  const totalBatches = Math.ceil(records.length / batchSize);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    try {
      const { error } = await supabase
        .from('historical_draws')
        .upsert(batch, { onConflict: 'contest_number' });

      if (error) throw error;

      successCount += batch.length;
      console.log(`✅ Batch ${batchNumber}/${totalBatches}: Inserted ${batch.length} records (Total: ${successCount})`);
    } catch (error) {
      errorCount += batch.length;
      console.error(`❌ Batch ${batchNumber}/${totalBatches} failed:`, error.message);
      // Continue with next batch instead of failing completely
    }
  }

  return { successCount, errorCount };
}

/**
 * Main import function
 */
async function importHistoricalData() {
  console.log('='.repeat(60));
  console.log('📊 MEGA-SENA HISTORICAL DATA IMPORT');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 1: Read Excel file
    console.log('📁 Reading Excel file:', EXCEL_FILE);

    // Check if file exists
    if (!fs.existsSync(EXCEL_FILE)) {
      throw new Error(`File not found: ${EXCEL_FILE}`);
    }

    // Read file with proper options
    const workbook = XLSX.readFile(EXCEL_FILE, {
      type: 'file',
      cellDates: true,
      cellStyles: false
    });

    const sheetName = workbook.SheetNames[0];
    console.log(`📄 Reading sheet: "${sheetName}"`);

    const worksheet = workbook.Sheets[sheetName];

    // Fix incorrect range detection (xlsx bug with some Excel files)
    // Find actual extent by scanning all cells
    let maxRow = 1;
    for (let key in worksheet) {
      if (key[0] === '!') continue; // Skip special keys
      const cell = XLSX.utils.decode_cell(key);
      if (cell.r > maxRow) maxRow = cell.r;
    }

    // Update range if needed
    if (maxRow > 1) {
      const currentRange = worksheet['!ref'] || 'A1:T1';
      const newRange = `A1:T${maxRow + 1}`;
      worksheet['!ref'] = newRange;
      console.log(`📐 Adjusted range from ${currentRange} to ${newRange}`);
    }

    // Convert to JSON with proper options
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,       // Don't use raw values
      defval: null      // Default value for empty cells
    });

    console.log(`✅ Found ${rawData.length} rows in Excel file`);

    if (rawData.length === 0) {
      throw new Error('No data found in Excel file. The file may be empty or incorrectly formatted.');
    }

    console.log('');

    // Step 2: Transform data
    console.log('🔄 Transforming data...');
    const transformedRecords = [];
    const errors = [];

    for (let i = 0; i < rawData.length; i++) {
      try {
        const record = transformRow(rawData[i]);

        if (validateRecord(record)) {
          transformedRecords.push(record);
        } else {
          errors.push({ row: i + 2, reason: 'Validation failed', data: record });
        }
      } catch (error) {
        errors.push({ row: i + 2, reason: error.message, data: rawData[i] });
      }
    }

    console.log(`✅ Transformed ${transformedRecords.length} valid records`);
    if (errors.length > 0) {
      console.log(`⚠️  Skipped ${errors.length} invalid records`);
      if (errors.length <= 5) {
        console.log('Errors:', errors);
      }
    }
    console.log('');

    // Step 3: Insert into database
    console.log('💾 Inserting into Supabase...');
    const { successCount, errorCount } = await batchInsert(transformedRecords);

    // Step 4: Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('📈 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total rows in Excel:     ${rawData.length}`);
    console.log(`Valid records:           ${transformedRecords.length}`);
    console.log(`Successfully inserted:   ${successCount}`);
    console.log(`Failed:                  ${errorCount}`);
    console.log('');

    // Verify in database
    console.log('🔍 Verifying database...');
    const { data, error } = await supabase
      .from('historical_draws')
      .select('contest_number')
      .order('contest_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Verification failed:', error.message);
    } else if (data && data.length > 0) {
      console.log(`✅ Latest contest in database: ${data[0].contest_number}`);
    }

    console.log('');
    console.log('✅ Import completed successfully!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Run import
importHistoricalData();
