#!/usr/bin/env python3
"""
Compare MASTER_MIGRATION.sql with types.ts to identify discrepancies
"""
import re
import json
from collections import defaultdict

def extract_tables_from_types(file_path):
    """Extract table schemas from types.ts"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    tables = {}
    # Find all table definitions in the Row type
    table_pattern = r'(\w+):\s*{\s*Row:\s*{([^}]+(?:{[^}]*}[^}]*)*)'

    for match in re.finditer(table_pattern, content, re.MULTILINE | re.DOTALL):
        table_name = match.group(1)
        row_content = match.group(2)

        # Extract columns with their types
        columns = {}
        column_pattern = r'(\w+):\s*([^\n]+)'
        for col_match in re.finditer(column_pattern, row_content):
            col_name = col_match.group(1)
            col_type = col_match.group(2).strip()
            if col_name not in ['Insert', 'Update', 'Relationships']:
                columns[col_name] = col_type

        if columns:
            tables[table_name] = columns

    return tables

def extract_tables_from_migration(file_path):
    """Extract table schemas from MASTER_MIGRATION.sql"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    tables = {}
    enums = set()

    # Extract enum types
    enum_pattern = r'CREATE TYPE (\w+) AS ENUM'
    for match in re.finditer(enum_pattern, content):
        enums.add(match.group(1))

    # Extract CREATE TABLE statements
    table_pattern = r'CREATE TABLE (\w+)\s*\((.*?)^\);'

    for match in re.finditer(table_pattern, content, re.MULTILINE | re.DOTALL):
        table_name = match.group(1)
        table_body = match.group(2)

        columns = {}
        # Extract column definitions (simplified)
        column_pattern = r'^\s+(\w+)\s+([A-Z][^\s,\n]+(?:\([^)]*\))?)'

        for col_match in re.finditer(column_pattern, table_body, re.MULTILINE):
            col_name = col_match.group(1)
            col_type = col_match.group(2).strip()
            columns[col_name] = col_type

        tables[table_name] = columns

    return tables, enums

def map_pg_type_to_ts(pg_type, enums):
    """Map PostgreSQL type to expected TypeScript type"""
    pg_type_lower = pg_type.lower()

    # Handle arrays
    if '[]' in pg_type or 'ARRAY' in pg_type.upper():
        return 'array'

    # Handle JSON types
    if 'json' in pg_type_lower:
        return 'Json'

    # Handle UUID
    if 'uuid' in pg_type_lower:
        return 'string'

    # Handle numeric types
    if any(x in pg_type_lower for x in ['integer', 'int', 'serial', 'bigint']):
        return 'number'

    if any(x in pg_type_lower for x in ['numeric', 'decimal', 'real', 'double']):
        return 'number'

    # Handle boolean
    if 'boolean' in pg_type_lower or 'bool' in pg_type_lower:
        return 'boolean'

    # Handle text/string types
    if any(x in pg_type_lower for x in ['text', 'varchar', 'char', 'character']):
        return 'string'

    # Handle timestamp types
    if 'timestamp' in pg_type_lower or 'date' in pg_type_lower:
        return 'string'

    # Handle geography/geometry
    if 'geography' in pg_type_lower or 'geometry' in pg_type_lower or 'inet' in pg_type_lower:
        return 'unknown'

    # Check if it's an enum
    base_type = pg_type.split('(')[0].strip()
    if base_type in enums:
        return 'enum'

    return 'unknown'

def compare_schemas(types_tables, migration_tables, enums):
    """Compare the two schemas"""
    discrepancies = []

    types_set = set(types_tables.keys())
    migration_set = set(migration_tables.keys())

    # Tables in types but not in migration
    missing_in_migration = types_set - migration_set
    if missing_in_migration:
        discrepancies.append({
            'type': 'missing_table_in_migration',
            'tables': sorted(missing_in_migration)
        })

    # Tables in migration but not in types
    extra_in_migration = migration_set - types_set
    if extra_in_migration:
        discrepancies.append({
            'type': 'extra_table_in_migration',
            'tables': sorted(extra_in_migration)
        })

    # Compare columns for common tables
    common_tables = types_set & migration_set
    for table in sorted(common_tables):
        types_cols = set(types_tables[table].keys())
        migration_cols = set(migration_tables[table].keys())

        missing_cols = types_cols - migration_cols
        if missing_cols:
            discrepancies.append({
                'type': 'missing_columns',
                'table': table,
                'columns': sorted(missing_cols),
                'expected_types': {col: types_tables[table][col] for col in missing_cols}
            })

        extra_cols = migration_cols - types_cols
        if extra_cols:
            discrepancies.append({
                'type': 'extra_columns',
                'table': table,
                'columns': sorted(extra_cols)
            })

    return discrepancies

def main():
    print("Extracting schema from types.ts...")
    types_tables = extract_tables_from_types('src/integrations/supabase/types.ts')
    print(f"Found {len(types_tables)} tables in types.ts")

    print("\nExtracting schema from MASTER_MIGRATION.sql...")
    migration_tables, enums = extract_tables_from_migration('MASTER_MIGRATION.sql')
    print(f"Found {len(migration_tables)} tables in MASTER_MIGRATION.sql")
    print(f"Found {len(enums)} enum types")

    print("\nComparing schemas...")
    discrepancies = compare_schemas(types_tables, migration_tables, enums)

    print(f"\n{'='*80}")
    print(f"COMPARISON RESULTS: {len(discrepancies)} discrepancy groups found")
    print(f"{'='*80}\n")

    for i, disc in enumerate(discrepancies, 1):
        print(f"\n{i}. {disc['type'].upper().replace('_', ' ')}")
        print("-" * 60)

        if disc['type'] in ['missing_table_in_migration', 'extra_table_in_migration']:
            for table in disc['tables']:
                print(f"  - {table}")
                if disc['type'] == 'missing_table_in_migration' and table in types_tables:
                    print(f"    Columns: {', '.join(sorted(types_tables[table].keys())[:10])}")
                    if len(types_tables[table]) > 10:
                        print(f"    ... and {len(types_tables[table]) - 10} more")

        elif disc['type'] in ['missing_columns', 'extra_columns']:
            print(f"  Table: {disc['table']}")
            for col in disc['columns']:
                col_info = f"    - {col}"
                if 'expected_types' in disc:
                    col_info += f": {disc['expected_types'][col]}"
                print(col_info)

    # Print summary
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    print(f"Tables in types.ts: {len(types_tables)}")
    print(f"Tables in migration: {len(migration_tables)}")
    print(f"Common tables: {len(set(types_tables.keys()) & set(migration_tables.keys()))}")

    # List all tables in types.ts
    print(f"\nAll tables in types.ts ({len(types_tables)}):")
    for i, table in enumerate(sorted(types_tables.keys()), 1):
        print(f"  {i:2d}. {table} ({len(types_tables[table])} columns)")

if __name__ == '__main__':
    main()
