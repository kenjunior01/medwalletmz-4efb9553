#!/usr/bin/env python3
"""
Complete translation script for MedWallet MZ.
Translates ALL Portuguese keys to 8 languages using a comprehensive dictionary approach.
For keys not in the dictionary, falls back to Portuguese (acceptable for v1).
"""
import json, os, sys
from copy import deepcopy

I18N_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'i18n')

# Load Portuguese source
with open(os.path.join(I18N_DIR, 'pt.json'), 'r', encoding='utf-8') as f:
    pt = json.load(f)

def flatten(obj, prefix=''):
    """Flatten nested JSON to dot-notation keys."""
    items = {}
    for k, v in obj.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.update(flatten(v, key))
        else:
            items[key] = v
    return items

def unflatten(items):
    """Unflatten dot-notation keys to nested JSON."""
    result = {}
    for key, value in items.items():
        parts = key.split('.')
        d = result
        for p in parts[:-1]:
            if p not in d:
                d[p] = {}
            d = d[p]
        d[parts[-1]] = value
    return result

# ============================================================
# COMPREHENSIVE TRANSLATION DICTIONARY
# Format: "dotted.key": { "en": "...", "es": "...", "fr": "...", ... }
# ============================================================

TR = {}

# --- common.* ---
for k, v in flatten(pt.get('common', {}), 'common').items():
    TR[k] = {}

TR["common.welcome"] = {"en": "Welcome", "es": "Bienvenido", "fr": "Bienvenue", "af": "Welkom", "sw": "Karibu", "am": "እንኳዕ ደሓን", "hi": "स्वागत है", "pt-BR": "Bem-vindo"}
TR["common.good_morning"] = {"en": "Good morning", "es": "Buenos días", "fr": "Bonjour", "af": "Goeie more", "sw": "Habari za asubuhi", "am": "ከደህና መጻእኩም", "hi": "सुप्रभात", "pt-BR": "Bom dia"}
TR["common.good_afternoon"] = {"en": "Good afternoon", "es": "Buenas tardes", "fr": "Bon après-midi", "af": "Goeie middag", "sw": "Habari za mchana", "am": "ከደህና ንጉሥ ይመጽእል", "hi": "नमस्कार", "pt-BR": "Boa tarde"}
TR["common.good_night"] = {"en": "Good night", "es": "Buenas noches", "fr": "Bonne nuit", "af": "Goeie nag", "sw": "Habari za jioni", "am": "ደህና መጻእኩም", "hi": "शुभ रात्रि", "pt-BR": "Boa noite"}
TR["common.loading"] = {"en": "Loading...", "es": "Cargando...", "fr": "Chargement...", "af": "Laai tans...", "sw": "Inapakia...", "am": "በማስገባት ላይ...", "hi": "लोड हो रहा है...", "pt-BR": "Carregando..."}
TR["common.error"] = {"en": "An error occurred", "es": "Ocurrió un error", "fr": "Une erreur est survenue", "af": "'n fout het voorgekom", "sw": "Hitilafu imetokea", "am": "ስህተት ተፈጥሯል", "hi": "एक त्रुटि हुई", "pt-BR": "Ocorreu um erro"}
TR["common.save"] = {"en": "Save", "es": "Guardar", "fr": "Enregistrer", "af": "Stoor", "sw": "Hifadhi", "am": "አስቀምጥ", "hi": "सहेजें", "pt-BR": "Salvar"}
TR["common.cancel"] = {"en": "Cancel", "es": "Cancelar", "fr": "Annuler", "af": "Kanselleer", "sw": "Ghairi", "am": "ሰርዝ", "hi": "रद्द करें", "pt-BR": "Cancelar"}
TR["common.back"] = {"en": "Back", "es": "Volver", "fr": "Retour", "af": "Terug", "sw": "Nyuma", "am": "ተመለስ", "hi": "वापस", "pt-BR": "Voltar"}
TR["common.confirm"] = {"en": "Confirm", "es": "Confirmar", "fr": "Confirmer", "af": "Bevestig", "sw": "Thibitisha", "am": "አረጋግጥ", "hi": "पुष्टि करें", "pt-BR": "Confirmar"}
TR["common.pay"] = {"en": "Pay", "es": "Pagar", "fr": "Payer", "af": "Betaal", "sw": "Lipa", "am": "ክፍያ", "hi": "भुगतान करें", "pt-BR": "Pagar"}
TR["common.doctor"] = {"en": "Doctor", "es": "Doctor", "fr": "Médecin", "af": "Dokter", "sw": "Daktari", "am": "ዶክተር", "hi": "डॉक्टर", "pt-BR": "Médico"}
TR["common.pharmacy"] = {"en": "Pharmacy", "es": "Farmacia", "fr": "Pharmacie", "af": "Apteek", "sw": "Duka la dawa", "am": "አፈርሚ", "hi": "फार्मेसी", "pt-BR": "Farmácia"}
TR["common.driver"] = {"en": "Driver", "es": "Conductor", "fr": "Livreur", "af": "Bestuurder", "sw": "Dereva", "am": "ነጋሽ", "hi": "ड्राइवर", "pt-BR": "Entregador"}
TR["common.in"] = {"en": "in", "es": "en", "fr": "à", "af": "in", "sw": "katika", "am": "ኣብ", "hi": "में", "pt-BR": "em"}
TR["common.moments"] = {"en": "MedWallet Moments", "es": "Momentos MedWallet", "fr": "Moments MedWallet", "af": "MedWallet Oomblikke", "sw": "Moments za MedWallet", "am": "ሰዓታት MedWallet", "hi": "MedWallet पल", "pt-BR": "Momentos MedWallet"}
TR["common.friend"] = {"en": "friend", "es": "amigo", "fr": "ami", "af": "vriend", "sw": "rafiki", "am": "ዓመጽን", "hi": "दोस्त", "pt-BR": "amigo"}
TR["common.visitor"] = {"en": "visitor", "es": "visitante", "fr": "visiteur", "af": "besoeker", "sw": "mgeni", "am": "ኣገልግሎት ተበጃሚ", "hi": "visitor", "pt-BR": "visitante"}
TR["common.more"] = {"en": "More", "es": "Más", "fr": "Plus", "af": "Meer", "sw": "Zaidi", "am": "ተወሳኺ", "hi": "अधिक", "pt-BR": "Mais"}
TR["common.edit"] = {"en": "Edit", "es": "Editar", "fr": "Modifier", "af": "Wysig", "sw": "Hariri", "am": "ኣርትዕ", "hi": "संपादित करें", "pt-BR": "Editar"}
TR["common.close"] = {"en": "Close", "es": "Cerrar", "fr": "Fermer", "af": "Sluit", "sw": "Funga", "am": "ዕጸው", "hi": "बंद करें", "pt-BR": "Fechar"}
TR["common.retry"] = {"en": "Try again", "es": "Intentar de nuevo", "fr": "Réessayer", "af": "Probeer weer", "sw": "Jaribu tena", "am": "ከደግም ፈትን", "hi": "पुनः प्रयास करें", "pt-BR": "Tentar novamente"}
TR["common.refresh"] = {"en": "Refresh", "es": "Actualizar", "fr": "Actualiser", "af": "Verfris", "sw": "Sasisha", "am": "ኣስደስት", "hi": "रीफ़्रेश करें", "pt-BR": "Atualizar"}
TR["common.search"] = {"en": "Search", "es": "Buscar", "fr": "Rechercher", "af": "Soek", "sw": "Tafuta", "am": "ፈልጥ", "hi": "खोजें", "pt-BR": "Pesquisar"}
TR["common.search_placeholder"] = {"en": "Search...", "es": "Buscar...", "fr": "Rechercher...", "af": "Soek...", "sw": "Tafuta...", "am": "ፈልጥ...", "hi": "खोजें...", "pt-BR": "Pesquisar..."}
TR["common.clear"] = {"en": "Clear", "es": "Limpiar", "fr": "Effacer", "af": "Wis", "sw": "Futa", "am": "ኣጽውት", "hi": "साफ़ करें", "pt-BR": "Limpar"}
TR["common.view_details"] = {"en": "View details", "es": "Ver detalles", "fr": "Voir les détails", "af": "Sien besonderhede", "sw": "Tazama maelezo", "am": "ዝርዝር ርእሲ", "hi": "विवरण देखें", "pt-BR": "Ver detalhes"}
TR["common.coming_soon"] = {"en": "Coming soon", "es": "Próximamente", "fr": "Bientôt disponible", "af": "Binnekort", "sw": "Inakuja karibu", "am": "ብደሓን ይመጽእ", "hi": "जल्द आ रहा है", "pt-BR": "Em breve"}

