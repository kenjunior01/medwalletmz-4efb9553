import 'package:supabase_flutter/supabase_flutter.dart';

/// Moradas do utilizador — tabela `addresses` (RLS por user_id),
/// MESMA base da versão web (`/addresses`): etiqueta, linha de
/// morada, cidade, bairro e padrão (is_default com a mesma sequência
/// de duas fases: limpar os outros → marcar este).
class AddressRepository {
  AddressRepository(this._client);

  final SupabaseClient _client;

  Future<List<Map<String, dynamic>>> fetchMyAddresses(String uid) async {
    final rows = await _client
        .from('addresses')
        .select()
        .eq('user_id', uid)
        .order('is_default', ascending: false)
        .order('created_at');
    return [for (final r in rows) Map<String, dynamic>.from(r)];
  }

  Future<void> addAddress({
    required String userId,
    required String label,
    required String addressLine,
    required String city,
    String? neighborhood,
    bool isDefault = false,
  }) async {
    // Se esta nasce como padrão, limpa os outros primeiro (web parity).
    if (isDefault) await _clearDefaults(userId);
    await _client.from('addresses').insert({
      'user_id': userId,
      'label': label,
      'address_line': addressLine,
      'city': city,
      if (neighborhood != null && neighborhood.isNotEmpty)
        'neighborhood': neighborhood,
      'is_default': isDefault,
    });
  }

  Future<void> updateAddress({
    required String id,
    required String label,
    required String addressLine,
    required String city,
    String? neighborhood,
  }) async {
    await _client.from('addresses').update({
      'label': label,
      'address_line': addressLine,
      'city': city,
      'neighborhood': neighborhood,
    }).eq('id', id);
  }

  /// Define a morada padrão — mesma sequência do web: primeiro limpa
  /// is_default de todas, depois marca a escolhida.
  Future<void> setDefault({
    required String userId,
    required String id,
  }) async {
    await _clearDefaults(userId);
    await _client.from('addresses').update({'is_default': true}).eq('id', id);
  }

  Future<void> _clearDefaults(String userId) async {
    await _client
        .from('addresses')
        .update({'is_default': false}).eq('user_id', userId);
  }

  Future<void> removeAddress(String id) =>
      _client.from('addresses').delete().eq('id', id);
}
