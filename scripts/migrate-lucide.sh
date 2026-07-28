#!/bin/bash
# Migrate all lucide-react imports to @/components/icons/lucide-compat
# Excludes lucide-compat.ts itself and .bak files

cd /home/z/my-project/medwalletmz

FILES=$(rg -l 'from ["'"'"']lucide-react["'"'"']' src/ | grep -v lucide-compat.ts | grep -v '\.bak$')

for f in $FILES; do
  echo "Migrating: $f"
  sed -i "s|from ['\"]lucide-react['\"]|from '@/components/icons/lucide-compat'|g" "$f"
done

echo ""
echo "Done! Verifying..."
REMAINING=$(rg -l 'from ["'"'"']lucide-react["'"'"']' src/ | grep -v lucide-compat.ts | grep -v '\.bak$' | wc -l)
echo "Files still using lucide-react directly: $REMAINING"