# --- referrals.* ---
ref_keys = flatten(pt.get('referrals', {}), 'referrals')
TR["referrals.program_title"] = {"en": "Referral Program", "es": "Programa de Referidos", "fr": "Programme de Parrainage", "af": "Verwysingsprogram", "sw": "Programu ya Kueleza", "am": "ፕሮግራም ምልክት", "hi": "रेफ़रल प्रोग्राम", "pt-BR": "Programa de Indicação"}
TR["referrals.invite_and_earn"] = {"en": "Invite and earn in {{city}}", "es": "Invita y gana en {{city}}", "fr": "Invitez et gagnez à {{city}}", "af": "Nooi en verdien in {{city}}", "sw": "Karibisha na pata katika {{city}}", "am": "ኣጋግምእ ኣብ {{city}}", "hi": "{{city}} में आमंत्रित करें और कमाएं", "pt-BR": "Convide e ganhe em {{city}}"}
TR["referrals.description"] = {"en": "Each friend who signs up with your code gets a welcome bonus — and so do you.", "es": "Cada amigo que se registre con tu código recibe un bono de bienvenida — y tú también.", "fr": "Chaque ami qui s'inscrit avec votre code reçoit un bonus de bienvenue — et vous aussi.", "af": "Elke vriend wat registreer met jou kode kry 'n welkom bonus — en jy ook.", "sw": "Kila rafiki anayejisajili kwa kodi yako anapata bonasi — na wewe pia.", "am": "ነፍሲ ወከፍ ጓንተማይ ብኻድካ ይመዝገብ ብኦሞና ብናይ ምሕማም ብርክ ይቕበል — እትስኻ ትረኽብ።", "hi": "हर दोस्त जो आपके कोड से साइन अप करता है, वेलकम बोनस पाता है — और आप भी।", "pt-BR": "Cada amigo que se cadastrar com seu código recebe bônus de boas-vindas — e você também."}
TR["referrals.your_code"] = {"en": "Your code", "es": "Tu código", "fr": "Votre code", "af": "Jou kode", "sw": "Kodi yako", "am": "ኮድካ", "hi": "आपका कोड", "pt-BR": "Seu código"}
TR["referrals.whatsapp_text"] = {"en": "I'm using MedWallet to talk to doctors and get medicines in {{city}}. Use my code {{code}} and we both get a bonus: {{link}}", "es": "Estoy usando MedWallet para hablar con médicos y recibir medicinas en {{city}}. Usa mi código {{code}} y ambos ganamos un bono: {{link}}", "fr": "J'utilise MedWallet pour parler aux médecins et recevoir des médicaments à {{city}}. Utilisez mon code {{code}} et nous recevons tous les deux un bonus : {{link}}", "af": "Ek gebruik MedWallet om met dokters te praat en medisyne te kry in {{city}}. Gebruik my kode {{code}} en ons albei kry 'n bonus: {{link}}", "sw": "Ninatumia MedWallet kuongea na madaktari na kupata dawa katika {{city}}. Tumia kodi yangu {{code}} na sote tupata bonasi: {{link}}", "am": "ኣብ MedWallet ንምኻድ ምስ መድሃኒትን ንምርካብ ኣብ {{city}} ክንፍትን። ነቲ ኮድየ {{code}} ኣጥተልካ ክንስዕምዎ ብርክ ክንሰርሕ: {{link}}", "hi": "मैं {{city}} में डॉक्टरों से बात करने और दवाएं पाने के लिए MedWallet इस्तेमाल कर रहा हूं। मेरा कोड {{code}} इस्तेमाल करें और हम दोनों को बोनस मिलेगा: {{link}}", "pt-BR": "Estou usando a MedWallet para falar com médicos e receber medicamentos em {{city}}. Use meu código {{code}} e ambos ganhamos bônus: {{link}}"}
TR["referrals.copied"] = {"en": "Link copied!", "es": "¡Enlace copiado!", "fr": "Lien copié !", "af": "Skakel gekopieer!", "sw": "Kiungo imenakiliwa!", "am": "ሊንኩ ተትትሕ!", "hi": "लिंक कॉपी हुआ!", "pt-BR": "Link copiado!"}
TR["referrals.details"] = {"en": "Program details", "es": "Detalles del programa", "fr": "Détails du programme", "af": "Program besonderhede", "sw": "Maelezo ya programu", "am": "ዝርዝር ፕሮግራም", "hi": "प्रोग्राम विवरण", "pt-BR": "Detalhes do programa"}

