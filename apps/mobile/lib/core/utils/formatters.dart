/// Formatação pt-MZ: moeda (MT), telefone (+258), datas relativas.
/// Implementação manual (sem dados de locale) para garantir
/// funcionamento em qualquer dispositivo.
library;

/// Formata valor em Meticais: 12345.5 → "12 345,50 MT".
String formatMZN(num value, {bool withSymbol = true}) {
  final negative = value < 0;
  final abs = value.abs();
  final cents = ((abs - abs.floorToDouble()) * 100).round();
  var intPart = abs.floor().toString();
  final buffer = StringBuffer();
  while (intPart.length > 3) {
    buffer.write(' ${intPart.substring(intPart.length - 3)}');
    intPart = intPart.substring(0, intPart.length - 3);
  }
  buffer.write(intPart);
  final grouped = buffer.toString().split('').reversed.join();
  final centsStr = cents.toString().padLeft(2, '0');
  final symbol = withSymbol ? ' MT' : '';
  return '${negative ? '-' : ''}$grouped,$centsStr$symbol';
}

/// Garante formato internacional: "841234567" → "+258841234567".
String normalizeMzPhone(String input) {
  var digits = input.replaceAll(RegExp(r'[\s\-()]'), '');
  if (digits.startsWith('+')) digits = digits.substring(1);
  if (digits.startsWith('258')) return '+$digits';
  if (digits.length == 9) return '+258$digits';
  return '+$digits';
}

bool isValidMzPhone(String input) {
  final n = normalizeMzPhone(input);
  return RegExp(r'^\+258(82|83|84|85|86|87|88)\d{7}$').hasMatch(n);
}

/// Máscara visual: "+258 84 123 4567".
String maskMzPhone(String raw) {
  final n = normalizeMzPhone(raw).replaceFirst('+', '');
  if (n.length < 12) return raw;
  return '+${n.substring(0, 3)} ${n.substring(3, 5)} ${n.substring(5, 8)} ${n.substring(8)}';
}

/// Data curta: "12 Set 2026".
const _monthsPt = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

String formatDateShort(DateTime d) => '${d.day.toString().padLeft(2, '0')} '
    '${_monthsPt[d.month - 1]} ${d.year}';

/// Data + hora: "12 Set 2026 · 14:30".
String formatDateTime(DateTime d) =>
    '${formatDateShort(d)} · ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

/// Hora simples "14:35".
String formatTimeOnly(DateTime d) =>
    '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

/// Relativo: "Hoje", "Ontem", "há 3 dias".
String formatRelative(DateTime d, {DateTime? now}) {  final ref = now ?? DateTime.now();
  final today = DateTime(ref.year, ref.month, ref.day);
  final target = DateTime(d.year, d.month, d.day);
  final days = today.difference(target).inDays;
  if (days == 0) return 'Hoje';
  if (days == 1) return 'Ontem';
  if (days == -1) return 'Amanhã';
  if (days > 1 && days < 7) return 'há $days dias';
  if (days < 0) {
    final future = -days;
    return future < 30 ? 'em $future dias' : formatDateShort(d);
  }
  return formatDateShort(d);
}

/// Primeiro nome: "Ana Maria Chissano" → "Ana".
String firstName(String? fullName) {
  if (fullName == null || fullName.trim().isEmpty) return 'Bem-vindo(a)';
  return fullName.trim().split(' ').first;
}

/// Iniciais do avatar: "Ana Chissano" → "AC".
String initials(String? fullName) {
  if (fullName == null || fullName.trim().isEmpty) return 'MW';
  final parts =
      fullName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
  if (parts.isEmpty) return 'MW';
  if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
  return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
      .toUpperCase();
}
