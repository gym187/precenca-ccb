# Transferência de Crianças — Frontend + RBAC Fix

## Goal

Expor a funcionalidade de transferência de crianças entre continuações na UI, com RBAC correto: auxiliares só podem transferir crianças da própria continuação.

## Architecture

A lógica de backend já existe (`POST /api/transferencias`, `GET /api/transferencias/crianca/:id`). São necessárias duas correções no backend (RBAC + permissão do GET) e uma única mudança no frontend: adicionar abas ao modal de edição de crianças.

## Tech Stack

Node.js/Express, Prisma (MariaDB), React 18, TailwindCSS, lucide-react, Axios.

---

## Backend Changes

### 1. RBAC em `transferencia.service.js`

`transferir()` passa a receber `usuario` como segundo argumento. Antes de criar a transferência, verifica:

- Se `usuario.todasContinuacoes === false` e `!usuario.continuacoes.includes(crianca.continuacaoId)` → lança `AppError('Sem acesso a esta continuação.', 403)`.

Assinatura nova:
```js
const transferir = async ({ criancaId, continuacaoDestinoId, dataTransferencia }, usuario) => { ... }
```

### 2. Controller passa `req.usuario`

```js
const transferir = async (req, res) => {
  const data = await service.transferir(req.body, req.usuario);
  res.status(201).json(data);
};
```

### 3. Permissão do GET em `transferencia.routes.js`

Muda de `gerenciar_criancas` para `transferir_crianca`:

```js
router.get('/crianca/:criancaId', perm('transferir_crianca'), controller.historico);
```

---

## Frontend Changes

### Arquivo: `frontend/src/pages/Criancas.jsx`

**Novos estados** (adicionados ao componente `Criancas`):

```js
const [abaModal, setAbaModal] = useState('dados')         // 'dados' | 'transferir'
const [todasConts, setTodasConts] = useState([])          // para o select de destino
const [histTransferencias, setHistTransferencias] = useState([])
const [loadingTransf, setLoadingTransf] = useState(false)
const [transferindo, setTransferindo] = useState(false)
const [formTransf, setFormTransf] = useState({ continuacaoDestinoId: '', dataTransferencia: '' })
```

**Ao abrir o modal de edição** (`abrirEditar`):
- `setAbaModal('dados')`
- `setFormTransf({ continuacaoDestinoId: '', dataTransferencia: '' })`
- Carrega histórico: `GET /api/transferencias/crianca/:id` → `setHistTransferencias`

**Ao abrir modal de criação** (`abrirAdicionar`):
- `setAbaModal('dados')`
- `setHistTransferencias([])`

**Estrutura do modal de edição** (somente quando `editando !== null`):

```
[Aba: Dados] [Aba: Transferir]   ← header do modal
────────────────────────────────
  conteúdo da aba ativa
```

As abas são renderizadas dentro do `<Modal>`, antes do `<form>`. Quando a aba ativa é `'dados'`, renderiza o formulário atual. Quando é `'transferir'`, renderiza:

1. **Continuação atual** — texto informativo: "Continuação atual: {nome}"
2. **Select destino** — lista `todasContinuacoes` excluindo a continuação atual da criança. Label: "Transferir para"
3. **Campo data** — tipo `date`, default: data de hoje (`new Date().toISOString().slice(0,10)`). Label: "Data da transferência"
4. **Botão** — "Confirmar Transferência", chama `POST /api/transferencias`, desabilitado enquanto `transferindo`
5. **Histórico** — lista de transferências anteriores abaixo do formulário; cada item mostra: "Origem → Destino · DD/MM/AAAA"

**Após confirmar transferência com sucesso:**
- Toast de sucesso: "Criança transferida com sucesso."
- Recarrega lista de crianças (`fetchCriancas()`)
- Reseta `formTransf`
- Recarrega histórico

**Carregamento de `todasConts`:** já existe `todasContinuacoes` no estado; reutilizar para o select de destino.

---

## RBAC no Frontend

Não é necessário ocultar a aba "Transferir" com base em permissão — o backend rejeita com 403 se o usuário não tiver `transferir_crianca`. O botão "Confirmar" pode exibir o erro via toast caso o backend rejeite.

---

## Campos e Validação

| Campo | Obrigatório | Validação |
|---|---|---|
| `continuacaoDestinoId` | Sim | UUID, diferente da continuação atual |
| `dataTransferencia` | Não | YYYY-MM-DD; default: hoje |

---

## Error Handling

- 403 do backend → toast "Sem permissão para transferir esta criança."
- 409 (já na continuação destino) → toast "A criança já pertence a esta continuação."
- Outros erros → toast "Erro ao realizar transferência. Tente novamente."

---

## Testes Manuais

1. Login como **ADMIN_GERAL** → editar qualquer criança → aba Transferir → transferir → criança muda de continuação.
2. Login como **auxiliar** com acesso à continuação A → editar criança da continuação A → transferir para B → sucesso.
3. Login como **auxiliar** com acesso à continuação A → tentar transferir criança da continuação B (URL direta) → 403.
4. Tentar transferir para a mesma continuação → backend retorna 409 → toast correto.
