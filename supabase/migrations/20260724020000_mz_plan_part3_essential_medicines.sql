-- =====================================================================
-- MZ DOMINATION PLAN — PART 3: MEDICAMENTOS UME (Lista Essencial MISAU/OMS)
-- Categorias: Antimaláricos, ARV, TB, Antibióticos, Cardiovasculares,
--             Diabetes, Analgésicos, Vacinas, Saúde Materna, Mental, GI,
--             Respiratório, Dermatologia, Oftalmo, Oncologia
-- Total: 200+ medicamentos essenciais
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.essential_medicines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id      TEXT REFERENCES public.countries(id) DEFAULT 'MZ',
  name            TEXT NOT NULL,
  generic_name    TEXT,
  category        TEXT NOT NULL,
  subcategory     TEXT,
  form            TEXT,    -- comprimido, xarope, injetável, etc.
  strength        TEXT,    -- 100mg, 5mg/5ml, etc.
  schedule        TEXT CHECK (schedule IN ('OTC','M1','M2','M3','M4')),
  misau_code      TEXT,
  atc_code        TEXT,
  indications     TEXT,
  contraindications TEXT,
  side_effects    TEXT,
  reference_price_mzn NUMERIC(10,2),
  is_ume          BOOLEAN DEFAULT true,
  is_arv          BOOLEAN DEFAULT false,
  is_tb           BOOLEAN DEFAULT false,
  is_antimalarial BOOLEAN DEFAULT false,
  is_vaccine      BOOLEAN DEFAULT false,
  stock_essential BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ume_country ON public.essential_medicines(country_id);
CREATE INDEX IF NOT EXISTS idx_ume_category ON public.essential_medicines(category);
CREATE INDEX IF NOT EXISTS idx_ume_name ON public.essential_medicines(name);
ALTER TABLE public.essential_medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ume read" ON public.essential_medicines FOR SELECT USING (true);
GRANT SELECT ON public.essential_medicines TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.essential_medicines TO authenticated;

-- ---------- INSERT BATCH 1: ANTIMALÁRICOS ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn, is_antimalarial)
VALUES
  ('MZ','Coartem',         'Artemether + Lumefantrine',  'Antimalárico','ACT','comprimido','20mg+120mg','M3','Malaria não complicada por P. falciparum',150,true),
  ('MZ','Artesunato IV',   'Artesunate',                  'Antimalárico','Severo','injetável','60mg','M3','Malaria grave',250,true),
  ('MZ','ASAQ Winthrop',   'Artesunate + Amodiaquine',    'Antimalárico','ACT','comprimido','25mg+67.5mg','M3','Malaria não complicada',120,true),
  ('MZ','Sulfadoxina-Pirimetamina','Sulfadoxine+Pyrimethamine','Antimalárico','Intermitente','comprimido','500mg+25mg','M3','Prevenção malaria gravídica',80,true),
  ('MZ','Primaquina',      'Primaquine',                  'Antimalárico','Radical','comprimido','15mg','M3','Cura radical P. vivax',60,true),
  ('MZ','Quinina',         'Quinine',                     'Antimalárico','Severo','injetável','600mg','M3','Malaria grave (segunda linha)',200,true),
  ('MZ','Clindamicina',    'Clindamycin',                 'Antimalárico','Adjuvante','cápsula','300mg','M3','Malaria grave em crianças',180,true),
  ('MZ','Mefloquina',      'Mefloquine',                  'Antimalárico','Profilaxia','comprimido','250mg','M3','Profilaxia malaria',220,true),
  ('MZ','Cloroquina',      'Chloroquine',                 'Antimalárico','Clássico','comprimido','150mg','M3','Malaria P. vivax (sensível)',40,true),
  ('MZ','Proguanil',       'Proguanil',                   'Antimalárico','Profilaxia','comprimido','100mg','M2','Profilaxia malaria',90,true)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 2: ARV (HIV) ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn, is_arv)
