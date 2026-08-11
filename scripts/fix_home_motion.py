#!/usr/bin/env python3
"""Replace framer-motion and premium component usage in Home.tsx with CSS-only equivalents."""
import re

PATH = "/home/z/my-project/medwalletmz/src/pages/Home.tsx"

with open(PATH, "r") as f:
    content = f.read()

# 1. Replace AnimatePresence + motion.div with plain div (tab content)
# Pattern: <AnimatePresence mode="wait">...<motion.div key="today" ...>
content = content.replace(
    '<AnimatePresence mode="wait">',
    '<!-- AnimatePresence removed — CSS page transitions handle this -->'
)

# 2. Replace motion.div with div (keep all props except motion-specific)
# <motion.div
#   key="today"
#   role="tabpanel"
#   id="today-panel"
#   aria-labelledby="today-tab"
#   initial={{ opacity: 0, y: 8 }}
#   animate={{ opacity: 1, y: 0 }}
#   exit={{ opacity: 0, y: -8 }}
#   transition={{ duration: 0.2 }}
#   className="space-y-6"
# >
content = re.sub(
    r'<motion\.div\s+key="today"\s+role="tabpanel"[^>]*className="space-y-6"\s*>',
    '<div\n            role="tabpanel"\n            id="today-panel"\n            aria-labelledby="today-tab"\n            className="space-y-6"\n          >',
    content
)
content = re.sub(
    r'<motion\.div\s+key="discover"\s+role="tabpanel"[^>]*className="space-y-6"\s*>',
    '<div\n            role="tabpanel"\n            id="discover-panel"\n            aria-labelledby="discover-tab"\n            className="space-y-6"\n          >',
    content
)

# 3. Replace closing </AnimatePresence>
content = content.replace('</AnimatePresence>', '')

# 4. Replace closing </motion.div> that wrap tab panels
# These are the ones right before the other tab content
content = content.replace('</motion.div>\n          ) : (', '</div>\n          ) : (')
content = content.replace('</motion.div>\n          )}', '</div>\n          )}')
content = content.replace('</motion.div>\n        )}', '</div>\n        )}')

# 5. Replace motion.button with button (keep className and onClick)
content = re.sub(
    r'<motion\.button\s+whileTap=\{\s*scale:\s*0\.98\s*\}\s+onClick=\{([^}]+)\}\s+aria-label=\{([^}]+)\}\s+className=\{([^}]+)\}\s*>',
    r'<button onClick={\1} aria-label={\2} className={\3}>',
    content
)

# 6. Replace ShimmerCard with a simple skeleton div
content = content.replace(
    '<ShimmerCard className="h-40 bg-gradient-to-br from-primary/20 to-primary/5" lines={2} />',
    '<div className="h-40 rounded-2xl bg-muted animate-pulse" />'
)
content = content.replace(
    '<ShimmerCard className="h-40" lines={2} />',
    '<div className="h-40 rounded-2xl bg-muted animate-pulse" />'
)

# 7. Replace GradientText with plain span + gradient class
content = content.replace(
    '<GradientText>{t(\'health.meddy_now\')}</GradientText>',
    '<span className="text-gradient-premium">{t(\'health.meddy_now\')}</span>'
)

# 8. Replace PulseRing with nothing (just remove it)
content = re.sub(
    r'<PulseRing[^/]*\s*/?>',
    '<!-- PulseRing removed -->',
    content
)

# 9. Replace NumberTicker with plain span
content = re.sub(
    r'<NumberTicker\s+value=\{Number\(wallet\?\.balance\s*\?\?\s*0\)\}\s+className="text-3xl font-black"\s+prefix=""\s+suffix=""\s*/?>',
    '<span className="text-3xl font-black tabular-nums">{Number(wallet?.balance ?? 0).toLocaleString()}</span>',
    content
)

# 10. Replace MagneticWrapper with plain div
content = content.replace('<MagneticWrapper>', '')
content = content.replace('</MagneticWrapper>', '')

# 11. Replace shadow-premium in urgent banner
content = content.replace(
    'shadow-premium relative overflow-hidden text-left group active:scale-95 transition-transform',
    'shadow-md relative overflow-hidden text-left group active:scale-95 transition-transform'
)

# 12. Replace blur-3xl in urgent banner
content = content.replace(
    'bg-secondary/10 rounded-full blur-3xl',
    'bg-secondary/10 rounded-full blur-none opacity-30'
)

# 13. Replace backdrop-blur-md in the urgent icon
content = content.replace(
    'bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-colors',
    'bg-white/15 flex items-center justify-center border border-white/20 transition-colors'
)

# 14. Remove shadow-glow from Crown icon
content = content.replace(
    'shadow-glow', ''
)

# 15. Fix the EnableNotificationsBanner reference (we removed import)
# It was already between the overlays section, just remove that line
content = content.replace(
    '<EnableNotificationsBanner />\n',
    ''
)

with open(PATH, "w") as f:
    f.write(content)

print("Done! Home.tsx de-motioned.")
# Count remaining motion references
remaining = content.count('motion.')
print(f"Remaining 'motion.' references: {remaining}")
remaining_premium = content.count('ShimmerCard') + content.count('GradientText') + content.count('PulseRing') + content.count('MagneticWrapper') + content.count('NumberTicker')
print(f"Remaining premium component refs: {remaining_premium}")
