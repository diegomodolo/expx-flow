#!/usr/bin/env python3
"""
Torna migrations PostgreSQL idempotentes. CUIDADOSAMENTE.
Garante NÃO mexer em statements que já estão dentro de DO $$ blocks.
"""
import re
import sys
from pathlib import Path

MIGRATIONS_DIR = Path("supabase/migrations")


def split_top_level_statements(content: str):
    """
    Divide o SQL em statements top-level (sem splitar dentro de DO $$...$$ ou strings).
    Retorna lista de (statement_text, was_inside_do_block).
    """
    statements = []
    i = 0
    n = len(content)
    cur = []
    in_single = False
    in_double = False
    in_dollar_tag = None  # name of the dollar quote tag if inside, e.g. "$$"
    depth_do_block = 0  # quantos DO $$ aninhados

    while i < n:
        c = content[i]
        nxt = content[i:i+2]

        # Comentário -- até final da linha
        if not in_single and not in_double and not in_dollar_tag and nxt == '--':
            j = content.find('\n', i)
            if j == -1:
                cur.append(content[i:])
                i = n
            else:
                cur.append(content[i:j])
                i = j
            continue

        # Comentário /* */
        if not in_single and not in_double and not in_dollar_tag and nxt == '/*':
            j = content.find('*/', i+2)
            if j == -1:
                cur.append(content[i:])
                i = n
            else:
                cur.append(content[i:j+2])
                i = j+2
            continue

        # Dollar-quoted string (for DO $$ ... $$ or function bodies)
        if not in_single and not in_double:
            m = re.match(r'\$[A-Za-z0-9_]*\$', content[i:])
            if m:
                tag = m.group(0)
                if in_dollar_tag is None:
                    in_dollar_tag = tag
                    cur.append(tag)
                    i += len(tag)
                    continue
                elif in_dollar_tag == tag:
                    # closing
                    cur.append(tag)
                    i += len(tag)
                    in_dollar_tag = None
                    continue
                # else: nested different tag — append
                cur.append(tag)
                i += len(tag)
                continue

        if in_dollar_tag is None:
            if c == "'" and not in_double:
                in_single = not in_single
            elif c == '"' and not in_single:
                in_double = not in_double

        cur.append(c)
        i += 1

    # Agora dividir por ; no nível top-level (fora de strings e dollar quotes)
    # Vamos refazer com split simples sobre o conteúdo acumulado — mas como já tokenizamos,
    # é mais fácil fazer um split de "$$...$$ blocks" primeiro e depois separar o resto por ;
    text = content
    # Substituir conteúdo de DO $$ ... $$ por placeholder
    placeholders = []

    def stash_do_block(m):
        placeholders.append(m.group(0))
        return f"\x00DO_BLOCK_{len(placeholders)-1}\x00"

    text = re.sub(
        r'DO\s+\$\w*\$\s*[\s\S]*?\$\w*\$;',
        stash_do_block,
        text,
    )
    # Também stash de function bodies CREATE FUNCTION ... AS $$ ... $$;
    # (estima que termina em ; fora do dollar quote)
    # Pular para simplicidade — assume que作者是bem comportado

    # Split por ;
    parts = text.split(';')
    out = []
    for p in parts:
        if not p.strip():
            continue
        # Restaurar placeholders
        def restore(m):
            idx = int(m.group(1))
            return placeholders[idx]
        restored = re.sub(r'\x00DO_BLOCK_(\d+)\x00', restore, p)
        # Re-adicionar ;
        if restored.rstrip().endswith(';'):
            out.append(restored)
        else:
            out.append(restored + ';')

    return out


def is_idempotent(stmt: str) -> bool:
    up = stmt.upper()
    return (
        "IF NOT EXISTS" in up
        or "IF EXISTS" in up
        or "CREATE OR REPLACE" in up
        or stmt.strip().startswith("DO ")
        or stmt.strip().upper().startswith("DO ")
    )


def _strip_leading_comments(s: str) -> str:
    """Remove comentários -- e /* */ do início para inspeção de keyword."""
    out = s.lstrip()
    while True:
        if out.startswith('--'):
            nl = out.find('\n')
            if nl == -1:
                return ''
            out = out[nl+1:].lstrip()
        elif out.startswith('/*'):
            end = out.find('*/')
            if end == -1:
                return ''
            out = out[end+2:].lstrip()
        else:
            return out