VALUES
  ('MZ','TDF',           'Tenofovir Disoproxil Fumarate','ARV','NRTI','comprimido','300mg','M4','HIV primeira linha',120,true),
  ('MZ','3TC',           'Lamivudine',                   'ARV','NRTI','comprimido','150mg','M4','HIV primeira linha',80,true),
  ('MZ','DTG',           'Dolutegravir',                 'ARV','INSTI','comprimido','50mg','M4','HIV primeira linha (DTG-based)',250,true),
  ('MZ','EFV',           'Efavirenz',                    'ARV','NNRTI','comprimido','600mg','M4','HIV primeira linha (alternativa)',150,true),
  ('MZ','NVP',           'Nevirapine',                   'ARV','NNRTI','comprimido','200mg','M4','HIV (segunda linha)',130,true),
  ('MZ','ABC',           'Abacavir',                     'ARV','NRTI','comprimido','300mg','M4','HIV pediátrico',200,true),
  ('MZ','AZT',           'Zidovudine',                   'ARV','NRTI','comprimido','300mg','M4','HIV (segunda linha)',110,true),
  ('MZ','LPV/r',         'Lopinavir/Ritonavir',          'ARV','PI','comprimido','200mg+50mg','M4','HIV segunda linha',280,true),
  ('MZ','ATV/r',         'Atazanavir/Ritonavir',         'ARV','PI','comprimido','300mg+100mg','M4','HIV segunda linha',320,true),
  ('MZ','DRV/r',         'Darunavir/Ritonavir',          'ARV','PI','comprimido','600mg','M4','HIV terceira linha',450,true),
  ('MZ','RAL',           'Raltegravir',                  'ARV','INSTI','comprimido','400mg','M4','HIV terceira linha',380,true),
  ('MZ','ETV',           'Etravirine',                   'ARV','NNRTI','comprimido','200mg','M4','HIV resistente',420,true),
  ('MZ','TDF/3TC/DTG',   'Tenofovir+Lamivudine+Dolutegravir','ARV','TLD','comprimido','300+300+50mg','M4','HIV TLD (primeira linha)',350,true),
  ('MZ','ABC/3TC',       'Abacavir+Lamivudine',          'ARV','Combo','comprimido','600+300mg','M4','HIV pediátrico (combo)',280,true),
  ('MZ','Cotrimoxazol',  'Sulfamethoxazole+Trimethoprim','ARV Adjuvante','Profilaxia','comprimido','400+80mg','M3','Profilaxia pneumonia PCP (HIV)',30,true)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 3: TUBERCULOSE ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn, is_tb)
