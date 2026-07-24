#!/usr/bin/env python3
"""Add new translation keys to all 7 locale files."""
import json, os

DIR = os.path.dirname(os.path.abspath(__file__))

translations = {
  "pt": {
    "bottomnav": {
      "hub_title": "MedWallet Hub",
      "current_location": "Localização Atual",
      "change": "Alterar",
      "my_institutions": "As Minhas Instituições",
      "active": "Activo",
      "open_dashboard": "Painel",
      "add_institution": "Adicionar",
      "add_institution_desc": "Mais papéis profissionais",
      "join_professional": "Entrar como Profissional",
      "join_professional_desc": "Registe a sua clínica, farmácia, laboratório ou comece como médico ou condutor",
      "explore_roles": "Explorar papéis",
      "emergency": "Emergência",
      "emergency_desc": "Triagem imediata com IA"
    },
    "profilehub": {
      "overview": "Geral",
      "institutions": "Instituições",
      "settings": "Definições",
      "account": "Conta",
      "active_roles": "Papéis Activos",
      "verified": "Verificado",
      "open": "Abrir",
      "available_roles": "Papéis Disponíveis",
      "language_region": "Idioma & Região",
      "notifications": "Notificações",
      "notifications_desc": "Gerir alertas e preferências",
      "notifications_soon": "Em breve!",
      "theme": "Tema",
      "theme_desc": "Claro, escuro ou automático",
      "theme_soon": "Em breve!",
      "change_password": "Alterar Palavra-passe",
      "change_password_desc": "Actualizar a sua senha de acesso",
      "password_soon": "Em breve!",
      "payment_settings": "Pagamentos",
      "payment_settings_desc": "M-Pesa, cartão e métodos de pagamento",
      "addresses": "Endereços",
      "addresses_desc": "Gerir moradas de entrega e cobrança",
      "privacy": "Privacidade & Segurança",
      "privacy_desc": "Dados, permissões e termos de uso"
    },
    "sidebar": { "my_institutions": "Instituições" },
    "changePassword": {
      "errors": {
        "currentRequired": "A senha actual é obrigatória",
        "minLength": "A nova senha deve ter no mínimo 6 caracteres",
        "mismatch": "As senhas não coincidem",
        "confirmRequired": "Confirme a nova senha",
        "fixErrors": "Corrija os erros antes de continuar",
        "invalidSession": "Sessão inválida. Faça login novamente.",
        "wrongPassword": "Senha actual incorreta",
        "generic": "Erro ao alterar senha. Tente novamente."
      },
      "strength": { "weak": "Fraca", "medium": "Média", "strong": "Forte" },
      "info": {
        "title": "Proteja sua conta",
        "description": "Use uma senha forte com letras, números e símbolos"
      },
      "current": "Senha actual",
      "new": "Nova senha",
      "confirm": "Confirmar nova senha",
      "match": "As senhas coincidem",
      "submitting": "A alterar senha...",
      "submit": "Alterar Senha",
      "success": "Senha alterada com sucesso!",
      "tips": {
        "title": "Dicas de segurança",
        "tip1": "Use pelo menos 6 caracteres com letras e números",
        "tip2": "Não reutilize senhas de outros serviços",
        "tip3": "Evite informações pessoais como datas ou nomes"
      }
    },
    "rail": {
      "join_title": "Entra na MedWallet",
      "join_desc": "Carteira local, médicos verificados e farmácia 24h num só sítio.",
      "join_cta": "Começar",
      "wallet_label": "Carteira",
      "wallet_discount": "Desconto auto em todas as compras",
      "quick_access": "Acesso rápido",
      "my_consultations": "Minhas consultas",
      "meddy_consult": "Meddy Consulta",
      "invite_friends": "Convidar amigos",
      "invite_title": "Convida amigos",
      "invite_desc": "Ganha saldo local e Pulse por cada amigo que entra.",
      "invite_cta": "Ver meu link"
    }
  },
  "en": {
    "bottomnav": {
      "hub_title": "MedWallet Hub",
      "current_location": "Current Location",
      "change": "Change",
      "my_institutions": "My Institutions",
      "active": "Active",
      "open_dashboard": "Dashboard",
      "add_institution": "Add",
      "add_institution_desc": "More professional roles",
      "join_professional": "Join as Professional",
      "join_professional_desc": "Register your clinic, pharmacy, laboratory or start as a doctor or driver",
      "explore_roles": "Explore roles",
      "emergency": "Emergency",
      "emergency_desc": "Immediate AI triage"
    },
    "profilehub": {
      "overview": "Overview",
      "institutions": "Institutions",
      "settings": "Settings",
      "account": "Account",
      "active_roles": "Active Roles",
      "verified": "Verified",
      "open": "Open",
      "available_roles": "Available Roles",
      "language_region": "Language & Region",
      "notifications": "Notifications",
      "notifications_desc": "Manage alerts and preferences",
      "notifications_soon": "Coming soon!",
      "theme": "Theme",
      "theme_desc": "Light, dark or automatic",
      "theme_soon": "Coming soon!",
      "change_password": "Change Password",
      "change_password_desc": "Update your access password",
      "password_soon": "Coming soon!",
      "payment_settings": "Payments",
      "payment_settings_desc": "M-Pesa, card and payment methods",
      "addresses": "Addresses",
      "addresses_desc": "Manage delivery and billing addresses",
      "privacy": "Privacy & Security",
      "privacy_desc": "Data, permissions and terms of use"
    },
    "sidebar": { "my_institutions": "Institutions" },
    "changePassword": {
      "errors": {
        "currentRequired": "Current password is required",
        "minLength": "New password must be at least 6 characters",
        "mismatch": "Passwords do not match",
        "confirmRequired": "Confirm the new password",
        "fixErrors": "Fix the errors before continuing",
        "invalidSession": "Invalid session. Please log in again.",
        "wrongPassword": "Current password is incorrect",
        "generic": "Error changing password. Please try again."
      },
      "strength": { "weak": "Weak", "medium": "Medium", "strong": "Strong" },
      "info": {
        "title": "Protect your account",
        "description": "Use a strong password with letters, numbers and symbols"
      },
      "current": "Current password",
      "new": "New password",
      "confirm": "Confirm new password",
      "match": "Passwords match",
      "submitting": "Changing password...",
      "submit": "Change Password",
      "success": "Password changed successfully!",
      "tips": {
        "title": "Security tips",
        "tip1": "Use at least 6 characters with letters and numbers",
        "tip2": "Do not reuse passwords from other services",
        "tip3": "Avoid personal information like dates or names"
      }
    },
    "rail": {
      "join_title": "Join MedWallet",
      "join_desc": "Local wallet, verified doctors and 24h pharmacy in one place.",
      "join_cta": "Get started",
      "wallet_label": "Wallet",
      "wallet_discount": "Auto discount on all purchases",
      "quick_access": "Quick access",
      "my_consultations": "My consultations",
      "meddy_consult": "Meddy Consult",
      "invite_friends": "Invite friends",
      "invite_title": "Invite friends",
      "invite_desc": "Earn local balance and Pulse for each friend who joins.",
      "invite_cta": "View my link"
    }
  },
  "es": {
    "bottomnav": {
      "hub_title": "MedWallet Hub",
      "current_location": "Ubicación Actual",
      "change": "Cambiar",
      "my_institutions": "Mis Instituciones",
      "active": "Activo",
      "open_dashboard": "Panel",
      "add_institution": "Agregar",
      "add_institution_desc": "Más roles profesionales",
      "join_professional": "Entrar como Profesional",
      "join_professional_desc": "Registra tu clínica, farmacia, laboratorio o comienza como médico o conductor",
      "explore_roles": "Explorar roles",
      "emergency": "Emergencia",
      "emergency_desc": "Triaje inmediato con IA"
    },
    "profilehub": {
      "overview": "General",
      "institutions": "Instituciones",
      "settings": "Configuración",
      "account": "Cuenta",
      "active_roles": "Roles Activos",
      "verified": "Verificado",
      "open": "Abrir",
      "available_roles": "Roles Disponibles",
      "language_region": "Idioma y Región",
      "notifications": "Notificaciones",
      "notifications_desc": "Gestionar alertas y preferencias",
      "notifications_soon": "¡Próximamente!",
      "theme": "Tema",
      "theme_desc": "Claro, oscuro o automático",
      "theme_soon": "¡Próximamente!",
      "change_password": "Cambiar Contraseña",
      "change_password_desc": "Actualizar tu contraseña de acceso",
      "password_soon": "¡Próximamente!",
      "payment_settings": "Pagos",
      "payment_settings_desc": "M-Pesa, tarjeta y métodos de pago",
      "addresses": "Direcciones",
      "addresses_desc": "Gestionar direcciones de entrega y facturación",
      "privacy": "Privacidad y Seguridad",
      "privacy_desc": "Datos, permisos y términos de uso"
    },
    "sidebar": { "my_institutions": "Instituciones" },
    "changePassword": {
      "errors": {
        "currentRequired": "La contraseña actual es obligatoria",
        "minLength": "La nueva contraseña debe tener al menos 6 caracteres",
        "mismatch": "Las contraseñas no coinciden",
        "confirmRequired": "Confirma la nueva contraseña",
        "fixErrors": "Corrige los errores antes de continuar",
        "invalidSession": "Sesión inválida. Inicia sesión de nuevo.",
        "wrongPassword": "Contraseña actual incorrecta",
        "generic": "Error al cambiar la contraseña. Inténtalo de nuevo."
      },
      "strength": { "weak": "Débil", "medium": "Media", "strong": "Fuerte" },
      "info": {
        "title": "Protege tu cuenta",
        "description": "Usa una contraseña fuerte con letras, números y símbolos"
      },
      "current": "Contraseña actual",
      "new": "Nueva contraseña",
      "confirm": "Confirmar nueva contraseña",
      "match": "Las contraseñas coinciden",
      "submitting": "Cambiando contraseña...",
      "submit": "Cambiar Contraseña",
      "success": "¡Contraseña cambiada con éxito!",
      "tips": {
        "title": "Consejos de seguridad",
        "tip1": "Usa al menos 6 caracteres con letras y números",
        "tip2": "No reutilices contraseñas de otros servicios",
        "tip3": "Evita información personal como fechas o nombres"
      }
    },
    "rail": {
      "join_title": "Únete a MedWallet",
      "join_desc": "Cartera local, médicos verificados y farmacia 24h en un solo lugar.",
      "join_cta": "Comenzar",
      "wallet_label": "Cartera",
      "wallet_discount": "Descuento automático en todas las compras",
      "quick_access": "Acceso rápido",
      "my_consultations": "Mis consultas",
      "meddy_consult": "Meddy Consulta",
      "invite_friends": "Invitar amigos",
      "invite_title": "Invita amigos",
      "invite_desc": "Gana saldo local y Pulse por cada amigo que se une.",
      "invite_cta": "Ver mi enlace"
    }
  },
  "fr": {
    "bottomnav": {
      "hub_title": "MedWallet Hub",
      "current_location": "Localisation Actuelle",
      "change": "Changer",
      "my_institutions": "Mes Institutions",
      "active": "Actif",
      "open_dashboard": "Tableau de bord",
      "add_institution": "Ajouter",
      "add_institution_desc": "Plus de rôles professionnels",
      "join_professional": "Rejoindre en tant que Professionnel",
      "join_professional_desc": "Inscrivez votre clinique, pharmacie, laboratoire ou commencez en tant que médecin ou livreur",
      "explore_roles": "Explorer les rôles",
      "emergency": "Urgence",
      "emergency_desc": "Triage immédiat par IA"
    },
    "profilehub": {
      "overview": "Général",
      "institutions": "Institutions",
      "settings": "Paramètres",
      "account": "Compte",
      "active_roles": "Rôles Actifs",
      "verified": "Vérifié",
      "open": "Ouvrir",
      "available_roles": "Rôles Disponibles",
      "language_region": "Langue et Région",
      "notifications": "Notifications",
      "notifications_desc": "Gérer les alertes et préférences",
      "notifications_soon": "Bientôt !",
      "theme": "Thème",
      "theme_desc": "Clair, sombre ou automatique",
      "theme_soon": "Bientôt !",
      "change_password": "Changer le Mot de Passe",
      "change_password_desc": "Mettre à jour votre mot de passe",
      "password_soon": "Bientôt !",
      "payment_settings": "Paiements",
      "payment_settings_desc": "M-Pesa, carte et méthodes de paiement",
      "addresses": "Adresses",
      "addresses_desc": "Gérer les adresses de livraison et de facturation",
      "privacy": "Confidentialité et Sécurité",
      "privacy_desc": "Données, autorisations et conditions d'utilisation"
    },
    "sidebar": { "my_institutions": "Institutions" },
    "changePassword": {
      "errors": {
        "currentRequired": "Le mot de passe actuel est requis",
        "minLength": "Le nouveau mot de passe doit comporter au moins 6 caractères",
        "mismatch": "Les mots de passe ne correspondent pas",
        "confirmRequired": "Confirmez le nouveau mot de passe",
        "fixErrors": "Corrigez les erreurs avant de continuer",
        "invalidSession": "Session invalide. Veuillez vous reconnecter.",
        "wrongPassword": "Mot de passe actuel incorrect",
        "generic": "Erreur lors du changement de mot de passe. Veuillez réessayer."
      },
      "strength": { "weak": "Faible", "medium": "Moyen", "strong": "Fort" },
      "info": {
        "title": "Protégez votre compte",
        "description": "Utilisez un mot de passe fort avec des lettres, chiffres et symboles"
      },
      "current": "Mot de passe actuel",
      "new": "Nouveau mot de passe",
      "confirm": "Confirmer le nouveau mot de passe",
      "match": "Les mots de passe correspondent",
      "submitting": "Changement du mot de passe...",
      "submit": "Changer le Mot de Passe",
      "success": "Mot de passe changé avec succès !",
      "tips": {
        "title": "Conseils de sécurité",
        "tip1": "Utilisez au moins 6 caractères avec des lettres et des chiffres",
        "tip2": "Ne réutilisez pas de mots de passe d'autres services",
        "tip3": "Évitez les informations personnelles comme les dates ou les noms"
      }
    },
    "rail": {
      "join_title": "Rejoignez MedWallet",
      "join_desc": "Portefeuille local, médecins vérifiés et pharmacie 24h en un seul endroit.",
      "join_cta": "Commencer",
      "wallet_label": "Portefeuille",
      "wallet_discount": "Remise automatique sur tous les achats",
      "quick_access": "Accès rapide",
      "my_consultations": "Mes consultations",
      "meddy_consult": "Consultation Meddy",
      "invite_friends": "Inviter des amis",
      "invite_title": "Invitez des amis",
      "invite_desc": "Gagnez du solde local et du Pulse pour chaque ami qui rejoint.",
      "invite_cta": "Voir mon lien"
    }
  },
  "af": {
    "bottomnav": {
      "hub_title": "MedWallet Hub",
      "current_location": "Huidige Ligging",
      "change": "Verander",
      "my_institutions": "My Instellings",
      "active": "Aktief",
      "open_dashboard": "Kontrolepaneel",
      "add_institution": "Voeg by",
      "add_institution_desc": "Meer professionele rolle",
      "join_professional": "Sluit aan as Profesioneel",
      "join_professional_desc": "Registreer u kliniek, apteek, laboratorium of begin as dokter of bestuurder",
      "explore_roles": "Verken rolle",
      "emergency": "Noodgeval",
      "emergency_desc": "Onmiddellike AI-triage"
    },
    "profilehub": {
      "overview": "Oorsig",
      "institutions": "Instellings",
      "settings": "Instellings",
      "account": "Rekening",
      "active_roles": "Aktiewe Rolle",
      "verified": "Geverifieer",
      "open": "Maak oop",
      "available_roles": "Beskikbare Rolle",
      "language_region": "Taal en Streek",
      "notifications": "Kennisgewings",
      "notifications_desc": "Bestuur waarskuwings en voorkeure",
      "notifications_soon": "Binnekort!",
      "theme": "Tema",
      "theme_desc": "Lig, donker of outomaties",
      "theme_soon": "Binnekort!",
      "change_password": "Verander Wagwoord",
      "change_password_desc": "Werk u wagwoord by",
      "password_soon": "Binnekort!",
      "payment_settings": "Betalings",
      "payment_settings_desc": "M-Pesa, kaart en betaalmetodes",
      "addresses": "Adresse",
      "addresses_desc": "Bestuur aflewerings- en faktureringsadresse",
      "privacy": "Privaatheid en Sekuriteit",
      "privacy_desc": "Data, toestemmings en gebruiksvoorwaardes"
    },
    "sidebar": { "my_institutions": "Instellings" },
    "changePassword": {
      "errors": {
        "currentRequired": "Huidige wagwoord is verpligtend",
        "minLength": "Nuwe wagwoord moet ten minste 6 karakters hê",
        "mismatch": "Wagwoorde stem nie ooreen nie",
        "confirmRequired": "Bevestig die nuwe wagwoord",
        "fixErrors": "Reg die foute voordat u voortgaan",
        "invalidSession": "Ongeldige sessie. Teken asseblief weer in.",
        "wrongPassword": "Huidige wagwoord is verkeerd",
        "generic": "Fout by verander van wagwoord. Probeer asseblief weer."
      },
      "strength": { "weak": "Swaak", "medium": "Gemiddeld", "strong": "Sterk" },
      "info": {
        "title": "Beskerm u rekening",
        "description": "Gebruik 'n sterk wagwoord met letters, syfers en simbole"
      },
      "current": "Huidige wagwoord",
      "new": "Nuwe wagwoord",
      "confirm": "Bevestig nuwe wagwoord",
      "match": "Wagwoorde stem ooreen",
      "submitting": "Wagwoord word verander...",
      "submit": "Verander Wagwoord",
      "success": "Wagwoord suksesvol verander!",
      "tips": {
        "title": "Sekerheidstips",
        "tip1": "Gebruik ten minste 6 karakters met letters en syfers",
        "tip2": "Hergebruik nie wagwoorde van ander dienste nie",
        "tip3": "Vermy persoonlike inligting soos datums of name"
      }
    },
    "rail": {
      "join_title": "Sluit aan by MedWallet",
      "join_desc": "Plaaslike beursie, geverifieerde dokters en 24h apteek in een plek.",
      "join_cta": "Begin",
      "wallet_label": "Beursie",
      "wallet_discount": "Outo-afslag op alle aankope",
      "quick_access": "Vinnige toegang",
      "my_consultations": "My konsultasies",
      "meddy_consult": "Meddy Konsultasie",
      "invite_friends": "Nooi vriende uit",
      "invite_title": "Nooi vriende uit",
      "invite_desc": "Verdien plaaslike saldo en Pulse vir elke vriend wat aansluit.",
      "invite_cta": "Sien my skakel"
    }
  },
  "hi": {
    "bottomnav": {
      "hub_title": "MedWallet Hub",
      "current_location": "वर्तमान स्थान",
      "change": "बदलें",
      "my_institutions": "मेरे संस्थान",
      "active": "सक्रिय",
      "open_dashboard": "डैशबोर्ड",
      "add_institution": "जोड़ें",
      "add_institution_desc": "अधिक पेशेवर भूमिकाएँ",
      "join_professional": "पेशेवर के रूप में शामिल हों",
      "join_professional_desc": "अपना क्लिनिक, फार्मेसी, लैब रजिस्टर करें या डॉक्टर या ड्राइवर के रूप में शुरू करें",
      "explore_roles": "भूमिकाएँ खोजें",
      "emergency": "आपातकाल",
      "emergency_desc": "तत्काल AI ट्रायज"
    },
    "profilehub": {
      "overview": "अवलोकन",
      "institutions": "संस्थान",
      "settings": "सेटिंग्स",
      "account": "खाता",
      "active_roles": "सक्रिय भूमिकाएँ",
      "verified": "सत्यापित",
      "open": "खोलें",
      "available_roles": "उपलब्ध भूमिकाएँ",
      "language_region": "भाषा और क्षेत्र",
      "notifications": "सूचनाएँ",
      "notifications_desc": "अलर्ट और प्राथमिकताएँ प्रबंधित करें",
      "notifications_soon": "जल्द आ रहा है!",
      "theme": "थीम",
      "theme_desc": "लाइट, डार्क या ऑटोमैटिक",
      "theme_soon": "जल्द आ रहा है!",
      "change_password": "पासवर्ड बदलें",
      "change_password_desc": "अपना एक्सेस पासवर्ड अपडेट करें",
      "password_soon": "जल्द आ रहा है!",
      "payment_settings": "भुगतान",
      "payment_settings_desc": "M-Pesa, कार्ड और भुगतान के तरीके",
      "addresses": "पते",
      "addresses_desc": "डिलीवरी और बिलिंग पते प्रबंधित करें",
      "privacy": "गोपनीयता और सुरक्षा",
      "privacy_desc": "डेटा, अनुमतियाँ और उपयोग की शर्तें"
    },
    "sidebar": { "my_institutions": "संस्थान" },
    "changePassword": {
      "errors": {
        "currentRequired": "वर्तमान पासवर्ड आवश्यक है",
        "minLength": "नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए",
        "mismatch": "पासवर्ड मेल नहीं खाते",
        "confirmRequired": "नया पासवर्ड कन्फर्म करें",
        "fixErrors": "आगे बढ़ने से पहले त्रुटियाँ ठीक करें",
        "invalidSession": "अमान्य सत्र। कृपया फिर से लॉग इन करें।",
        "wrongPassword": "वर्तमान पासवर्ड गलत है",
        "generic": "पासवर्ड बदलने में त्रुटि। कृपया पुनः प्रयास करें।"
      },
      "strength": { "weak": "कमज़ोर", "medium": "मध्यम", "strong": "मज़बूत" },
      "info": {
        "title": "अपना खाता सुरक्षित रखें",
        "description": "अक्षरों, संख्याओं और प्रतीकों के साथ मज़बूत पासवर्ड का उपयोग करें"
      },
      "current": "वर्तमान पासवर्ड",
      "new": "नया पासवर्ड",
      "confirm": "नया पासवर्ड कन्फर्म करें",
      "match": "पासवर्ड मेल खाते हैं",
      "submitting": "पासवर्ड बदल रहा है...",
      "submit": "पासवर्ड बदलें",
      "success": "पासवर्ड सफलतापूर्वक बदला गया!",
      "tips": {
        "title": "सुरक्षा युक्तियाँ",
        "tip1": "अक्षरों और संख्याओं के साथ कम से कम 6 अक्षरों का उपयोग करें",
        "tip2": "अन्य सेवाओं के पासवर्ड पुनः उपयोग न करें",
        "tip3": "तारीखों या नामों जैसी व्यक्तिगत जानकारी से बचें"
      }
    },
    "rail": {
      "join_title": "MedWallet से जुड़ें",
      "join_desc": "स्थानीय वॉलेट, सत्यापित डॉक्टर और 24 घंटे की फार्मेसी एक जगह।",
      "join_cta": "शुरू करें",
      "wallet_label": "वॉलेट",
      "wallet_discount": "सभी खरीदारी पर ऑटो छूट",
      "quick_access": "त्वरित पहुँच",
      "my_consultations": "मेरे परामर्श",
      "meddy_consult": "Meddy परामर्श",
      "invite_friends": "दोस्तों को आमंत्रित करें",
      "invite_title": "दोस्तों को आमंत्रित करें",
      "invite_desc": "हर दोस्त के जुड़ने पर स्थानीय बैलेंस और Pulse कमाएं।",
      "invite_cta": "मेरा लिंक देखें"
    }
  },
  "pt-BR": {
    "bottomnav": {
      "hub_title": "MedWallet Hub",
      "current_location": "Localização Atual",
      "change": "Alterar",
      "my_institutions": "Minhas Instituições",
      "active": "Ativo",
      "open_dashboard": "Painel",
      "add_institution": "Adicionar",
      "add_institution_desc": "Mais papéis profissionais",
      "join_professional": "Entrar como Profissional",
      "join_professional_desc": "Registre sua clínica, farmácia, laboratório ou comece como médico ou motorista",
      "explore_roles": "Explorar papéis",
      "emergency": "Emergência",
      "emergency_desc": "Triagem imediata com IA"
    },
    "profilehub": {
      "overview": "Geral",
      "institutions": "Instituições",
      "settings": "Configurações",
      "account": "Conta",
      "active_roles": "Papéis Ativos",
      "verified": "Verificado",
      "open": "Abrir",
      "available_roles": "Papéis Disponíveis",
      "language_region": "Idioma & Região",
      "notifications": "Notificações",
      "notifications_desc": "Gerenciar alertas e preferências",
      "notifications_soon": "Em breve!",
      "theme": "Tema",
      "theme_desc": "Claro, escuro ou automático",
      "theme_soon": "Em breve!",
      "change_password": "Alterar Senha",
      "change_password_desc": "Atualizar sua senha de acesso",
      "password_soon": "Em breve!",
      "payment_settings": "Pagamentos",
      "payment_settings_desc": "M-Pesa, cartão e métodos de pagamento",
      "addresses": "Endereços",
      "addresses_desc": "Gerenciar endereços de entrega e cobrança",
      "privacy": "Privacidade & Segurança",
      "privacy_desc": "Dados, permissões e termos de uso"
    },
    "sidebar": { "my_institutions": "Instituições" },
    "changePassword": {
      "errors": {
        "currentRequired": "A senha atual é obrigatória",
        "minLength": "A nova senha deve ter no mínimo 6 caracteres",
        "mismatch": "As senhas não coincidem",
        "confirmRequired": "Confirme a nova senha",
        "fixErrors": "Corrija os erros antes de continuar",
        "invalidSession": "Sessão inválida. Faça login novamente.",
        "wrongPassword": "Senha atual incorreta",
        "generic": "Erro ao alterar senha. Tente novamente."
      },
      "strength": { "weak": "Fraca", "medium": "Média", "strong": "Forte" },
      "info": {
        "title": "Proteja sua conta",
        "description": "Use uma senha forte com letras, números e símbolos"
      },
      "current": "Senha atual",
      "new": "Nova senha",
      "confirm": "Confirmar nova senha",
      "match": "As senhas coincidem",
      "submitting": "Alterando senha...",
      "submit": "Alterar Senha",
      "success": "Senha alterada com sucesso!",
      "tips": {
        "title": "Dicas de segurança",
        "tip1": "Use pelo menos 6 caracteres com letras e números",
        "tip2": "Não reutilize senhas de outros serviços",
        "tip3": "Evite informações pessoais como datas ou nomes"
      }
    },
    "rail": {
      "join_title": "Entre na MedWallet",
      "join_desc": "Carteira local, médicos verificados e farmácia 24h em um só lugar.",
      "join_cta": "Começar",
      "wallet_label": "Carteira",
      "wallet_discount": "Desconto automático em todas as compras",
      "quick_access": "Acesso rápido",
      "my_consultations": "Minhas consultas",
      "meddy_consult": "Meddy Consulta",
      "invite_friends": "Convidar amigos",
      "invite_title": "Convide amigos",
      "invite_desc": "Ganhe saldo local e Pulse por cada amigo que entrar.",
      "invite_cta": "Ver meu link"
    }
  }
}

