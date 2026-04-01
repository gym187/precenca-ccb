const PDFDocument = require('pdfkit');
const prisma = require('../../config/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcPerc = (presentes, total) =>
  total === 0 ? 0 : Math.round((presentes / total) * 100);

const resolverIntervalo = (periodo) => {
  if (!periodo || periodo === 'all') return null;
  const meses = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[periodo];
  if (!meses) return null;
  const fim = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - meses);
  return { inicio, fim };
};

const labelPeriodo = (periodo) => {
  const map = {
    '1m': 'Último mês',
    '3m': 'Últimos 3 meses',
    '6m': 'Últimos 6 meses',
    '12m': 'Últimos 12 meses',
    all: 'Todo o período',
  };
  return map[periodo] ?? 'Mês atual';
};

const fmtData = (d) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

// ─── Buscar dados de uma continuação ─────────────────────────────────────────

const dadosContinuacao = async (continuacaoId, intervalo) => {
  const cont = await prisma.continuacao.findUnique({ where: { id: continuacaoId } });
  if (!cont) return null;

  const criancas = await prisma.crianca.findMany({
    where: { continuacaoId, ativo: true },
    orderBy: { nomeCompleto: 'asc' },
    select: { id: true, nomeCompleto: true, dataNascimento: true },
  });

  const ids = criancas.map((c) => c.id);
  const wherePresenca = { criancaId: { in: ids } };
  if (intervalo) wherePresenca.data = { gte: intervalo.inicio, lte: intervalo.fim };

  const presencas = await prisma.presenca.findMany({ where: wherePresenca });

  const contagem = {};
  for (const p of presencas) {
    if (!contagem[p.criancaId])
      contagem[p.criancaId] = { presentes: 0, ausentes: 0, justificados: 0, total: 0 };
    contagem[p.criancaId].total++;
    if (p.status === 'presente') contagem[p.criancaId].presentes++;
    else if (p.status === 'ausente') contagem[p.criancaId].ausentes++;
    else contagem[p.criancaId].justificados++;
  }

  const linhas = criancas.map((c) => {
    const cnt = contagem[c.id] ?? { presentes: 0, ausentes: 0, justificados: 0, total: 0 };
    return { ...c, ...cnt, perc: calcPerc(cnt.presentes, cnt.total) };
  });

  const totPresentes = presencas.filter((p) => p.status === 'presente').length;
  const totTotal = presencas.length;

  return {
    continuacao: cont,
    linhas,
    totalCriancas: criancas.length,
    totTotal,
    totPresentes,
    percGeral: calcPerc(totPresentes, totTotal),
  };
};

// ─── Construtor do PDF ────────────────────────────────────────────────────────