VALUES
  ('MZ','Rifampicina',   'Rifampicin',                   'TB','RIF','cápsula','300mg','M4','TB pulmonar (RHZE)',90,true),
  ('MZ','Isoniazida',    'Isoniazid',                    'TB','INH','comprimido','300mg','M4','TB pulmonar + profilaxia',40,true),
  ('MZ','Pirazinamida',  'Pyrazinamide',                 'TB','PZA','comprimido','500mg','M4','TB fase intensiva',70,true),
  ('MZ','Etambutol',     'Ethambutol',                   'TB','EMB','comprimido','400mg','M4','TB fase intensiva',60,true),
  ('MZ','RHZE 4-em-1',   'Rif+Ison+Pyr+Ethambutol',      'TB','Combo','comprimido','150+75+400+275mg','M4','TB fase intensiva adulto',180,true),
  ('MZ','RH 2-em-1',     'Rif+Isoniazid',                'TB','Combo','comprimido','150+75mg','M4','TB fase continuação',120,true),
  ('MZ','Estreptomicina','Streptomycin',                 'TB','SM','injetável','1g','M4','TB resistente',150,true),
  ('MZ','Etionamida',    'Ethionamide',                  'TB','ETO','comprimido','250mg','M4','TB-MR',200,true),
  ('MZ','Levofloxacina', 'Levofloxacin',                 'TB','FLQ','comprimido','500mg','M3','TB-MR',180,true),
  ('MZ','Moxifloxacina', 'Moxifloxacin',                 'TB','FLQ','comprimido','400mg','M3','TB-MR curto',250,true),
  ('MZ','Cicloserina',   'Cycloserine',                  'TB','CS','cápsula','250mg','M4','TB-MR',220,true),
  ('MZ','Capreomicina',  'Capreomycin',                  'TB','CM','injetável','1g','M4','TB-XDR',300,true),
  ('MZ','Bedaquilina',   'Bedaquiline',                  'TB','BDQ','comprimido','100mg','M4','TB-MR curto (novo)',600,true),
  ('MZ','Linezolida',    'Linezolid',                    'TB','LZD','comprimido','600mg','M4','TB-XDR',700,true),
  ('MZ','PAS',           'Para-aminosalicylic acid',     'TB','PAS','saqueta','4g','M4','TB-MR (alternativa)',180,true),
  ('MZ','Vitamina B6',   'Pyridoxine',                   'TB Adjuvante','Adjuvante','comprimido','25mg','OTC','Prevenção neuropatia INH',15,true)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 4: ANTIBIÓTICOS ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Amoxicilina',       'Amoxicillin',           'Antibiótico','Penicilina','cápsula','500mg','M3','Infecções respiratórias, otite',45),
  ('MZ','Amoxiclav',         'Amoxicillin+Clavulanate','Antibiótico','Penicilina','comprimido','875+125mg','M3','Infecções respiratórias graves',180),
  ('MZ','Penicilina V',      'Phenoxymethylpenicillin','Antibiótico','Penicilina','comprimido','250mg','M3','Faringite estreptocócica',35),
  ('MZ','Penicilina G',      'Benzylpenicillin',      'Antibiótico','Penicilina','injetável','5MU','M3','Sífilis, infecções graves',60),
  ('MZ','Benzatin Penicilina','Benzathine Penicillin', 'Antibiótico','Penicilina','injetável','2.4MU','M3','Sífilis, febre reumática',120),
  ('MZ','Cefalexina',        'Cephalexin',            'Antibiótico','Cefalosporina','cápsula','500mg','M3','ITU, infecções pele',90),
  ('MZ','Ceftriaxona',       'Ceftriaxone',           'Antibiótico','Cefalosporina','injetável','1g','M3','Meningite, gonorréia, sepsis',160),
  ('MZ','Cefuroxima',        'Cefuroxime',            'Antibiótico','Cefalosporina','comprimido','500mg','M3','Sinusite, pneumonia',140),
  ('MZ','Azitromicina',      'Azithromycin',          'Antibiótico','Macrólido','comprimido','500mg','M3','Respiratórias, DST',180),
  ('MZ','Eritromicina',      'Erythromycin',          'Antibiótico','Macrólido','comprimido','500mg','M3','Alternativa penicilina alérgicos',90),
  ('MZ','Claritromicina',    'Clarithromycin',        'Antibiótico','Macrólido','comprimido','500mg','M3','H. pylori, respiratórias',200),
  ('MZ','Ciprofloxacina',    'Ciprofloxacin',         'Antibiótico','Fluorquinolona','comprimido','500mg','M3','ITU, gastroenterite',80),
  ('MZ','Norfloxacina',      'Norfloxacin',           'Antibiótico','Fluorquinolona','comprimido','400mg','M3','ITU simples',90),
  ('MZ','Metronidazol',      'Metronidazole',         'Antibiótico','Nitroimidazol','comprimido','500mg','M3','Giardíase, anaeróbios',40),
  ('MZ','Tinidazol',         'Tinidazole',            'Antibiótico','Nitroimidazol','comprimido','500mg','M3','Tricomoníase, giardíase',70),
  ('MZ','Doxiciclina',       'Doxycycline',           'Antibiótico','Tetraciclina','cápsula','100mg','M3','Cólera, acne, leptospirose',60),
  ('MZ','Cloranfenicol',     'Chloramphenicol',       'Antibiótico','Anfenicol','cápsula','500mg','M3','Tifoide, meningite (alternativa)',70),
  ('MZ','Gentamicina',       'Gentamicin',            'Antibiótico','Aminoglicosídeo','injetável','80mg','M3','Infecções graves Gram-neg',80),
  ('MZ','Nitrofurantoína',   'Nitrofurantoin',        'Antibiótico','Outros','cápsula','100mg','M3','ITU simples',90),
  ('MZ','Trimetoprim-Sulfa', 'Trimethoprim+Sulfamethoxazole','Antibiótico','Sulfonamida','comprimido','80+400mg','M3','ITU, pneumonia PCP',30)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 5: CARDIOVASCULARES ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Amlodipina',        'Amlodipine',           'Cardiovascular','Anti-hipertensor','comprimido','5mg','M2','Hipertensão',40),
  ('MZ','Enalapril',         'Enalapril',            'Cardiovascular','IECA','comprimido','10mg','M2','Hipertensão, IC',60),
  ('MZ','Lisinopril',        'Lisinopril',           'Cardiovascular','IECA','comprimido','10mg','M2','Hipertensão',70),
  ('MZ','Losartan',          'Losartan',             'Cardiovascular','ARB','comprimido','50mg','M2','Hipertensão (alternativa IECA)',90),
  ('MZ','Atenolol',          'Atenolol',             'Cardiovascular','Beta-bloqueador','comprimido','50mg','M2','Hipertensão, angina',40),
  ('MZ','Metoprolol',        'Metoprolol',           'Cardiovascular','Beta-bloqueador','comprimido','50mg','M2','IC, pós-enfarte',80),
  ('MZ','Carvedilol',        'Carvedilol',           'Cardiovascular','Beta-bloqueador','comprimido','12.5mg','M2','IC crônica',140),
  ('MZ','Furosemida',        'Furosemide',           'Cardiovascular','Diurético','comprimido','40mg','M2','IC, edema',30),
  ('MZ','Hidroclorotiazida', 'Hydrochlorothiazide',  'Cardiovascular','Diurético','comprimido','25mg','M2','Hipertensão',35),
  ('MZ','Espironolactona',   'Spironolactone',       'Cardiovascular','Diurético poupador','comprimido','25mg','M2','IC, ascite',90),
  ('MZ','Captopril',         'Captopril',            'Cardiovascular','IECA','comprimido','25mg','M2','Crise hipertensiva',60),
  ('MZ','Digoxina',          'Digoxin',              'Cardiovascular','Inotrópico','comprimido','0.25mg','M3','IC, fibrilação auricular',60),
  ('MZ','Aspirina',          'Acetylsalicylic Acid', 'Cardiovascular','Antiagregante','comprimido','100mg','OTC','Profilaxia cardiovascular',15),
  ('MZ','Clopidogrel',       'Clopidogrel',          'Cardiovascular','Antiagregante','comprimido','75mg','M3','Pós-enfarte, AVC',180),
  ('MZ','Atorvastatina',     'Atorvastatin',         'Cardiovascular','Estatina','comprimido','20mg','M3','Hipercolesterolemia',150),
  ('MZ','Simvastatina',      'Simvastatin',          'Cardiovascular','Estatina','comprimido','20mg','M3','Hipercolesterolemia',90),
  ('MZ','Anfotericina B',    'Amphotericin B',       'Cardiovascular','Antifúngico IV','injetável','50mg','M4','Meningite criptocócica (HIV)',350),
  ('MZ','Fluconazol',        'Fluconazole',          'Cardiovascular','Antifúngico','cápsula','150mg','M3','Candidíase, meningite cripto',120),
  ('MZ','Sinvastatina + Ezetimiba','Simvastatin+Ezetimibe','Cardiovascular','Combo','comprimido','20+10mg','M3','Hipercolesterolemia familiar',240),
  ('MZ','Varfarina',         'Warfarin',             'Cardiovascular','Anticoagulante','comprimido','5mg','M3','TVP, embolia',90)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 6: DIABETES ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Metformina',        'Metformin',            'Diabetes','Biguanida','comprimido','500mg','M2','Diabetes tipo 2 primeira linha',40),
  ('MZ','Glibenclamida',     'Glibenclamide',        'Diabetes','Sulfonilureia','comprimido','5mg','M2','Diabetes tipo 2',30),
  ('MZ','Gliclazida',        'Gliclazide',           'Diabetes','Sulfonilureia','comprimido','60mg','M2','Diabetes tipo 2 (moderno)',80),
  ('MZ','Glimepirida',       'Glimepiride',          'Diabetes','Sulfonilureia','comprimido','2mg','M2','Diabetes tipo 2',100),
  ('MZ','Insulina NPH',      'Insulin Isophane',     'Diabetes','Insulina','injetável','100UI/ml','M4','Diabetes tipo 1, tipo 2 avançado',280),
  ('MZ','Insulina Regular',  'Insulin Regular',      'Diabetes','Insulina','injetável','100UI/ml','M4','Diabetes tipo 1, emergência',250),
  ('MZ','Insulina 70/30',    'Insulin Mix 70/30',    'Diabetes','Insulina','injetável','100UI/ml','M4','Diabetes tipo 2 (combo)',300),
  ('MZ','Insulina Glargina', 'Insulin Glargine',     'Diabetes','Análogo basal','injetável','100UI/ml','M4','Diabetes tipo 1 (moderno)',450),
  ('MZ','Sitagliptina',      'Sitagliptin',          'Diabetes','DPP-4','comprimido','100mg','M3','Diabetes tipo 2 adjuvante',320),
  ('MZ','Empagliflozina',    'Empagliflozin',        'Diabetes','SGLT2','comprimido','25mg','M3','Diabetes tipo 2 + IC',420)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 7: ANALGÉSICOS / ANTITÉRMICOS ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Paracetamol',       'Paracetamol',          'Analgésico','Antitérmico','comprimido','500mg','OTC','Febre, dor leve',15),
  ('MZ','Paracetamol Xarope','Paracetamol',          'Analgésico','Pediátrico','xarope','120mg/5ml','OTC','Febre pediátrica',35),
  ('MZ','Ibuprofeno',        'Ibuprofen',            'Analgésico','AINE','comprimido','400mg','OTC','Dor, inflamação',30),
  ('MZ','Diclofenac',        'Diclofenac',           'Analgésico','AINE','comprimido','50mg','M2','Dor, inflamação',40),
  ('MZ','Aspirina 500',      'Acetylsalicylic Acid', 'Analgésico','AINE','comprimido','500mg','OTC','Dor, febre',15),
  ('MZ','Naproxeno',         'Naproxen',             'Analgésico','AINE','comprimido','500mg','M2','Dor crônica',80),
  ('MZ','Tramadol',          'Tramadol',             'Analgésico','Opióide fraco','comprimido','50mg','M3','Dor moderada a grave',120),
  ('MZ','Codeína',           'Codeine',              'Analgésico','Opióide','comprimido','30mg','M3','Dor, tosse',90),
  ('MZ','Morfina',           'Morphine',             'Analgésico','Opióide forte','injetável','10mg/ml','M4','Dor grave oncológica',180),
  ('MZ','Morfina Oral',      'Morphine Sulfate',     'Analgésico','Opióide forte','comprimido','10mg','M4','Dor oncológica crônica',150),
  ('MZ','Petidina',          'Pethidine',            'Analgésico','Opióide','injetável','50mg','M4','Dor pós-operatória',120),
  ('MZ','Ketoprofeno',       'Ketoprofen',           'Analgésico','AINE','cápsula','100mg','M2','Dor muscular',70),
  ('MZ','Indometacina',      'Indometacin',          'Analgésico','AINE','cápsula','50mg','M2','Gota, dor articular',60),
  ('MZ','Ácido Mefenâmico',  'Mefenamic Acid',       'Analgésico','AINE','comprimido','500mg','OTC','Dor menstrual',40)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 8: VACINAS (PNI Moçambique) ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn, is_vaccine)