# Also fix the "manager" section in es, fr which still has Portuguese text
manager_translations = {
  "es": {
    "welcome_title": "Panel Regional",
    "panel_label": "Gestor Regional",
    "isolation_notice": "Acceso restringido a los datos de su región. No puede ver datos de otras regiones.",
    "isolated_session": "Sesión aislada por región",
    "region_isolated": "Datos 100% aislados por región",
    "active_in_region": "Activos en la región",
    "total_orders": "Total de pedidos",
    "registered_pharmacies": "Farmacias registradas",
    "verified_doctors": "Médicos verificados",
    "registered_clinics": "Clínicas registradas",
    "active_drivers": "Repartidores activos",
    "recent_registrations": "Registros Recientes en la Región",
    "no_recent_activity": "Sin actividad reciente en su región.",
    "users_title": "Gestión de Usuarios de la Región",
    "users_subtitle": "Solo usuarios registrados en su región",
    "total_users": "Total de usuarios",
    "search_users": "Buscar por nombre o teléfono...",
    "no_users_found": "Ningún usuario encontrado.",
    "prev": "Anterior",
    "next": "Siguiente"
  },
  "fr": {
    "welcome_title": "Tableau de Bord Régional",
    "panel_label": "Gestionnaire Régional",
    "isolation_notice": "Accès restreint aux données de votre région. Vous ne pouvez pas voir les données d'autres régions.",
    "isolated_session": "Session isolée par région",
    "region_isolated": "Données 100% isolées par région",
    "active_in_region": "Actifs dans la région",
    "total_orders": "Total des commandes",
    "registered_pharmacies": "Pharmacies enregistrées",
    "verified_doctors": "Médecins vérifiés",
    "registered_clinics": "Cliniques enregistrées",
    "active_drivers": "Livreurs actifs",
    "recent_registrations": "Enregistrements Récents dans la Région",
    "no_recent_activity": "Pas d'activité récente dans votre région.",
    "users_title": "Gestion des Utilisateurs de la Région",
    "users_subtitle": "Uniquement les utilisateurs enregistrés dans votre région",
    "total_users": "Total des utilisateurs",
    "search_users": "Rechercher par nom ou téléphone...",
    "no_users_found": "Aucun utilisateur trouvé.",
    "prev": "Précédent",
    "next": "Suivant"
  }
}

for locale, new_keys in translations.items():
    filepath = os.path.join(DIR, f"{locale}.json")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    data.update(new_keys)
    
    # Fix manager section for es and fr
    if locale in manager_translations:
        data['manager'] = manager_translations[locale]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    
    print(f"✅ {locale}.json updated ({sum(len(v) if isinstance(v, dict) else 1 for v in new_keys.values())} top-level keys)")

print("\nValidating all files...")
for locale in ["pt", "en", "es", "fr", "af", "hi", "pt-BR"]:
    filepath = os.path.join(DIR, f"{locale}.json")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            json.load(f)
        print(f"  ✅ {locale}.json valid")
    except Exception as e:
        print(f"  ❌ {locale}.json INVALID: {e}")

print("\nDone!")
