import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/ai/gemini_client.dart';

/// Scanner de Visão — paridade com `src/services/visionScanner.ts` da web.
///
/// Fluxo (idêntico ao web, 100% client-side, zero backend):
///   1. UPLOAD da imagem para o bucket `vision-scans/{uid}/{ts}.jpg`
///      (políticas de storage da migração 20260827000000);
///   2. INSERT da linha em `vision_scans` com scan_type;
///   3. EXTRAÇÃO IA (Gemini Vision, prompts por tipo copiados da web);
///   4. UPDATE da linha com os campos detectados + confiança.
/// Se a IA não estiver configurada, o registo fica `pending` e o ecrã
/// mostra a imagem + dica — o utilizador pode re-analisar depois.
class VisionScan {
  const VisionScan({
    required this.id,
    required this.scanType,
    required this.imageUrl,
    this.extractedData = const {},
    this.detectedMedications = const [],
    this.detectedResults = const [],
    this.detectedDoctor,
    this.detectedFacility,
    this.detectedDate,
    this.confidenceScore,
    this.wasReviewed = false,
    required this.createdAt,
  });

  final String id;
  final String scanType; // prescription|lab_result|medicine_label|…
  final String imageUrl;
  final Map<String, dynamic> extractedData;
  final List<DetectedMedication> detectedMedications;
  final List<DetectedLabResult> detectedResults;
  final String? detectedDoctor;
  final String? detectedFacility;
  final String? detectedDate;
  final double? confidenceScore;
  final bool wasReviewed;
  final DateTime createdAt;

  bool get isPending =>
      detectedMedications.isEmpty &&
      detectedResults.isEmpty &&
      extractedData.isEmpty;

  static const _typeLabels = {
    'prescription': 'Receita médica',
    'lab_result': 'Resultado de exames',
    'medicine_label': 'Rótulo de medicamento',
    'doctor_note': 'Nota do médico',
    'vaccine_card': 'Boletim de vacinas',
    'other': 'Outro documento',
  };
  String get typeLabel => _typeLabels[scanType] ?? 'Documento';

  static VisionScan fromMap(Map<String, dynamic> m) {
    return VisionScan(
      id: m['id'] as String,
      scanType: (m['scan_type'] ?? 'other') as String,
      imageUrl: (m['image_url'] ?? '') as String,
      extractedData:
          (m['extracted_data'] as Map<String, dynamic>?) ?? const {},
      detectedMedications: ((m['detected_medications'] as List<dynamic>?) ??
              const [])
          .map((e) => DetectedMedication.fromMap(e as Map<String, dynamic>))
          .toList(),
      detectedResults:
          ((m['detected_results'] as List<dynamic>?) ?? const [])
              .map((e) => DetectedLabResult.fromMap(e as Map<String, dynamic>))
              .toList(),
      detectedDoctor: m['detected_doctor'] as String?,
      detectedFacility: m['detected_facility'] as String?,
      detectedDate: m['detected_date'] as String?,
      confidenceScore: (m['confidence_score'] as num?)?.toDouble(),
      wasReviewed: (m['was_reviewed_by_user'] as bool?) ?? false,
      createdAt: DateTime.parse(m['created_at'] as String).toLocal(),
    );
  }
}

class DetectedMedication {
  const DetectedMedication({
    required this.name,
    this.dosage,
    this.frequency,
    this.duration,
  });
  final String name;
  final String? dosage;
  final String? frequency;
  final String? duration;

  static DetectedMedication fromMap(Map<String, dynamic> m) =>
      DetectedMedication(
        name: (m['name'] ?? '') as String,
        dosage: m['dosage'] as String?,
        frequency: m['frequency'] as String?,
        duration: m['duration'] as String?,
      );
}

class DetectedLabResult {
  const DetectedLabResult({
    required this.parameter,
    required this.value,
    this.unit,
    this.referenceRange,
    this.status,
  });
  final String parameter;
  final String value;
  final String? unit;
  final String? referenceRange;
  final String? status; // normal|high|low|critical

