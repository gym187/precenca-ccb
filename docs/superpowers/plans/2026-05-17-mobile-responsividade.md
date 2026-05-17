# Mobile Responsividade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar todas as telas com tabelas funcionais no mobile, substituindo colunas escondidas por cards responsivos, e corrigir problemas de safe-area e PWA para iOS.

**Architecture:** Cada página mantém a tabela desktop intacta dentro de `<div className="hidden sm:block">` e ganha um bloco mobile `<div className="block sm:hidden">` com cards que expõem todos os campos. Sem novos componentes — os cards são JSX inline de cada página. Fixes de infraestrutura tocam `index.html`, `index.css` e `Layout.jsx`.

**Tech Stack:** React 18, Vite, TailwindCSS, Lucide React. Sem suíte de testes — verificação via build + browser.

---

## File Map

| Arquivo | Mudança |
|---|---|
| `frontend/index.html` | viewport-fit=cover + 3 meta tags iOS PWA |
| `frontend/src/index.css` | remover padding-bottom do body (será feito via Layout) |
| `frontend/src/components/Layout.jsx` | `pb-20 sm:pb-0` no `<main>`; safe-area no InstallBanner |
| `frontend/src/components/InstallBanner.jsx` | `paddingBottom: env(safe-area-inset-bottom)` inline |
| `frontend/src/pages/Criancas.jsx` | padding responsivo + bloco mobile cards |
| `frontend/src/pages/Visitas.jsx` | padding responsivo + bloco mobile cards |
| `frontend/src/pages/Usuarios.jsx` | padding responsivo + bloco mobile cards |
| `frontend/src/pages/Continuacoes.jsx` | padding responsivo + bloco mobile cards |

---

## Task 1: Infraestrutura — index.html + Layout.jsx + InstallBanner.jsx

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/InstallBanner.jsx`

### Contexto

`index.html` não tem `viewport-fit=cover` nem meta tags de PWA para iOS. Sem elas, o conteúdo fica embaixo do notch/home bar do iPhone quando instalado como PWA.

`Layout.jsx`: o `<main>` não tem padding-bottom. O `InstallBanner` é `fixed bottom-0` e cobre o conteúdo do rodapé. A solução é `pb-20 sm:pb-0` no `<main>` (80px cobre o banner ~56px + home bar ~34px do iPhone).

`InstallBanner.jsx`: precisa de `paddingBottom: 'env(safe-area-inset-bottom)'` para que o seu próprio conteúdo não fique atrás do home indicator.

- [ ] **Step 1: Atualizar `frontend/index.html`**

Substitua a linha do viewport e adicione as meta tags logo abaixo:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="CCB Presenças" />
```

O arquivo completo deve ficar:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="CCB Presenças" />
    <title>CCB — Controle de Presença</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✝</text></svg>" />
    <link rel="apple-touch-icon" href="/pwa-192.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Atualizar `frontend/src/components/Layout.jsx`**

Substitua o conteúdo completo por:

```jsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Cross } from 'lucide-react'
import Sidebar from './Sidebar'
import InstallBanner from './InstallBanner'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gelo dark:bg-stone-950">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-stone-800 dark:bg-stone-700 rounded-md flex items-center justify-center">
              <Cross size={12} className="text-white" />
            </div>
            <span className="text-sm font-bold text-stone-800 dark:text-stone-100">CCB</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto pb-20 sm:pb-0">
          <Outlet />
        </main>
      </div>

      <InstallBanner />
    </div>
  )
}
```

- [ ] **Step 3: Atualizar `frontend/src/components/InstallBanner.jsx`**

Localize a div raiz do banner (linha 78):
```jsx
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-white/95 dark:bg-stone-900/95 border-t border-stone-200 dark:border-stone-700 shadow-lg">
```

Substitua por:
```jsx
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 px-4 pt-3 bg-white/95 dark:bg-stone-900/95 border-t border-stone-200 dark:border-stone-700 shadow-lg"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
```

- [ ] **Step 4: Verificar build**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb/frontend && npm run build 2>&1 | tail -5
```

Esperado: `✓ built in` sem erros de sintaxe.

- [ ] **Step 5: Commit**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb
git add frontend/index.html frontend/src/components/Layout.jsx frontend/src/components/InstallBanner.jsx
git commit -m "fix(pwa): viewport-fit=cover, meta iOS, safe-area e pb no main"
```

---

## Task 2: Cards mobile — Criancas.jsx

