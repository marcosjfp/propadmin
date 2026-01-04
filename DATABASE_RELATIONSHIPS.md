# Sistema de Relacionamentos e Comissões

## Visão Geral

Este documento descreve o sistema de relacionamentos entre as tabelas do banco de dados e como o cálculo de comissões funciona no **Administrador de Propriedades**.

## Estrutura de Relacionamentos

### Diagrama de Entidades e Relacionamentos

```
┌─────────────┐
│   USERS     │
│             │
│ - id (PK)   │◄────────┐
│ - openId    │         │
│ - name      │         │ 1:N (Um agente, muitas propriedades)
│ - email     │         │
│ - role      │         │
│ - isAgent   │    ┌────┴────────────┐
│ - creci     │    │   PROPERTIES    │
└─────────────┘    │                 │
       ▲           │ - id (PK)       │
       │           │ - title         │
       │           │ - price         │
       │ 1:N       │ - agentId (FK)  │◄─────┐
       │           │ - status        │      │
       │           │ - type          │      │ 1:N (Uma propriedade, muitas comissões)
       │           └─────────────────┘      │
       │                                    │
       │           ┌─────────────────┐      │
       └───────────┤  COMMISSIONS    │      │
         1:N       │                 │      │
                   │ - id (PK)       │──────┘
                   │ - propertyId(FK)│
                   │ - agentId (FK)  │
                   │ - amount        │
                   │ - rate          │
                   │ - status        │
                   └─────────────────┘
```

### Tabela: `users`

**Campos Principais:**
- `id`: Identificador único do usuário
- `role`: Papel do usuário (`user`, `agent`, `admin`)
- `isAgent`: Indica se o usuário é um agente imobiliário
- `creci`: Número de registro CRECI (obrigatório para agentes)

**Relacionamentos:**
- **1:N com `properties`**: Um agente pode ter muitas propriedades
- **1:N com `commissions`**: Um agente pode ter muitas comissões

### Tabela: `properties`

**Campos Principais:**
- `id`: Identificador único da propriedade
- `agentId`: **Foreign Key** referenciando `users.id` (agente responsável)
- `transactionType`: Tipo de transação (`venda` ou `aluguel`)
- `price`: Preço da propriedade (em centavos)
- `status`: Status da propriedade (`ativa`, `vendida`, `alugada`, `inativa`)

**Relacionamentos:**
- **N:1 com `users`**: Muitas propriedades pertencem a um agente
  - Constraint: `properties_agentId_users_id_fk`
  - On Delete: CASCADE (se o agente for deletado, suas propriedades também serão)
- **1:N com `commissions`**: Uma propriedade pode gerar várias comissões

### Tabela: `commissions`

**Campos Principais:**
- `id`: Identificador único da comissão
- `propertyId`: **Foreign Key** referenciando `properties.id`
- `agentId`: **Foreign Key** referenciando `users.id`
- `transactionAmount`: Valor da transação (em centavos)
- `commissionRate`: Taxa de comissão (800 = 8%, 1000 = 10%)
- `commissionAmount`: Valor calculado da comissão (em centavos)
- `status`: Status da comissão (`pendente`, `paga`, `cancelada`)
- `paymentDate`: Data do pagamento (quando status = `paga`)

**Relacionamentos:**
- **N:1 com `properties`**: Muitas comissões podem referenciar uma propriedade
  - Constraint: `commissions_propertyId_properties_id_fk`
  - On Delete: CASCADE
- **N:1 com `users`**: Muitas comissões pertencem a um agente
  - Constraint: `commissions_agentId_users_id_fk`
  - On Delete: CASCADE

## Sistema de Cálculo de Comissões

### Regras de Cálculo

O sistema calcula comissões automaticamente baseado no tipo de transação:

| Tipo de Transação | Taxa de Comissão |
|-------------------|------------------|
| **Venda**         | 8%               |
| **Aluguel**       | 10%              |

### Fórmula de Cálculo

```typescript
// Para venda: 8% (rate = 800)
// Para aluguel: 10% (rate = 1000)
const rate = transactionType === "venda" ? 800 : 1000;

// Cálculo do valor da comissão
const commissionAmount = Math.round((transactionAmount * rate) / 10000);
```

### Exemplo Prático

**Cenário 1: Venda de Imóvel**
- Valor da transação: R$ 500.000,00 (50000000 centavos)
- Taxa: 8% (rate = 800)
- Comissão: R$ 40.000,00 (4000000 centavos)

**Cenário 2: Aluguel de Imóvel**
- Valor da transação: R$ 3.000,00/mês (300000 centavos)
- Taxa: 10% (rate = 1000)
- Comissão: R$ 300,00 (30000 centavos)

## Funções da API

### Consultas com Relacionamentos

#### 1. Obter Propriedades com Dados do Agente

```typescript
// Retorna todas as propriedades com informações do agente responsável
await getAllPropertiesWithAgents();

// Retorna uma propriedade específica com dados do agente
await getPropertyWithAgent(propertyId);
```

**Retorno:**
```typescript
{
  property: {
    id: 1,
    title: "Apartamento Luxo",
    price: 50000000, // R$ 500.000,00
    agentId: 5,
    // ... outros campos
  },
  agent: {
    id: 5,
    name: "João Silva",
    creci: "12345-SP",
    // ... outros campos
  }
}
```

#### 2. Obter Comissões com Detalhes Completos

```typescript
// Retorna todas as comissões com propriedade e agente
await getAllCommissionsWithDetails();

// Retorna comissões de um agente específico com detalhes
await getCommissionsByAgentWithDetails(agentId);

// Retorna uma comissão específica com detalhes
await getCommissionWithDetails(commissionId);
```

