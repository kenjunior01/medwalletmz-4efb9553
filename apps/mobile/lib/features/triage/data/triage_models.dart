import 'package:flutter/material.dart';

// ═══════════════════════════════════════════════════════════════════
// Modelos da triagem — tabela `triage_logs` (schema real das migrations)
// ═══════════════════════════════════════════════════════════════════

/// Resultado da triagem (Edge Function `ai-triage` ou motor local).
class TriageResult {
  const TriageResult({
    required this.severity,
    required this.recommendation,
    required this.suggestedSpecialty,
    this.redFlags = const [],
    this.selfCare = const [],
    this.possibleCauses = const [],
    this.whenToSeekHelp,
    this.provider,
  });

  final String severity; // baixa | moderada | alta | emergência
  final String recommendation;
  final String suggestedSpecialty;
  final List<String> redFlags;
  final List<String> selfCare;
  final List<String> possibleCauses;
  final String? whenToSeekHelp;
  final String? provider;

  factory TriageResult.fromJson(Map<String, dynamic> json) {
    String severity = json['severity'] as String? ?? 'moderada';
    severity = severity.toLowerCase();
    return TriageResult(
      severity: severity,
      recommendation: json['recommendation'] as String? ?? '',
      suggestedSpecialty: json['suggested_specialty'] as String? ?? '',
      redFlags: (json['red_flags'] as List?)?.cast<String>() ?? const [],
      selfCare: (json['self_care'] as List?)?.cast<String>() ?? const [],
      possibleCauses: ((json['possible_causes'] as List?) ?? const [])
          .map((c) => c is Map ? (c['name'] as String? ?? '') : '$c')
          .where((s) => s.isNotEmpty)
          .toList(),
      whenToSeekHelp: json['when_to_seek_help'] as String?,
      provider: json['_provider'] as String?,
    );
  }
}

/// Resposta guardada — linha de `triage_logs`.
class TriageLog {
  const TriageLog({
    required this.id,
    required this.symptoms,
    required this.createdAt,
    this.age,
    this.duration,
    this.severity,
    this.recommendation,
    this.suggestedSpecialty,
  });

  final String id;
  final String symptoms;
  final int? age;
  final String? duration;
  final String? severity;
  final String? recommendation;
  final String? suggestedSpecialty;
  final DateTime createdAt;

  factory TriageLog.fromJson(Map<String, dynamic> j) => TriageLog(
        id: j['id'] as String,
        symptoms: (j['symptoms'] ?? '') as String,
        age: (j['age'] as num?)?.toInt(),
        duration: j['duration'] as String?,
        severity: j['severity'] as String?,
        recommendation: j['recommendation'] as String?,
        suggestedSpecialty: j['suggested_specialty'] as String?,
        createdAt: DateTime.tryParse(j['created_at']?.toString() ?? '') ??
            DateTime.now(),
      );
}

/// Rascunho recolhido pelo assistente em 5 passos.
class TriageDraft {
  const TriageDraft({
    required this.symptoms,
    this.age,
    this.duration = 'Não sei dizer',
    this.severity = 'moderada',
    this.contexts = const [],
    this.freeText = '',
  });

  final List<String> symptoms; // seleccionados do catálogo
  final int? age;
  final String duration; // rótulo escolhido
  final String severity; // leve | moderada | severa | emergência
  final List<String> contexts; // grávida, crónico, medicação…
  final String freeText;

  String get composedSymptoms {
    final parts = [...symptoms];
    if (freeText.trim().isNotEmpty) parts.add(freeText.trim());
    if (contexts.isNotEmpty) parts.add('Contexto: ${contexts.join(', ')}');
    return parts.join('; ');
  }

  /// Texto completo enviado à IA e guardado em `triage_logs.symptoms`.
  String get aiInput => '$composedSymptoms (duração: $duration)';
}

// ═══════════════════════════════════════════════════════════════════
// Catálogo de sintomas (agrupados por área do corpo)
// ═══════════════════════════════════════════════════════════════════

class TriageSymptomGroup {
  const TriageSymptomGroup(this.area, this.emoji, this.symptoms);

  final String area;
  final String emoji;
  final List<String> symptoms;
}

const triageSymptomGroups = <TriageSymptomGroup>[
  TriageSymptomGroup('Cabeça e garganta', '🧠', [
    'Dor de cabeça',
    'Febre',
    'Dor de garganta',
    'Tosse',
    'Congestão nasal',
    'Tonturas',
    'Dificuldade em engolir',
  ]),
  TriageSymptomGroup('Peito e respiração', '🫁', [
    'Dor no peito',
    'Dificuldade em respirar',
    'Chiado no peito',
    'Palpitações',
    'Tosse com sangue',
  ]),
  TriageSymptomGroup('Barriga e digestão', '🍽️', [
    'Dor abdominal',
    'Náusea',
    'Vómitos',
    'Diarreia',
    'Prisão de ventre',
    'Azia',
  ]),
  TriageSymptomGroup('Pele e alergias', '🩹', [
    'Erupção cutânea',
    'Comichão',
    'Inchaço',
    'Picada de insecto',
    'Queimadura',
    'Ferida que não cura',
  ]),
  TriageSymptomGroup('Ossos e músculos', '🦴', [
    'Dor nas costas',
    'Dor articular',
    'Entorse',
    'Fratura suspeita',
    'Dor muscular',
  ]),
  TriageSymptomGroup('Saúde mental', '🧘', [
    'Ansiedade',
    'Tristeza persistente',
    'Insónia',
    'Stress intenso',
  ]),
  TriageSymptomGroup('Olhos e ouvidos', '👁️', [
    'Dor de ouvido',
    'Visão enevoada',
    'Olho vermelho',
    'Zumbido no ouvido',
  ]),
  TriageSymptomGroup('Criança', '🧒', [
    'Febre na criança',
    'Vómitos na criança',
    'Diarreia na criança',
    'Choro intenso e persistente',
  ]),
];