  bool get isAbnormal =>
      status == 'high' || status == 'low' || status == 'critical';

  static DetectedLabResult fromMap(Map<String, dynamic> m) =>
      DetectedLabResult(
        parameter: (m['parameter'] ?? '') as String,
        value: (m['value'] ?? '') as String,
        unit: m['unit'] as String?,
        referenceRange: m['reference_range'] as String?,
        status: m['status'] as String?,
      );
}

class VisionRepository {
  VisionRepository(this._sb);
  final SupabaseClient _sb;

  String? get _uid => _sb.auth.currentUser?.id;

  /// Últimos scans (histórico pessoal).
  Future<List<VisionScan>> fetchScans({int limit = 30}) async {
    final rows = await _sb
        .from('vision_scans')
        .select()
        .order('created_at', ascending: false)
        .limit(limit);
    return (rows as List)
        .map((m) => VisionScan.fromMap(m as Map<String, dynamic>))
        .toList();
  }

  /// Fluxo completo: upload → insert → IA → update. Devolve o scan
  /// actualizado. Se a IA falhar, devolve o scan "pending".
  Future<VisionScan> scanImage({
    required String filePath,
    required String scanType,
  }) async {
    final uid = _uid;
    if (uid == null) throw const AuthException('Sessão necessária');

    // 1. Upload (mesmo padrão de pastas da web: uid/timestamp.ext).
    final ext = filePath.split('.').last.toLowerCase();
    final path = '$uid/${DateTime.now().millisecondsSinceEpoch}.$ext';
    await _sb.storage.from('vision-scans').upload(
          path,
          File(filePath),
          fileOptions: const FileOptions(cacheControl: '3600', upsert: false),
        );
    final publicUrl =
        _sb.storage.from('vision-scans').getPublicUrl(path);

    // 2. Registo inicial.
    final row = await _sb
        .from('vision_scans')
        .insert({'user_id': uid, 'scan_type': scanType, 'image_url': publicUrl})
        .select()
        .single();
    var scan = VisionScan.fromMap(row);

    // 3. Extração IA (base64 lido do ficheiro local).
    try {
      final Uint8List bytes = await File(filePath).readAsBytes();
      final raw = await geminiAnalyzeImage(
        prompt: _promptFor(scanType),
        imageBase64: base64Encode(bytes),
      );
      final json = extractJson(raw);
      if (json != null) {
        scan = await _persistExtraction(scan.id, scanType, json);
      }
    } on GeminiUnavailable {
      // Fica pending — re-analisável mais tarde.
    }
    return scan;
  }

  /// Re-análise de um scan que ficou pendente.
  Future<VisionScan> reAnalyze(VisionScan scan) async {
    try {
      final json = extractJson(await geminiAnalyzeImage(
        prompt: _promptFor(scan.scanType),
        imageBase64: await _downloadAsBase64(scan.imageUrl),
      ));
      if (json != null) {
        return _persistExtraction(scan.id, scan.scanType, json);
      }
    } on GeminiUnavailable {
      // ignora — mantém pendente
    }
    return scan;
  }

  Future<void> markReviewed(String scanId) async {
    await _sb.from('vision_scans').update({'was_reviewed_by_user': true}).eq(
        'id', scanId);
  }

  // ── Internos ─────────────────────────────────────────────────────

