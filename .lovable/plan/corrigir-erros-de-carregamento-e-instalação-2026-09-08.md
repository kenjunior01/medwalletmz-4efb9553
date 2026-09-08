# Corrigir erros de carregamento e instalação

## Objetivo
Eliminar os pedidos 400/401/404 mostrados no navegador e corrigir o aviso de instalação da aplicação, mantendo o acesso público apenas aos dados seguros necessários para pesquisa.

## Alterações

1. **Instalação PWA**
   - Unificar a captura de `beforeinstallprompt` para evitar dois listeners concorrentes.
   - Guardar corretamente o evento e chamar o diálogo nativo apenas após o utilizador escolher “Instalar”.
   - Não apresentar um botão de instalação quando o navegador não disponibilizar essa ação.

2. **Consultas compatíveis com a base de dados**
   - Remover filtros inexistentes em médicos (`country_id`) e obter o país através da relação correta já existente.
   - Evitar pedidos inválidos como `user_id=in.()` quando não houver médicos para consultar.
   - Ajustar as relações de médicos de clínicas e avaliações aos campos efetivamente existentes.
   - Substituir ou desativar, com estado vazio normal, consultas a recursos que ainda não existem (`health_articles` e `triage_sessions`).

3. **Acesso público seguro a catálogos**
   - Permitir leitura anónima somente das colunas públicas necessárias de hospitais e farmácias ativas.
   - Manter dados privados de perfis, licenças e proprietários protegidos.
   - Corrigir a leitura limitada de nomes públicos usada nas listas de médicos sem reabrir o perfil completo.

4. **Validação**
   - Testar a página inicial, médicos, hospitais, farmácias e detalhes de clínica sem sessão iniciada.
   - Confirmar que os pedidos deixam de retornar 400/401/404 e que não surgem erros de tela branca.
   - Verificar o fluxo de instalação em navegador compatível.

## Detalhes técnicos
- Uma migração pequena ajustará apenas permissões/políticas dos catálogos afetados.
- As mudanças de interface ficarão concentradas nos hooks e páginas que originam os pedidos reportados.
- Nenhum dado pessoal ou documento profissional será exposto anonimamente.
