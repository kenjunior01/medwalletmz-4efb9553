import 'dart:async';
import 'dart:convert';

import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// Cache OFFLINE da app (sqflite local, zero codegen).
///
/// Padrão stale-while-revalidate:
///   1. tenta a rede (timeout de 12 s);
///   2. se conseguir, grava a cópia fresca e devolve;
///   3. se falhar (sem internet / Supabase inacessível), serve a
///      última cópia guardada em disco — a app abre com dados reais
///      mesmo offline;
///   4. sem rede e sem cache, o erro propaga (os ecrãs já mostram os
///      seus painéis de erro / vazios).
///
/// Escolha técnica: sqflite em vez de Drift para evitar build_runner
/// (codegen) — a app compila em qualquer máquina sem passo extra.
/// Utilizado pelos repositórios críticos de saúde: laboratórios
/// (`labs_all`) e medicação planeada (`meds_planned`).
class OfflineCache {
  OfflineCache._();
  static final OfflineCache instance = OfflineCache._();

  Database? _db;
  bool _failed = false;

  Future<Database?> _open() async {
    if (_db != null) return _db;
    if (_failed) return null;
    try {
      _db = await openDatabase(
        p.join(await getDatabasesPath(), 'medwallet_cache.db'),
        version: 1,
        onCreate: (db, _) => db.execute(
          'CREATE TABLE IF NOT EXISTS cache_entries ('
          'key TEXT PRIMARY KEY, '
          'payload TEXT NOT NULL, '
          'updated_at INTEGER NOT NULL)',
        ),
      );
      return _db;
    } catch (_) {
      // ambiente sem sqlite (ex.: web sem sqflite_common_ffi) — cache
      // fica desligada e a app funciona só online, como antes.
      _failed = true;
      return null;
    }
  }

  /// Grava (ou substitui) a cópia de um payload JSON.
  Future<void> write(String key, String payload) async {
    final db = await _open();
    if (db == null) return;
    try {
      await db.insert(
        'cache_entries',
        {
          'key': key,
          'payload': payload,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } catch (_) {}
  }

  Future<String?> read(String key) async {
    final db = await _open();
    if (db == null) return null;
    try {
      final rows = await db.query(
        'cache_entries',
        where: 'key = ?',
        whereArgs: [key],
        limit: 1,
      );
      if (rows.isEmpty) return null;
      return rows.first['payload'] as String?;
    } catch (_) {
      return null;
    }
  }

  /// Lê uma lista de linhas guardada (usada pelos repositórios para
  /// reconstruir modelos a partir do cache).
  Future<List<Map<String, dynamic>>> readRows(String key) async {
    final cached = await read(key);
    if (cached == null || cached.isEmpty) return const [];
    try {
      final decoded = jsonDecode(cached);
      if (decoded is List) {
        return [
          for (final e in decoded) Map<String, dynamic>.from(e as Map),
        ];
      }
    } catch (_) {}
    return const [];
  }

  /// Rede-primeiro com fallback silencioso para a cópia local.
  ///
  /// `fetch` devolve as linhas cruas (mapas) da consulta Supabase; em
  /// sucesso são gravadas e devolvidas; em falha devolve-se o cache.
  /// Sem rede E sem cache, o erro original é re-lançado.
  Future<List<Map<String, dynamic>>> cachedList(
    String key, {
    required Future<List<Map<String, dynamic>>> Function() fetch,
  }) async {
    try {
      final fresh = await fetch().timeout(const Duration(seconds: 12));
      await write(key, jsonEncode(fresh));
      return fresh;
    } catch (_) {
      final cached = await readRows(key);
      if (cached.isNotEmpty) return cached;
      rethrow;
    }
  }
}
