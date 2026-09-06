import 'dart:math' as math;

/// Distância great-circle (Haversine) em km — mesma fórmula usada pela
/// versão web (`haversineKm` em src/lib/googleRoutes.ts) para ordenar
/// instituições por proximidade.
double haversineKm({
  required double lat1,
  required double lon1,
  required double lat2,
  required double lon2,
}) {
  const r = 6371.0; // raio médio da Terra, km
  final dLat = _rad(lat2 - lat1);
  final dLon = _rad(lon2 - lon1);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_rad(lat1)) *
          math.cos(_rad(lat2)) *
          math.sin(dLon / 2) *
          math.sin(dLon / 2);
  return 2 * r * math.asin(math.sqrt(a));
}

double _rad(double deg) => deg * math.pi / 180.0;

/// Formata distância no estilo dos cartões web: "850 m" / "12,4 km".
String formatDistanceKm(double km) {
  if (km < 1) return '${(km * 1000).round()} m';
  return '${km.toStringAsFixed(1).replaceAll('.', ',')} km';
}