# --- home.* ---
TR["home.hero_title"] = {"en": "Health and pharmacy in one wallet.", "es": "Salud y farmacia en una sola cartera.", "fr": "Santé et pharmacie dans un seul portefeuille.", "af": "Gesondheid en apteek in een beurs.", "sw": "Afya na duka la dawa katika moja pochi.", "am": "ጽግእቲ ንኣፈርሚ ኣብ ሓደ ጥራይ.", "hi": "एक ही वॉलेट में स्वास्थ्य और फ़ार्मेसी।", "pt-BR": "Saúde e farmácia em uma só carteira."}
TR["home.hero_subtitle"] = {"en": "AI Triage, verified doctors and 24h pharmacy.", "es": "Triaje con IA, médicos verificados y farmacia 24h.", "fr": "Triage IA, médecins vérifiés et pharmacie 24h.", "af": "AI Triaging, bevestigde dokters en 24h apteek.", "sw": "Upunguzaji wa AI, madaktari walioidhinishwa na duka la dawa masaa 24.", "am": "ናይ AI መርመራ፣ ዝተረጋገጹ መድሃኒታት ንኣፈርሚ 24ሰዓት.", "hi": "AI ट्रायज, सत्यापित डॉक्टर और 24 घंटे की फ़ार्मेसी।", "pt-BR": "Triagem com IA, médicos verificados e farmácia 24h."}
TR["home.wallet_card"] = {"en": "Wallet", "es": "Cartera", "fr": "Portefeuille", "af": "Beurs", "sw": "Pochi", "am": "ጥራይ", "hi": "वॉलेट", "pt-BR": "Carteira"}
TR["home.meddy_consulta"] = {"en": "Meddy Consult", "es": "Meddy Consulta", "fr": "Meddy Consultation", "af": "Meddy Konsultasie", "sw": "Meddy Ushauri", "am": "መድሃኒት ምርመራ", "hi": "MedWallet परामर्श", "pt-BR": "Meddy Consulta"}
TR["home.doctors"] = {"en": "Doctors", "es": "Doctores", "fr": "Médecins", "af": "Dokters", "sw": "Madaktari", "am": "መድሃኒታት", "hi": "डॉक्टर", "pt-BR": "Médicos"}
TR["home.pharmacy"] = {"en": "Pharmacy", "es": "Farmacia", "fr": "Pharmacie", "af": "Apteek", "sw": "Duka la dawa", "am": "ኣፈርሚ", "hi": "फ़ार्मेसी", "pt-BR": "Farmácia"}
TR["home.pharmacy_24h"] = {"en": "24h Pharmacy", "es": "Farmacia 24h", "fr": "Pharmacie 24h", "af": "24h Apteek", "sw": "Duka la dawa masaa 24", "am": "24ሰ ኣፈርሚ", "hi": "24 घंटे की फ़ार्मेसी", "pt-BR": "Farmácia 24h"}
TR["home.delivery_priority"] = {"en": "Priority delivery", "es": "Entrega prioritaria", "fr": "Livraison prioritaire", "af": "Prioriteit aflewering", "sw": "Utoaji wa kipaumbele", "am": "ቅድሚኡ ናይ ትሓዝል ኣገልግሎት", "hi": "प्राथमिकता डिलीवरी", "pt-BR": "Entrega prioritária"}
TR["home.prescriptions"] = {"en": "Prescriptions", "es": "Recetas", "fr": "Ordonnances", "af": "Voorskrifte", "sw": "Ushauri wa dawa", "am": "ፕሪስክሪፕሽን", "hi": "प्रिस्क्रिप्शन", "pt-BR": "Receitas"}
TR["home.prescriptions_desc"] = {"en": "History + PDF", "es": "Historial + PDF", "fr": "Historique + PDF", "af": "Geskiedenis + PDF", "sw": "Historia + PDF", "am": "ታሪኽ + PDF", "hi": "इतिहास + PDF", "pt-BR": "Histórico + PDF"}
TR["home.chat_medical"] = {"en": "Medical chat", "es": "Chat médico", "fr": "Chat médical", "af": "Mediese geselskap", "sw": "Mgogoro wa matibabu", "am": "ሕክምናዊ ቻት", "hi": "मेडिकल चैट", "pt-BR": "Chat médico"}
TR["home.chat_medical_desc"] = {"en": "Async + attachments", "es": "Asíncrono + adjuntos", "fr": "Asynchrone + pièces jointes", "af": "Async + aanhegsels", "sw": "Async + viambatisho", "am": "Async + ሎሚ ምህታዝ", "hi": "Async + अटैचमेंट", "pt-BR": "Assíncrono + anexos"}
TR["home.health_in_country"] = {"en": "Health in {{country}}", "es": "Salud en {{country}}", "fr": "Santé au {{country}}", "af": "Gesondheid in {{country}}", "sw": "Afya katika {{country}}", "am": "ጽግእቲ ኣብ {{country}}", "hi": "{{country}} में स्वास्थ्य", "pt-BR": "Saúde em {{country}}"}
TR["home.health_team_desc"] = {"en": "By the clinical team", "es": "Por el equipo clínico", "fr": "Par l'équipe clinique", "af": "Deur die kliniese span", "sw": "Na timu ya kliniki", "am": "ብናይ ክሊኒካዊ ቡድን", "hi": "क्लिनिकल टीम द्वारा", "pt-BR": "Pela equipe clínica"}
TR["home.earn_with_medwallet"] = {"en": "Earn with MedWallet", "es": "Gana con MedWallet", "fr": "Gagnez avec MedWallet", "af": "Verdien met MedWallet", "sw": "Pata na MedWallet", "am": "ምስ MedWallet ንተረክብ", "hi": "MedWallet के साथ कमाएं", "pt-BR": "Ganhe com o MedWallet"}
TR["home.are_you_professional"] = {"en": "Are you a doctor, pharmacy or delivery driver?", "es": "¿Eres médico, farmacia o conductor de entregas?", "fr": "Êtes-vous médecin, pharmacie ou livreur ?", "af": "Is jy 'n dokter, apteek of afleweringsbestuurder?", "sw": "Je, wewe ni daktari, duka la dawa au dereva?", "am": "ንነቲ መድሃኒት፣ ኣፈርሚ ወይ ተሓዚ ኣሎካ?", "hi": "क्या आप डॉक्टर, फ़ार्मेसी या डिलीवरी ड्राइवर हैं?", "pt-BR": "Você é médico, farmácia ou entregador?"}
TR["home.onboarding_desc"] = {"en": "Receive patients, manage appointments and receive directly in your wallet. No monthly fees.", "es": "Recibe pacientes, gestiona citas y recibe directamente en tu cartera. Sin cuotas mensuales.", "fr": "Recevez des patients, gérez les rendez-vous et recevez directement dans votre portefeuille. Pas de frais mensuels.", "af": "Ontvang pasiënte, bestuur afsprake en ontvang direk in jou beurs. Geen maandelikse fooie.", "sw": "Pokea wagonjwa, simamia miadi na pokea moja kwa moja katika pochi yako. Bila ada ya kila mwezi.", "am": "ሰብኣዊ ሕጽረት ተቐበል፣ ስደድ ተወልእ ብጽቡቕ ኣብ ጥራይኻ ክትቕበል።", "hi": "मरीज़ प्राप्त करें, अपॉइंटमेंट मैनेज करें और सीधे अपने वॉलेट में पैसे प्राप्त करें। कोई मासिक शुल्क नहीं।", "pt-BR": "Receba pacientes, gerencie consultas e receba direto na sua carteira. Sem mensalidade."}
TR["home.top_doctors"] = {"en": "Featured professionals", "es": "Profesionales destacados", "fr": "Professionnels en vedette", "af": "Uitgestaan professionele", "sw": "Wataalamu wanaoonekana", "am": "ዝተመርጹ ሰባት ስራ", "hi": "विशेष पेशेवर", "pt-BR": "Profissionais em destaque"}
TR["home.verified_reviews"] = {"en": "Verified, with real reviews", "es": "Verificados, con reseñas reales", "fr": "Vérifiés, avec de vrais avis", "af": "Bevestig, met regte resensies", "sw": "Walioidhinishwa, na maoni halisi", "am": "ዝተረጋገጹ፣ ብትኽኽል ምርከብ", "hi": "सत्यापित, असली समीक्षाओं के साथ", "pt-BR": "Verificados, com avaliações reais"}
TR["home.view_all"] = {"en": "View all", "es": "Ver todos", "fr": "Voir tout", "af": "Sien alles", "sw": "Tazama zote", "am": "ኩሉ ርአ", "hi": "सभी देखें", "pt-BR": "Ver todos"}
TR["home.categories"] = {"en": "Explore by category", "es": "Explorar por categoría", "fr": "Explorer par catégorie", "af": "Verken per kategorie", "sw": "Tafuta kwa kategoria", "am": "ብመደብ ርኸብ", "hi": "श्रेणी से एक्सप्लोर करें", "pt-BR": "Explore por categoria"}
TR["home.fast_verification"] = {"en": "Fast verification", "es": "Verificación rápida", "fr": "Vérification rapide", "af": "Vinnige verifikasie", "sw": "Uthibitisho wa haraka", "am": "ቅልጡፍ ምርመራ", "hi": "तेज़ सत्यापन", "pt-BR": "Verificação rápida"}
TR["home.payments_24h"] = {"en": "24h payments", "es": "Pagos 24h", "fr": "Paiements 24h", "af": "24h betalings", "sw": "Malipo masaa 24", "am": "24ሰ ክፍያታት", "hi": "24 घंटे के भुगतान", "pt-BR": "Pagamentos 24h"}
TR["home.provider_panel"] = {"en": "Professional panel", "es": "Panel profesional", "fr": "Panneau professionnel", "af": "Beroepspaneel", "sw": "Jopo la kitaalamu", "am": "ስራዊ ፓነል", "hi": "प्रोफ़ेशनल पैनल", "pt-BR": "Painel profissional"}
TR["home.your_business"] = {"en": "Your business", "es": "Tu negocio", "fr": "Votre entreprise", "af": "Jou besigheid", "sw": "Biashara yako", "am": "ንጹሃት ስራህ", "hi": "आपका बिज़नेस", "pt-BR": "Seu negócio"}
TR["home.doctor_dashboard"] = {"en": "Medical dashboard", "es": "Panel médico", "fr": "Tableau de bord médical", "af": "Mediese paneel", "sw": "Dashibodi ya matibabu", "am": "ሕክምናዊ ዳሽቦርድ", "hi": "मेडिकल डैशबोर्ड", "pt-BR": "Painel médico"}
TR["home.deliveries"] = {"en": "Deliveries", "es": "Entregas", "fr": "Livraisons", "af": "Aflewerings", "sw": "Utoaji", "am": "ምህርቲ", "hi": "डिलीवरी", "pt-BR": "Entregas"}
TR["home.clinics"] = {"en": "Clinics", "es": "Clínicas", "fr": "Cliniques", "af": "Klinieke", "sw": "Kliniki", "am": "ክሊኒካት", "hi": "क्लिनिक", "pt-BR": "Clínicas"}
TR["home.laboratories"] = {"en": "Laboratories", "es": "Laboratorios", "fr": "Laboratoires", "af": "Laboratoriums", "sw": "Maabara", "am": "ላቦራቶሪ", "hi": "लैबोरेटरी", "pt-BR": "Laboratórios"}
TR["home.hospitals"] = {"en": "Hospitals", "es": "Hospitales", "fr": "Hôpitaux", "af": "Hospitale", "sw": "Hospitali", "am": "ሆስፒታላት", "hi": "अस्पताल", "pt-BR": "Hospitais"}
TR["home.veterinary"] = {"en": "Veterinary", "es": "Veterinaria", "fr": "Vétérinaire", "af": "Veterinêr", "sw": "Mtaalamu wa wanyama", "am": "ሕክምና ኣእምሮ", "hi": "पशु चिकित्सा", "pt-BR": "Veterinária"}
TR["home.exams"] = {"en": "Exams", "es": "Exámenes", "fr": "Examens", "af": "Eksamens", "sw": "Uchunguzi", "am": "ፈተናታት", "hi": "जांच", "pt-BR": "Exames"}
TR["home.plans"] = {"en": "Plans", "es": "Planes", "fr": "Forfaits", "af": "Planne", "sw": "Mipango", "am": "ፕላናት", "hi": "प्लान", "pt-BR": "Planos"}
TR["home.insurance"] = {"en": "Insurance", "es": "Seguros", "fr": "Assurance", "af": "Versekering", "sw": "Bima", "am": "ኢንሹራንስ", "hi": "बीमा", "pt-BR": "Seguros"}
TR["home.solidarity"] = {"en": "Solidarity", "es": "Solidaridad", "fr": "Solidarité", "af": "Solidariteit", "sw": "Umoja", "am": "ሓርእሲ", "hi": "सोलिडैरिटी", "pt-BR": "Solidários"}
TR["home.ads"] = {"en": "Ads", "es": "Anuncios", "fr": "Annonces", "af": "Advertensies", "sw": "Tangazo", "am": "ማሓዛጥቒ", "hi": "विज्ञापन", "pt-BR": "Anúncios"}
TR["home.for_professionals"] = {"en": "FOR PROFESSIONALS", "es": "PARA PROFESIONALES", "fr": "POUR PROFESSIONNELS", "af": "VIR BEROEPELE", "sw": "KWA WATAALAMU", "am": "ለሰባት ስራ", "hi": "प्रोफ़ेशनल्स के लिए", "pt-BR": "PARA PROFISSIONAIS"}
TR["home.work_with_medwallet"] = {"en": "Work with MedWallet", "es": "Trabaja con MedWallet", "fr": "Travaillez avec MedWallet", "af": "Werk met MedWallet", "sw": "Fanya kazi na MedWallet", "am": "ምስ MedWallet ስራ ኣድርግ", "hi": "MedWallet के साथ काम करें", "pt-BR": "Trabalhe com o MedWallet"}
TR["home.become_provider_desc"] = {"en": "Doctor, pharmacy, driver or clinic — receive patients/orders and your wallet in MZN.", "es": "Médico, farmacia, conductor o clínica — recibe pacientes/pedidos y tu cartera en MZN.", "fr": "Médecin, pharmacie, livreur ou clinique — recevez des patients/commandes et votre portefeuille en MZN.", "af": "Dokter, apteek, bestuurder of kliniek — ontvang pasiënte/bestellings en jou beurs in MZN.", "sw": "Daktari, duka la dawa, dereva au kliniki — pokea wagonjwa/oddesha na pochi yako kwa MZN.", "am": "መድሃኒት፣ ኣፈርሚ፣ ተሓዚ ወይ ክሊኒክ — ሰብኣዊ ሕጽረት/ኣዝዩ ኣብ ጥራይኻ ኣብ MZN ተቐበል።", "hi": "डॉक्टर, फ़ार्मेसी, ड्राइवर या क्लिनिक — मरीज़/ऑर्डर प्राप्त करें और अपना वॉलेट MZN में।", "pt-BR": "Médico, farmácia, motorista ou clínica — receba pacientes/pedidos e sua carteira em MZN."}
TR["home.im_doctor"] = {"en": "I'm a doctor", "es": "Soy médico", "fr": "Je suis médecin", "af": "Ek is 'n dokter", "sw": "Mimi ni daktari", "am": "እንተሎ ነኽብር መድሃኒት", "hi": "मैं डॉक्टर हूं", "pt-BR": "Sou médico"}
TR["home.have_pharmacy"] = {"en": "I have a pharmacy", "es": "Tengo una farmacia", "fr": "J'ai une pharmacie", "af": "Ek het 'n apteek", "sw": "Nina duka la dawa", "am": "ኣፈርሚ ኣለኒ", "hi": "मेरी फ़ार्मेसी है", "pt-BR": "Tenho farmácia"}
TR["home.do_deliveries"] = {"en": "I do deliveries", "es": "Hago entregas", "fr": "Je fais des livraisons", "af": "Ek doen aflewerings", "sw": "Nafanya utoaji", "am": "ምህርቲ ኣስተካኽል", "hi": "मैं डिलीवरी करता हूं", "pt-BR": "Faço entregas"}
TR["home.competitive_commission"] = {"en": "Competitive commission, daily payments", "es": "Comisión competitiva, pagos diarios", "fr": "Commission compétitive, paiements quotidiens", "af": "Kompetitiewe kommissie, daaglikse betalings", "sw": "Tume ya ushindani, malipo ya kila siku", "am": "ናይ ውዕል ኮሚሽን፣ ናይ ከመይ ክፍያ", "hi": "प्रतिस्पर्धी कमीशन, रोज़ का भुगतान", "pt-BR": "Comissão competitiva, pagamentos diários"}
TR["home.suggest_place_title"] = {"en": "Do you know a pharmacy or clinic?", "es": "¿Conoces una farmacia o clínica?", "fr": "Connaissez-vous une pharmacie ou clinique ?", "af": "Ken jy 'n apteek of kliniek?", "sw": "Je, unajua duka la dawa au kliniki?", "am": "ኣፈርሚ ወይ ክሊኒክ ትፈልጥ?", "hi": "क्या आप कोई फ़ार्मेसी या क्लिनिक जानते हैं?", "pt-BR": "Conhece uma farmácia ou clínica?"}
TR["home.suggest_place_desc"] = {"en": "Suggest and, when we publish, you receive balance + Pulse automatically.", "es": "Sugiere y, cuando publiquemos, recibes saldo + Pulso automáticamente.", "fr": "Suggérez et, lors de la publication, vous recevez automatiquement solde + Pulse.", "af": "Stel voor en wanneer ons publiseer, ontvang jy automaties saldo + Pulse.", "sw": "Pendekeza na tunapochapisha, utapokea salio + Pulse moja kwa moja.", "am": "ሓቕጽርካ ኣብኡ ክንሕዝእ እንተኾይኑ፣ ሰዓብ + Pulse ብኣውቶማቲክ ትቕበል።", "hi": "सुझाव दें और जब हम पब्लिश करें, आप ऑटोमेटिक बैलेंस + Pulse पाएं।", "pt-BR": "Sugira e, quando publicarmos, receba saldo + Pulse automaticamente."}
TR["home.trust_strip.doctors"] = {"en": "+120 doctors", "es": "+120 doctores", "fr": "+120 médecins", "af": "+120 dokters", "sw": "+120 madaktari", "am": "+120 መድሃኒታት", "hi": "+120 डॉक्टर", "pt-BR": "+120 médicos"}
TR["home.trust_strip.available"] = {"en": "24/7", "es": "24/7", "fr": "24/7", "af": "24/7", "sw": "24/7", "am": "24/7", "hi": "24/7", "pt-BR": "24/7"}
TR["home.nearby_title"] = {"en": "Near you", "es": "Cerca de ti", "fr": "Près de vous", "af": "Naby jou", "sw": "Karibu nawe", "am": "ብጥቕንትካ", "hi": "आपके पास", "pt-BR": "Perto de você"}
TR["home.nearby_radius"] = {"en": "Radius {{km}} km", "es": "Radio {{km}} km", "fr": "Rayon {{km}} km", "af": "Radius {{km}} km", "sw": "Radiusi {{km}} km", "am": "ሬድየስ {{km}} ኪሜ", "hi": "{{km}} km रेडियस", "pt-BR": "Raio {{km}} km"}
TR["home.nearby_no_providers"] = {"en": "No providers in {{city}} yet.", "es": "Aún no hay proveedores en {{city}}.", "fr": "Pas encore de fournisseurs à {{city}}.", "af": "Nog geen verskaffers in {{city}}.", "sw": "Bado hakuna watoa huduma katika {{city}}.", "am": "ኣብ {{city}} እውን ዝለዓለ ኣለኒ።", "hi": "{{city}} में अभी कोई प्रोवाइडर नहीं।", "pt-BR": "Ainda não há prestadores em {{city}}."}

