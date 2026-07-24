#!/usr/bin/env python3
"""Fix manager section in af, hi, pt-BR locales."""
import json, os

DIR = os.path.dirname(os.path.abspath(__file__))

fixes = {
  "af": {
    "welcome_title": "Streeks Paneel",
    "panel_label": "Streeks Bestuurder",
    "isolation_notice": "Toegang beperk tot u streek se data. U kan nie data van ander streke sien nie.",
    "isolated_session": "Sessie geïsoleer per streek",
    "region_isolated": "Data 100% geïsoleer per streek",
    "active_in_region": "Aktief in streek",
    "total_orders": "Totaal bestellings",
    "registered_pharmacies": "Geregistreerde apteke",
    "verified_doctors": "Geverifieerde dokters",
    "registered_clinics": "Geregistreerde klinieke",
    "active_drivers": "Aktiewe bestuurders",
    "recent_registrations": "Onlangse Registrasies in Streek",
    "no_recent_activity": "Geen onlangse aktiwiteit in u streek.",
    "users_title": "Gebruikersbestuur van Streek",
    "users_subtitle": "Slegs gebruikers geregistreer in u streek",
    "total_users": "Totaal gebruikers",
    "search_users": "Soek na naam of telefoon...",
    "no_users_found": "Geen gebruiker gevind.",
    "prev": "Vorige",
    "next": "Volgende"
  },
  "hi": {
    "welcome_title": "क्षेत्रीय डैशबोर्ड",
    "panel_label": "क्षेत्रीय प्रबंधक",
    "isolation_notice": "केवल अपने क्षेत्र के डेटा तक पहुँच। अन्य क्षेत्रों का डेटा नहीं देख सकते।",
    "isolated_session": "क्षेत्र के अनुसार अलग सत्र",
    "region_isolated": "क्षेत्र के अनुसार 100% अलग डेटा",
    "active_in_region": "क्षेत्र में सक्रिय",
    "total_orders": "कुल ऑर्डर",
    "registered_pharmacies": "पंजीकृत फार्मेसियाँ",
    "verified_doctors": "सत्यापित डॉक्टर",
    "registered_clinics": "पंजीकृत क्लिनिक",
    "active_drivers": "सक्रिय ड्राइवर",
    "recent_registrations": "क्षेत्र में हालिया पंजीकरण",
    "no_recent_activity": "आपके क्षेत्र में कोई हालिया गतिविधि नहीं।",
    "users_title": "क्षेत्रीय उपयोगकर्ता प्रबंधन",
    "users_subtitle": "केवल आपके क्षेत्र में पंजीकृत उपयोगकर्ता",
    "total_users": "कुल उपयोगकर्ता",
    "search_users": "नाम या फोन से खोजें...",
    "no_users_found": "कोई उपयोगकर्ता नहीं मिला।",
    "prev": "पिछला",
    "next": "अगला"
  },
  "pt-BR": {
    "welcome_title": "Painel Regional",
    "panel_label": "Gestor Regional",
    "isolation_notice": "Acesso restrito aos dados da sua região. Você não pode ver dados de outras regiões.",
    "isolated_session": "Sessão isolada por região",
    "region_isolated": "Dados 100% isolados por região",
    "active_in_region": "Ativos na região",
    "total_orders": "Total de pedidos",
    "registered_pharmacies": "Farmácias registradas",
    "verified_doctors": "Médicos verificados",
    "registered_clinics": "Clínicas registradas",
    "active_drivers": "Entregadores ativos",
    "recent_registrations": "Registros Recentes na Região",
    "no_recent_activity": "Sem atividade recente na sua região.",
    "users_title": "Gestão de Usuários da Região",
    "users_subtitle": "Apenas usuários registrados na sua região",
    "total_users": "Total de usuários",
    "search_users": "Pesquisar por nome ou telefone...",
    "no_users_found": "Nenhum usuário encontrado.",
    "prev": "Anterior",
    "next": "Próximo"
  }
}

for locale, manager_keys in fixes.items():
    filepath = os.path.join(DIR, f"{locale}.json")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    data['manager'] = manager_keys
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f"✅ {locale}.json manager section fixed")

print("Done!")