**Files:**
- Modify: `frontend/src/pages/Criancas.jsx`

### Contexto

A tabela atual está em `<div className="card overflow-hidden">` (linha ~352). Quando `loading` é falso, renderiza diretamente um `<table>`. A mudança envolve:
1. Trocar `p-6` por `px-4 py-4 sm:p-6` no div raiz (linha 292).
2. Dentro do bloco `!loading`: adicionar cards mobile antes da tabela desktop, ambos com classes `block sm:hidden` / `hidden sm:block`.

A variável `fmtMotivo` já existe no arquivo (linha 15). `AvatarWithFallback`, `MessageCircle`, `History`, `Pencil`, `Trash2` já estão importados.

- [ ] **Step 1: Corrigir padding da página**

Localize (linha 292):
```jsx
    <div className="p-6 max-w-7xl mx-auto">
```

Substitua por:
```jsx
    <div className="px-4 py-4 sm:p-6 max-w-7xl mx-auto">
```

- [ ] **Step 2: Substituir o bloco da tabela pelo bloco duplo mobile+desktop**

Localize o bloco completo:
```jsx
      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-100">
```

Substitua pelo bloco abaixo (mantendo tudo que vem depois do `<table` inalterado, apenas adicionando o wrapper e os cards antes):

```jsx
      {/* Lista */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block sm:hidden divide-y divide-stone-100 dark:divide-stone-700">
              {lista.length === 0 ? (
                <p className="text-center text-stone-400 py-10 text-sm px-4">
                  {abaLista === 'arquivados' ? 'Nenhum jovem ou menor arquivado.' : 'Nenhum jovem ou menor encontrado.'}
                </p>
              ) : (
                lista.map((c) => (
                  <div key={c.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <AvatarWithFallback foto={c.foto} nome={c.nomeCompleto} size="sm" />
                      <button
                        type="button"
                        onClick={() => setDetalhe(c)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="font-semibold text-stone-800 dark:text-stone-100 truncate">{c.nomeCompleto}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{c.continuacao?.nome}</p>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                      <div>
                        <p className="text-xs text-stone-400 uppercase tracking-wide">Responsável</p>
                        <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">{c.nomeResponsavel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 uppercase tracking-wide">Telefone</p>
                        <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">{c.telefoneResponsavel || '—'}</p>
                      </div>
                      {abaLista === 'arquivados' && c.motivoArquivamento && (
                        <div className="col-span-2">
                          <p className="text-xs text-stone-400 uppercase tracking-wide">Motivo</p>
                          <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">{fmtMotivo(c.motivoArquivamento)}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-3">
                      <button
                        onClick={() => verHistorico(c.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                        title="Ver histórico"
                      >
                        <History size={15} />
                      </button>
                      {c.telefoneResponsavel && (() => {
                        const tel = c.telefoneResponsavel.replace(/\D/g, '')
                        const msg = encodeURIComponent(`Paz de Deus ${c.nomeResponsavel ?? 'Responsável'} sou auxiliar da ${c.nomeCompleto}, podemos conversar?`)
                        return (
                          <a
                            href={`https://wa.me/55${tel}?text=${msg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enviar WhatsApp"
                            className="p-1.5 rounded-lg text-stone-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-colors"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )
                      })()}
                      <button
                        onClick={() => abrirEditar(c)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      {abaLista === 'ativos' && (
                        <button
                          onClick={() => setShowConfirmDelete(c)}
                          className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                          title="Arquivar"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-stone-100">
```

- [ ] **Step 3: Fechar os novos wrappers após o `</table>`**

Localize o trecho que fecha a tabela:
```jsx
            </tbody>
          </table>
        )}
      </div>
```

Substitua por:
```jsx
            </tbody>
              </table>
            </div>
          </>
        )}
      </div>
```

- [ ] **Step 4: Verificar build**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb/frontend && npm run build 2>&1 | tail -5
```

Esperado: `✓ built in` sem erros.

- [ ] **Step 5: Commit**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb
git add frontend/src/pages/Criancas.jsx
git commit -m "feat(mobile): cards responsivos em Jovens e Menores"
```

---

## Task 3: Cards mobile — Visitas.jsx

**Files:**
- Modify: `frontend/src/pages/Visitas.jsx`

### Contexto

A tabela de visitas está em `<div className="card overflow-hidden">` (linha ~203). O bloco `loading` e `lista.length === 0` estão fora do bloco `<table>` — atenção ao estruturar o `<>` fragment.

`STATUS_CONFIG` já existe com `{ label, cls }`. `MapPin`, `Pencil`, `Trash2` já estão importados.

- [ ] **Step 1: Corrigir padding da página**

Localize (linha 159):
```jsx
    <div className="p-6 max-w-5xl mx-auto">