# --- nav.* keys ---
nav_keys = ["nav.home", "nav.dashboard", "nav.doctors", "nav.pharmacy", "nav.triage",
            "nav.profile", "nav.consultations", "nav.patients", "nav.agenda", "nav.orders",
            "nav.products", "nav.reports", "nav.history", "nav.earnings", "nav.help",
            "nav.prescriptions", "nav.exams", "nav.records", "nav.blood", "nav.hospitals",
            "nav.wallet", "nav.subscriptions", "nav.insurance", "nav.admin", "nav.curation",
            "nav.users", "nav.financial", "nav.drivers", "nav.settings", "nav.approvals",
            "nav.team", "nav.content"]

nav_translations = {
    "nav.home": {"en": "Home", "es": "Inicio", "fr": "Accueil", "af": "Tuis", "sw": "Nyumbani", "am": "ቤት", "hi": "होम", "pt-BR": "Início"},
    "nav.dashboard": {"en": "Dashboard", "es": "Panel", "fr": "Tableau de bord", "af": "Paneel", "sw": "Dashibodi", "am": "ዳሽቦርድ", "hi": "डैशबोर्ड", "pt-BR": "Painel"},
    "nav.doctors": {"en": "Doctors", "es": "Doctores", "fr": "Médecins", "af": "Dokters", "sw": "Madaktari", "am": "መድሃኒታት", "hi": "डॉक्टर", "pt-BR": "Médicos"},
    "nav.pharmacy": {"en": "Pharmacy", "es": "Farmacia", "fr": "Pharmacie", "af": "Apteek", "sw": "Duka la dawa", "am": "ኣፈርሚ", "hi": "फ़ार्मेसी", "pt-BR": "Farmácia"},
    "nav.triage": {"en": "Triage", "es": "Triaje", "fr": "Triage", "af": "Triering", "sw": "Upunguzaji", "am": "መርመራ", "hi": "ट्रायज", "pt-BR": "Triagem"},
    "nav.profile": {"en": "Profile", "es": "Perfil", "fr": "Profil", "af": "Profiel", "sw": "Wasifu", "am": "ፕሮፋይል", "hi": "प्रोफ़ाइल", "pt-BR": "Perfil"},
    "nav.consultations": {"en": "Consultations", "es": "Consultas", "fr": "Consultations", "af": "Konsultasies", "sw": "Ushauri", "am": "ምርመራታት", "hi": "परामर्श", "pt-BR": "Consultas"},
    "nav.patients": {"en": "Patients", "es": "Pacientes", "fr": "Patients", "af": "Pasiënte", "sw": "Wagonjwa", "am": "ሰብኣዊ ሕጽረት", "hi": "मरीज़", "pt-BR": "Pacientes"},
    "nav.agenda": {"en": "Schedule", "es": "Agenda", "fr": "Agenda", "af": "Agenda", "sw": "Ratiba", "am": "ሰዓሪ", "hi": "शेड्यूल", "pt-BR": "Agenda"},
    "nav.orders": {"en": "Orders", "es": "Pedidos", "fr": "Commandes", "af": "Bestellings", "sw": "Odessa", "am": "ኣዝዩ", "hi": "ऑर्डर", "pt-BR": "Pedidos"},
    "nav.products": {"en": "Products", "es": "Productos", "fr": "Produits", "af": "Produkte", "sw": "Bidhaa", "am": "ኣተሓዳይ", "hi": "प्रोडक्ट", "pt-BR": "Produtos"},
    "nav.reports": {"en": "Reports", "es": "Informes", "fr": "Rapports", "af": "Verslae", "sw": "Ripoti", "am": "ሪፖርት", "hi": "रिपोर्ट", "pt-BR": "Relatórios"},
    "nav.history": {"en": "History", "es": "Historial", "fr": "Historique", "af": "Geskiedenis", "sw": "Historia", "am": "ታሪኽ", "hi": "इतिहास", "pt-BR": "Histórico"},
    "nav.earnings": {"en": "Earnings", "es": "Ganancias", "fr": "Gains", "af": "Inkomste", "sw": "Mapato", "am": "ገቢ", "hi": "कमाई", "pt-BR": "Ganhos"},
    "nav.help": {"en": "Help", "es": "Ayuda", "fr": "Aide", "af": "Hulp", "sw": "Msaada", "am": "ሓገዝ", "hi": "मदद", "pt-BR": "Ajuda"},
    "nav.prescriptions": {"en": "Prescriptions", "es": "Recetas", "fr": "Ordonnances", "af": "Voorskrifte", "sw": "Ushauri wa dawa", "am": "ፕሪስክሪፕሽን", "hi": "प्रिस्क्रिप्शन", "pt-BR": "Receitas"},
    "nav.exams": {"en": "Exams", "es": "Exámenes", "fr": "Examens", "af": "Eksamens", "sw": "Uchunguzi", "am": "ፈተናታት", "hi": "जांच", "pt-BR": "Exames"},
    "nav.records": {"en": "Records", "es": "Expedientes", "fr": "Dossiers", "af": "Rekords", "sw": "Rekodi", "am": "መዛገብ", "hi": "रिकॉर्ड", "pt-BR": "Prontuários"},
    "nav.blood": {"en": "Blood", "es": "Sangre", "fr": "Sang", "af": "Bloed", "sw": "Damu", "am": "ደም", "hi": "ब्लड", "pt-BR": "Sangue"},
    "nav.hospitals": {"en": "Hospitals", "es": "Hospitales", "fr": "Hôpitaux", "af": "Hospitale", "sw": "Hospitali", "am": "ሆስፒታላት", "hi": "अस्पताल", "pt-BR": "Hospitais"},
    "nav.wallet": {"en": "Wallet", "es": "Cartera", "fr": "Portefeuille", "af": "Beurs", "sw": "Pochi", "am": "ጥራይ", "hi": "वॉलेट", "pt-BR": "Carteira"},
    "nav.subscriptions": {"en": "Subscriptions", "es": "Suscripciones", "fr": "Abonnements", "af": "Subskripsies", "sw": "Usajili", "am": "ምርመራ", "hi": "सब्सक्रिप्शन", "pt-BR": "Assinaturas"},
    "nav.insurance": {"en": "Insurance", "es": "Seguros", "fr": "Assurance", "af": "Versekering", "sw": "Bima", "am": "ኢንሹራንስ", "hi": "बीमा", "pt-BR": "Seguros"},
    "nav.admin": {"en": "Admin", "es": "Admin", "fr": "Admin", "af": "Admin", "sw": "Simamizi", "am": "ኣድሚን", "hi": "एडमिन", "pt-BR": "Admin"},
    "nav.curation": {"en": "Curation", "es": "Curaduría", "fr": "Curation", "af": "Kurering", "sw": "Usimamizi", "am": "ምምራት", "hi": "क्यूरेशन", "pt-BR": "Curadoria"},
    "nav.users": {"en": "Users", "es": "Usuarios", "fr": "Utilisateurs", "af": "Gebruikers", "sw": "Watumiaji", "am": "ተጠቀምቲ", "hi": "यूज़र्स", "pt-BR": "Usuários"},
    "nav.financial": {"en": "Financial", "es": "Financiero", "fr": "Financier", "af": "Finansieel", "sw": "Kifedha", "am": "ፋይናንስያል", "hi": "फ़ाइनेंशियल", "pt-BR": "Financeiro"},
    "nav.drivers": {"en": "Drivers", "es": "Conductores", "fr": "Livreur", "af": "Bestuurders", "sw": "Wadereva", "am": "ነጋሾታት", "hi": "ड्राइवर्स", "pt-BR": "Entregadores"},
    "nav.settings": {"en": "Settings", "es": "Ajustes", "fr": "Paramètres", "af": "Instellings", "sw": "Mipangilio", "am": "ቅጥዒታት", "hi": "सेटिंग्स", "pt-BR": "Configurações"},
    "nav.approvals": {"en": "Approvals", "es": "Aprobaciones", "fr": "Approbations", "af": "Goedkeuring", "sw": "Kibali", "am": "ምርካብ", "hi": "अप्रूवल", "pt-BR": "Aprovações"},
    "nav.support": {"en": "Support", "es": "Soporte", "fr": "Support", "af": "Ondersteuning", "sw": "Usaidizi", "am": "ደገፍ", "hi": "सपोर्ट", "pt-BR": "Suporte"},
    "nav.team": {"en": "Team", "es": "Equipo", "fr": "Équipe", "af": "Span", "sw": "Timu", "am": "ቡድን", "hi": "टीम", "pt-BR": "Equipe"},
    "nav.content": {"en": "Content", "es": "Contenido", "fr": "Contenu", "af": "Inhoud", "sw": "Yaliyomo", "am": "ዝርዝር", "hi": "कंटेंट", "pt-BR": "Conteúdo"},
}
TR.update(nav_translations)

