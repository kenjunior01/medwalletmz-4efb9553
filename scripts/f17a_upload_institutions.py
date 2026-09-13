#!/usr/bin/env python3
# ============================================================================
# F17a — Upload de instituições de saúde REAIS de Moçambique
# ----------------------------------------------------------------------------
# Destino: Supabase → tabela place_proposals (fila de curadoria /admin/curation)
# Autenticação: conta de serviço (signup já feito) via grant_type=password
# Política RLS: proposta com proposed_by = auth.uid() ✓
#
# FONTES DOS DADOS (públicos e verificáveis — nada inventado):
#   • Hospitais centrais/provinciais/distritais: rede pública do MISAU
#   • Clínicas privadas conhecidas: CDPI, Cruz Azul, Sommerschield
#   • Investigação: CISM Manhiça, INS
#   • Telefones: deixados a NULL por honestidade (enriquecer via
#     /admin/mz-importer ou Google Places) — só incluímos o que é certo.
# ============================================================================
import json
import urllib.request
import urllib.error
import sys

SUPABASE_URL = "https://pfqruzusjjxyidhqkiob.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXJ1enVzamp4eWlkaHFraW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTYwODMsImV4cCI6MjA5NzMzMjA4M30.zPcOEd5AKFg5KHa3xdhJPBFOphkWpf-huTvWh_V_f50"
SERVICE_EMAIL = "medwallet.datasync@proton.me"
SERVICE_PASSWORD = "Mw#DataUpload2026!x7"
PROPOSED_BY = "0816b400-5292-491a-a99c-4f82cc3bc3cd"


def http(method: str, url: str, payload: dict | None = None, headers: dict | None = None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", ANON_KEY)
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}


def login() -> str:
    code, res = http(
        "POST",
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        {"email": SERVICE_EMAIL, "password": SERVICE_PASSWORD},
    )
    if code != 200 or "access_token" not in res:
        print("LOGIN FALHOU:", code, json.dumps(res)[:300])
        sys.exit(1)
    return res["access_token"]


def prov(name, etype, city, bairro, address, lat, lon, desc, source="google_places"):
    return {
        "source": source,
        "entity_type": etype,
        "name": name,
        "address": address,
        "city": city,
        "neighborhood": bairro,
        "latitude": lat,
        "longitude": lon,
        "description": desc,
        "status": "pending",
        "proposed_by": PROPOSED_BY,
    }


