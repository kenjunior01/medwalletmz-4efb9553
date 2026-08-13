#!/usr/bin/env python3
"""Fix double parentheses left by as any removal.
Pattern: .from('table')) → .from('table')
Also: (supabase.from('table')).select → supabase.from('table').select
"""
import re, glob

stats = {'files': 0, 'fixes': 0}

for pattern in glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True):
    if 'node_modules' in pattern:
        continue
    with open(pattern, 'r') as f:
        content = f.read()
    
    original = content
    
    # Pattern 1: .from('table')).select → .from('table').select
    content = re.sub(r"\.from\('([^']+)'\)\)\.", r".from('\1').", content)
    
    # Pattern 2: .from('table')) → .from('table')
    content = re.sub(r"\.from\('([^']+)'\)\)", r".from('\1')", content)
    
    # Pattern 3: (supabase.from('table')) → supabase.from('table')
    content = re.sub(r"\(supabase\.from\('([^']+)'\)\)", r"supabase.from('\1')", content)
    
    if content != original:
        fixes = len(original) - len(content)
        stats['files'] += 1
        stats['fixes'] += fixes
        with open(pattern, 'w') as f:
            f.write(content)
        print(f"  Fixed: {pattern} ({fixes} chars)")

print(f"\nFixed {stats['files']} files")