# --- manager.* keys ---
manager_keys = flatten(pt.get('manager', {}), 'manager') if 'manager' in pt else {}
TR["manager.welcome"] = {"en": "Regional Manager Panel", "es": "Panel del Gestor Regional", "fr": "Panneau du Gestionnaire Régional", "af": "Streeksbestuurder Paneel", "sw": "Jopo la Meneja wa Mkoa", "am": "ናይ ክልተ ኣዳሚ ፓነል", "hi": "रीजनल मैनेजर पैनल", "pt-BR": "Painel do Gestor Regional"}
TR["manager.permissions_label"] = {"en": "Manager Permissions", "es": "Permisos del Gestor", "fr": "Permissions du Gestionnaire", "af": "Bestuurder Toestemmings", "sw": "Ruhusa ya Meneja", "am": "ኣዳሚ ፍሉይ", "hi": "मैनेजर अनुमतियां", "pt-BR": "Permissões do Gestor"}
TR["manager.total_users"] = {"en": "Users", "es": "Usuarios", "fr": "Utilisateurs", "af": "Gebruikers", "sw": "Watumiaji", "am": "ተጠቀምቲ", "hi": "उपयोगकर्ता", "pt-BR": "Usuários"}
TR["manager.active_users"] = {"en": "Active", "es": "Activos", "fr": "Actifs", "af": "Aktief", "sw": "Wako hai", "am": "ንቕሓት", "hi": "सक्रिय", "pt-BR": "Ativos"}
TR["manager.doctors"] = {"en": "Doctors", "es": "Médicos", "fr": "Médecins", "af": "Dokters", "sw": "Madaktari", "am": "መድሃኒታት", "hi": "डॉक्टर", "pt-BR": "Médicos"}
TR["manager.pharmacies"] = {"en": "Pharmacies", "es": "Farmacias", "fr": "Pharmacies", "af": "Apteke", "sw": "Maduka ya dawa", "am": "ኣፈርሚታት", "hi": "फ़ार्मेसी", "pt-BR": "Farmácias"}
TR["manager.orders"] = {"en": "Orders", "es": "Pedidos", "fr": "Commandes", "af": "Bestellings", "sw": "Odessa", "am": "ኣዝዩ", "hi": "ऑर्डर", "pt-BR": "Pedidos"}
TR["manager.revenue"] = {"en": "Revenue", "es": "Ingresos", "fr": "Revenus", "af": "Inkomste", "sw": "Mapato", "am": "ገቢ", "hi": "रेवेन्यू", "pt-BR": "Receita"}
TR["manager.manage_doctors"] = {"en": "Manage Doctors", "es": "Gestionar Médicos", "fr": "Gérer les Médecins", "af": "Bestuur Dokters", "sw": "Simamia Madaktari", "am": "መድሃኒታት ኣዳም", "hi": "डॉक्टर मैनेज करें", "pt-BR": "Gerir Médicos"}
TR["manager.manage_pharmacies"] = {"en": "Manage Pharmacies", "es": "Gestionar Farmacias", "fr": "Gérer les Pharmacies", "af": "Bestuur Apteke", "sw": "Simamia Maduka", "am": "ኣፈርሚታት ኣዳም", "hi": "फ़ार्मेसी मैनेज करें", "pt-BR": "Gerir Farmácias"}
TR["manager.manage_orders"] = {"en": "Manage Orders", "es": "Gestionar Pedidos", "fr": "Gérer les Commandes", "af": "Bestuur Bestellings", "sw": "Simamia Odessa", "am": "ኣዝዩ ኣዳም", "hi": "ऑर्डर मैनेज करें", "pt-BR": "Gerir Pedidos"}
TR["manager.reports"] = {"en": "Reports", "es": "Informes", "fr": "Rapports", "af": "Verslae", "sw": "Ripoti", "am": "ሪፖርት", "hi": "रिपोर्ट", "pt-BR": "Relatórios"}
TR["manager.pending_verifications"] = {"en": "Pending Verifications", "es": "Verificaciones Pendientes", "fr": "Vérifications en attente", "af": "Hangende Verifikasies", "sw": "Uthibitisho Usiopendelewa", "am": "ዘይተረጋገጹ ምርመራ", "hi": "लंबित सत्यापन", "pt-BR": "Verificações Pendentes"}
TR["manager.no_pending"] = {"en": "No pending verifications", "es": "Sin verificaciones pendientes", "fr": "Aucune vérification en attente", "af": "Geen hangende verifikasies", "sw": "Hakuna uthibitisho usiopendelewa", "am": "ዘይተረጋገጹ ምርመራ የለን", "hi": "कोई लंबित सत्यापन नहीं", "pt-BR": "Sem verificações pendentes"}
TR["manager.growth"] = {"en": "Regional Growth", "es": "Crecimiento Regional", "fr": "Croissance Régionale", "af": "Streeks Groei", "sw": "Ukuaji wa Mkoa", "am": "ናይ ክልተ ኣዝዩ", "hi": "रीजनल ग्रोथ", "pt-BR": "Crescimento Regional"}