```

Substitua por:
```jsx
    <div className="px-4 py-4 sm:p-6 max-w-5xl mx-auto">
```

- [ ] **Step 2: Substituir o bloco da lista pelo bloco duplo mobile+desktop**

Localize o bloco completo:
```jsx
      {/* Lista */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-stone-400">
            <MapPin size={32} className="opacity-30" />
            <p className="text-sm">Nenhuma visita encontrada.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-100">
```

Substitua por:
```jsx
      {/* Lista */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-stone-400">
            <MapPin size={32} className="opacity-30" />
            <p className="text-sm">Nenhuma visita encontrada.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block sm:hidden divide-y divide-stone-100 dark:divide-stone-700">
              {lista.map((v) => (
                <div key={v.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-800 dark:text-stone-100 truncate">{v.crianca?.nomeCompleto}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{v.crianca?.continuacao?.nome}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${STATUS_CONFIG[v.status]?.cls}`}>
                      {STATUS_CONFIG[v.status]?.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wide">Data e hora</p>
                      <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">
                        {new Date(v.data.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')} às {v.hora}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wide">Responsável</p>
                      <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">{v.responsavel?.nome}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-stone-400 uppercase tracking-wide">Endereço</p>
                      <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">{v.endereco}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-3">
                    <button
                      onClick={() => abrirEditar(v)}
                      className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmarDeletar(v)}
                      className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-stone-100">
```

- [ ] **Step 3: Fechar os novos wrappers após o `</table>`**

Localize:
```jsx
            </tbody>
          </table>
        )}
      </div>
```

Substitua por:
```jsx
            </tbody>
              </table>
            </div>
          </>
        )}
      </div>
```

- [ ] **Step 4: Build + commit**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb/frontend && npm run build 2>&1 | tail -5
```

Esperado: `✓ built in` sem erros.

```bash
cd /Users/guylherme.miguel/code/precenca-ccb
git add frontend/src/pages/Visitas.jsx
git commit -m "feat(mobile): cards responsivos em Visitas"
```

---

## Task 4: Cards mobile — Usuarios.jsx

**Files:**
- Modify: `frontend/src/pages/Usuarios.jsx`

### Contexto

A tabela de usuários está em `<div className="card overflow-hidden">` (linha ~139). O bloco `loading` retorna spinner ou a tabela. `Shield`, `UserPlus`, `BookOpen`, `Trash2` já estão importados.

- [ ] **Step 1: Corrigir padding da página**

Localize (linha 126):
```jsx
      <div className="p-6 max-w-5xl mx-auto">
```

Substitua por:
```jsx
      <div className="px-4 py-4 sm:p-6 max-w-5xl mx-auto">
```

- [ ] **Step 2: Substituir o bloco da tabela pelo bloco duplo mobile+desktop**

Localize o bloco:
```jsx
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-100">
```

Substitua por:
```jsx
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block sm:hidden divide-y divide-stone-100 dark:divide-stone-700">
              {usuarios.length === 0 ? (
                <p className="text-center text-stone-400 py-10 text-sm px-4">Nenhum usuário encontrado.</p>
              ) : (
                usuarios.map((u) => (
                  <div key={u.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-stone-500 dark:text-stone-300 uppercase">{u.nome[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-stone-800 dark:text-stone-100 truncate">{u.nome}</p>
                        <p className="text-xs text-stone-400 mt-0.5 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                      {u.roles?.map((r) => (
                        <span
                          key={r.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            r.fixa ? 'bg-stone-800 text-white' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {r.fixa && <Shield size={10} />}
                          {r.nome}
                          {!r.fixa && (
                            <button onClick={() => removerRole(u.id, r.id)} className="ml-0.5 hover:text-red-500 transition-colors">×</button>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-3">
                      <button
                        onClick={() => abrirContModal(u)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                        title="Gerenciar continuações"
                      >
                        <BookOpen size={15} />
                      </button>
                      <button
                        onClick={() => setShowRoleModal(u)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                        title="Atribuir role"
                      >
                        <UserPlus size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-stone-100">
```

- [ ] **Step 3: Fechar os novos wrappers após o `</table>`**

Localize:
```jsx
            </tbody>
          </table>
        )}
      </div>
```

Substitua por:
```jsx
            </tbody>
              </table>
            </div>
          </>
        )}
      </div>
```

- [ ] **Step 4: Build + commit**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb/frontend && npm run build 2>&1 | tail -5
```

Esperado: `✓ built in` sem erros.

```bash
cd /Users/guylherme.miguel/code/precenca-ccb
git add frontend/src/pages/Usuarios.jsx
git commit -m "feat(mobile): cards responsivos em Usuários"
```

---

## Task 5: Cards mobile — Continuacoes.jsx

**Files:**
- Modify: `frontend/src/pages/Continuacoes.jsx`

### Contexto

A tabela de continuações está em `<div className="card overflow-hidden">` (linha ~84). O bloco `loading` retorna spinner ou a tabela. `Pencil`, `Trash2`, `Users` já estão importados.

- [ ] **Step 1: Corrigir padding da página**

Localize (linha 71):
```jsx
      <div className="p-6 max-w-3xl mx-auto">
```

Substitua por:
```jsx
      <div className="px-4 py-4 sm:p-6 max-w-3xl mx-auto">
```

- [ ] **Step 2: Substituir o bloco da tabela pelo bloco duplo mobile+desktop**

Localize o bloco:
```jsx
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-100">
```

Substitua por:
```jsx
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block sm:hidden divide-y divide-stone-100 dark:divide-stone-700">
              {continuacoes.length === 0 ? (
                <p className="text-center text-stone-400 py-10 text-sm px-4">Nenhuma continuação cadastrada.</p>
              ) : (
                continuacoes.map((c) => (
                  <div key={c.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-stone-800 dark:text-stone-100">{c.nome}</p>
                      <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0">
                        {c._count?.criancas ?? 0} jovens
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-700 space-y-2">
                      {c.descricao && (
                        <div>
                          <p className="text-xs text-stone-400 uppercase tracking-wide">Descrição</p>
                          <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">{c.descricao}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-stone-400 uppercase tracking-wide">Auxiliares</p>
                        <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">
                          {c.auxiliares?.length > 0 ? c.auxiliares.map((a) => a.nome).join(', ') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-3">
                      <button
                        onClick={() => abrir(c)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-stone-100">
```

- [ ] **Step 3: Fechar os novos wrappers após o `</table>`**

Localize:
```jsx
            </tbody>
          </table>
        )}
      </div>
```

Substitua por:
```jsx
            </tbody>
              </table>
            </div>
          </>
        )}
      </div>
```

- [ ] **Step 4: Build final + commit**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb/frontend && npm run build 2>&1 | tail -5
```

Esperado: `✓ built in` sem erros.

```bash
cd /Users/guylherme.miguel/code/precenca-ccb
git add frontend/src/pages/Continuacoes.jsx
git commit -m "feat(mobile): cards responsivos em Continuações"
```

---

## Task 6: Rebuild Docker + teste manual

**Files:** nenhum (infra)

- [ ] **Step 1: Rebuild e subir containers**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb
docker compose build frontend && docker compose up -d
```

Esperado: containers sobem sem erro.

- [ ] **Step 2: Teste manual no browser mobile**

Abra http://localhost:8080 no browser do computador e use DevTools → Toggle Device Toolbar (iPhone 12, 390px de largura).

Verifique em cada tela:
1. **Jovens e Menores** → cards com Avatar, Nome, Continuação, Responsável, Telefone e botões WhatsApp/Editar/Arquivar todos visíveis
2. **Aba Arquivados** → campo "Motivo" aparece no card quando preenchido
3. **Visitas** → cards com Nome, Status badge, Data+Hora, Responsável, Endereço e botões Editar/Remover
4. **Usuários** → cards com Avatar, Nome, Email, badges de roles e botões de ação
5. **Continuações** → cards com Nome, badge de contagem, Auxiliares e botões Editar/Remover
6. **Desktop (1280px)** → todas as telas mostram a tabela original sem alteração

- [ ] **Step 3: Testar no celular real (via túnel Cloudflare)**

Acesse o app via HTTPS no celular. Verifique:
- iPhone: status bar não fica por cima do conteúdo (safe-area funcionando)
- O InstallBanner não esconde o último item da lista em nenhuma página
- Ao instalar o PWA, abrindo via ícone da tela inicial: conteúdo não fica embaixo da barra do sistema