**Retorno:**
```typescript
{
  commission: {
    id: 1,
    transactionAmount: 50000000,
    commissionRate: 800,
    commissionAmount: 4000000,
    status: "pendente",
    // ... outros campos
  },
  property: {
    id: 1,
    title: "Apartamento Luxo",
    // ... outros campos
  },
  agent: {
    id: 5,
    name: "João Silva",
    creci: "12345-SP",
    // ... outros campos
  }
}
```

#### 3. Obter Resumo de Comissões do Agente

```typescript
await getAgentCommissionSummary(agentId);
```

**Retorno:**
```typescript
{
  totalCommissions: 10,          // Total de comissões
  pendingAmount: 15000000,       // R$ 150.000,00 pendente
  paidAmount: 5000000,           // R$ 50.000,00 pago
  totalAmount: 20000000,         // R$ 200.000,00 total
  commissionCount: 10            // Contador de comissões
}
```

### Endpoints tRPC Disponíveis

#### Propriedades

- `properties.list`: Lista todas as propriedades
- `properties.listWithAgents`: Lista propriedades com dados dos agentes
- `properties.getWithAgent`: Obtém propriedade específica com agente
- `properties.myProperties`: Lista propriedades do agente logado
- `properties.create`: Cria nova propriedade
- `properties.update`: Atualiza propriedade
- `properties.delete`: Remove propriedade

#### Comissões

- `commissions.myCommissions`: Lista comissões do agente
- `commissions.myCommissionsWithDetails`: Lista comissões com detalhes
- `commissions.mySummary`: Obtém resumo de comissões do agente
- `commissions.list`: Lista todas (apenas admin)
- `commissions.listWithDetails`: Lista todas com detalhes (apenas admin)
- `commissions.getWithDetails`: Obtém comissão específica com detalhes
- `commissions.calculate`: Calcula comissão antes de criar
- `commissions.create`: Cria nova comissão
- `commissions.updateStatus`: Atualiza status (apenas admin)

## Fluxo de Trabalho

### 1. Criação de Comissão

```typescript
// 1. Agente cria uma propriedade
const property = await createProperty({
  title: "Casa Moderna",
  price: 80000000, // R$ 800.000,00
  transactionType: "venda",
  agentId: currentUserId,
  // ... outros campos
});

// 2. Quando a propriedade é vendida, cria a comissão
const commission = await createCommission({
  propertyId: property.id,
  agentId: property.agentId,
  transactionType: property.transactionType,
  transactionAmount: 80000000, // Valor da venda
});

// Resultado automático:
// commissionRate: 800 (8%)
// commissionAmount: 6400000 (R$ 64.000,00)
// status: "pendente"
```

### 2. Aprovação de Comissão (Admin)

```typescript
// Admin aprova e marca como paga
await updateCommissionStatus(commissionId, "paga");

// paymentDate é automaticamente definida
```

### 3. Consulta de Comissões do Agente

```typescript
// Agente visualiza suas comissões
const myCommissions = await getCommissionsByAgentWithDetails(agentId);

// Agente vê resumo
const summary = await getAgentCommissionSummary(agentId);
```

## Integridade Referencial

### Cascata de Exclusão

Quando um agente é deletado:
1. Todas as suas propriedades são deletadas (CASCADE)
2. Todas as suas comissões são deletadas (CASCADE)

Quando uma propriedade é deletada:
1. Todas as comissões relacionadas são deletadas (CASCADE)

### Índices para Performance

Foram criados índices nas colunas de foreign keys para melhorar a performance das consultas:

- `properties_agentId_idx`: Índice em `properties.agentId`
- `commissions_propertyId_idx`: Índice em `commissions.propertyId`
- `commissions_agentId_idx`: Índice em `commissions.agentId`
- `commissions_status_idx`: Índice em `commissions.status`

## Migração do Banco de Dados

Para aplicar as foreign keys ao banco de dados existente:

```bash
# Executar a migração
pnpm db:push
```

Ou manualmente:

```sql
-- Executar o arquivo SQL
source drizzle/0002_add_foreign_keys.sql
```

## Considerações Importantes

1. **Valores em Centavos**: Todos os valores monetários são armazenados em centavos para evitar problemas com ponto flutuante
   - R$ 1.000,00 = 100000 centavos

2. **Taxas de Comissão**: Armazenadas como inteiros (800 = 8%, 1000 = 10%)

3. **Cascata de Exclusão**: Cuidado ao deletar usuários ou propriedades, pois isso deletará dados relacionados

4. **Status de Comissões**:
   - `pendente`: Comissão criada mas não paga
   - `paga`: Comissão aprovada e paga (paymentDate é definido)
   - `cancelada`: Comissão cancelada (transação não concluída)

5. **Permissões**:
   - Apenas agentes podem criar propriedades
   - Apenas agentes ou admin podem criar comissões
   - Apenas admin pode alterar status de comissões
   - Agentes veem apenas suas próprias comissões
   - Admin vê todas as comissões

## Exemplos de Uso no Frontend

```typescript
// Listar propriedades com agentes
const propertiesWithAgents = await trpc.properties.listWithAgents.query();

// Calcular comissão antes de finalizar venda
const calculation = await trpc.commissions.calculate.query({
  transactionAmount: 50000000,
  transactionType: "venda"
});
// Retorna: { rate: 800, amount: 4000000, percentage: "8.0%" }

// Criar comissão ao finalizar venda
await trpc.commissions.create.mutate({
  propertyId: 1,
  transactionAmount: 50000000
});

// Ver resumo do agente
const summary = await trpc.commissions.mySummary.query();

// Ver comissões com detalhes
const details = await trpc.commissions.myCommissionsWithDetails.query();
```
