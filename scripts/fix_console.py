#!/usr/bin/env python3
"""
Replace console.* calls with logger.* in src/ files.

Rules:
  - console.log → logger.info
  - console.warn → logger.warn
  - console.error → logger.error
  - console.info → logger.info
  - console.debug → logger.debug

Exclusions:
  - src/lib/logger.ts
  - Test files (*.test.ts, *.test.tsx)
  - src/integrations/supabase/client.ts
  - src/main.tsx
  - console.error in catch blocks where error is re-thrown (none found in audit)

For console.error(e) with single non-string arg → logger.error('Unexpected error', { error: e })
For console.warn(e) with single non-string arg → logger.warn('Unexpected warning', { error: e })
For 3+ arg calls → wrap extra args in an array
"""

import re
import os
import glob

SRC_DIR = os.path.join(os.path.dirname(__file__), '..', 'src')

EXCLUDED_FILES = {
    'src/lib/logger.ts',
    'src/integrations/supabase/client.ts',
    'src/main.tsx',
}

METHOD_MAP = {
    'log': 'info',
    'warn': 'warn',
    'error': 'error',
    'info': 'info',
    'debug': 'debug',
}


def find_matching_close_paren(content: str, open_idx: int) -> int:
    """Find the matching close paren for an open paren at open_idx."""
    depth = 0
    i = open_idx
    while i < len(content):
        ch = content[i]
        if ch in ('"', "'", '`'):
            quote = ch
            i += 1
            while i < len(content) and content[i] != quote:
                if content[i] == '\\':
                    i += 1
                i += 1
        elif ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def split_args(args_str: str) -> list[str]:
    """Split a comma-separated arg list respecting nested parens/brackets/braces and strings."""
    args = []
    current = []
    depth = 0
    i = 0
    while i < len(args_str):
        ch = args_str[i]
        if ch in ('"', "'", '`'):
            quote = ch
            current.append(ch)
            i += 1
            while i < len(args_str) and args_str[i] != quote:
                if args_str[i] == '\\':
                    current.append(args_str[i])
                    i += 1
                current.append(args_str[i])
                i += 1
            if i < len(args_str):
                current.append(args_str[i])
        elif ch in ('(', '[', '{'):
            depth += 1
            current.append(ch)
        elif ch in (')', ']', '}'):
            depth -= 1
            current.append(ch)
        elif ch == ',' and depth == 0:
            args.append(''.join(current).strip())
            current = []
        else:
            current.append(ch)
        i += 1
    last = ''.join(current).strip()
    if last:
        args.append(last)
    return args


def is_string_literal(arg: str) -> bool:
    """Check if arg starts with a string quote (', ", `)."""
    arg = arg.strip()
    return bool(arg) and arg[0] in ('"', "'", '`')


def looks_like_error_var(arg: str) -> bool:
    """Check if an arg looks like an error variable (e, err, error, etc.)."""
    arg = arg.strip()
    # Not a string literal, looks like a variable name
    if is_string_literal(arg):
        return False
    # Simple variable patterns like: e, err, error, someError, e1, e2, etc.
    pattern = r'^[a-zA-Z_$][a-zA-Z0-9_$]*(\.(message|stack|error))?$'
    return bool(re.match(pattern, arg)) and not '(' in arg


def is_in_catch_block(content: str, call_start: int) -> bool:
    """Check if the position is inside a catch block."""
    # Look backwards for 'catch'
    before = content[:call_start]
    # Find the last 'catch' keyword before this position
    last_catch = before.rfind('catch')
    if last_catch == -1:
        return False
    # Check there's a corresponding opening brace after catch
    catch_section = before[last_catch:]
    brace_pos = catch_section.find('{')
    if brace_pos == -1:
        return False
    # Count braces between catch and our position
    section = catch_section[brace_pos:]
    depth = 0
    for ch in section:
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return False  # We exited the catch block
    return depth > 0  # Still inside the catch block


