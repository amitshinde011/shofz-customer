import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bgcwvvosbpidxrabaotm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnY3d2dm9zYnBpZHhyYWJhb3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NjM3MzYsImV4cCI6MjA3NzAzOTczNn0.QxJYRuQ_hZMM4bo4Q8PI0wrXfnc8Gsy70bctt5oK1N0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
  console.log('=== INSPECTING SUPABASE DATABASE SCHEMA ===\n');

  // Get all tables
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (tablesError) {
    console.error('Error fetching tables:', tablesError);

    // Alternative: Try to list tables by querying each known table
    const knownTables = [
      'users', 'shops', 'products', 'inquiries', 'messages', 'orders',
      'offers', 'user_favorites', 'shop_categories', 'product_categories',
      'reviews', 'notifications', 'analytics_events'
    ];

    console.log('\nAttempting to verify tables by querying...\n');

    for (const tableName of knownTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`✓ Table exists: ${tableName} (count: ${count ?? 0})`);
        }
      } catch (e) {
        console.log(`✗ Table not found or inaccessible: ${tableName}`);
      }
    }

    return;
  }

  console.log('Tables found:', tables);

  // For each table, get column information
  for (const table of tables) {
    const tableName = table.table_name;

    const { data: columns } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `
    });

    console.log(`\n\n=== Table: ${tableName} ===`);
    console.log(JSON.stringify(columns, null, 2));

    // Get constraints
    const { data: constraints } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = '${tableName}'
        ORDER BY tc.constraint_type, tc.constraint_name;
      `
    });

    console.log(`\nConstraints for ${tableName}:`);
    console.log(JSON.stringify(constraints, null, 2));
  }
}

inspectDatabase().catch(console.error);
