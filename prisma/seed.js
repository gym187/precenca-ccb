/**
 * Seed — CCB Sistema de Presença
 *
 * Cria dados iniciais obrigatórios de forma IDEMPOTENTE (upsert).
 * Pode ser executado múltiplas vezes sem duplicar registros.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Permissões básicas do sistema ──────────────────────────────────────────
const PERMISSOES = [
  'gerenciar_criancas',
  'lancar_presenca',
  'editar_presenca',
  'visualizar_dashboard',
  'transferir_crianca',
  'gerenciar_usuarios',
  'gerenciar_roles',
  'gerenciar_permissoes',
  'gerenciar_continuacoes',
  'gerenciar_visitas',
];

// ─── Continuações de exemplo ─────────────────────────────────────────────────
const CONTINUACOES = [
  { nome: 'Maternal', descricao: 'Crianças de 0 a 3 anos' },
  { nome: 'Jardim', descricao: 'Crianças de 4 a 6 anos' },
  { nome: 'Primário', descricao: 'Crianças de 7 a 9 anos' },
  { nome: 'Juniores', descricao: 'Crianças de 10 a 12 anos' },
];

async function main() {
  console.log('🌱 Iniciando seed...\n');

  // 1. Criar permissões
  console.log('📋 Criando permissões...');
  const permissoesCriadas = {};
  for (const nome of PERMISSOES) {
    const p = await prisma.permissao.upsert({
      where: { nome },
      create: { nome },
      update: {},
    });
    permissoesCriadas[nome] = p;
    console.log(`   ✓ ${nome}`);
  }

  // 2. Criar role ADMIN_GERAL (fixa)
  console.log('\n🔐 Criando role ADMIN_GERAL...');
  const adminGeral = await prisma.role.upsert({
    where: { nome: 'ADMIN_GERAL' },
    create: { nome: 'ADMIN_GERAL', fixa: true },
    update: { fixa: true },
  });
  console.log(`   ✓ ADMIN_GERAL (id: ${adminGeral.id})`);

  // 3. Atribuir todas as permissões ao ADMIN_GERAL
  console.log('\n🔗 Atribuindo permissões ao ADMIN_GERAL...');
  for (const permissao of Object.values(permissoesCriadas)) {
    await prisma.rolePermissao.upsert({
      where: {
        roleId_permissaoId: { roleId: adminGeral.id, permissaoId: permissao.id },
      },
      create: { roleId: adminGeral.id, permissaoId: permissao.id },
      update: {},
    });
  }
  console.log('   ✓ Todas as permissões atribuídas');

  // 4. Criar role OPERADOR (lançamento de presença)
  console.log('\n👤 Criando role OPERADOR...');
  const operador = await prisma.role.upsert({
    where: { nome: 'OPERADOR' },
    create: { nome: 'OPERADOR', fixa: false },
    update: {},
  });
  const permsOperador = [
    'lancar_presenca',
    'editar_presenca',
    'visualizar_dashboard',
    'gerenciar_criancas',
    'gerenciar_visitas',
  ];
  for (const nomePerm of permsOperador) {
    const p = permissoesCriadas[nomePerm];
    await prisma.rolePermissao.upsert({
      where: { roleId_permissaoId: { roleId: operador.id, permissaoId: p.id } },
      create: { roleId: operador.id, permissaoId: p.id },
      update: {},
    });
  }
  console.log('   ✓ OPERADOR criado com permissões de lançamento');

  // 5. Criar usuário admin
  console.log('\n👨‍💼 Criando usuário administrador...');
  const ADMIN_EMAIL = 'admin@ccb.com';
  const ADMIN_SENHA = 'Admin@123';
  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 12);

  const admin = await prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    create: { nome: 'Administrador', email: ADMIN_EMAIL, senha: senhaHash },
    update: {},
  });

  await prisma.usuarioRole.upsert({
    where: { usuarioId_roleId: { usuarioId: admin.id, roleId: adminGeral.id } },
    create: { usuarioId: admin.id, roleId: adminGeral.id },
    update: {},
  });
  console.log(`   ✓ admin@ccb.com / Admin@123`);

  // 6. Criar continuações
  console.log('\n🏫 Criando continuações...');
  for (const cont of CONTINUACOES) {
    const existe = await prisma.continuacao.findFirst({ where: { nome: cont.nome } });
    if (!existe) {
      await prisma.continuacao.create({ data: cont });
    }
    console.log(`   ✓ ${cont.nome}`);
  }

  console.log('\n✅ Seed concluído com sucesso!');
  console.log('─────────────────────────────────────────');
  console.log('  Acesso admin:');
  console.log('  E-mail:  admin@ccb.com');
  console.log('  Senha:   Admin@123');
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