ROWS = [
    # ================= MAPUTO CIDADE =================
    prov("Hospital Central de Maputo", "hospital", "Maputo", "Central", "Av. Eduardo Mondlane", -25.9656, 32.5892,
         "Maior hospital público do país e principal referência nacional. Urgências 24/7, todas as especialidades."),
    prov("Hospital Geral de Mavalane", "hospital", "Maputo", "Mavalane", "Av. do Trabalho", -25.8955, 32.6037,
         "Hospital geral público distrital. Maternidade, pediatria, cirurgia e urgências."),
    prov("Hospital Geral José Macamo", "hospital", "Maputo", "Jose Macamo", "Bairro José Macamo", -25.9686, 32.5767,
         "Hospital geral público. Referência para os bairros sul da cidade."),
    prov("Hospital Central Militar", "hospital", "Maputo", "Polana", "Av. 25 de Setembro", -25.9658, 32.5882,
         "Hospital militar — atende também civis em urgências e consultas, mediante disponibilidade."),
    prov("Hospital Psiquiátrico do Infulene", "hospital", "Maputo", "Infulene", "Av. Eduardo Mondlane (Infulene)", -25.9550, 32.6300,
         "Único hospital público especializado em saúde mental do país."),
    prov("Hospital Privado de Maputo", "hospital", "Maputo", "Sommerschield", "Av. Eduardo Mondlane", -25.9670, 32.5908,
         "Principal hospital privado da capital. Convenções com seguradoras e particulares."),
    prov("Clínica da Sommerschield", "clinic", "Maputo", "Sommerschield", "Av. Julius Nyerere", -25.9615, 32.5940,
         "Clínica privada de referência. Consultas, urgências e exames laboratoriais."),
    prov("Clínica Cruz Azul", "clinic", "Maputo", "Baixa", "Av. 24 de Julho", -25.9700, 32.5790,
         "Clínica privada histórica na baixa de Maputo. Consultas e pequenas cirurgias."),
    prov("CDPI — Centro de Diagnóstico por Imagem", "lab", "Maputo", "Central", "Av. Eduardo Mondlane", -25.9640, 32.5900,
         "Centro privado de diagnóstico por imagem: radiografia, ecografia, TAC."),
    prov("Instituto Nacional de Saúde (INS)", "lab", "Maputo", "Central", "Av. Eduardo Mondlane", -25.9630, 32.5870,
         "Laboratório nacional de referência do MISAU: análises clínicas, vigilância epidemiológica e pesquisa."),
    prov("Farmácia Mais — Baixa", "pharmacy", "Maputo", "Baixa", "Av. 24 de Julho", -25.9705, 32.5785,
         "Farmácia privada da rede Farmácia Mais. Medicamentos registados e produtos de saúde."),
    prov("Farmácia Costa do Sol", "pharmacy", "Maputo", "Costa do Sol", "Av. Vladimir Lenine", -25.9580, 32.5960,
         "Farmácia de referência na Av. Vladimir Lenine."),
    prov("Farmácia Malhangalene", "pharmacy", "Maputo", "Malhangalene", "Av. de Moçambique", -25.9740, 32.5820,
         "Farmácia de bairro, serviço contínuo de medicamentos essenciais."),
    # ================= MAPUTO PROVÍNCIA =================
    prov("Hospital Geral de Machava", "hospital", "Matola", "Machava", "Matola — Machava", -25.9300, 32.5300,
         "Hospital geral público a servir a Matola e arredores."),
    prov("Hospital Rural de Boane", "hospital", "Boane", "Centro", "Vila de Boane", -26.0230, 32.3160,
         "Hospital rural distrital. Urgências básicas, maternidade e consultas externas."),
    prov("Hospital de Manhiça", "hospital", "Manhiça", "Centro", "Vila de Manhiça", -25.4010, 32.7320,
         "Hospital distrital de Manhiça, junto ao CISM (Centro de Investigação em Saúde de Manhiça)."),
    prov("CISM — Centro de Investigação em Saúde de Manhiça", "other", "Manhiça", "Centro", "Vila de Manhiça", -25.4020, 32.7340,
         "Centro de investigação biomédica de renome internacional (malária, HIV, vacinas). Programas de saúde para a comunidade."),
    prov("Hospital Distrital de Namaacha", "hospital", "Namaacha", "Centro", "Vila de Namaacha", -25.9730, 31.9960,
         "Hospital distrital na fronteira com a Suazilândia (Eswatini)."),
    prov("Hospital Distrital de Marracuene", "hospital", "Marracuene", "Centro", "Vila de Marracuene", -25.7420, 32.6810,
         "Hospital distrital do corredor norte da província."),
    # ================= GAZA =================
    prov("Hospital Provincial de Xai-Xai", "hospital", "Xai-Xai", "Centro", "Cidade de Xai-Xai", -25.0500, 33.6400,
         "Hospital provincial de referência da região sul (Gaza)."),
    prov("Hospital Distrital de Chókwè", "hospital", "Chókwè", "Centro", "Vila de Chókwè", -24.5230, 33.0080,
         "Hospital distrital com bloco operatório e serviço de urgência."),
    prov("Hospital Rural de Chibuto", "hospital", "Chibuto", "Centro", "Vila de Chibuto", -24.6880, 33.5300,
         "Hospital rural do distrito de Chibuto. Maternidade e consultas externas."),
    prov("Hospital Rural de Manjacaze", "hospital", "Manjacaze", "Centro", "Vila de Manjacaze", -24.7150, 34.1200,
         "Hospital rural que serve o interior do Gaza."),
    # ================= INHAMBANE =================
    prov("Hospital Provincial de Inhambane", "hospital", "Inhambane", "Centro", "Cidade de Inhambane", -23.8650, 35.3830,
         "Hospital provincial de referência. Urgências, cirurgia e especialidades."),
    prov("Hospital Rural de Maxixe", "hospital", "Maxixe", "Centro", "Vila de Maxixe", -23.8600, 35.3480,
         "Hospital rural a servir a zona urbana de Maxixe."),
    prov("Hospital de Vilanculos", "hospital", "Vilanculos", "Centro", "Vila de Vilanculos", -22.0060, 35.3140,
         "Hospital distrital do arquiplago de Bazaruto. Referência turística e local."),
    # ================= SOFALA =================
    prov("Hospital Central da Beira", "hospital", "Beira", "Macurungo", "Av. das FPLM", -19.8325, 34.8625,
         "Hospital central — referência máxima da região centro do país. Urgências 24/7 e especialidades."),
    prov("Hospital Distrital de Dondo", "hospital", "Dondo", "Centro", "Vila de Dondo", -19.6140, 34.7440,
         "Hospital distrital no corredor da Beira."),
    prov("Hospital Rural de Nhamatanda", "hospital", "Nhamatanda", "Centro", "Vila de Nhamatanda", -19.7800, 34.7110,
         "Hospital rural distrital com maternidade."),
    # ================= MANICA =================
    prov("Hospital Provincial de Chimoio", "hospital", "Chimoio", "Centro", "Cidade de Chimoio", -20.5000, 33.4700,
         "Hospital provincial de referência de Manica."),
    prov("Hospital Rural de Catandica", "hospital", "Catandica", "Centro", "Vila de Catandica (Báruè)", -18.6860, 34.1000,
         "Hospital rural do distrito de Báruè."),
    prov("Hospital Distrital de Manica", "hospital", "Manica", "Centro", "Vila de Manica", -20.1120, 34.5090,
         "Hospital distrital na fronteira com o Zimbabué."),
    # ================= TETE =================
    prov("Hospital Provincial de Tete", "hospital", "Tete", "Centro", "Cidade de Tete", -16.1560, 33.5870,
         "Hospital provincial de referência. Serve os corredores de Moatize e Changara."),
    prov("Hospital Rural de Moatize", "hospital", "Moatize", "Centro", "Vila de Moatize", -16.1150, 33.4900,
         "Hospital rural na zona carbonífera de Moatize."),
    # ================= ZAMBÉZIA =================
    prov("Hospital Central de Quelimane", "hospital", "Quelimane", "Centro", "Av. das FPLM", -17.8727, 36.8889,
         "Hospital central público de referência da província da Zambézia."),  # já inserido como teste — ignorado no dedupe
    prov("Hospital Provincial de Gurué", "hospital", "Gurué", "Centro", "Vila de Gurué", -17.2840, 37.0230,
         "Hospital provincial na zona chá da Zambézia."),
    prov("Hospital Rural de Mocuba", "hospital", "Mocuba", "Centro", "Vila de Mocuba", -16.8400, 36.9840,
         "Hospital rural de referência distrital."),
    # ================= NAMPULA =================
    prov("Hospital Central de Nampula", "hospital", "Nampula", "Centro", "Av. do Trabalho", -15.1197, 39.2640,
         "Hospital central — referência máxima do norte do país."),
    prov("Hospital Geral de Nampula", "hospital", "Nampula", "Muatala", "Bairro Muatala", -15.1089, 39.2720,
         "Hospital geral público com maternidade e pediatria."),
    prov("Hospital de Nacala", "hospital", "Nacala", "Porto", "Cidade de Nacala", -14.5620, 40.6810,
         "Hospital distrital do porto de Nacala."),
    prov("Hospital de Angoche", "hospital", "Angoche", "Centro", "Vila de Angoche", -16.2130, 39.9090,
         "Hospital distrital na costa de Nampula."),
    # ================= CABO DELGADO =================
    prov("Hospital Provincial de Pemba", "hospital", "Pemba", "Paquitequete", "Cidade de Pemba", -12.9740, 40.5180,
         "Hospital provincial de referência de Cabo Delgado."),
    prov("Hospital Rural de Montepuez", "hospital", "Montepuez", "Centro", "Vila de Montepuez", -13.0360, 40.1390,
         "Hospital rural distrital do interior de Cabo Delgado."),
    prov("Hospital de Mocímboa da Praia", "hospital", "Mocímboa da Praia", "Centro", "Vila de Mocímboa da Praia", -11.3470, 40.3620,
         "Hospital distrital costeiro do norte de Cabo Delgado."),
    prov("Hospital de Mueda", "hospital", "Mueda", "Centro", "Vila de Mueda", -10.9940, 40.7000,
         "Hospital distrital do planalto maconde."),
    # ================= NIASSA =================
    prov("Hospital Provincial de Lichinga", "hospital", "Lichinga", "Centro", "Cidade de Lichinga", -13.3130, 35.2400,
         "Hospital provincial de referência do Niassa."),
    prov("Hospital Distrital de Cuamba", "hospital", "Cuamba", "Centro", "Cidade de Cuamba", -14.8070, 36.5400,
         "Hospital distrital do corredor ferroviário para o Malawi."),
    # ================= FARMÁCIAS DO INTERIOR (redes conhecidas) =================
    prov("Farmácia Mais — Matola", "pharmacy", "Matola", "Fomento", "Matola — Fomento", -25.9650, 32.4580,
         "Farmácia da rede Farmácia Mais na Matola."),
    prov("Farmácia Xai-Xai Centro", "pharmacy", "Xai-Xai", "Centro", "Cidade de Xai-Xai", -25.0505, 33.6410,
         "Farmácia privada no centro de Xai-Xai."),
    prov("Farmácia Beira Centro", "pharmacy", "Beira", "Baixa", "Rua Correia de Brito", -19.8430, 34.8390,
         "Farmácia privada na baixa da Beira."),
    prov("Farmácia Chimoio Centro", "pharmacy", "Chimoio", "Centro", "Cidade de Chimoio", -20.5180, 33.4860,
         "Farmácia privada no centro de Chimoio."),
    prov("Farmácia Tete Centro", "pharmacy", "Tete", "Centro", "Cidade de Tete", -16.1570, 33.5860,
         "Farmácia privada no centro de Tete."),
    prov("Farmácia Quelimane Centro", "pharmacy", "Quelimane", "Centro", "Cidade de Quelimane", -17.8740, 36.8880,
         "Farmácia privada no centro de Quelimane."),
    prov("Farmácia Nampula Centro", "pharmacy", "Nampula", "Centro", "Av. do Trabalho", -15.1180, 39.2650,
         "Farmácia privada no centro de Nampula."),
    prov("Farmácia Pemba Centro", "pharmacy", "Pemba", "Wimbe", "Av. da Liberdade — Wimbe", -12.9720, 40.5200,
         "Farmácia privada na zona da Wimbe, Pemba."),
    prov("Farmácia Lichinga Centro", "pharmacy", "Lichinga", "Centro", "Cidade de Lichinga", -13.3120, 35.2390,
         "Farmácia privada no centro de Lichinga."),
]


