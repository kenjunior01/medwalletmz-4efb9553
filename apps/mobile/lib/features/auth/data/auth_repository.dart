import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/utils/formatters.dart';
import '../domain/profile.dart';

/// Acesso ao Supabase Auth + tabela `profiles`.
///
/// Caminhos verificados contra as migrations:
///  - `profiles.user_id` é UNIQUE → upsert por user_id é seguro.
///  - Sign-up grava metadados (full_name, phone) em `auth.users.user_metadata`.
///  - Email é obrigatório no Supabase Auth; telefone usado para OTP.
class AuthRepository {
  AuthRepository(this._client);

  final SupabaseClient _client;

  GoTrueClient get _auth => _client.auth;
  Session? get currentSession => _auth.currentSession;
  User? get currentUser => _auth.currentUser;

  Future<AuthResponse> signInWithEmail({
    required String email,
    required String password,
  }) =>
      _auth.signInWithPassword(email: email, password: password);

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
    required String phone,
  }) =>
      _auth.signUp(
        email: email,
        password: password,
        emailRedirectTo: null,
        data: {
          'full_name': fullName,
          'phone': normalizeMzPhone(phone),
        },
      );

  /// Envia código OTP por SMS (login sem password).
  Future<void> sendOtp({required String phone}) =>
      _auth.signInWithOtp(phone: normalizeMzPhone(phone));

  /// Verifica o código de 6 dígitos recebido por SMS.
  Future<AuthResponse> verifyOtp({
    required String phone,
    required String token,
  }) =>
      _auth.verifyOTP(
        type: OtpType.sms,
        phone: normalizeMzPhone(phone),
        token: token.trim(),
      );

  Future<void> signOut() => _auth.signOut();

  /// Lê o perfil; cria-o na primeira sessão (auto-recuperação caso o
  /// trigger de signup não tenha corrido).
  Future<Profile?> fetchMyProfile() async {
    final uid = currentUser?.id;
    if (uid == null) return null;

    final rows = await _client
        .from('profiles')
        .select()
        .eq('user_id', uid)
        .limit(1);
    if (rows.isNotEmpty) return Profile.fromJson(rows.first);

    // Fallback: cria perfil a partir dos metadados da conta.
    final meta = currentUser?.userMetadata ?? const {};
    final inserted = await _client
        .from('profiles')
        .insert({
          'user_id': uid,
          'full_name': meta['full_name'] as String?,
          'phone': currentUser?.phone ?? meta['phone'] as String?,
        })
        .select()
        .single();
    return Profile.fromJson(inserted);
  }

  Future<void> updateProfile({
    required String userId,
    String? fullName,
    String? phone,
    String? defaultCity,
  }) {
    final patch = <String, dynamic>{
      if (fullName != null) 'full_name': fullName,
      if (phone != null) 'phone': normalizeMzPhone(phone),
      if (defaultCity != null) 'default_city': defaultCity,
    };
    return _client.from('profiles').update(patch).eq('user_id', userId);
  }
}
