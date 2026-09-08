import 'package:supabase_flutter/supabase_flutter.dart';

/// Moradas do utilizador — tabela `addresses` (RLS por user_id).
class AddressRepository {
  AddressRepository(this._client);

  final SupabaseClient _client;

  Future<List<Map<String, dynamic>>> fetchMyAddresses(String uid) async {
    final rows = await _client
        .from('addresses')
        .select()
        .eq('user_id', uid)
        .order('created_at');
    return [for (final r in rows) Map<String, dynamic>.from(r)];
  }

  Future<void> addAddress({
    required String userId,
    required String label,
    required String addressLine,
    required String city,
  }) async {
    await _client.from('addresses').insert({
      'user_id': userId,
      'label': label,
      'address_line': addressLine,
      'city': city,
    });
  }

  Future<void> removeAddress(String id) =>
      _client.from('addresses').delete().eq('id', id);
}
