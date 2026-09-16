# Paulispan ERP — PRD (Product Requirements Document)

## Visão
Sistema de gestão empresarial completo para a distribuidora **Paulispan** (sobremesas, bolos, pavês, tortas), com todos os módulos interligados: Cliente → Pedido → Produtos → Faturamento → Entrega → Devolução → Financeiro → Resultado.

## Idioma e Locale
- pt-BR, moeda R$ (formato brasileiro com vírgula decimal), datas dd/mm/yyyy.

## Personas
- **Administrador** — acesso total, cria usuários e módulos.
- **Comercial** — clientes, produtos, pedidos.
- **Financeiro** — receita, custo, resultado por pedido/cliente/produto.
- **Logística** — rotas, entregas, motoristas (fase 3).
- **Promotores** — visitas, execuções, não conformidades (fase 4).
- **Consulta** — leitura em módulos base.

## Arquitetura
- **Backend**: FastAPI + Motor (MongoDB async), autenticação JWT via cookies httpOnly (samesite=none/secure=true), CORS explícito com credentials, hashing bcrypt, brute-force lockout (5 tentativas / 15 min), seed idempotente do admin no startup.
- **Frontend**: React 19 + React Router 7 + Tailwind + Recharts + Sonner + Lucide. AuthContext com sessão baseada em cookie. Layout: sidebar dark (#0B1120) + workspace clara. Fontes: Plus Jakarta Sans (títulos) + IBM Plex Sans (dados) com tabular-nums.

## Data model (MongoDB)
- `users` — email, password_hash (bcrypt), name, role
- `clientes` — codigo, nome_rede, nome_loja, cnpj, regiao, cidade, estado, endereco, cep, telefone, email, contato, gerente, horario_recebimento, valor_minimo_pedido, status
- `produtos` — sku, nome, categoria, marca, unidade, qtd_por_caixa, preco_venda, custo, peso_liquido_g, tara_g, peso_esperado_balanca_g, prazo_validade_dias, status
- `pedidos` — numero, cliente_id, cliente_rede, cliente_loja, cidade, regiao, data_pedido, data_prevista_entrega, vendedor, status, items[], subtotal, desconto, total, custo_total, lucro, margem_pct, created_by
- `login_attempts` — controle brute force

## Endpoints (Fase 1)
- POST/GET /api/auth/login, /logout, /me, /refresh
- GET/POST /api/users (admin)
- GET/POST/PUT/DELETE /api/clientes, GET /api/clientes/{id}/resumo
- GET/POST/PUT/DELETE /api/produtos
- GET/POST/DELETE /api/pedidos, PATCH /api/pedidos/{id}/status
- GET /api/dashboard/kpis
- GET /api/financeiro/resultado

## O que foi implementado (2026-02 · Fase 1)
- Login JWT com cookies httpOnly, seed admin `admin@paulispan.com.br / admin123`
- Dashboard executivo com 8 KPIs + gráfico de faturamento diário (Area) + donut de status + ranking Top 5 sobremesas
- Cadastro completo de Clientes/Lojas (rede + unidade) com filtros e página CRM 360º (histórico, ticket médio, lucro, devoluções)
- Cadastro completo de Produtos com custo, margem % auto, peso esperado na balança (peso_liquido + tara)
- Pedidos: criação com múltiplos itens, cálculo automático de subtotal/custo/lucro/margem, alteração de status inline, resumo financeiro no formulário
- Financeiro: resultado por pedido (receita, custo, lucro, margem), totais consolidados
- Design tokens Paulispan (sidebar dark + workspace claro + amber accents), fontes Plus Jakarta Sans + IBM Plex Sans
- Testes backend (23/23 pytest) e frontend E2E: 100%

## Backlog priorizado (próximas fases)
### P1 · Fase 2 — Financeiro avançado & Devoluções
- Contas a pagar / a receber com centros de custo
- Devoluções vinculadas a pedido + motivos + NF de devolução
- Controle de estoque (entrada/saída/perdas/lote/validade)
- Histórico de preços por produto

### P2 · Fase 3 — Logística
- Caminhões, motoristas, rotas com custo (combustível/pedágios), planejamento de entregas
- Notas fiscais e comprovantes

### P2 · Fase 4 — Promotores
- Agências, agenda de visitas (2/semana/loja), execução com checklist e fotos
- Não conformidades vinculadas a produto/loja/visita
- Controle de pesagem por produto

### P3 · Fase 5+ — Analytics & Integrações
- Relatórios exportáveis (Excel/CSV/PDF)
- Central de pendências & alertas configuráveis
- Função "Analisar" (filtros combinados → KPIs auto)
- Auditoria/histórico de alterações
- Anexos (fotos, NFs, comprovantes)
- Integrações (Google Sheets, WhatsApp, e-mail, fiscal)

## Credenciais de teste
Ver `/app/memory/test_credentials.md`.