const triageDurations = <String>[
  'Menos de 1 dia',
  '1–3 dias',
  '4–7 dias',
  '1–4 semanas',
  'Mais de 1 mês',
  'Não sei dizer',
];

const triageSeverityOptions = <(String, String, String, IconData)>[
  // (chave, rótulo, descrição, ícone)
  ('leve', 'Leve', 'Incomoda, mas consigo fazer tudo normalmente',
      Icons.sentiment_satisfied_rounded),
  ('moderada', 'Moderada', 'Atrapalha o meu dia-a-dia',
      Icons.sentiment_neutral_rounded),
  ('severa', 'Severa', 'Não consigo fazer as actividades normais',
      Icons.sentiment_very_dissatisfied_rounded),
  ('emergência', 'Emergência', 'Situação muito grave ou que piora rápido',
      Icons.emergency_rounded),
];

const triageContextOptions = <String>[
  'Gravidez',
  'Doença crónica (ex.: HIV, diabetes, tensão alta)',
  'Tomo medicação contínua',
  'Tenho alergias conhecidas',
  'Recuperação de cirurgia',
];

// ═══════════════════════════════════════════════════════════════════
// Motor local — fallback quando a Edge Function `ai-triage` falha.
// Regras por palavras-chave → especialidade + orientação.
// ═══════════════════════════════════════════════════════════════════

const _emergencyKeywords = <String>[
  'dificuldade respirar',
  'dor no peito',
  'convuls',
  'inconsciente',
  'sangramento intenso',
  'tosse com sangue',
  'fratura',
  'emergência',
];

/// (palavra-chave, especialidade) — avaliado por ordem.
const _specialtyRules = <(String, String)>[
  ('criança', 'Pediatria'),
  ('bebe', 'Pediatria'),
  ('pele', 'Dermatologia'),
  ('comichão', 'Dermatologia'),
  ('erupção', 'Dermatologia'),
  ('ansiedade', 'Psicologia'),
  ('tristeza', 'Psicologia'),
  ('insónia', 'Psicologia'),
  ('stress', 'Psicologia'),
  ('olho', 'Oftalmologia'),
  ('visão', 'Oftalmologia'),
  ('ouvido', 'Clínica Geral'),
  ('dente', 'Odontologia'),
  ('boca', 'Odontologia'),
  ('gravidez', 'Ginecologia'),
  ('menstruação', 'Ginecologia'),
  ('entorse', 'Ortopedia'),
  ('costas', 'Ortopedia'),
  ('articular', 'Ortopedia'),
  ('dieta', 'Nutrição'),
  ('peso', 'Nutrição'),
  ('diabetes', 'Nutrição'),
];

/// Motor local mínimo (espelha o fallback do edge function) com
/// recomendação de especialidade para dar sequência à consulta.
TriageResult localTriage(TriageDraft draft) {
  final text = draft.composedSymptoms.toLowerCase();

  final isEmergency = draft.severity == 'emergência' ||
      _emergencyKeywords.any(text.contains);
  if (isEmergency) {
    return const TriageResult(
      severity: 'emergência',
      recommendation:
          'Os teus sintomas podem indicar uma emergência. Procura '
          'imediatamente o hospital mais próximo ou liga para o INAS '
          '(84 146) / Linha Verde 117. Não esperes pela consulta agendada.',
      suggestedSpecialty: 'Emergência',
      redFlags: [
        'Sintomas potencialmente graves descritos',
        'Se houver agravamento rápido, vai ao serviço de urgência',
      ],
      provider: 'local_rules',
    );
  }

  // Especialidade pela primeira regra que corresponde.
  String specialty = 'Clínica Geral';
  for (final (keyword, target) in _specialtyRules) {
    if (text.contains(keyword)) {
      specialty = target;
      break;
    }
  }

  final severe = draft.severity == 'severa' ||
      draft.duration == 'Mais de 1 mês';
  final severityLabel = severe ? 'alta' : 'moderada';

  return TriageResult(
    severity: severityLabel,
    recommendation: severe
        ? 'Os sintomas descritos merecem avaliação médica próxima. '
            'Recomenda-se agendar consulta de $specialty nas próximas '
            '24–48 horas.'
        : 'Com base no que descreveste, uma consulta de $specialty é o '
            'passo recomendado. Enquanto esperas, segue os auto-cuidados '
            'e monitoriza a evolução dos sintomas.',
    suggestedSpecialty: specialty,
    selfCare: const [
      'Mantém-te hidratado e descansa',
      'Monitoriza a evolução dos sintomas',
      'Se piorares, procura cuidado imediato',
    ],
    whenToSeekHelp: severe
        ? 'Se os sintomas piorarem nas próximas 24 horas, vai ao serviço '
            'de saúde mais próximo.'
        : 'Se não melhorar em 3 dias, agenda a consulta com o '
            'especialista recomendado.',
    provider: 'local_rules',
  );
}