const construirPdf = (dados, labelPer, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  const W = doc.page.width - 80; // largura útil

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc
    .fillColor('#1c1917')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('CCB — Congregação Cristã no Brasil', 40, 40);
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#78716c')
    .text('Sistema de Controle de Presença', 40, 60);
  doc
    .moveTo(40, 78)
    .lineTo(doc.page.width - 40, 78)
    .strokeColor('#e7e5e4')
    .stroke();

  let y = 90;

  for (const bloco of dados) {
    // Verificar se cabe na página atual (pelo menos cabeçalho da tabela)
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 40;
    }

    // ── Título da continuação ───────────────────────────────────────────────
    doc
      .fillColor('#292524')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(bloco.continuacao.nome, 40, y);
    y += 18;

    doc
      .fillColor('#a8a29e')
      .fontSize(9)
      .font('Helvetica')
      .text(
        `${bloco.totalCriancas} jovens/menores ativos · Período: ${labelPer} · Presença geral: ${bloco.percGeral}%  (${bloco.totPresentes}/${bloco.totTotal} registros)`,
        40,
        y
      );
    y += 16;

    // ── Cabeçalho da tabela ──────────────────────────────────────────────────
    const cols = [
      { label: 'Nome', x: 40, w: 230 },
      { label: 'Presenças', x: 278, w: 72, align: 'center' },
      { label: 'Faltas', x: 356, w: 60, align: 'center' },
      { label: 'Justif.', x: 422, w: 60, align: 'center' },
      { label: 'Total', x: 488, w: 50, align: 'center' },
      { label: '% Pres.', x: 543, w: 52, align: 'center' },
    ];

    doc.rect(40, y, W, 18).fill('#f5f5f4');
    cols.forEach((c) => {
      doc
        .fillColor('#57534e')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(c.label, c.x + 3, y + 5, { width: c.w - 6, align: c.align ?? 'left' });
    });
    y += 18;

    // ── Linhas ───────────────────────────────────────────────────────────────
    for (const linha of bloco.linhas) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
        // repetir cabeçalho
        doc.rect(40, y, W, 18).fill('#f5f5f4');
        cols.forEach((c) => {
          doc
            .fillColor('#57534e')
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(c.label, c.x + 3, y + 5, { width: c.w - 6, align: c.align ?? 'left' });
        });
        y += 18;
      }

      const bg = bloco.linhas.indexOf(linha) % 2 === 0 ? '#ffffff' : '#fafaf9';
      doc.rect(40, y, W, 16).fill(bg);

      const percColor =
        linha.perc >= 75 ? '#16a34a' : linha.perc >= 50 ? '#d97706' : '#dc2626';

      doc
        .fillColor('#1c1917')
        .fontSize(8)
        .font('Helvetica')
        .text(linha.nomeCompleto, 43, y + 4, { width: 227, ellipsis: true });

      doc.text(String(linha.presentes), cols[1].x + 3, y + 4, { width: cols[1].w - 6, align: 'center' });
      doc.text(String(linha.ausentes), cols[2].x + 3, y + 4, { width: cols[2].w - 6, align: 'center' });
      doc.text(String(linha.justificados), cols[3].x + 3, y + 4, { width: cols[3].w - 6, align: 'center' });
      doc.text(String(linha.total), cols[4].x + 3, y + 4, { width: cols[4].w - 6, align: 'center' });
      doc.fillColor(percColor).text(`${linha.perc}%`, cols[5].x + 3, y + 4, { width: cols[5].w - 6, align: 'center' });

      y += 16;
    }

    // borda inferior do bloco
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#e7e5e4').stroke();
    y += 12;

    // ── Top 5 rankings ────────────────────────────────────────────────────
    const linhasComRegistro = bloco.linhas.filter((l) => l.total > 0);

    if (linhasComRegistro.length > 0) {
      // Top 5 mais faltantes (mais ausentes em %)
      const top5Faltantes = [...linhasComRegistro]
        .sort((a, b) => a.perc - b.perc)
        .slice(0, 5);

      // Top 5 mais presentes
      const top5Presentes = [...linhasComRegistro]
        .sort((a, b) => b.perc - a.perc)
        .slice(0, 5);

      const desenharRanking = (titulo, cor, lista) => {
        if (y > doc.page.height - 100) { doc.addPage(); y = 40; }

        doc.fillColor(cor).fontSize(9).font('Helvetica-Bold').text(titulo, 40, y);
        y += 14;

        for (let i = 0; i < lista.length; i++) {
          if (y > doc.page.height - 40) { doc.addPage(); y = 40; }
          const item = lista[i];
          const percColor = item.perc >= 75 ? '#16a34a' : item.perc >= 50 ? '#d97706' : '#dc2626';
          doc.fillColor('#44403c').fontSize(8).font('Helvetica')
            .text(`${i + 1}. ${item.nomeCompleto}`, 50, y, { continued: true })
            .text('  —  ', { continued: true })
            .fillColor(percColor)
            .text(`${item.perc}% presença`, { continued: true })
            .fillColor('#78716c')
            .text(`  (${item.presentes}P / ${item.ausentes}F / ${item.justificados}J)`);
          y += 13;
        }
        y += 6;
      };

      desenharRanking('Top 5 — Mais faltantes', '#dc2626', top5Faltantes);
      desenharRanking('Top 5 — Mais presentes', '#16a34a', top5Presentes);
    }

    y += 6;
  }

  // ── Rodapé ──────────────────────────────────────────────────────────────────
  doc
    .fillColor('#a8a29e')
    .fontSize(8)
    .font('Helvetica')
    .text(
      `Gerado em ${new Date().toLocaleString('pt-BR')}`,
      40,
      doc.page.height - 40,
      { align: 'right', width: W }
    );

  doc.end();
};

// ─── Relatório de uma continuação ────────────────────────────────────────────

