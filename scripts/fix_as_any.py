#!/usr/bin/env python3
"""
Batch remove safe 'as any' casts from Supabase queries.
Only removes when the table IS in the generated Database types.
"""
import re, os, glob

# Tables confirmed in Database types
KNOWN_TABLES = set(open('src/integrations/supabase/types.ts').read())
# Extract table names from types file
with open('src/integrations/supabase/types.ts') as f:
    content = f.read()
# Match table definitions: `tablename: {`
KNOWN_TABLES = set(re.findall(r'^\s+([a-z_][a-z0-9_]*):\s*\{', content, re.MULTILINE))

print(f"Found {len(KNOWN_TABLES)} known tables in Database types")

# Also check for Views
KNOWN_VIEWS = set(re.findall(r'^\s+\[key: string\]:', content))

# Tables NOT in types (keep as any for these)
NOT_IN_TYPES = {
    'regional_kpis', 'regional_goals', 'regional_rankings', 'regional_content',
    'v_compliance_overview', 'regulatory_frameworks', 'partner_certifications',
    'partner_applications', 'compliance_documents', 'compliance_audit_trail',
    'country_metrics', 'user_engagement_logs', 'health_rider_deliveries',
    'micro_insurance_claims', 'legal_documents'
}

stats = {'total': 0, 'removed': 0, 'kept': 0, 'files': 0}

for pattern in glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True):
    if 'types.ts' in pattern or '.test.' in pattern or 'node_modules' in pattern:
        continue
    
    with open(pattern, 'r') as f:
        original = f.read()
    
    if 'as any' not in original:
        continue
    
    stats['files'] += 1
    new_content = original
    
    # Pattern 1: .from('tablename' as any) where table IS known
    def replace_known_table(m):
        table = m.group(1)
        if table in KNOWN_TABLES and table not in NOT_IN_TYPES:
            stats['removed'] += 1
            return f".from('{table}')"
        stats['kept'] += 1
        return m.group(0)
    
    new_content = re.sub(
        r"\.from\('([^']+)'\s+as\s+any\)",
        replace_known_table,
        new_content
    )
    
    # Pattern 2: (supabase as any).from → supabase.from (if .from is used)
    new_content = re.sub(
        r'\(supabase\s+as\s+any\)\.from',
        'supabase.from',
        new_content
    )
    
    # Pattern 3: (supabase.functions as any).invoke → supabase.functions.invoke
    new_content = re.sub(
        r'\(supabase\.functions\s+as\s+any\)',
        'supabase.functions',
        new_content
    )
    
    if new_content != original:
        with open(pattern, 'w') as f:
            f.write(new_content)
        print(f"  Fixed: {pattern}")

print(f"\nStats: {stats['removed']} removed, {stats['kept']} kept (not in types), {stats['files']} files touched")
