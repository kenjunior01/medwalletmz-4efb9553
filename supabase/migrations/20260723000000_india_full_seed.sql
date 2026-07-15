-- =====================================================================
-- INDIA FULL SEED + REGIONAL MANAGER USER
-- Adds: country_id columns on dedicated institution tables,
--       50+ Indian healthcare institutions (hospitals, clinics, pharmacies, labs),
--       medhindi user (country_manager for IN) with bcrypt-hashed password.
-- =====================================================================

-- ---------- 1. ADD country_id TO DEDICATED INSTITUTION TABLES ----------
ALTER TABLE public.hospitals       ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.medical_clinics ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.laboratories    ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.pharmacies      ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';

-- Index for country-filtered queries
CREATE INDEX IF NOT EXISTS idx_hospitals_country       ON public.hospitals(country_id);
CREATE INDEX IF NOT EXISTS idx_medical_clinics_country ON public.medical_clinics(country_id);
CREATE INDEX IF NOT EXISTS idx_laboratories_country    ON public.laboratories(country_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_country      ON public.pharmacies(country_id);

-- ---------- 2. ENSURE INDIA ROW EXISTS IN countries ----------
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_code, default_locale, supported_locales, timezone, branding_config, config, is_active)
VALUES (
  'IN', 'India', 'INR', '₹', '+91', 'en', ARRAY['en','hi','bn'], 'Asia/Kolkata',
  '{"primary_color":"#FF9933","secondary_color":"#138808","accent_color":"#000080","home_banner_url":"https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200"}'::jsonb,
  '{"payment_methods":["upi","razorpay","card","wallet"],"cities":["Mumbai","Delhi","Bangalore","Hyderabad","Ahmedabad","Chennai","Kolkata","Pune","Jaipur","Kochi"],"tax_name":"GST","tax_rate":18}'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ---------- 3. CREATE medhindi USER (COUNTRY MANAGER FOR INDIA) ----------
-- Password: Medhindi2026 (bcrypt-hashed via pgcrypto)
-- Email:    medhindi@medwallet.in
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'medhindi@medwallet.in';
BEGIN
  -- Skip if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      phone, phone_change_token, email_change, email_change_token, email_change_confirm_status,
      recovery_token, confirmation_token, confirmation_sent_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt('Medhindi2026', gen_salt('bf', 10)),
      now(),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MedHindi Regional Manager","country_id":"IN","role":"country_manager"}'::jsonb,
      '', '', '', '', 0, '', '', now()
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Profile (idempotent)
  INSERT INTO public.profiles (user_id, full_name, phone, default_city, country_id, avatar_url)
  VALUES (v_user_id, 'MedHindi Regional Manager', '+919999999999', 'Mumbai', 'IN',
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200')
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    country_id = 'IN';

  -- country_manager role scoped to India
  INSERT INTO public.user_roles (user_id, role, country_id)
  VALUES (v_user_id, 'country_manager', 'IN')
  ON CONFLICT (user_id, role, country_id) DO NOTHING;

  -- Country management entry (used by is_manager_of_country())
  INSERT INTO public.country_management (user_id, country_id, permissions)
  VALUES (v_user_id, 'IN',
    '{"can_approve_doctors":true,"can_view_revenue":true,"can_manage_stores":true,"can_manage_clinics":true,"can_manage_labs":true,"can_view_compliance":true,"can_issue_insurance":true}'::jsonb)
  ON CONFLICT (user_id, country_id) DO NOTHING;
END $$;

-- ---------- 4. SEED INDIAN PHARMACIES (stores + pharmacies tables) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Apollo Pharmacy - Bandra',  'pharmacy', 'Mumbai',    'Hill Road, Bandra West, Mumbai',          'India''s largest pharmacy chain. 24h service, genuine medicines, free home delivery within 2km.', true, 4.7, 19.0596, 72.8295, 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600', true, 40, '20-30 min', 'IN', '+912226434444'),
  ('MedPlus - Andheri East',    'pharmacy', 'Mumbai',    'Andheri East, Mumbai',                     'Trusted pharmacy with 1800+ outlets. Online refill, lab tests, doctor consult.',                  true, 4.5, 19.1136, 72.8697, 'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600', true, 30, '25-40 min', 'IN', '+912267266666'),
  ('Wellness Forever - Powai',  'pharmacy', 'Mumbai',    'Hiranandani Gardens, Powai, Mumbai',      'Premium 24h pharmacy with chronic disease program and senior citizen discounts.',                 true, 4.6, 19.1197, 72.9050, 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600', true, 35, '15-25 min', 'IN', '+912225555555'),
  ('Guardian Pharmacy - CP',    'pharmacy', 'Delhi',     'Connaught Place, New Delhi',              'Delhi-NCR''s leading pharmacy chain. Doctor consultation booth on-site.',                          true, 4.4, 28.6315, 77.2167, 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600', true, 25, '30-45 min', 'IN', '+911123456789'),
  ('1mg Pharmacy - Noida',      'pharmacy', 'Delhi',     'Sector 18, Noida',                         'Tata 1mg offline pickup point with online refill integration.',                                    true, 4.6, 28.5708, 77.3260, 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600', true, 0,  'Same day',  'IN', '+911140000000'),
  ('Apollo Pharmacy - Karol Bagh','pharmacy','Delhi',    'Ajmal Khan Road, Karol Bagh, Delhi',      '24h pharmacy with ICU medicines availability and free delivery.',                                  true, 4.5, 28.6519, 77.1909, 'https://images.unsplash.com/photo-1512418490979-92798ccc1380?w=600', true, 30, '20-30 min', 'IN', '+911125000000'),
  ('MedPlus - Koramangala',     'pharmacy', 'Bangalore', '5th Block, Koramangala, Bangalore',       'Busy tech corridor pharmacy with same-day home delivery and e-prescriptions.',                     true, 4.5, 12.9352, 77.6245, 'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600', true, 20, '20-30 min', 'IN', '+918025000000'),
  ('Apollo Pharmacy - Indiranagar','pharmacy','Bangalore','100 Feet Road, Indiranagar, Bangalore',  'Apollo flagship with medicine subscription plan and diagnostic discounts.',                       true, 4.7, 12.9719, 77.6412, 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600', true, 25, '15-25 min', 'IN', '+918025200000'),
  ('PharmEasy Store - HSR',     'pharmacy', 'Bangalore', 'HSR Layout, Bangalore',                    'Pickup point for PharmEasy online orders with chronic refill program.',                            true, 4.3, 12.9116, 77.6474, 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600', true, 0,  'Same day',  'IN', '+918025300000'),
  ('Netmeds Store - T Nagar',   'pharmacy', 'Chennai',   'Pondy Bazaar, T Nagar, Chennai',           'Reliance-owned Netmeds retail pharmacy with 24h emergency service.',                              true, 4.4, 13.0418, 80.2341, 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600', true, 25, '30-40 min', 'IN', '+914425000000'),
  ('Apollo Pharmacy - Anna Nagar','pharmacy','Chennai',  'Anna Nagar West, Chennai',                 'Apollo retail outlet with full OTC range and chronic disease program.',                            true, 4.6, 13.0850, 80.2101, 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600', true, 20, '20-30 min', 'IN', '+914425200000'),
  ('MedPlus - Banjara Hills',   'pharmacy', 'Hyderabad', 'Road No 12, Banjara Hills, Hyderabad',    'Premium pharmacy serving Banjara Hills/Jubilee Hills with senior priority.',                       true, 4.5, 17.4126, 78.4392, 'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600', true, 30, '25-35 min', 'IN', '+914025000000'),
  ('Apollo Pharmacy - Gachibowli','pharmacy','Hyderabad','Gachibowli, Hyderabad',                   'Serving the IT corridor with 24h emergency medicines and corporate tie-ups.',                     true, 4.6, 17.4400, 78.3489, 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600', true, 25, '20-30 min', 'IN', '+914025200000'),
  ('Wellness Forever - Pune',   'pharmacy', 'Pune',      'FC Road, Shivajinagar, Pune',              '24h pharmacy near educational hub with OTC focus and STD testing kits.',                          true, 4.4, 18.5293, 73.8567, 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600', true, 30, '25-35 min', 'IN', '+912025000000'),
  ('Guardian Pharmacy - Jaipur','pharmacy', 'Jaipur',    'C-Scheme, Jaipur',                         'Rajasthan''s leading pharmacy with ayurveda section and home delivery.',                          true, 4.5, 26.9124, 75.7873, 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600', true, 30, '30-40 min', 'IN', '+914125000000')
ON CONFLICT DO NOTHING;

-- ---------- 5. SEED INDIAN HOSPITALS (clinics + hospitals + health_facilities) ----------
INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('AIIMS Delhi',                    'hospital', 'Delhi',      'Ansari Nagar, New Delhi',                 'All India Institute of Medical Sciences — India''s #1 public hospital and medical research university. 24/7 trauma, transplant, oncology.',                 true, true, 28.5672, 77.2090, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/AIIMS_Delhi.jpg/800px-AIIMS_Delhi.jpg',                              '00000000-0000-0000-0000-000000000000', 'IN', '+911126588500', 'aiims@medwallet.in', 'https://aiims.edu'),
  ('Apollo Hospitals Chennai',       'hospital', 'Chennai',    'Greams Road, Thousand Lights, Chennai',   'Apollo Group flagship — first Indian hospital to perform multi-organ transplant. 60+ specialties, JCI accredited.',         true, true, 13.0523, 80.2520, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+914428293333', 'apollo@medwallet.in', 'https://apollohospitals.com'),
  ('Fortis Hospital Mulund',         'hospital', 'Mumbai',     'Mulund Goregaon Link Road, Mumbai',      'Fortis Mumbai flagship — 300-bed multi-super-specialty with cardiac sciences, oncology, neurosciences.',                   true, true, 19.1726, 72.9425, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+912267679999', 'fortis.mulund@medwallet.in', 'https://fortishealthcare.com'),
  ('Tata Memorial Hospital',         'hospital', 'Mumbai',     'Dr E Borges Road, Parel, Mumbai',         'India''s premier cancer treatment and research centre. 700+ beds, 60% free treatment for underprivileged.',                true, true, 19.0028, 72.8417, 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+912224177000', 'tmc@medwallet.in', 'https://tmc.gov.in'),
  ('Manipal Hospital Old Airport Road','hospital','Bangalore', 'Old Airport Road, Kodihalli, Bangalore',  'Manipal Health flagship — 600+ beds, 60+ specialties, JCI accredited, leading transplant program.',                         true, true, 12.9600, 77.6690, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+918025002333', 'manipal@medwallet.in', 'https://manipalhospitals.com'),
  ('Narayana Health City',           'hospital', 'Bangalore', 'Bommasandra Industrial Area, Bangalore', 'Narayana Hrudayalaya — world''s largest cardiac hospital. 5000+ cardiac surgeries/year, oncology and orthopaedics.',      true, true, 12.8100, 77.6500, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+918071228333', 'narayana@medwallet.in', 'https://narayanahealth.org'),
  ('Christian Medical College Vellore','hospital','Vellore',   'Ida Scudder Road, Vellore',               'CMC Vellore — top-ranked medical college & hospital. Pioneer in leprosy, HIV, and rare disease care.',                     true, true, 12.9240, 79.1320, 'https://images.unsplash.com/photo-1538108176635-6c098c219dfa?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+914162283400', 'cmc@medwallet.in', 'https://cmcvellore.ac.in'),
  ('Max Super Speciality Saket',     'hospital', 'Delhi',     'Press Enclave Marg, Saket, New Delhi',    'Max Healthcare flagship — 530+ beds, JCI accredited, leading cancer and cardiac programs.',                                 true, true, 28.5245, 77.2066, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+911126515000', 'max.saket@medwallet.in', 'https://maxhealthcare.in'),
  ('Kokilaben Dhirubhai Ambani',     'hospital', 'Mumbai',     'Rao Saheb Achutrao Patwardhan Marg, Mumbai','Andheri West — 750-bed JCI accredited, only hospital in India with full digital integration (Paperless HIMSS-7).',     true, true, 19.1197, 72.8468, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+912242479999', 'kdah@medwallet.in', 'https://kdahospital.com'),
  ('Medanta The Medicity',           'hospital', 'Gurgaon',   'Sector 38, Gurgaon, Haryana',             'Medanta — 1250-bed multi-super-specialty, leading liver transplant and cardiac program in North India.',                  true, true, 28.4470, 77.0410, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+911244144444', 'medanta@medwallet.in', 'https://medanta.org'),
  ('Sir Ganga Ram Hospital',         'hospital', 'Delhi',     'Rajinder Nagar, New Delhi',               '675-bed multi-specialty — DNB teaching, IVF pioneer, low-cost charity wing.',                                              true, true, 28.6381, 77.1887, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+911125750000', 'sgrh@medwallet.in', 'https://sgrh.com'),
  ('Lilavati Hospital',              'hospital', 'Mumbai',     'A-791, Bandra Reclamation, Mumbai',       'Bandra West — 323-bed multi-specialty, popular with Bollywood & business elite.',                                          true, true, 19.0520, 72.8290, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+912226756000', 'lilavati@medwallet.in', 'https://lilavatihospital.com'),
  ('Artemis Hospital Gurgaon',       'hospital', 'Gurgaon',   'Sector 51, Gurgaon',                      'JCI accredited 400-bed super-specialty — leading orthopaedics and oncology program in NCR.',                                true, true, 28.4270, 77.0640, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+911244588000', 'artemis@medwallet.in', 'https://artemishospitals.com'),
  ('NIMHANS Bangalore',              'hospital', 'Bangalore', 'Hosur Road, Bangalore',                   'National Institute of Mental Health and Neurosciences — India''s #1 mental health institute.',                              true, true, 12.9420, 77.5970, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+918026996500', 'nimhans@medwallet.in', 'https://nimhans.ac.in'),
  ('Aster Medcity Kochi',            'hospital', 'Kochi',     'Kuttisahib Road, Cheranelloor, Kochi',    'Aster flagship in Kerala — 670 beds, JCI accredited, leading multi-organ transplant program in South India.',              true, true, 10.0540, 76.3020, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',                                                          '00000000-0000-0000-0000-000000000000', 'IN', '+914844400000', 'aster@medwallet.in', 'https://astermedcity.com')
ON CONFLICT DO NOTHING;

-- ---------- 6. SEED INDIAN CLINICS (clinics table type='clinic') ----------
INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Apollo Clinic Whitefield',    'clinic', 'Bangalore', 'Whitefield Main Road, Bangalore',     'Apollo day-care clinic with general medicine, paediatrics, gynaecology.',                       true, true, 12.9698, 77.7500, 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+918028460000', 'apollo.whitefield@medwallet.in', 'https://apolloclinic.com'),
  ('Fortis Clinic Mohali',        'clinic', 'Mohali',    'Sector 62, Mohali, Punjab',            'Fortis day clinic — general physician, dermatology, ENT.',                                       true, true, 30.7046, 76.7179, 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+911725050000', 'fortis.mohali@medwallet.in', 'https://fortishealthcare.com'),
  ('Rainbow Children''s Clinic',  'clinic', 'Chennai',   'Anna Nagar, Chennai',                  'Rainbow Children''s — paediatric specialist clinic, 24x7 emergency.',                            true, true, 13.0850, 80.2101, 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+914442850000', 'rainbow@medwallet.in', 'https://rainbowhospitals.in'),
  ('Motherhood Clinic Indiranagar','clinic','Bangalore', '100 Feet Road, Indiranagar',          'Motherhood — women''s health, fertility, and maternity boutique clinic.',                       true, true, 12.9719, 77.6412, 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+918025200000', 'motherhood@medwallet.in', 'https://motherhoodindia.com'),
  ('Cloudnine Clinic Powai',      'clinic', 'Mumbai',    'Hiranandani Gardens, Powai',           'Cloudnine — maternity, fertility, and childcare chain flagship.',                                true, true, 19.1197, 72.9050, 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+912267266000', 'cloudnine@medwallet.in', 'https://cloudninecare.com'),
  ('Nova Specialty Bangalore',    'clinic', 'Bangalore', 'Koramangala 5th Block',                'Nova — day-care surgery center for ortho, ENT, ophthalmology.',                                  true, true, 12.9352, 77.6245, 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+918025002000', 'nova@medwallet.in', 'https://novaspeciality.com'),
  ('Kaya Skin Clinic Defence Colony','clinic','Delhi',   'Defence Colony, New Delhi',            'Kaya — India''s largest dermatology and aesthetic clinic chain.',                                true, true, 28.5726, 77.2296, 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+911124640000', 'kaya@medwallet.in', 'https://kayaskinclinic.com'),
  ('Apollo Spectra Bangalore',    'clinic', 'Bangalore', 'Koramangala 1st Block',                'Apollo Spectra — short-stay surgical centre, 11+ specialties.',                                  true, true, 12.9290, 77.6280, 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+918025003000', 'apollo.spectra@medwallet.in', 'https://apollospectra.com'),
  ('Care Clinic Banjara Hills',   'clinic', 'Hyderabad', 'Road No 12, Banjara Hills',            'Care Hospitals day clinic — cardiology OPD and diabetes management.',                           true, true, 17.4126, 78.4392, 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+914025000000', 'care.clinic@medwallet.in', 'https://carehospitals.com'),
  ('Manipal Clinic Jaipur',       'clinic', 'Jaipur',    'C-Scheme, Jaipur',                     'Manipal — preventive health, OPD, and lab collection center.',                                   true, true, 26.9124, 75.7873, 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+914125000000', 'manipal.jaipur@medwallet.in', 'https://manipalhospitals.com')
ON CONFLICT DO NOTHING;

-- ---------- 7. SEED INDIAN LABORATORIES (laboratories + clinics type='laboratory') ----------
INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, email, website, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Dr Lal PathLabs - Connaught Place','Delhi',     'Connaught Place, New Delhi',         'India''s largest diagnostic chain — 2000+ collection centers, NABL accredited.',                true, true, 28.6315, 77.2167, 'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600', 'IN', '+911133333000', 'lal.cp@medwallet.in', 'https://lalpathlabs.com', ARRAY['hematology','biochemistry','microbiology','pathology','hormones'], true, 24),
  ('Thyrocare - Mumbai HQ',           'Mumbai',     'A-66, Turbhe, Navi Mumbai',          'Thyrocare — leader in thyroid and hormone testing, 5000+ tests processed daily.',                true, true, 19.0760, 73.0200, 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600', 'IN', '+912267200000', 'thyrocare@medwallet.in', 'https://thyrocare.com', ARRAY['thyroid','hormones','vitamins','allergy'], true, 12),
  ('SRL Diagnostics - Worli',         'Mumbai',     'Dr Annie Besant Road, Worli, Mumbai','SRL — Fortis-owned, 1000+ tests, 400+ collection centers across India.',                       true, true, 19.0176, 72.8179, 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=600', 'IN', '+912267201000', 'srl.worli@medwallet.in', 'https://srl.in', ARRAY['pathology','radiology','cardiology','genetics'], true, 24),
  ('Metropolis Healthcare - Bandra',  'Mumbai',     'Bandra West, Mumbai',                'Metropolis — 700+ collection centers, NABL+CAP accredited, 4000+ tests.',                       true, true, 19.0596, 72.8295, 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600', 'IN', '+912267202000', 'metropolis@medwallet.in', 'https://metropolisindia.com', ARRAY['pathology','biochemistry','microbiology','molecular'], true, 24),
  ('Apollo Diagnostics - Koramangala','Bangalore',  'Koramangala 5th Block, Bangalore',   'Apollo Diagnostics — 800+ centers, integrated with Apollo Hospitals EMR.',                       true, true, 12.9352, 77.6245, 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600', 'IN', '+918025004000', 'apollo.diag@medwallet.in', 'https://apollodiagnostics.in', ARRAY['pathology','biochemistry','radiology','cardiology'], true, 24),
  ('Suburban Diagnostics - Andheri',  'Mumbai',     'Andheri West, Mumbai',               'Suburban — Mumbai''s leading high-end diagnostic chain, specialized in molecular diagnostics.', true, true, 19.1136, 72.8697, 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600', 'IN', '+912267203000', 'suburban@medwallet.in', 'https://suburbandiagnostics.com', ARRAY['molecular','genetics','pathology','radiology'], true, 24),
  ('Neuberg Diagnostics - Chennai',   'Chennai',    'Anna Nagar, Chennai',                'Neuberg — 4-country chain with AI-assisted pathology reading.',                                  true, true, 13.0850, 80.2101, 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=600', 'IN', '+914425003000', 'neuberg@medwallet.in', 'https://neubergdiagnostics.com', ARRAY['pathology','biochemistry','molecular','genetics'], true, 24),
  ('Strand Life Sciences - Bangalore','Bangalore',  'Bannerghatta Road, Bangalore',       'Strand — India''s leading genomic and precision medicine lab.',                                  true, true, 12.8930, 77.5970, 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600', 'IN', '+918025005000', 'strand@medwallet.in', 'https://strandls.com', ARRAY['genomics','oncology','genetics'], true, 72),
  ('Core Diagnostics - Gurgaon',      'Gurgaon',    'Sector 32, Gurgaon',                 'Core — NABL accredited, advanced haematology and flow cytometry.',                               true, true, 28.4500, 77.0700, 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600', 'IN', '+911244145000', 'core@medwallet.in', 'https://corediagnostics.in', ARRAY['haematology','flow_cytometry','molecular','pathology'], true, 48),
  ('Dr PathLabs Hyderabad - Banjara', 'Hyderabad',  'Banjara Hills, Hyderabad',           'Dr PathLabs — south India''s reference lab for rare disease diagnostics.',                       true, true, 17.4126, 78.4392, 'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600', 'IN', '+914025004000', 'drpathlabs@medwallet.in', 'https://drpathlabs.com', ARRAY['pathology','biochemistry','rare_disease'], true, 48)
ON CONFLICT DO NOTHING;

-- Mirror labs into clinics (so AdminClinics lists them too)
INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Dr Lal PathLabs - Connaught Place','laboratory','Delhi','Connaught Place, New Delhi','India''s largest diagnostic chain — 2000+ collection centers, NABL accredited.',true, true, 28.6315, 77.2167, 'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+911133333000', 'lal.cp@medwallet.in', 'https://lalpathlabs.com'),
  ('Thyrocare - Mumbai HQ',           'laboratory','Mumbai','A-66, Turbhe, Navi Mumbai','Thyrocare — leader in thyroid and hormone testing, 5000+ tests processed daily.',true, true, 19.0760, 73.0200, 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+912267200000', 'thyrocare@medwallet.in', 'https://thyrocare.com'),
  ('SRL Diagnostics - Worli',         'laboratory','Mumbai','Dr Annie Besant Road, Worli, Mumbai','SRL — Fortis-owned, 1000+ tests, 400+ collection centers across India.',true, true, 19.0176, 72.8179, 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+912267201000', 'srl.worli@medwallet.in', 'https://srl.in'),
  ('Metropolis Healthcare - Bandra',  'laboratory','Mumbai','Bandra West, Mumbai','Metropolis — 700+ collection centers, NABL+CAP accredited, 4000+ tests.',true, true, 19.0596, 72.8295, 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+912267202000', 'metropolis@medwallet.in', 'https://metropolisindia.com'),
  ('Apollo Diagnostics - Koramangala','laboratory','Bangalore','Koramangala 5th Block, Bangalore','Apollo Diagnostics — 800+ centers, integrated with Apollo Hospitals EMR.',true, true, 12.9352, 77.6245, 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800', '00000000-0000-0000-0000-000000000000', 'IN', '+918025004000', 'apollo.diag@medwallet.in', 'https://apollodiagnostics.in')
ON CONFLICT DO NOTHING;

-- ---------- 8. UNIFIED health_facilities entries (for the explorer UI) ----------
INSERT INTO public.health_facilities (country_id, name, type, status, rating, address, contact, services, branding_color)
VALUES
  ('IN','AIIMS Delhi','hospital','verified',4.9,'{"street":"Ansari Nagar","city":"Delhi","lat":28.5672,"lng":77.2090}'::jsonb,'{"phone":"+911126588500","email":"aiims@medwallet.in","website":"https://aiims.edu"}'::jsonb,ARRAY['trauma','transplant','oncology','cardiology','pediatrics'],'#ea580c'),
  ('IN','Apollo Hospitals Chennai','hospital','verified',4.8,'{"street":"Greams Road","city":"Chennai","lat":13.0523,"lng":80.2520}'::jsonb,'{"phone":"+914428293333","website":"https://apollohospitals.com"}'::jsonb,ARRAY['transplant','cardiology','oncology','orthopedics'],'#16a34a'),
  ('IN','Fortis Hospital Mulund','hospital','verified',4.7,'{"street":"Mulund Goregaon Link Road","city":"Mumbai","lat":19.1726,"lng":72.9425}'::jsonb,'{"phone":"+912267679999","website":"https://fortishealthcare.com"}'::jsonb,ARRAY['cardiology','oncology','neurosciences'],'#0ea5e9'),
  ('IN','Tata Memorial Hospital','hospital','verified',4.8,'{"street":"Dr E Borges Road, Parel","city":"Mumbai","lat":19.0028,"lng":72.8417}'::jsonb,'{"phone":"+912224177000","website":"https://tmc.gov.in"}'::jsonb,ARRAY['cancer','radiotherapy','oncology'],'#dc2626'),
  ('IN','Manipal Hospital Old Airport Road','hospital','verified',4.7,'{"street":"Old Airport Road","city":"Bangalore","lat":12.9600,"lng":77.6690}'::jsonb,'{"phone":"+918025002333","website":"https://manipalhospitals.com"}'::jsonb,ARRAY['transplant','cardiology','oncology'],'#7c3aed'),
  ('IN','Narayana Health City','hospital','verified',4.7,'{"street":"Bommasandra","city":"Bangalore","lat":12.8100,"lng":77.6500}'::jsonb,'{"phone":"+918071228333","website":"https://narayanahealth.org"}'::jsonb,ARRAY['cardiac','oncology','orthopedics'],'#0d9488'),
  ('IN','Apollo Pharmacy Bandra','pharmacy','verified',4.7,'{"street":"Hill Road, Bandra West","city":"Mumbai","lat":19.0596,"lng":72.8295}'::jsonb,'{"phone":"+912226434444"}'::jsonb,ARRAY['delivery','otc','prescription','24h'],'#0ea5e9'),
  ('IN','Wellness Forever Powai','pharmacy','verified',4.6,'{"street":"Hiranandani Gardens, Powai","city":"Mumbai","lat":19.1197,"lng":72.9050}'::jsonb,'{"phone":"+912225555555"}'::jsonb,ARRAY['delivery','24h','senior_discount'],'#16a34a'),
  ('IN','Dr Lal PathLabs Connaught Place','lab','verified',4.7,'{"street":"Connaught Place","city":"Delhi","lat":28.6315,"lng":77.2167}'::jsonb,'{"phone":"+911133333000","website":"https://lalpathlabs.com"}'::jsonb,ARRAY['hematology','biochemistry','microbiology','home_collection'],'#f59e0b'),
  ('IN','Thyrocare Mumbai HQ','lab','verified',4.6,'{"street":"Turbhe, Navi Mumbai","city":"Mumbai","lat":19.0760,"lng":73.0200}'::jsonb,'{"phone":"+912267200000","website":"https://thyrocare.com"}'::jsonb,ARRAY['thyroid','hormones','vitamins','home_collection'],'#f59e0b')
ON CONFLICT DO NOTHING;

-- ---------- 9. INDIA-SPECIFIC REGULATORY FRAMEWORKS ----------
INSERT INTO public.regulatory_frameworks (country_id, region_group, name, authority, description, framework_url, key_requirements, mandatory_for, tier_required, effective_date, next_review_date)
VALUES
  ('IN','SUB_SAHARAN_AFRICA','Drugs and Cosmetics Act 1940','CDSCO','Central regulatory framework governing import, manufacture, distribution and sale of drugs and cosmetics in India.','https://cdsco.gov.in',
   '["Pharmaceutical manufacturing license","Wholesale drug license (Form 20B)","Retail drug license (Form 21B)","Cold chain compliance for biologics","Pharmacovigilance reporting"]'::jsonb,
   ARRAY['pharmacy','hospital','lab','clinic'],'gold','1940-04-10'::date,'2026-04-10'::date),
  ('IN','SUB_SAHARAN_AFRICA','Clinical Establishments Act 2010','MoHFW','Mandatory registration and regulation of all clinical establishments (hospitals, clinics, labs) in India.','https://mohfw.gov.in',
   '["State clinical establishment registration","Minimum standards for staff and equipment","Patient rights charter","Tariff disclosure","Electronic health records maintenance"]'::jsonb,
   ARRAY['hospital','clinic','lab'],'platinum','2010-08-23'::date,'2026-08-23'::date),
  ('IN','SUB_SAHARAN_AFRICA','DPDP Act 2023 (Digital Personal Data Protection)','MeitY','India''s comprehensive data protection law — governs all digital health data processing.','https://meity.gov.in',
   '["Explicit patient consent for health data","Data principal rights (access, correction, erasure)","Data breach notification within 72 hours","Cross-border transfer restrictions","Data Protection Officer appointment"]'::jsonb,
   ARRAY['pharmacy','hospital','clinic','lab','insurance','doctor'],'platinum','2023-08-11'::date,'2026-08-11'::date),
  ('IN','SUB_SAHARAN_AFRICA','MCI/NMC Professional Conduct Regulations','NMC','Medical Council of India (now NMC) code of ethics for registered medical practitioners.','https://nmc.org.in',
   '["NMC registration mandatory","Continuing Medical Education (CME) — 30 hours/5year","Telemedicine guidelines compliance","Professional indemnity insurance recommended","Conflict of interest disclosure"]'::jsonb,
   ARRAY['doctor','clinic','hospital'],'gold','2002-04-06'::date,'2026-04-06'::date),
  ('IN','SUB_SAHARAN_AFRICA','CDSCO Medical Device Rules 2017','CDSCO','Regulatory framework for medical devices — import, manufacture, clinical trial, sale and distribution.','https://cdsco.gov.in',
   '["Device manufacturing/import license","ISO 13485 QMS certification","Post-market surveillance","Adverse event reporting","Clinical investigation approval for Class C/D devices"]'::jsonb,
   ARRAY['hospital','clinic','lab'],'platinum','2017-01-01'::date,'2027-01-01'::date),
  ('IN','SUB_SAHARAN_AFRICA','Ayushman Bharat PM-JAY Enrollment','NHA','National health insurance scheme covering 500M+ Indians — hospital empanelment requirements.','https://pmjay.gov.in',
   '["NHA hospital empanelment","Package rate compliance","Pre-authorization workflow","Cashless treatment for eligible families","Claim submission via NHA portal"]'::jsonb,
   ARRAY['hospital','clinic'],'gold','2018-09-23'::date,'2027-09-23'::date)
ON CONFLICT DO NOTHING;

-- ---------- 10. INDIA-SPECIFIC MICRO-INSURANCE PRODUCTS ----------
INSERT INTO public.micro_insurance_products (country_id, name, code, description, premium_amount, premium_currency, coverage_amount, coverage_currency, payout_trigger_hours, payout_auto, active)
VALUES
  ('IN','MedCash Doctor SLA','MEDCASH_DOCTOR_IN','Auto cashback if video consultation starts >15 min after scheduled time. Pays INR 100 directly to patient wallet.', 49, 'INR', 500, 'INR', 1, true, true),
  ('IN','MedCash Pharmacy SLA','MEDCASH_PHARM_IN','Auto cashback if pharmacy delivery exceeds promised ETA by >30 min. Pays INR 75 to patient wallet.', 29, 'INR', 300, 'INR', 1, true, true),
  ('IN','MedCash Lab SLA','MEDCASH_LAB_IN','Auto cashback if lab results delivery exceeds committed hours. Pays INR 200 to patient wallet.', 79, 'INR', 1000, 'INR', 1, true, true),
  ('IN','MedCash Hospital Cashless','MEDCASH_HOSP_IN','Daily hospital cash benefit of INR 2000/day for up to 7 days when admitted at empanelled hospital.', 199, 'INR', 14000, 'INR', 24, false, true)
ON CONFLICT DO NOTHING;

-- ---------- 11. COMMIT MESSAGE LINE ----------
SELECT 'India full seed complete — medhindi user + 50+ institutions + 6 regulatory frameworks + 4 micro-insurance products' as result;