# --- regional.* keys ---
TR["regional.dashboard_title"] = {"en": "Provincial Manager Panel", "es": "Panel del Gestor Provincial", "fr": "Panneau du Gestionnaire Provincial", "af": "Provinsiale Bestuurder Paneel", "sw": "Jopo la Meneja wa Mkoa", "am": "ናይ ክልተ ኣዳሚ ፓነል", "hi": "प्रांतीय मैनेजर पैनल", "pt-BR": "Painel do Gestor Provincial"}
TR["regional.welcome"] = {"en": "Welcome, Provincial Manager", "es": "Bienvenido, Gestor Provincial", "fr": "Bienvenue, Gestionnaire Provincial", "af": "Welkom, Provinsiale Bestuurder", "sw": "Karibu, Meneja wa Mkoa", "am": "እንኳዕ ደሓን፣ ናይ ክልተ ኣዳሚ", "hi": "स्वागत, प्रांतीय मैनेजर", "pt-BR": "Bem-vindo, Gestor Provincial"}
TR["regional.province_of"] = {"en": "Province of", "es": "Provincia de", "fr": "Province de", "af": "Provinsie van", "sw": "Mkoa wa", "am": "ክልተ ናይ", "hi": "प्रांत का", "pt-BR": "Província de"}
TR["regional.total_users"] = {"en": "Total Users", "es": "Total de Usuarios", "fr": "Total Utilisateurs", "af": "Totaal Gebruikers", "sw": "Jumla Watumiaji", "am": "ኣጠቓቕሕ ተጠቀምቲ", "hi": "कुल उपयोगकर्ता", "pt-BR": "Total de Usuários"}
TR["regional.active_professionals"] = {"en": "Active Professionals", "es": "Profesionales Activos", "fr": "Professionnels Actifs", "af": "Aktiewe Beroepes", "sw": "Wataalamu Wako hai", "am": "ንቕሓት ሰባት ስራ", "hi": "सक्रिय प्रोफ़ेशनल्स", "pt-BR": "Profissionais Ativos"}
TR["regional.consultations_month"] = {"en": "Consultations this Month", "es": "Consultas este Mes", "fr": "Consultations ce mois", "af": "Konsultasies hierdie Maand", "sw": "Ushauri wa Mwezi huu", "am": "ናይ ወርሒ ምርመራ", "hi": "इस महीने की कंसल्टेशन", "pt-BR": "Consultas este Mês"}
TR["regional.deliveries_month"] = {"en": "Deliveries this Month", "es": "Entregas este Mes", "fr": "Livraisons ce mois", "af": "Aflewerings hierdie Maand", "sw": "Utoaji wa Mwezi huu", "am": "ናይ ወርሒ ምህርቲ", "hi": "इस महीने की डिलीवरी", "pt-BR": "Entregas este Mês"}
TR["regional.revenue"] = {"en": "Revenue (MZN)", "es": "Ingresos (MZN)", "fr": "Revenus (MZN)", "af": "Inkomste (MZN)", "sw": "Mapato (MZN)", "am": "ገቢ (MZN)", "hi": "रेवेन्यू (MZN)", "pt-BR": "Receita (MZN)"}
TR["regional.growth_rate"] = {"en": "Growth Rate", "es": "Tasa de Crecimiento", "fr": "Taux de Croissance", "af": "Groei Koers", "sw": "Kiwango cha Ukuaji", "am": "ናይ ኣዝዩ መጠን", "hi": "ग्रोथ रेट", "pt-BR": "Taxa de Crescimento"}
TR["regional.pending_verifications"] = {"en": "Pending Verifications", "es": "Verificaciones Pendientes", "fr": "Vérifications en attente", "af": "Hangende Verifikasies", "sw": "Uthibitisho Usiopendelewa", "am": "ዘይተረጋገጹ ምርመራ", "hi": "लंबित सत्यापन", "pt-BR": "Verificações Pendentes"}
TR["regional.no_pending"] = {"en": "No pending verifications", "es": "Sin verificaciones pendientes", "fr": "Aucune vérification en attente", "af": "Geen hangende verifikasies", "sw": "Hakuna uthibitisho usiopendelewa", "am": "ዘይተረጋገጹ ምርመራ የለን", "hi": "कोई लंबित सत्यापन नहीं", "pt-BR": "Sem verificações pendentes"}
TR["regional.manage_team"] = {"en": "Manage Team", "es": "Gestionar Equipo", "fr": "Gérer l'Équipe", "af": "Bestuur Span", "sw": "Simamia Timu", "am": "ቡድን ኣዳም", "hi": "टीम मैनेज करें", "pt-BR": "Gerir Equipe"}
TR["regional.regional_content"] = {"en": "Regional Content", "es": "Contenido Regional", "fr": "Contenu Régional", "af": "Streeksinhoud", "sw": "Yaliyomo ya Mkoa", "am": "ናይ ክልተ ዝርዝር", "hi": "रीजनल कंटेंट", "pt-BR": "Conteúdo Regional"}
TR["regional.financial_report"] = {"en": "Financial Report", "es": "Informe Financiero", "fr": "Rapport Financier", "af": "Finansiële Verslag", "sw": "Ripoti ya Kifedha", "am": "ፋይናንስያል ሪፖርት", "hi": "फ़ाइनेंशियल रिपोर्ट", "pt-BR": "Relatório Financeiro"}
TR["regional.province_ranking"] = {"en": "Province Ranking", "es": "Ranking Provincial", "fr": "Classement Provincial", "af": "Provinsiale Ranglys", "sw": "Cheo cha Mkoa", "am": "ናይ ክልተ ትሕዝቶ", "hi": "प्रांत रैंकिंग", "pt-BR": "Ranking Provincial"}
TR["regional.vs_national"] = {"en": "vs National", "es": "vs Nacional", "fr": "vs National", "af": "vs Nasionaal", "sw": "dhidi ya Taifa", "am": "ድሕሪ ሃገራዊ", "hi": "vs राष्ट्रीय", "pt-BR": "vs Nacional"}
TR["regional.team_title"] = {"en": "Provincial Team Management", "es": "Gestión de Equipo Provincial", "fr": "Gestion d'Équipe Provinciale", "af": "Provinsiale Spanbestuur", "sw": "Usimamizi wa Timu ya Mkoa", "am": "ናይ ክልተ ቡድን ኣዳም", "hi": "प्रांतीय टीम मैनेजमेंट", "pt-BR": "Gestão de Equipe Provincial"}
TR["regional.team_subtitle"] = {"en": "Health professionals and riders in the province", "es": "Profesionales de salud y riders de la provincia", "fr": "Professionnels de santé et livreurs de la province", "af": "Gesondheid beroepes en ryers in die provinsie", "sw": "Wataalamu wa afya na wapanda baiskeli katika mkoa", "am": "ናይ ክልተ ጽግእቲ ሰባት ስራን ራዛታት", "hi": "प्रांत में स्वास्थ्य प्रोफ़ेशनल्स और राइडर्स", "pt-BR": "Profissionais de saúde e riders da província"}
TR["regional.content_title"] = {"en": "Province Content", "es": "Contenido de la Provincia", "fr": "Contenu de la Province", "af": "Provinsie Inhoud", "sw": "Yaliyomo ya Mkoa", "am": "ናይ ክልተ ዝርዝር", "hi": "प्रांत कंटेंट", "pt-BR": "Conteúdo da Província"}
TR["regional.content_subtitle"] = {"en": "Alerts, campaigns and regional health tips", "es": "Alertas, campañas y consejos de salud regional", "fr": "Alertes, campagnes et conseils de santé régionaux", "af": "Waarskuwings, veldtogte en streeks gesondheidstips", "sw": "Tahadhari, kampeni na vidokezo vya afya ya mkoa", "am": "ሓገራዊ ጽግእቲ ሓበሬታ፣ ምህረትን ምኽሪ ጽግእቲ", "hi": "अलर्ट, कैंपेन और रीजनल हेल्थ टिप्स", "pt-BR": "Alertas, campanhas e dicas de saúde regional"}
TR["regional.earnings_title"] = {"en": "Regional Earnings", "es": "Ganancias Regionales", "fr": "Revenus Régionaux", "af": "Streeks Inkomste", "sw": "Mapato ya Mkoa", "am": "ናይ ክልተ ገቢ", "hi": "रीजनल कमाई", "pt-BR": "Ganhos Regionais"}
TR["regional.earnings_subtitle"] = {"en": "Revenue and commissions of the province", "es": "Ingresos y comisiones de la provincia", "fr": "Revenus et commissions de la province", "af": "Inkomste en kommissies van die provinsie", "sw": "Mapato na tume ya mkoa", "am": "ናይ ክልተ ገቢን ኮሚሽን", "hi": "प्रांत का रेवेन्यू और कमीशन", "pt-BR": "Receitas e comissões da província"}
TR["regional.create_alert"] = {"en": "Create Alert", "es": "Crear Alerta", "fr": "Créer une Alerte", "af": "Skep Waarskuwing", "sw": "Unda Tahadhari", "am": "ሓበሬታ ፍጠር", "hi": "अलर्ट बनाएं", "pt-BR": "Criar Alerta"}
TR["regional.create_campaign"] = {"en": "Create Campaign", "es": "Crear Campaña", "fr": "Créer une Campagne", "af": "Skep Veldtog", "sw": "Unda Kampeni", "am": "ምህረት ፍጠር", "hi": "कैंपेन बनाएं", "pt-BR": "Criar Campanha"}
TR["regional.create_tip"] = {"en": "Create Tip", "es": "Crear Consejo", "fr": "Créer un Conseil", "af": "Skep Wenk", "sw": "Unda Kidokezo", "am": "ምኽሪ ፍጠር", "hi": "टिप बनाएं", "pt-BR": "Criar Dica"}
TR["regional.content_form_title"] = {"en": "Title", "es": "Título", "fr": "Titre", "af": "Titel", "sw": "Kichwa", "am": "ኣርእስቲ", "hi": "शीर्षक", "pt-BR": "Título"}
TR["regional.content_form_description"] = {"en": "Description", "es": "Descripción", "fr": "Description", "af": "Beskrywing", "sw": "Maelezo", "am": "መግለጺ", "hi": "विवरण", "pt-BR": "Descrição"}
TR["regional.content_form_type"] = {"en": "Type", "es": "Tipo", "fr": "Type", "af": "Tipe", "sw": "Aina", "am": "ዓይነት", "hi": "टाइप", "pt-BR": "Tipo"}
TR["regional.content_form_priority"] = {"en": "Priority", "es": "Prioridad", "fr": "Priorité", "af": "Prioriteit", "sw": "Kipaumbele", "am": "ቅድሚኡ ቦታ", "hi": "प्राथमिकता", "pt-BR": "Prioridade"}
TR["regional.content_form_submit"] = {"en": "Publish", "es": "Publicar", "fr": "Publier", "af": "Publiseer", "sw": "Chapisha", "am": "ሓትብ", "hi": "पब्लिश करें", "pt-BR": "Publicar"}
TR["regional.revenue_consultations"] = {"en": "Consultations", "es": "Consultas", "fr": "Consultations", "af": "Konsultasies", "sw": "Ushauri", "am": "ምርመራታት", "hi": "कंसल्टेशन", "pt-BR": "Consultas"}
TR["regional.revenue_deliveries"] = {"en": "Deliveries", "es": "Entregas", "fr": "Livraisons", "af": "Aflewerings", "sw": "Utoaji", "am": "ምህርቲ", "hi": "डिलीवरी", "pt-BR": "Entregas"}
TR["regional.revenue_pharmacy"] = {"en": "Pharmacy", "es": "Farmacia", "fr": "Pharmacie", "af": "Apteek", "sw": "Duka la dawa", "am": "ኣፈርሚ", "hi": "फ़ार्मेसी", "pt-BR": "Farmácia"}
TR["regional.commissions"] = {"en": "Commissions", "es": "Comisiones", "fr": "Commissions", "af": "Kommissies", "sw": "Tume", "am": "ኮሚሽን", "hi": "कमीशन", "pt-BR": "Comissões"}
TR["regional.mpesa_status"] = {"en": "M-Pesa Payments", "es": "Pagos M-Pesa", "fr": "Paiements M-Pesa", "af": "M-Pesa Betalings", "sw": "Malipo ya M-Pesa", "am": "ኤም-ፔሳ ክፍያታት", "hi": "M-Pesa भुगतान", "pt-BR": "Pagamentos M-Pesa"}
TR["regional.monthly_comparison"] = {"en": "Monthly Comparison", "es": "Comparación Mensual", "fr": "Comparaison Mensuelle", "af": "Maandelikse Vergelyking", "sw": "Ulinganisho wa Kila Mwezi", "am": "ናይ ወርሒ ምምላእ", "hi": "मासिक तुलना", "pt-BR": "Comparação Mensal"}
TR["regional.withdrawal_requests"] = {"en": "Withdrawal Requests", "es": "Solicitudes de Retiro", "fr": "Demandes de Retrait", "af": "Onttrekkings Versoeke", "sw": "Ombi la Kutoa", "am": "ናይ ምልኣት ጠወት", "hi": "विड्रॉल रिक्वेस्ट", "pt-BR": "Pedidos de Saque"}
TR["regional.filter_all"] = {"en": "All", "es": "Todos", "fr": "Tous", "af": "Almal", "sw": "Wote", "am": "ኩሉ", "hi": "सभी", "pt-BR": "Todos"}
TR["regional.filter_doctors"] = {"en": "Doctors", "es": "Médicos", "fr": "Médecins", "af": "Dokters", "sw": "Madaktari", "am": "መድሃኒታት", "hi": "डॉक्टर", "pt-BR": "Médicos"}
TR["regional.filter_riders"] = {"en": "Riders", "es": "Riders", "fr": "Livreurs", "af": "Ryders", "sw": "Wapanda baiskeli", "am": "ራዛታት", "hi": "राइडर्स", "pt-BR": "Riders"}
TR["regional.filter_workers"] = {"en": "Professionals", "es": "Profesionales", "fr": "Professionnels", "af": "Beroepes", "sw": "Wataalamu", "am": "ሰባት ስራ", "hi": "प्रोफ़ेशनल्स", "pt-BR": "Profissionais"}
TR["regional.filter_verified"] = {"en": "Verified", "es": "Verificados", "fr": "Vérifiés", "af": "Bevestig", "sw": "Walioidhinishwa", "am": "ዝተረጋገጹ", "hi": "सत्यापित", "pt-BR": "Verificados"}
TR["regional.filter_pending"] = {"en": "Pending", "es": "Pendientes", "fr": "En attente", "af": "Hangende", "sw": "Usiopendelewa", "am": "ዘይተረጋገጽ", "hi": "लंबित", "pt-BR": "Pendentes"}
TR["regional.approve"] = {"en": "Approve", "es": "Aprobar", "fr": "Approuver", "af": "Goedkeur", "sw": "Kubali", "am": "ምርካብ", "hi": "अप्रूव करें", "pt-BR": "Aprovar"}
TR["regional.reject"] = {"en": "Reject", "es": "Rechazar", "fr": "Rejeter", "af": "Verwerp", "sw": "Kataa", "am": "ሓድሽ", "hi": "रिजेक्ट करें", "pt-BR": "Rejeitar"}
TR["regional.search_placeholder"] = {"en": "Search professionals...", "es": "Buscar profesionales...", "fr": "Rechercher des professionnels...", "af": "Soek beroepes...", "sw": "Tafuta wataalamu...", "am": "ሰባት ስራ ፈልጥ...", "hi": "प्रोफ़ेशनल्स खोजें...", "pt-BR": "Pesquisar profissionais..."}
TR["regional.no_professionals"] = {"en": "No professionals in this category", "es": "Sin profesionales en esta categoría", "fr": "Aucun professionnel dans cette catégorie", "af": "Geen beroepes in hierdie kategorie", "sw": "Hakuna wataalamu katika kategoria hii", "am": "ኣብኡ ክልተ ሰባት ስራ የለዮም", "hi": "इस श्रेणी में कोई प्रोफ़ेशनल नहीं", "pt-BR": "Sem profissionais nesta categoria"}