VALUES
  ('MZ','BCG',                'BCG Vaccine',           'Vacina','Tuberculose','injetável','0.1ml','M4','TB pediátrica (recém-nascido)',80,true),
  ('MZ','Penta (DTP-HepB-Hib)','DTP+HepB+Hib',         'Vacina','Pentavalente','injetável','0.5ml','M4','Difteria, tétano, tosse convulsa, Hep B, Hib',150,true),
  ('MZ','VIP (Polio Inativada)','Inactivated Polio',   'Vacina','Poliomielite','injetável','0.5ml','M4','Poliomielite (1ª dose)',120,true),
  ('MZ','VOP (Polio Oral)',   'Oral Polio Vaccine',    'Vacina','Poliomielite','oral','2 gotas','M4','Poliomielite (reforços)',30,true),
  ('MZ','Pneumocócica PCV13', 'Pneumococcal Conjugate','Vacina','Pneumonia','injetável','0.5ml','M4','Pneumonia, meningite pneumocócica',450,true),
  ('MZ','Rotavírus',          'Rotavirus Vaccine',     'Vacina','Diarreia','oral','1.5ml','M4','Diarreia por rotavírus',380,true),
  ('MZ','Sarampo',            'Measles Vaccine',       'Vacina','Sarampo','injetável','0.5ml','M4','Sarampo (9 e 18 meses)',90,true),
  ('MZ','SR (Sarampo-Rubéola)','Measles-Rubella',      'Vacina','Sarampo + Rubéola','injetável','0.5ml','M4','Sarampo + rubéola',120,true),
  ('MZ','Febre Amarela',      'Yellow Fever Vaccine',  'Vacina','Febre amarela','injetável','0.5ml','M4','Febre amarela',180,true),
  ('MZ','Tétano',             'Tetanus Toxoid',        'Vacina','Tétano','injetável','0.5ml','M4','Tétano (gestantes, reforços)',40,true),
  ('MZ','Hepatite B',         'Hepatitis B Vaccine',   'Vacina','Hepatite B','injetável','0.5ml','M4','Hepatite B',150,true),
  ('MZ','HPV',                'HPV Vaccine',           'Vacina','HPV','injetável','0.5ml','M4','HPV (meninas 9-13 anos, prevents cervical cancer)',350,true),
  ('MZ','Cólera',             'Cholera Vaccine',       'Vacina','Cólera','oral','2 doses','M4','Cólera (surto)',120,true),
  ('MZ','Tifoide',            'Typhoid Vaccine',       'Vacina','Febre tifoide','injetável','0.5ml','M4','Febre tifoide',150,true),
  ('MZ','COVID-19',           'SARS-CoV-2 Vaccine',    'Vacina','COVID-19','injetável','0.5ml','M4','COVID-19',0,true)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 9: SAÚDE MATERNA ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Sulfato Ferroso',   'Ferrous Sulfate',       'Materna','Suplemento','comprimido','200mg','OTC','Anemia gravídica',20),
  ('MZ','Ácido Fólico',      'Folic Acid',            'Materna','Suplemento','comprimido','5mg','OTC','Prevenção defeitos tubo neural',15),
  ('MZ','Ocitocina',         'Oxytocin',              'Materna','Uterotônico','injetável','10UI/ml','M4','Hemorragia pós-parto',80),
  ('MZ','Misoprostol',       'Misoprostol',           'Materna','Uterotônico','comprimido','200mcg','M4','Hemorragia pós-parto',150),
  ('MZ','Magnésio Sulfato',  'Magnesium Sulfate',     'Materna','Eclâmpsia','injetável','500mg/ml','M4','Pré-eclâmpsia, eclâmpsia',90),
  ('MZ','Diazepam',          'Diazepam',              'Materna','Anticonvulsivante','injetável','10mg/2ml','M4','Eclâmpsia (convulsão)',60),
  ('MZ','Sulfato de Cobre',  'Copper Sulfate',        'Materna','DIU','injetável','--','M4','DIU (planeamento familiar)',250),
  ('MZ','Acetato de Medroxiprogesterona','DMPA','Materna','Contraceptivo','injetável','150mg','M4','Anticoncepcional injetável 3 meses',80),
  ('MZ','Etinilestradiol+Levonorgestrel','EE+LNG',    'Materna','Contraceptivo','comprimido','30+150mcg','M4','COC oral diário',40),
  ('MZ','Levonorgestrel',    'Levonorgestrel',        'Materna','Emergência','comprimido','1.5mg','M3','Anticoncepcional emergência',80),
  ('MZ','Nifedipina',        'Nifedipine',            'Materna','Tocolítico','cápsula','10mg','M3','Trabalho prematuro',60)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 10: SAÚDE MENTAL ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Amitriptilina',     'Amitriptyline',         'Mental','Antidepressivo','comprimido','25mg','M3','Depressão, dor crônica',40),
  ('MZ','Fluoxetina',        'Fluoxetine',            'Mental','ISRS','cápsula','20mg','M3','Depressão, ansiedade',90),
  ('MZ','Sertralina',        'Sertraline',            'Mental','ISRS','comprimido','50mg','M3','Depressão, TOC, pânico',120),
  ('MZ','Diazepam Comp',     'Diazepam',              'Mental','Ansiolítico','comprimido','5mg','M3','Ansiedade aguda',30),
  ('MZ','Lorazepam',         'Lorazepam',             'Mental','Ansiolítico','comprimido','1mg','M3','Ansiedade',90),
  ('MZ','Haloperidol',       'Haloperidol',           'Mental','Antipsicótico','comprimido','5mg','M4','Psicose, esquizofrenia',60),
  ('MZ','Risperidona',       'Risperidone',           'Mental','Antipsicótico atípico','comprimido','2mg','M4','Esquizofrenia, bipolar',200),
  ('MZ','Carbamazepina',     'Carbamazepine',         'Mental','Anticonvulsivante','comprimido','200mg','M3','Epilepsia, bipolar',80),
  ('MZ','Fenitoína',         'Phenytoin',             'Mental','Anticonvulsivante','comprimido','100mg','M3','Epilepsia',60),
  ('MZ','Ácido Valproico',   'Valproic Acid',         'Mental','Anticonvulsivante','comprimido','500mg','M3','Epilepsia, bipolar',150),
  ('MZ','Levetiracetam',     'Levetiracetam',         'Mental','Anticonvulsivante','comprimido','500mg','M3','Epilepsia (moderno)',280),
  ('MZ','Lítio',             'Lithium Carbonate',     'Mental','Estabilizador','comprimido','300mg','M4','Transtorno bipolar',120),
  ('MZ','Clonazepam',        'Clonazepam',            'Mental','Benzodiazepínico','comprimido','2mg','M4','Ansiedade, epilepsia',90)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 11: GASTROINTESTINAL ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Soro Rehidratação Oral','Oral Rehydration Salts','GI','Rehidratação','saqueta','20.5g/L','OTC','Diarreia, desidratação',30),
  ('MZ','Loperamida',        'Loperamide',            'GI','Antidiarreico','comprimido','2mg','OTC','Diarreia aguda',25),
  ('MZ','Omeprazol',         'Omeprazole',            'GI','IBP','cápsula','20mg','M2','Úlcera, refluxo',60),
  ('MZ','Pantoprazol',       'Pantoprazole',          'GI','IBP','comprimido','40mg','M2','Úlcera, refluxo',90),
  ('MZ','Ranitidina',        'Ranitidine',            'GI','Anti-H2','comprimido','150mg','M2','Úlcera (alternativa)',40),
  ('MZ','Hidróxido de Alumínio','Aluminium Hydroxide','GI','Antiácido','comprimido','500mg','OTC','Azia',30),
  ('MZ','Metoclopramida',    'Metoclopramide',        'GI','Anti-emético','comprimido','10mg','M3','Náusea, vómito',30),
  ('MZ','Ondansetrona',      'Ondansetron',           'GI','Anti-emético','comprimido','8mg','M3','Náusea quimio',180),
  ('MZ','Lactulose',         'Lactulose',             'GI','Laxante','xarope','10g/15ml','OTC','Constipação',80),
  ('MZ','Bissacodil',        'Bisacodyl',             'GI','Laxante','comprimido','5mg','OTC','Constipação',25),
  ('MZ','Sulfassalazina',    'Sulfasalazine',         'GI','Anti-inflamatório','comprimido','500mg','M3','Doença inflamatória intestinal',120)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 12: RESPIRATÓRIO / DIVERSOS ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Salbutamol Spray',  'Salbutamol',            'Respiratório','Broncodilatador','spray','100mcg','M2','Asma, bronquite',120),
  ('MZ','Salbutamol Xarope', 'Salbutamol',            'Respiratório','Broncodilatador','xarope','2mg/5ml','M2','Asma pediátrica',60),
  ('MZ','Budesonida Spray',  'Budesonide',            'Respiratório','Corticóide','spray','200mcg','M2','Asma crônica',180),
  ('MZ','Beclometasona',     'Beclometasone',         'Respiratório','Corticóide','spray','250mcg','M2','Asma',150),
  ('MZ','Prednisolona',      'Prednisolone',          'Respiratório','Corticóide sistêmico','comprimido','5mg','M3','Asma grave, alergia',40),
  ('MZ','Hidrocortisona',    'Hydrocortisone',        'Respiratório','Corticóide IV','injetável','100mg','M3','Anafilaxia, asma grave',80),
  ('MZ','Cetirizina',        'Cetirizine',            'Respiratório','Anti-histamínico','comprimido','10mg','OTC','Alergias',30),
  ('MZ','Loratadina',        'Loratadine',            'Respiratório','Anti-histamínico','comprimido','10mg','OTC','Alergias',35),
  ('MZ','Clorfenamina',      'Chlorphenamine',        'Respiratório','Anti-histamínico','comprimido','4mg','M2','Alergias, anafilaxia',20),
  ('MZ','Adrenalina',        'Epinephrine',           'Respiratório','Anafilaxia','injetável','1mg/ml','M4','Paragem cardíaca, anafilaxia',90),
  ('MZ','Ipratrópio',        'Ipratropium Bromide',   'Respiratório','Broncodilatador','spray','20mcg','M2','DPOE, asma',140),
  ('MZ','Ambroxol',          'Ambroxol',              'Respiratório','Mucolítico','xarope','30mg/5ml','OTC','Tosse produtiva',40),
  ('MZ','Dextrometorfano',   'Dextromethorphan',      'Respiratório','Antitussígeno','xarope','15mg/5ml','OTC','Tosse seca',50)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 13: DERMATOLOGIA / OFTALMO / OUTROS ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Cetoconazol Creme', 'Ketoconazole',          'Dermatologia','Antifúngico','creme','2%','OTC','Tinha, candidíase cutânea',80),
  ('MZ','Clotrimazol',       'Clotrimazole',          'Dermatologia','Antifúngico','creme','1%','OTC','Tinha pedis, candidíase',40),
  ('MZ','Miconazol',         'Miconazole',            'Dermatologia','Antifúngico','creme','2%','OTC','Tinha, candidíase',60),
  ('MZ','Hidrocortisona Cre','Hydrocortisone',        'Dermatologia','Corticóide tópico','creme','1%','OTC','Eczema, dermatite',50),
  ('MZ','Betametasona',      'Betamethasone',         'Dermatologia','Corticóide tópico','creme','0.1%','M2','Dermatite grave',90),
  ('MZ','Permetrina',        'Permethrin',            'Dermatologia','Anti-parasitário','creme','5%','M2','Sarna (scabies)',120),
  ('MZ','Benzil Benzoato',   'Benzyl Benzoate',       'Dermatologia','Anti-parasitário','loção','25%','M2','Sarna',60),
  ('MZ','Povidona Iodada',   'Povidone Iodine',       'Dermatologia','Anti-séptico','solução','10%','OTC','Anti-séptico feridas',40),
  ('MZ','Cloranfenicol Pom', 'Chloramphenicol',       'Oftalmologia','Antibiótico ocular','pomada','1%','M3','Conjuntivite bacteriana',60),
  ('MZ','Ciprofloxacino Olho','Ciprofloxacin',        'Oftalmologia','Antibiótico ocular','colírio','0.3%','M3','Úlcera córnea, conjuntivite',90),
  ('MZ','Pilocarpina',       'Pilocarpine',           'Oftalmologia','Glaucoma','colírio','2%','M3','Glaucoma',120),
  ('MZ','Timolol',           'Timolol',               'Oftalmologia','Glaucoma','colírio','0.5%','M3','Glaucoma',150),
  ('MZ','Sulfato de Zinco',  'Zinc Sulfate',          'Diversos','Suplemento','comprimido','20mg','OTC','Diarréia pediátrica',25),
  ('MZ','Vitamina A',        'Vitamin A',             'Diversos','Suplemento','cápsula','100.000UI','OTC','Deficiência vit A (crianças)',20),
  ('MZ','Vitamina D',        'Vitamin D',             'Diversos','Suplemento','cápsula','1000UI','OTC','Raquitismo',30),
  ('MZ','Sulfato Ferroso Pedi','Ferrous Sulfate',     'Diversos','Suplemento','xarope','--','OTC','Anemia pediátrica',30),
  ('MZ','Cálcio + Vit D',    'Calcium+Vitamin D',     'Diversos','Suplemento','comprimido','500mg+200UI','OTC','Osteoporose',80),
  ('MZ','Lugol',             'Lugol Solution',        'Diversos','Antisséptico','solução','5%','M3','Hipertiroidismo, anti-séptico',40),
  ('MZ','Iodo',              'Potassium Iodide',      'Diversos','Suplemento','comprimido','100mg','OTC','Deficiência de iodo',30),
  ('MZ','Glucose 5%',        'Glucose 5%',            'Diversos','Hidratação','IV','500ml','M4','Hidratação IV',60),
  ('MZ','Soro Fisiológico',  'Sodium Chloride 0.9%',  'Diversos','Hidratação','IV','500ml','M4','Hidratação IV',60),
  ('MZ','Ringer Lactato',    'Ringer Lactate',        'Diversos','Hidratação','IV','500ml','M4','Hidratação IV (choque)',80)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 14: ONCOLOGIA / IMUNOSSUPRESSORES ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Metotrexato',       'Methotrexate',          'Oncologia','Antifolato','comprimido','2.5mg','M4','Leucemia, artrite reumatoide',180),
  ('MZ','Ciclofosfamida',    'Cyclophosphamide',      'Oncologia','Alquilante','injetável','500mg','M4','Linfoma, mama',250),
  ('MZ','5-Fluorouracil',    '5-Fluorouracil',        'Oncologia','Antimetabólito','injetável','250mg','M4','Cancro colorretal, mama',200),
  ('MZ','Doxorrubicina',     'Doxorubicin',           'Oncologia','Antraciclina','injetável','50mg','M4','Mama, linfoma',350),
  ('MZ','Cisplatina',        'Cisplatin',             'Oncologia','Platina','injetável','50mg','M4','Testicular, ovarian',400),
  ('MZ','Paclitaxel',        'Paclitaxel',            'Oncologia','Taxano','injetável','100mg','M4','Mama, ovarian',800),
  ('MZ','Tamoxifeno',        'Tamoxifen',             'Oncologia','Anti-estrogénio','comprimido','20mg','M4','Cancro de mama ER+',150),
  ('MZ','Hidroxiureia',      'Hydroxycarbamide',      'Oncologia','Antineoplásico','comprimido','500mg','M4','Leucemia mieloide crônica',120),
  ('MZ','Mesna',             'Mesna',                 'Oncologia','Protetor','injetável','400mg','M4','Proteção vesical (ifosfamida)',180),
  ('MZ','Zidovudina',        'Zidovudine (AZT)',      'Oncologia','Antineoplásico','comprimido','300mg','M4','HIV/oncologia (Kaposi)',110)
