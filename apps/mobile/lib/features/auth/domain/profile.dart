/// Perfil do utilizador — tabela `profiles` do Supabase.
class Profile {
  const Profile({
    required this.id,
    required this.userId,
    this.fullName,
    this.phone,
    this.avatarUrl,
    this.defaultCity,
  });

  final String id;
  final String userId;
  final String? fullName;
  final String? phone;
  final String? avatarUrl;
  final String? defaultCity;

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        fullName: json['full_name'] as String?,
        phone: json['phone'] as String?,
        avatarUrl: json['avatar_url'] as String?,
        defaultCity: json['default_city'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'full_name': fullName,
        'phone': phone,
        'avatar_url': avatarUrl,
        'default_city': defaultCity,
      };
}