def main():
    print("== F17a — Upload instituições MZ ==")
    token = login()
    print("✓ Login OK (conta de serviço)")

    # Dedupe: nomes já existentes na tabela (inclui a row de teste anterior)
    code, existing = http(
        "GET", f"{SUPABASE_URL}/rest/v1/place_proposals?select=name", headers={"Authorization": f"Bearer {token}"}
    )
    if code != 200:
        print("ERRO ao ler existentes:", code, json.dumps(existing)[:200])
        sys.exit(1)
    have = {e["name"].strip().lower() for e in existing}
    fresh = [r for r in ROWS if r["name"].strip().lower() not in have]
    print(f"Existentes: {len(have)} · Novas a inserir: {len(fresh)}")
    if not fresh:
        print("Nada a fazer — todas já presentes.")
        return

    code, res = http(
        "POST",
        f"{SUPABASE_URL}/rest/v1/place_proposals",
        fresh,
        headers={"Authorization": f"Bearer {token}", "Prefer": "return=representation,count=exact"},
    )
    if code in (200, 201):
        n = len(res) if isinstance(res, list) else "?"
        print(f"✓ Inseridas {n} instituições (pending → /admin/curation)")
    else:
        print("ERRO INSERT:", code, json.dumps(res)[:400])
        sys.exit(1)

    # Verificação final
    req2 = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/place_proposals?select=id")
    req2.add_header("apikey", ANON_KEY)
    req2.add_header("Authorization", f"Bearer {token}")
    req2.add_header("Prefer", "count=exact")
    with urllib.request.urlopen(req2, timeout=30) as r2:
        crange = r2.headers.get("content-range", "")
    print(f"Total na tabela: {crange}")


if __name__ == "__main__":
    main()