const gerarPdfContinuacao = async (continuacaoId, { periodo } = {}, usuario, res) => {
  if (
    usuario &&
    !usuario.todasContinuacoes &&
    !usuario.continuacoes.includes(continuacaoId)
  ) {
    res.status(403).json({ erro: 'Sem acesso a esta continuação.' });
    return;
  }

  const intervalo = resolverIntervalo(periodo);
  const dados = await dadosContinuacao(continuacaoId, intervalo);
  if (!dados) {
    res.status(404).json({ erro: 'Continuação não encontrada.' });
    return;
  }

  const nomeSanitizado = dados.continuacao.nome.replace(/[^a-z0-9]/gi, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="relatorio_${nomeSanitizado}_${labelPeriodo(periodo).replace(/ /g, '_')}.pdf"`
  );

  construirPdf([dados], labelPeriodo(periodo), res);
};

// ─── Relatório geral (todas as continuações) ─────────────────────────────────

const gerarPdfGeral = async ({ periodo } = {}, usuario, res) => {
  const where = usuario?.todasContinuacoes
    ? {}
    : { id: { in: usuario?.continuacoes ?? [] } };

  const continuacoes = await prisma.continuacao.findMany({
    where,
    orderBy: { nome: 'asc' },
  });

  const intervalo = resolverIntervalo(periodo);
  const blocos = await Promise.all(
    continuacoes.map((c) => dadosContinuacao(c.id, intervalo))
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="relatorio_geral_${new Date().toISOString().slice(0, 10)}.pdf"`
  );

  construirPdf(blocos.filter(Boolean), labelPeriodo(periodo), res);
};

// ─── Relatório administrativo (ranking de continuações) ──────────────────────

