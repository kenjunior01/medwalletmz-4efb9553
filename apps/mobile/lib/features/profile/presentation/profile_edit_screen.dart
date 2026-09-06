import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/presentation/auth_controller.dart';

/// Editar perfil: nome, telefone, cidade e foto (bucket `avatars`,
/// caminho `{uid}/avatar.{ext}` com upsert — igual à web).
class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _city = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  bool _uploading = false;
  String? _avatarUrl;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final repo = ref.read(authRepositoryProvider);
      final profile = await repo.fetchMyProfile();
      if (!mounted) return;
      setState(() {
        _name.text = profile?.fullName ?? '';
        _phone.text = profile?.phone ?? '';
        _city.text = profile?.defaultCity ?? '';
        _avatarUrl = profile?.avatarUrl;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Text(
                      'Editar perfil',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Center(
                              child: GestureDetector(
                                onTap: _pickAndUploadAvatar,
                                child: Stack(
                                  children: [
                                    Container(
                                      width: 96,
                                      height: 96,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        gradient: const LinearGradient(
                                            colors:
                                                AppColors.heroCardGradient),
                                        border: Border.all(
                                            color: Colors.white
                                                .withOpacity(0.22)),
                                      ),
                                      child: _avatarWidget(),
                                    ),
                                    Positioned(
                                      right: 0,
                                      bottom: 0,
                                      child: Container(
                                        width: 30,
                                        height: 30,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: AppColors.accent,
                                          border: Border.all(
                                              color: const Color(0xFF0B1D31),
                                              width: 2.5),
                                        ),
                                        child: _uploading
                                            ? const Padding(
                                                padding: EdgeInsets.all(6),
                                                child:
                                                    CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                        color: Colors.white),
                                              )
                                            : const Icon(Icons.edit_rounded,
                                                size: 15, color: Colors.white),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ).animate().fadeIn(duration: 300.ms),
                            const SizedBox(height: 8),
                            const Center(
                              child: Text(
                                'Toque na foto para alterar',
                                style: TextStyle(
                                    color: AppColors.textMuted, fontSize: 12),
                              ),
                            ),
                            const SizedBox(height: 22),
                            TextField(
                              controller: _name,
                              style: const TextStyle(
                                  color: AppColors.textPrimary),
                              decoration: const InputDecoration(
                                labelText: 'Nome completo',
                                prefixIcon: Icon(Icons.person_rounded),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _phone,
                              keyboardType: TextInputType.phone,
                              style: const TextStyle(
                                  color: AppColors.textPrimary),
                              decoration: const InputDecoration(
                                labelText: 'Telefone',
                                hintText: '+258 84 123 4567',
                                prefixIcon: Icon(Icons.phone_rounded),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _city,
                              style: const TextStyle(
                                  color: AppColors.textPrimary),
                              decoration: const InputDecoration(
                                labelText: 'Cidade',
                                hintText: 'Maputo, Matola, Beira…',
                                prefixIcon:
                                    Icon(Icons.location_city_rounded),
                              ),
                            ),
                            const SizedBox(height: 26),
                            GradientButton(
                              label: 'Guardar alterações',
                              icon: Icons.save_rounded,
                              loading: _saving,
                              onPressed: _save,
                            ),
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _avatarWidget() {
    if (_avatarUrl != null && _avatarUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(48),
        child: Image.network(
          _avatarUrl!,
          fit: BoxFit.cover,
          width: 94,
          height: 94,
          errorBuilder: (_, __, ___) => const Icon(Icons.person_rounded,
              color: Colors.white, size: 40),
        ),
      );
    }
    final initial = _name.text.trim().isNotEmpty
        ? _name.text.trim()[0].toUpperCase()
        : 'U';
    return Center(
      child: Text(
        initial,
        style: const TextStyle(
            color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800),
      ),
    );
  }

  Future<void> _pickAndUploadAvatar() async {
    if (_uploading) return;
    final uid = ref.read(currentUserIdProvider);
    if (uid == null) return;
    final picker = ImagePicker();
    final XFile? file;
    try {
      file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 82);
    } catch (_) {
      return;
    }
    if (file == null) return;

    setState(() => _uploading = true);
    try {
      final client = Supabase.instance.client;
      final bytes = await file.readAsBytes();
      final ext = file.name.split('.').last.toLowerCase();
      final safeExt = (ext.length == 3 || ext.length == 4) ? ext : 'jpg';
      final path = '$uid/avatar.$safeExt';
      await client.storage.from('avatars').uploadBinary(
            path,
            bytes,
            fileOptions: const FileOptions(upsert: true),
          );
      final publicUrl = client.storage.from('avatars').getPublicUrl(path);
      final bust = '$publicUrl?v=${DateTime.now().millisecondsSinceEpoch}';
      await client
          .from('profiles')
          .update({'avatar_url': bust}).eq('user_id', uid);
      ref.invalidate(profileProvider);
      if (mounted) {
        setState(() => _avatarUrl = bust);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Foto actualizada')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível enviar a foto')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _save() async {
    if (_saving) return;
    if (_name.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('O nome é obrigatório')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(authRepositoryProvider).updateProfile(
            userId: ref.read(currentUserIdProvider)!,
            fullName: _name.text.trim(),
            phone: _phone.text.trim(),
            defaultCity: _city.text.trim(),
          );
      ref.invalidate(profileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Perfil actualizado com sucesso')),
        );
        context.pop();
      }
    } on PostgrestException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao guardar: ${e.message}')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Falha de rede. Tenta de novo.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