  Future<VisionScan> _persistExtraction(
    String id,
    String scanType,
    Map<String, dynamic> json,
  ) async {
    final meds = (json['medications'] as List<dynamic>? ?? const [])
        .map((e) => {
              'name': e['name'],
              'dosage': e['dosage'],
              'frequency': e['frequency'],
              'duration': e['duration'],
            })
        .toList();
    final results = (json['results'] as List<dynamic>? ?? const [])
        .map((e) => {
              'parameter': e['parameter'],
              'value': e['value'],
              'unit': e['unit'],
              'reference_range': e['reference_range'],
              'status': e['status'],
            })
        .toList();
    final patch = <String, dynamic>{
      'extracted_data': json,
      'confidence_score': (json['confidence'] as num?)?.toDouble() ?? 0.8,
      'model_used': 'gemini',
    };
    if (meds.isNotEmpty) patch['detected_medications'] = meds;
    if (results.isNotEmpty) patch['detected_results'] = results;
    if (json['doctor'] is String) patch['detected_doctor'] = json['doctor'];
    if (json['facility'] is String) patch['detected_facility'] = json['facility'];
    if (json['lab_name'] is String && scanType == 'lab_result') {
      patch['detected_facility'] = json['lab_name'];
    }
    if (json['date'] is String) patch['detected_date'] = json['date'];
    if (json['test_name'] is String) {
      patch['detected_test_name'] = json['test_name'];
    }
    final row = await _sb
        .from('vision_scans')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
    return VisionScan.fromMap(row);
  }

  Future<String> _downloadAsBase64(String publicUrl) async {
    // Bucket público → download directo via http do SDK não é exposto;
    // usamos o path no storage do próprio projecto (url do getPublicUrl
    // contém /storage/v1/object/public/<bucket>/<path>).
    final marker = '/object/public/vision-scans/';
    final idx = publicUrl.indexOf(marker);
    if (idx < 0) throw const GeminiUnavailable('URL inválido');
    final path = publicUrl.substring(idx + marker.length);
    final bytes = await _sb.storage.from('vision-scans').download(path);
    return base64Encode(bytes);
  }

  /// Prompts por tipo — espelhos dos prompts da web (visionScanner.ts).
  String _promptFor(String type) {
    switch (type) {
      case 'prescription':
        return '''
Analisa esta imagem de receita médica e extrai:
- Medicamentos (nome, dosagem, frequência, duração)
- Nome do médico (campo "doctor")
- Nome da clínica/facilidade (campo "facility")
- Data da receita (campo "date", YYYY-MM-DD)
Responde APENAS com JSON:
{"medications":[{"name":"","dosage":"","frequency":"","duration":""}],
 "doctor":"","facility":"","date":"","confidence":0.9}
Se um campo não for legível, usa null. Não inventes dados.''';
      case 'lab_result':
        return '''
Analisa esta imagem de resultado de laboratório e extrai:
- Nome do teste (campo "test_name")
- Resultados: parâmetro, valor, unidade, range de referência,
  status (normal/high/low/critical)
- Data (YYYY-MM-DD) e laboratório (campo "lab_name")
Responde APENAS com JSON:
{"test_name":"","results":[{"parameter":"","value":"","unit":"",
 "reference_range":"","status":"normal"}],"date":"","lab_name":"",
 "confidence":0.9}
Se um campo não for legível, usa null. Não inventes dados.''';
      case 'medicine_label':
        return '''
Analisa esta imagem de rótulo de medicamento e extrai:
- Nome comercial, ingrediente activo, dosagem, fabricante,
  validade (YYYY-MM-DD), lote, instruções
Responde APENAS com JSON:
{"name":"","active_ingredient":"","dosage":"","manufacturer":"",
 "expiry_date":"","batch_number":"","instructions":"","confidence":0.9}
Se um campo não for legível, usa null.''';
      case 'vaccine_card':
        return '''
Analisa esta imagem de boletim/cartão de vacinas e extrai as vacinas:
Responde APENAS com JSON:
{"results":[{"parameter":"nome da vacina","value":"data de toma",
 "unit":"","reference_range":"","status":"normal"}],"date":"","facility":"",
 "confidence":0.9}
Cada vacina é uma entrada em "results" (parameter=nome, value=data/dose).
Se um campo não for legível, usa null.''';
      default:
        return '''
Analisa esta imagem de documento de saúde e descreve o conteúdo essencial.
Responde APENAS com JSON:
{"summary":"","date":"","doctor":"","facility":"","confidence":0.8}
"summary" em 2-3 frases em português. Não inventes dados.''';
    }
  }
}

final visionRepositoryProvider = Provider<VisionRepository>(
    (ref) => VisionRepository(Supabase.instance.client));
