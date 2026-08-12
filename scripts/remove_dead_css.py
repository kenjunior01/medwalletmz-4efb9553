#!/usr/bin/env python3
"""Remove dead CSS from index.css:
1. Compliance Command Center section (lines 404-469)
2. MedWallet Creative Animations v1 (lines 1111-1350)
"""
import re

CSS_PATH = '/home/z/my-project/medwalletmz/src/index.css'

with open(CSS_PATH, 'r') as f:
    lines = f.readlines()

total_before = len(lines)

# Remove compliance section: lines 404-469 (0-indexed: 403-468)
# Find the section markers
compliance_start = None
compliance_end = None
v1_start = None
v1_end = None

for i, line in enumerate(lines):
    if 'Compliance Command Center' in line and compliance_start is None:
        # Go back to find the comment block start
        compliance_start = i
        while compliance_start > 0 and lines[compliance_start - 1].strip().startswith('/*'):
            compliance_start -= 1
    if compliance_start and compliance_end is None:
        # End is the line before the next major section
        if 'REGIONAL IDENTITY SYSTEM' in line:
            compliance_end = i
            while compliance_end > 0 and lines[compliance_end - 1].strip() == '':
                compliance_end -= 1
    if 'MEDWALLET CREATIVE ANIMATIONS' in line and 'v2' not in line and v1_start is None:
        v1_start = i - 1 if lines[i-1].strip() == '' else i
    if v1_start and v1_end is None:
        if 'MEDWALLET CREATIVE ANIMATIONS v2' in line:
            v1_end = i
            while v1_end > 0 and lines[v1_end - 1].strip() == '':
                v1_end -= 1

print(f'Compliance: lines {compliance_start+1}-{compliance_end+1} ({compliance_end - compliance_start + 1} lines)')
print(f'v1 Animations: lines {v1_start+1}-{v1_end+1} ({v1_end - v1_start + 1} lines)')

# Remove in reverse order to preserve line numbers
new_lines = lines[:]
for start, end in sorted([(v1_start, v1_end), (compliance_start, compliance_end)], reverse=True):
    # Remove lines and clean up double blanks
    del new_lines[start:end+1]
    # Remove trailing blank lines left behind
    while start > 0 and start < len(new_lines) and new_lines[start-1].strip() == '' and new_lines[start].strip() == '':
        del new_lines[start]

with open(CSS_PATH, 'w') as f:
    f.writelines(new_lines)

print(f'Removed {total_before - len(new_lines)} lines ({total_before} -> {len(new_lines)})')