def process_file(filepath: str) -> tuple[int, list[str]]:
    """Process a single file, replacing console.* with logger.*."""
    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    replacements = []
    total_count = 0

    # Pattern to find console.XXX( calls
    pattern = re.compile(r'console\.(log|warn|error|info|debug)\s*\(')

    # We process from end to start to preserve indices
    matches = list(pattern.finditer(content))

    for match in reversed(matches):
        method = match.group(1)
        logger_method = METHOD_MAP[method]
        call_start = match.start()
        open_paren = match.end() - 1  # position of '('

        # Find matching close paren
        close_paren = find_matching_close_paren(content, open_paren)
        if close_paren == -1:
            continue

        args_str = content[open_paren + 1:close_paren].strip()
        args = split_args(args_str) if args_str else []

        # Build replacement
        new_call = f'logger.{logger_method}('

        if len(args) == 0:
            # console.log() → logger.info('')
            new_call += "''"
        elif len(args) == 1:
            arg = args[0]
            if method in ('error',) and not is_string_literal(arg) and is_in_catch_block(content, call_start):
                # console.error(e) in catch → logger.error('Unexpected error', { error: e })
                new_call += f"'Unexpected error', {{ error: {arg} }}"
            elif method in ('warn',) and not is_string_literal(arg):
                # console.warn(e) → logger.warn('Unexpected warning', { error: e })
                new_call += f"'Unexpected warning', {{ error: {arg} }}"
            elif method in ('error',) and not is_string_literal(arg):
                # console.error(e) outside catch → logger.error('Error', { error: e })
                new_call += f"'Error', {{ error: {arg} }}"
            else:
                new_call += arg
        elif len(args) == 2:
            # console.error("msg", e) → logger.error("msg", { error: e }) if in catch and second arg is error-like
            if method in ('error', 'warn') and is_in_catch_block(content, call_start) and looks_like_error_var(args[1]):
                new_call += f"{args[0]}, {{ error: {args[1]} }}"
            else:
                new_call += f"{args[0]}, {args[1]}"
        else:
            # 3+ args: wrap extras in array
            new_call += f"{args[0]}, [{', '.join(args[1:])}]"

        new_call += ')'

        # Preserve the trailing semicolon and whitespace after close paren
        after_close = content[close_paren + 1:]
        leading_ws = ''
        i = 0
        while i < len(after_close) and after_close[i] in (' ', '\t'):
            leading_ws += after_close[i]
            i += 1
        # Check for semicolon
        has_semi = i < len(after_close) and after_close[i] == ';'

        content = content[:call_start] + new_call + leading_ws + (';' if has_semi else '') + content[close_paren + 1 + len(leading_ws) + (1 if has_semi else 0):]

        total_count += 1
        line_num = original[:call_start].count('\n') + 1
        replacements.append(f"  Line {line_num}: console.{method} → logger.{logger_method}")

    if content != original:
        # Add logger import if needed
        has_logger_import = bool(re.search(r"import\s*\{[^}]*\blogger\b[^}]*\}\s*from\s*['\"]@/lib/logger['\"]", content))
        if not has_logger_import:
            # Find the last import statement
            import_matches = list(re.finditer(r'^import\s+.*?;\s*$', content, re.MULTILINE))
            if import_matches:
                last_import = import_matches[-1]
                insert_pos = last_import.end()
                content = content[:insert_pos] + "\nimport { logger } from '@/lib/logger';" + content[insert_pos:]
            else:
                # No imports found, add at top after any comments
                content = "import { logger } from '@/lib/logger';\n" + content

        with open(filepath, 'w') as f:
            f.write(content)

    return total_count, replacements


def main():
    total_files = 0
    total_replacements = 0

    all_files = []
    for ext in ('*.ts', '*.tsx'):
        all_files.extend(glob.glob(os.path.join(SRC_DIR, '**', ext), recursive=True))

    for filepath in sorted(all_files):
        rel_path = os.path.relpath(filepath, os.path.join(os.path.dirname(__file__), '..'))

        # Skip excluded files
        if rel_path in EXCLUDED_FILES:
            continue

        # Skip test files
        if '.test.' in rel_path:
            continue

        # Skip node_modules
        if 'node_modules' in filepath:
            continue

        # Check if file has any console.* calls
        with open(filepath, 'r') as f:
            content = f.read()

        if not re.search(r'console\.(log|warn|error|info|debug)\s*\(', content):
            continue

        count, replacements = process_file(filepath)
        if count > 0:
            total_files += 1
            total_replacements += count
            print(f"\n{rel_path}: {count} replacement(s)")
            for r in replacements:
                print(r)

    print(f"\n{'='*60}")
    print(f"Total: {total_replacements} replacements across {total_files} files")


if __name__ == '__main__':
    main()