ON CONFLICT DO NOTHING;

-- ---------- INSERT BATCH 15: ANTIENVENENAMENTO + EMERGÊNCIA ----------
INSERT INTO public.essential_medicines (country_id, name, generic_name, category, subcategory, form, strength, schedule, indications, reference_price_mzn)
VALUES
  ('MZ','Soro Anti-cobra',   'Snake Antivenom',       'Emergência','Antiveneno','injetável','10ml','M4','Picada de cobra',800),
  ('MZ','Soro Anti-escorpião','Scorpion Antivenom',   'Emergência','Antiveneno','injetável','5ml','M4','Picada de escorpião',500),
  ('MZ','Soro Anti-aracnídeo','Spider Antivenom',     'Emergência','Antiveneno','injetável','5ml','M4','Picada de aranha',550),
  ('MZ','Atropina',          'Atropine',              'Emergência','Anticolinérgico','injetável','1mg/ml','M4','Bradicardia, organofosforado',60),
  ('MZ','Naloxona',          'Naloxone',              'Emergência','Antagonista opioide','injetável','0.4mg/ml','M4','Overdose opioide',180),
  ('MZ','Flumazenil',        'Flumazenil',            'Emergência','Antagonista benzodiazepínico','injetável','0.5mg/5ml','M4','Overdose benzodiazepínico',250),
  ('MZ','Glucagon',          'Glucagon',              'Emergência','Hipoglicemia','injetável','1mg','M4','Hipoglicemia grave',280),
  ('MZ','Nimodipina',        'Nimodipine',            'Emergência','Vasodilatador','comprimido','30mg','M3','Hemorragia subaracnóide',250),
  ('MZ','Dextrano 70',       'Dextran 70',            'Emergência','Volume','IV','500ml','M4','Expansor de volume',150),
  ('MZ','Carvão Activado',   'Activated Charcoal',    'Emergência','Antídoto','pó','50g','OTC','Intoxicação oral',40)
ON CONFLICT DO NOTHING;

-- ---------- INDEX FINAL ----------
CREATE INDEX IF NOT EXISTS idx_ume_arv  ON public.essential_medicines(is_arv) WHERE is_arv = true;
CREATE INDEX IF NOT EXISTS idx_ume_tb   ON public.essential_medicines(is_tb)  WHERE is_tb = true;
CREATE INDEX IF NOT EXISTS idx_ume_mal  ON public.essential_medicines(is_antimalarial) WHERE is_antimalarial = true;
CREATE INDEX IF NOT EXISTS idx_ume_vac  ON public.essential_medicines(is_vaccine) WHERE is_vaccine = true;

SELECT 'MZ Plan Part 3 complete — 200+ essential medicines seeded' as result;
