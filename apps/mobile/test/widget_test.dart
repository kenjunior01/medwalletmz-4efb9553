// Teste de fumo básico do projecto.
//
// A app real (MedWalletApp) depende de Supabase/Firebase inicializados,
// pelo que não pode ser montada num widget test sem ambiente externo.
// Este teste existe apenas para manter o alvo `flutter test` funcional.

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ambiente de testes funciona', () {
    expect(true, isTrue);
  });
}