# --- bottomnav.* ---
TR["bottomnav.hub_title"] = {"en": "MedWallet Hub", "es": "MedWallet Hub", "fr": "MedWallet Hub", "af": "MedWallet Hub", "sw": "MedWallet Hub", "am": "MedWallet Hub", "hi": "MedWallet Hub", "pt-BR": "MedWallet Hub"}
TR["bottomnav.current_location"] = {"en": "Current Location", "es": "Ubicación Actual", "fr": "Position Actuelle", "af": "Huidige Ligging", "sw": "Mahali Pa Sasa", "am": "ኣብኡ ቦታ", "hi": "वर्तमान स्थान", "pt-BR": "Localização Atual"}
TR["bottomnav.change"] = {"en": "Change", "es": "Cambiar", "fr": "Changer", "af": "Verander", "sw": "Badilisha", "am": "ቀይር", "hi": "बदलें", "pt-BR": "Alterar"}
TR["bottomnav.my_institutions"] = {"en": "My Institutions", "es": "Mis Instituciones", "fr": "Mes Institutions", "af": "My Instellings", "sw": "Taasisi Zangu", "am": "ኻልእ ተቓጻጸር", "hi": "मेरे इंस्टीट्यूशन", "pt-BR": "Minhas Instituições"}
TR["bottomnav.active"] = {"en": "Active", "es": "Activo", "fr": "Actif", "af": "Aktief", "sw": "Active", "am": "ንቕሓት", "hi": "सक्रिय", "pt-BR": "Ativo"}
TR["bottomnav.open_dashboard"] = {"en": "Dashboard", "es": "Panel", "fr": "Tableau de bord", "af": "Paneel", "sw": "Dashibodi", "am": "ዳሽቦርድ", "hi": "डैशबोर्ड", "pt-BR": "Painel"}
TR["bottomnav.add_institution"] = {"en": "Add", "es": "Añadir", "fr": "Ajouter", "af": "Voeg by", "sw": "Ongeza", "am": "ወስኽ", "hi": "जोड़ें", "pt-BR": "Adicionar"}
TR["bottomnav.add_institution_desc"] = {"en": "More professional roles", "es": "Más roles profesionales", "fr": "Plus de rôles professionnels", "af": "Meer beroepes rolle", "sw": "Jopo zaidi kitaalamu", "am": "ተወሳኺ ስራዊ ሚናታት", "hi": "और प्रोफ़ेशनल रोल", "pt-BR": "Mais papéis profissionais"}
TR["bottomnav.join_professional"] = {"en": "Join as Professional", "es": "Entrar como Profesional", "fr": "Rejoindre en tant que Professionnel", "af": "Sluit as Beroepes aan", "sw": "Jiunge kama Mtaalamu", "am": "ከም ሰባት ስራ ተወረድ", "hi": "प्रोफ़ेशनल के रूप में जुड़ें", "pt-BR": "Entrar como Profissional"}
TR["bottomnav.join_professional_desc"] = {"en": "Register your clinic, pharmacy, laboratory or start as a doctor or driver", "es": "Registra tu clínica, farmacia, laboratorio o comienza como médico o conductor", "fr": "Enregistrez votre clinique, pharmacie, laboratoire ou commencez comme médecin ou chauffeur", "af": "Registreer jou kliniek, apteek, laboratorium of begin as dokter of bestuurder", "sw": "Sajili kliniki yako, duka la dawa, laboratori auanza kama daktari au dereva", "am": "ክሊኒክኻ፣ ኣፈርሚኻ፣ ላቦራቶሪኻ ምዝራብ ወይ ከም መድሃኒት ወይ ነጋሽ ጀምር", "hi": "अपना क्लिनिक, फ़ार्मेसी, लैब रजिस्टर करें या डॉक्टर/ड्राइवर के रूप में शुरू करें", "pt-BR": "Registre sua clínica, farmácia, laboratório ou comece como médico ou motorista"}
TR["bottomnav.explore_roles"] = {"en": "Explore roles", "es": "Explorar roles", "fr": "Explorer les rôles", "af": "Verken rolle", "sw": "Tafuta majukumu", "am": "ሚናታት ርኸብ", "hi": "रोल एक्सप्लोर करें", "pt-BR": "Explorar papéis"}
TR["bottomnav.emergency"] = {"en": "Emergency", "es": "Emergencia", "fr": "Urgence", "af": "Noodgeval", "sw": "Dharura", "am": "ህጹጽ", "hi": "इमरजेंसी", "pt-BR": "Emergência"}
TR["bottomnav.emergency_desc"] = {"en": "Immediate AI triage", "es": "Triaje inmediato con IA", "fr": "Triage IA immédiat", "af": "Onmiddellike AI triering", "sw": "Upunguzi wa AI wa haraka", "am": "ቅልጡፍ ናይ AI መርመራ", "hi": "तुरंत AI ट्रायज", "pt-BR": "Triagem imediata com IA"}

# --- profilehub.* ---
TR["profilehub.overview"] = {"en": "Overview", "es": "General", "fr": "Aperçu", "af": "Oorsig", "sw": "Muhtasari", "am": "ጽሑፍ", "hi": "ओवरव्यू", "pt-BR": "Geral"}
TR["profilehub.institutions"] = {"en": "Institutions", "es": "Instituciones", "fr": "Institutions", "af": "Instellings", "sw": "Taasisi", "am": "ተቓጻጸር", "hi": "इंस्टीट्यूशन", "pt-BR": "Instituições"}
TR["profilehub.settings"] = {"en": "Settings", "es": "Ajustes", "fr": "Paramètres", "af": "Instellings", "sw": "Mipangilio", "am": "ቅጥዒታት", "hi": "सेटिंग्स", "pt-BR": "Definições"}
TR["profilehub.account"] = {"en": "Account", "es": "Cuenta", "fr": "Compte", "af": "Rekening", "sw": "Akaunti", "am": "ሓሳብ", "hi": "अकाउंट", "pt-BR": "Conta"}
TR["profilehub.active_roles"] = {"en": "Active Roles", "es": "Roles Activos", "fr": "Rôles Actifs", "af": "Aktiewe Rolle", "sw": "Majukumu Hai", "am": "ንቕሓት ሚናታት", "hi": "सक्रिय रोल", "pt-BR": "Papéis Ativos"}
TR["profilehub.verified"] = {"en": "Verified", "es": "Verificado", "fr": "Vérifié", "af": "Bevestig", "sw": "Imethibitishwa", "am": "ዝተረጋገጽ", "hi": "सत्यापित", "pt-BR": "Verificado"}
TR["profilehub.open"] = {"en": "Open", "es": "Abrir", "fr": "Ouvrir", "af": "Open", "sw": "Fungua", "am": "ከፍት", "hi": "खोलें", "pt-BR": "Abrir"}
TR["profilehub.available_roles"] = {"en": "Available Roles", "es": "Roles Disponibles", "fr": "Rôles Disponibles", "af": "Beskikbare Rolle", "sw": "Majukumu Yanayopatikana", "am": "ዝርከብ ሚናታት", "hi": "उपलब्ध रोल", "pt-BR": "Papéis Disponíveis"}
TR["profilehub.language_region"] = {"en": "Language & Region", "es": "Idioma y Región", "fr": "Langue et Région", "af": "Taal en Streek", "sw": "Lugha na Mkoa", "am": "ቋንቋን ክልቲን", "hi": "भाषा और क्षेत्र", "pt-BR": "Idioma e Região"}
TR["profilehub.notifications"] = {"en": "Notifications", "es": "Notificaciones", "fr": "Notifications", "af": "Kennisgewings", "sw": "Arifa", "am": "ሓበሬታ", "hi": "नोटिफिकेशन", "pt-BR": "Notificações"}
TR["profilehub.notifications_desc"] = {"en": "Manage alerts and preferences", "es": "Gestionar alertas y preferencias", "fr": "Gérer les alertes et préférences", "af": "Bestuur waarskuwings en voorkeure", "sw": "Simamia tahadhari na mapendeleo", "am": "ሓበሬታን ምርካብ ኣዳም", "hi": "अलर्ट और प्रेफ़रेंस मैनेज करें", "pt-BR": "Gerenciar alertas e preferências"}
TR["profilehub.notifications_soon"] = {"en": "Coming soon!", "es": "Próximamente!", "fr": "Bientôt disponible !", "af": "Binnekort!", "sw": "Inakuja karibu!", "am": "ብደሓን ይመጽእ!", "hi": "जल्द आ रहा है!", "pt-BR": "Em breve!"}
TR["profilehub.theme"] = {"en": "Theme", "es": "Tema", "fr": "Thème", "af": "Tema", "sw": "Mandhari", "am": "ቀለም", "hi": "थीम", "pt-BR": "Tema"}
TR["profilehub.theme_desc"] = {"en": "Light, dark or automatic", "es": "Claro, oscuro o automático", "fr": "Clair, sombre ou automatique", "af": "Lig, donker of outomaties", "sw": "Nyeupe, nyeusi au otomatiki", "am": "ብርሃን፣ ጸልማት ወይ ኣውቶማቲክ", "hi": "लाइट, डार्क या ऑटो", "pt-BR": "Claro, escuro ou automático"}
TR["profilehub.theme_soon"] = {"en": "Coming soon!", "es": "Próximamente!", "fr": "Bientôt disponible !", "af": "Binnekort!", "sw": "Inakuja karibu!", "am": "ብደሓን ይመጽእ!", "hi": "जल्द आ रहा है!", "pt-BR": "Em breve!"}
TR["profilehub.change_password"] = {"en": "Change Password", "es": "Cambiar Contraseña", "fr": "Changer le Mot de Passe", "af": "Verander Wagwoord", "sw": "Badilisha Nenosiri", "am": "ሚን ቀይር", "hi": "पासवर्ड बदलें", "pt-BR": "Alterar Senha"}
TR["profilehub.change_password_desc"] = {"en": "Update your access password", "es": "Actualizar tu contraseña", "fr": "Mettre à jour votre mot de passe", "af": "Werk jou wagwoord by", "sw": "Sasisha nosiri yako", "am": "ነቲ ሚንኻ ኣስደስት", "hi": "अपना पासवर्ड अपडेट करें", "pt-BR": "Atualizar sua senha de acesso"}
TR["profilehub.password_soon"] = {"en": "Coming soon!", "es": "Próximamente!", "fr": "Bientôt disponible !", "af": "Binnekort!", "sw": "Inakuja karibu!", "am": "ብደሓን ይመጽእ!", "hi": "जल्द आ रहा है!", "pt-BR": "Em breve!"}
TR["profilehub.payment_settings"] = {"en": "Payments", "es": "Pagos", "fr": "Paiements", "af": "Betalings", "sw": "Malipo", "am": "ክፍያታት", "hi": "भुगतान", "pt-BR": "Pagamentos"}
TR["profilehub.payment_settings_desc"] = {"en": "M-Pesa, card and payment methods", "es": "M-Pesa, tarjeta y métodos de pago", "fr": "M-Pesa, carte et méthodes de paiement", "af": "M-Pesa, kaart en betalingsmetodes", "sw": "M-Pesa, kadi na njia za malipo", "am": "M-Pesa፣ ካርድን ናይ ክፍያ መንገዲ", "hi": "M-Pesa, कार्ड और भुगतान मेथड", "pt-BR": "M-Pesa, cartão e métodos de pagamento"}
TR["profilehub.addresses"] = {"en": "Addresses", "es": "Direcciones", "fr": "Adresses", "af": "Adresse", "sw": "Anwani", "am": "ኣድራሻ", "hi": "पते", "pt-BR": "Endereços"}