const gerarPdfAdministrativo = async ({ periodo } = {}, res) => {
  const continuacoes = await prisma.continuacao.findMany({ orderBy: { nome: 'asc' } });
  const intervalo = resolverIntervalo(periodo);

  const blocos = await Promise.all(
    continuacoes.map((c) => dadosContinuacao(c.id, intervalo))
  );
  const dados = blocos.filter(Boolean);

  const labelPer = labelPeriodo(periodo);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="relatorio_administrativo_${new Date().toISOString().slice(0, 10)}.pdf"`
  );

  const W = doc.page.width - 80;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc
    .fillColor('#1c1917').fontSize(16).font('Helvetica-Bold')
    .text('CCB — Relatório Administrativo', 40, 40);
  doc
    .fontSize(10).font('Helvetica').fillColor('#78716c')
    .text(`Sistema de Controle de Presença · Período: ${labelPer}`, 40, 60);
  doc.moveTo(40, 78).lineTo(doc.page.width - 40, 78).strokeColor('#e7e5e4').stroke();

  let y = 95;

  // ── Resumo geral ──────────────────────────────────────────────────────────
  const totalJovens = dados.reduce((s, b) => s + b.totalCriancas, 0);
  const totalRegistros = dados.reduce((s, b) => s + b.totTotal, 0);
  const totalPresentes = dados.reduce((s, b) => s + b.totPresentes, 0);
  const percGeralGlobal = calcPerc(totalPresentes, totalRegistros);

  doc.fillColor('#292524').fontSize(11).font('Helvetica-Bold').text('Resumo Geral', 40, y);
  y += 16;
  doc.fillColor('#44403c').fontSize(9).font('Helvetica')
    .text(`Total de continuações: ${dados.length}`, 50, y); y += 13;
  doc.text(`Total de jovens/menores ativos: ${totalJovens}`, 50, y); y += 13;
  doc.text(`Total de registros de presença: ${totalRegistros}`, 50, y); y += 13;
  doc.text(`Presença geral: ${percGeralGlobal}% (${totalPresentes}/${totalRegistros})`, 50, y); y += 20;

  // ── Tabela de continuações ─────────────────────────────────────────────────
  doc.fillColor('#292524').fontSize(11).font('Helvetica-Bold').text('Detalhamento por Continuação', 40, y);
  y += 16;

  const colsAdmin = [
    { label: 'Continuação', x: 40, w: 200 },
    { label: 'Jovens', x: 246, w: 55, align: 'center' },
    { label: 'Presenças', x: 307, w: 65, align: 'center' },
    { label: 'Faltas', x: 378, w: 55, align: 'center' },
    { label: 'Registros', x: 439, w: 60, align: 'center' },
    { label: '% Pres.', x: 505, w: 55, align: 'center' },
  ];

  doc.rect(40, y, W, 18).fill('#f5f5f4');
  colsAdmin.forEach((c) => {
    doc.fillColor('#57534e').fontSize(8).font('Helvetica-Bold')
      .text(c.label, c.x + 3, y + 5, { width: c.w - 6, align: c.align ?? 'left' });
  });
  y += 18;

  for (let i = 0; i < dados.length; i++) {
    const bloco = dados[i];
    if (y > doc.page.height - 60) {
      doc.addPage(); y = 40;
      doc.rect(40, y, W, 18).fill('#f5f5f4');
      colsAdmin.forEach((c) => {
        doc.fillColor('#57534e').fontSize(8).font('Helvetica-Bold')
          .text(c.label, c.x + 3, y + 5, { width: c.w - 6, align: c.align ?? 'left' });
      });
      y += 18;
    }

    const bg = i % 2 === 0 ? '#ffffff' : '#fafaf9';
    doc.rect(40, y, W, 16).fill(bg);

    const percColor = bloco.percGeral >= 75 ? '#16a34a' : bloco.percGeral >= 50 ? '#d97706' : '#dc2626';
    const totAusentes = bloco.totTotal - bloco.totPresentes;

    doc.fillColor('#1c1917').fontSize(8).font('Helvetica')
      .text(bloco.continuacao.nome, 43, y + 4, { width: 194, ellipsis: true });
    doc.text(String(bloco.totalCriancas), colsAdmin[1].x + 3, y + 4, { width: colsAdmin[1].w - 6, align: 'center' });
    doc.text(String(bloco.totPresentes), colsAdmin[2].x + 3, y + 4, { width: colsAdmin[2].w - 6, align: 'center' });
    doc.text(String(totAusentes), colsAdmin[3].x + 3, y + 4, { width: colsAdmin[3].w - 6, align: 'center' });
    doc.text(String(bloco.totTotal), colsAdmin[4].x + 3, y + 4, { width: colsAdmin[4].w - 6, align: 'center' });
    doc.fillColor(percColor).text(`${bloco.percGeral}%`, colsAdmin[5].x + 3, y + 4, { width: colsAdmin[5].w - 6, align: 'center' });

    y += 16;
  }

  doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#e7e5e4').stroke();
  y += 18;

  // ── Rankings de continuações ───────────────────────────────────────────────
  const dadosComRegistro = dados.filter((b) => b.totTotal > 0);

  if (dadosComRegistro.length > 0) {
    const top5MaisFreq = [...dadosComRegistro].sort((a, b) => b.percGeral - a.percGeral).slice(0, 5);
    const top5MenosFreq = [...dadosComRegistro].sort((a, b) => a.percGeral - b.percGeral).slice(0, 5);

    const desenharRankingCont = (titulo, cor, lista) => {
      if (y > doc.page.height - 100) { doc.addPage(); y = 40; }
      doc.fillColor(cor).fontSize(10).font('Helvetica-Bold').text(titulo, 40, y);
      y += 15;

      for (let i = 0; i < lista.length; i++) {
        if (y > doc.page.height - 40) { doc.addPage(); y = 40; }
        const item = lista[i];
        const percColor = item.percGeral >= 75 ? '#16a34a' : item.percGeral >= 50 ? '#d97706' : '#dc2626';
        doc.fillColor('#44403c').fontSize(9).font('Helvetica')
          .text(`${i + 1}. ${item.continuacao.nome}`, 50, y, { continued: true })
          .text('  —  ', { continued: true })
          .fillColor(percColor)
          .text(`${item.percGeral}% presença`, { continued: true })
          .fillColor('#78716c')
          .text(`  (${item.totalCriancas} jovens, ${item.totTotal} registros)`);
        y += 14;
      }
      y += 8;
    };

    desenharRankingCont('Top 5 — Continuações mais frequentes', '#16a34a', top5MaisFreq);
    desenharRankingCont('Top 5 — Continuações menos frequentes', '#dc2626', top5MenosFreq);
  }

  // ── Rodapé ──────────────────────────────────────────────────────────────────
  doc.fillColor('#a8a29e').fontSize(8).font('Helvetica')
    .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 40, doc.page.height - 40, { align: 'right', width: W });

  doc.end();
};

module.exports = { gerarPdfContinuacao, gerarPdfGeral, gerarPdfAdministrativo };
