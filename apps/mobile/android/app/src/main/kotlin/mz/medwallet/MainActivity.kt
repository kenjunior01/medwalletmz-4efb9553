package mz.medwallet

import io.flutter.embedding.android.FlutterFragmentActivity

/// FlutterFragmentActivity (não FlutterActivity): exigido pelo
/// local_auth para mostrar o prompt de biometria do sistema
/// (BiometricPrompt só funciona sobre FragmentActivity).
class MainActivity : FlutterFragmentActivity()
