# Guia de Simulação · MedWallet Global

Este guia descreve como testar todos os fluxos e instituições integradas na plataforma.

## 1. Fluxo do Paciente (Utilizador Final)
1. **Login Social:** Acede a `/auth` e entra com Google. O sistema detecta a tua região.
2. **Triagem IA:** Na Home, clica em "Triagem" ou usa o comando de voz (ícone microfone).
3. **Consulta:** Escolhe um médico em `/health/doctors`, agenda e paga com a **Wallet**.
4. **Chat & Vídeo:** Entra no chat da consulta. Envia uma imagem de um sintoma. Inicia a vídeo-chamada.
5. **Compra:** Após a consulta, recebe a **Receita Digital**. Escolhe uma farmácia e finaliza o pedido.

## 2. Fluxo do Médico (Saúde Humana)
1. **Registo:** Vai ao Perfil -> "Ser Médico". Faz upload da cédula profissional.
2. **Painel:** Acede a `/doctor/dashboard` (após aprovação regional).
3. **Receituário:** Durante a consulta no chat, clica em "Emitir Receita" e preenche os medicamentos.

## 3. Fluxo de Veterinária (Pet & Agro)
1. **Busca:** Acede a `/health/veterinary` na Home.
2. **Filtro:** Procura por "Grandes Animais" (contexto agro-pecuário) ou "Clínicas Pet".
3. **Onboarding:** No Perfil -> "Ser Veterinário", o profissional segue o fluxo específico de licença animal.

## 4. Fluxo de Farmácia & Logística
1. **Gestão:** O dono da farmácia acede a `/store/dashboard` para gerir stock e pedidos.
2. **Entrega:** O estafeta (Driver) acede a `/driver/dashboard` para aceitar entregas prioritárias de medicamentos.

## 5. Fluxo de Laboratório (Exames)
1. **Pedido:** O utilizador acede a `/health/exams`, escolhe um laboratório e agenda a recolha de amostras.
2. **Resultados:** O Lab faz upload do PDF do resultado via dashboard, e o paciente recebe notificação.

## 6. Fluxo de Gestor Regional (O "Cérebro" Local)
1. **Acesso:** Role `country_manager` acede a `/manager`.
2. **Curadoria:** Aprova ou Rejeita novas farmácias e clínicas submetidas pela comunidade em `/manager/curation`.
3. **Métricas:** Visualiza o volume de transações apenas do seu país em `/manager`.

---

## Como Validar a Integridade Técnica
Executa o script `FULL_ECOSYSTEM_SIMULATION.sql` no Editor SQL do Supabase. 
Ele irá:
- Criar dados simulados para todas as entidades acima.
- Vincular uma receita a um pedido real.
- Validar se o saldo da carteira é debitado corretamente no servidor.
- Garantir que o isolamento regional (MZ vs BR) está a funcionar.