def transform_statement(stmt: str) -> str:
    """Aplica transformações de idempotência em um statement top-level."""
    s = stmt.strip()
    if not s:
        return stmt
    if is_idempotent(s):
        return stmt

    up = s.upper()
    sql_head = _strip_leading_comments(s)
    up_head = sql_head.upper()

    # CREATE TABLE sem IF NOT EXISTS
    m = re.match(r'(\s*)(create\s+table\b)(\s+)(?!if\s+not\s+exists)', sql_head, re.IGNORECASE)
    if m and "IF NOT EXISTS" not in up_head[:80]:
        # Aplicar sobre o sql_head, mantendo comentários prefix
        new_head = re.sub(r'(?i)^(\s*create\s+table\b)(\s+)(?!if\s+not\s+exists)', r'\1 IF NOT EXISTS\2', sql_head, count=1)
        # Reconstruir
        prefix = s[:s.index(sql_head)]
        return prefix + new_head.rstrip() + ';\n'

    # CREATE INDEX sem IF NOT EXISTS
    if re.match(r'\s*create\s+(?:unique\s+)?index\b', sql_head, re.IGNORECASE) and "IF NOT EXISTS" not in up_head[:80]:
        new_head = re.sub(r'(?i)^(\s*create\s+(?:unique\s+)?index\b)(\s+)(?!if\s+not\s+exists)', r'\1 IF NOT EXISTS\2', sql_head, count=1)
        prefix = s[:s.index(sql_head)]
        return prefix + new_head.rstrip() + ';\n'

    # ALTER TYPE ADD VALUE
    if re.match(r'\s*alter\s+type\b', sql_head, re.IGNORECASE) and 'ADD VALUE' in up_head and 'IF NOT EXISTS' not in up_head:
        new_head = re.sub(r'(?i)(add\s+value)\s+(?!if\s+not\s+exists)', r'\1 IF NOT EXISTS ', sql_head, count=1)
        prefix = s[:s.index(sql_head)]
        return prefix + new_head.rstrip() + ';\n'

    # CREATE TYPE X AS ENUM
    m = re.match(r'\s*create\s+type\b[^;]*?as\s+enum\s*\([^)]*\)\s*', sql_head, re.IGNORECASE | re.DOTALL)
    if m and "IF NOT EXISTS" not in up_head:
        body = sql_head.rstrip(';').rstrip().rstrip(';')
        indent = re.match(r'^(\s*)', s).group(1)
        return (
            f"{indent}DO $$ BEGIN\n"
            f"{indent}  {body.strip()};\n"
            f"{indent}EXCEPTION WHEN duplicate_object THEN null;\n"
            f"{indent}END $$;\n"
        )

    # ALTER TABLE ... ADD CONSTRAINT
    m = re.match(r'\s*alter\s+table\s+(?:public\.)?\w+\s+add\s+constraint\s+\w+\s+(?:unique|foreign\s+key|primary\s+key|check|default)\b', sql_head, re.IGNORECASE)
    if m and "IF NOT EXISTS" not in up_head:
        body = sql_head.rstrip(';').rstrip()
        indent = re.match(r'^(\s*)', s).group(1)
        return (
            f"{indent}DO $$ BEGIN\n"
            f"{indent}  {body.strip()};\n"
            f"{indent}EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;\n"
            f"{indent}END $$;\n"
        )

    # CREATE POLICY sem IF NOT EXISTS
    m = re.match(r'\s*create\s+policy\b\s+(?!if\s+not\s+exists)', sql_head, re.IGNORECASE)
    if m and "IF NOT EXISTS" not in up_head[:80]:
        body = sql_head.rstrip(';').rstrip()
        indent = re.match(r'^(\s*)', s).group(1)
        return (
            f"{indent}DO $$ BEGIN\n"
            f"{indent}  {body.strip()};\n"
            f"{indent}EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;\n"
            f"{indent}END $$;\n"
        )

    # INSERT INTO storage.buckets
    m = re.match(r'\s*insert\s+into\s+storage\.buckets\b', sql_head, re.IGNORECASE)
    if m and "ON CONFLICT" not in up_head:
        body = sql_head.rstrip(';').rstrip()
        indent = re.match(r'^(\s*)', s).group(1)
        return f"{indent}{body.strip()} ON CONFLICT (id) DO NOTHING;\n"

    # CREATE TRIGGER sem DROP TRIGGER antes
    # Extrai nome do trigger e tabela para inserir DROP TRIGGER IF EXISTS
    m = re.match(
        r'\s*create\s+(?:or\s+replace\s+)?trigger\s+(\S+)\s+.*?\bon\s+(\S+)\b',
        sql_head,
        re.IGNORECASE | re.DOTALL,
    )
    if m and "DROP TRIGGER" not in s.upper():
        trig_name = m.group(1)
        table_name = m.group(2)
        body = sql_head.rstrip(';').rstrip()
        indent = re.match(r'^(\s*)', s).group(1)
        return (
            f"{indent}DROP TRIGGER IF EXISTS {trig_name} ON {table_name};\n"
            f"{indent}{body.strip()};\n"
        )

    return stmt


def process_migration(content: str) -> str:
    statements = split_top_level_statements(content)
    out = []
    for stmt in statements:
        out.append(transform_statement(stmt))
    result = "\n".join(out)
    # Re-adiciona ; final se perdeu
    return result


def main():
    changed = []
    for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        original = sql_file.read_text(encoding="utf-8")
        # Skip migrations já marcadas self-host
        if "Self-host" in original[:300]:
            continue
        try:
            content = process_migration(original)
        except Exception as e:
            print(f"SKIP {sql_file.name}: {e}", file=sys.stderr)
            continue
        if content != original:
            sql_file.write_text(content, encoding="utf-8")
            changed.append(sql_file.name)

    print(f"Atualizados {len(changed)} arquivos:")
    for f in changed:
        print(f"  {f}")


if __name__ == "__main__":
    main()