# --- userRoles / registration ---
TR["userRoles.patient.label"] = {"en": "Patient", "es": "Paciente", "fr": "Patient", "af": "Pasiënt", "sw": "Mgonjwa", "am": "ሕጽረት", "hi": "मरीज़", "pt-BR": "Paciente"}
TR["userRoles.patient.description"] = {"en": "I want to take care of my health and my family", "es": "Quiero cuidar de mi salud y de mi familia", "fr": "Je veux prendre soin de ma santé et de ma famille", "af": "Ek wil my gesondheid en my familie versorg", "sw": "Ninataka kujali afya yangu na familia yangu", "am": "ጽግእቲኒ ንቤተይ ንምሕማም ክንፍትን", "hi": "मैं अपने स्वास्थ्य और परिवार का ख्याल रखना चाहता हूं", "pt-BR": "Quero cuidar da minha saúde e da minha família"}
TR["userRoles.patient.cta"] = {"en": "Book appointments, view prescriptions, AI scanner", "es": "Reservar citas, ver recetas, escáner IA", "fr": "Prendre rendez-vous, voir les ordonnances, scanner IA", "af": "Boek afsprake, sien voorskrifte, AI skandeerder", "sw": "Panga miadi, tazama ushauri wa dawa, skana ya AI", "am": "ምርመራ ስደድ፣ ፕሪስክሪፕሽን ርኣ፣ AI ስካነር", "hi": "अपॉइंटमेंट बुक करें, प्रिस्क्रिप्शन देखें, AI स्कैनर", "pt-BR": "Marcar consultas, ver receitas, scanner IA"}
TR["userRoles.rider.label"] = {"en": "Health Rider", "es": "Health Rider", "fr": "Health Rider", "af": "Gesondheid Ryer", "sw": "Mpanda Baiskeli wa Afya", "am": "ዝሕጽእ ራዛታት", "hi": "हेल्थ राइडर", "pt-BR": "Health Rider"}
TR["userRoles.rider.description"] = {"en": "I want to deliver medicines and lab samples", "es": "Quiero entregar medicamentos y muestras de laboratorio", "fr": "Je veux livrer des médicaments et échantillons de laboratoire", "af": "Ek wil medisyne en lab-monsters aflewer", "sw": "Ninataka kupeleka dawa na sampuli za maabara", "am": "ኣፈርሚን ላቦራቶሪ ምልክት ምህርቲ ክንፍትን", "hi": "मैं दवाइयां और लैब सैंपल डिलीवर करना चाहता हूं", "pt-BR": "Quero entregar medicamentos e amostras de laboratório"}
TR["userRoles.health_worker.label"] = {"en": "Health Professional", "es": "Profesional de Salud", "fr": "Professionnel de Santé", "af": "Gesondheid Beroepes", "sw": "Mtaalamu wa Afya", "am": "ጽግእቲ ሰባት ስራ", "hi": "हेल्थ प्रोफ़ेशनल", "pt-BR": "Profissional de Saúde"}
TR["userRoles.health_worker.description"] = {"en": "I am a doctor, nurse, nursing technician, health technician, midwife, APE, traditional healer...", "es": "Soy médico, enfermero, técnico de enfermería, técnico de salud, matrona, APE, curandero tradicional...", "fr": "Je suis médecin, infirmier, technicien infirmier, technicien de santé, sage-femme, APE, guérisseur traditionnel...", "af": "Ek is 'n dokter, verpleegster, verpleegtegnikus, gesondheidstegnikus, vroedvrou, APE, tradisionele geneser...", "sw": "Mimi ni daktari, muuguzi, mfamasia wa tabibu, mfamasia wa afya, mkunga, APE, mganga wa jadi...", "am": "እንተሎ መድሃኒት፣ ናርስ፣ ናይ ናርስ ቴክኒሺያን፣ ጽግእቲ ቴክኒሺያን፣ ምዕራብ፣ APE፣ ብሔራዊ መድሃኒት...", "hi": "मैं डॉक्टर, नर्स, नर्सिंग टेक्नीशियन, हेल्थ टेक्नीशियन, नर्स, APE, पारंपरिक हीलर... हूं", "pt-BR": "Sou médico, enfermeiro, técnico de enfermagem, técnico de saúde, parteira, APE, curandeiro tradicional..."}
TR["userRoles.promoter.label"] = {"en": "Health Promoter", "es": "Promotor de Salud", "fr": "Promoteur de Santé", "af": "Gesondheid Promotor", "sw": "Mwelimbwaji wa Afya", "am": "ጽግእቲ ምሓዝንካይ", "hi": "हेल्थ प्रोमोटर", "pt-BR": "Promotor de Saúde"}
TR["userRoles.promoter.description"] = {"en": "I want to invite friends and earn rewards", "es": "Quiero invitar amigos y ganar recompensas", "fr": "Je veux inviter des amis et gagner des récompenses", "af": "Ek wil vriende nooi en belonings verdien", "sw": "Ninataka kuwalika marafiki na kupata tuzo", "am": "ጓንተማይ ክንጋገምን ብርክ ክንሰርሕ", "hi": "मैं दोस्तों को इनवाइट करके इनाम कमाना चाहता हूं", "pt-BR": "Quero convidar amigos e ganhar recompensas"}

# ============================================================
# Translation function
# ============================================================

def translate_pt_value(pt_val: str, lang: str) -> str:
    """Try dictionary first, then return PT fallback."""
    # Check if we have a direct translation for this string value
    for key, translations in TR.items():
        if translations.get('pt', pt.get(key.split('.')[-1], '')) == pt_val or \
           translations.get('pt-BR', '') == pt_val:
            return translations.get(lang, pt_val)
    return pt_val  # fallback to Portuguese

def apply_translations(source: dict, lang: str) -> dict:
    """Apply translations to a nested dict using flattened TR dictionary."""
    flat = flatten(source)
    result = {}
    for key, pt_val in flat.items():
        if key in TR and lang in TR[key]:
            result[key] = TR[key][lang]
        else:
            result[key] = pt_val  # keep Portuguese as fallback
    return unflatten(result)

# ============================================================
# Main: generate all 8 language files
# ============================================================

languages = ['en', 'es', 'fr', 'af', 'sw', 'am', 'hi', 'pt-BR']

print(f"Source: pt.json ({len(flatten(pt))} keys)")
print(f"TR dictionary: {len(TR)} entries")
print()

for lang in languages:
    print(f"Translating to {lang}...")
    translated = apply_translations(pt, lang)
    filepath = os.path.join(I18N_DIR, f"{lang}.json")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(translated, f, ensure_ascii=False, indent=2)
    
    # Count how many keys were actually translated (not PT fallback)
    flat_src = flatten(pt)
    flat_tgt = flatten(translated)
    translated_count = sum(1 for k in flat_src if flat_tgt.get(k) != flat_src[k])
    total_count = len(flat_src)
    pct = (translated_count / total_count * 100) if total_count > 0 else 0
    
    print(f"  {lang}: {translated_count}/{total_count} keys translated ({pct:.1f}%)")

print()
print("Done! All translation files updated.")
