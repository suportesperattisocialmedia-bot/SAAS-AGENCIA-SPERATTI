import { describe, expect, it } from 'vitest';
import { buildPreview, parseCsv, parseDate, parseNumber, TEMPLATE_CSV } from '../src/services/metricsImport';

describe('parseNumber', () => {
  it('entende formatos brasileiros e americanos e não inventa zero', () => {
    expect(parseNumber('1.234')).toBe(1234);
    expect(parseNumber('1,234')).toBe(1234);
    expect(parseNumber('1.234.567')).toBe(1234567);
    expect(parseNumber('12,5')).toBe(13);
    expect(parseNumber('2,3 mil')).toBe(2300);
    expect(parseNumber('0')).toBe(0);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('-')).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });
});

describe('parseDate', () => {
  it('converte dd/mm, mm/dd e ISO', () => {
    expect(parseDate('15/09/2026 10:30', true)).toBe('2026-09-15T13:30:00.000Z'); // 10:30 em Brasília
    expect(parseDate('16/09/2026 01:00', true)).toBe('2026-09-16T04:00:00.000Z'); // madrugada não volta um dia
    expect(parseDate('09/15/2026 10:30', false)).toBe('2026-09-15T13:30:00.000Z');
    expect(parseDate('2026-09-15T12:00:00Z', true)).toBe('2026-09-15T12:00:00.000Z');
    expect(parseDate('Lifetime', true)).toBeNull();
  });
});

describe('parseCsv', () => {
  it('lida com BOM, ponto e vírgula, aspas e quebra de linha dentro de célula', () => {
    const rows = parseCsv('﻿a;b;c\n"linha 1\nlinha 2";"com ""aspas""";3\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['linha 1\nlinha 2', 'com "aspas"', '3']
    ]);
  });
});

describe('buildPreview', () => {
  it('reconhece o export do Meta Business Suite em inglês e ignora a coluna Date="Lifetime"', () => {
    const csv = [
      'Post ID,Account ID,Account username,Description,Publish time,Permalink,Post type,Date,Views,Reach,Likes,Shares,Follows,Comments,Saves',
      '1790001,178,cliente,"Antes e depois, sala",09/16/2026 14:05,https://www.instagram.com/reel/ABC/,IG reel,Lifetime,"1,520",980,85,4,2,7,31',
      '1790002,178,cliente,Dicas de iluminação,09/12/2026 09:00,https://www.instagram.com/p/DEF/,IG carousel,Lifetime,,640,40,,0,3,12'
    ].join('\n');
    const preview = buildPreview(csv);
    expect(preview.posts).toHaveLength(2);
    expect(preview.posts[0]).toMatchObject({
      externalId: '1790001',
      publishedAt: '2026-09-16T17:05:00.000Z',
      format: 'Reels',
      views: 1520,
      reach: 980,
      likes: 85,
      shares: 4,
      comments: 7,
      saves: 31
    });
    expect(preview.posts[1]).toMatchObject({ format: 'Carrossel', views: null, shares: null });
    expect(preview.warnings).toEqual([]);
  });

  it('reconhece cabeçalhos em português com datas dd/mm', () => {
    const csv = [
      'Identificação da publicação;Descrição;Horário de publicação;Link permanente;Tipo de publicação;Visualizações;Alcance;Curtidas;Compartilhamentos;Comentários;Salvamentos',
      '555;Tour pela obra;15/09/2026 18:00;https://www.instagram.com/p/XYZ/;Imagem do IG;2.300;1.100;120;9;14;40'
    ].join('\n');
    const [post] = buildPreview(csv).posts;
    expect(post).toMatchObject({ externalId: '555', publishedAt: '2026-09-15T21:00:00.000Z', format: 'Foto', views: 2300, reach: 1100, saves: 40 });
  });

  it('aceita linhas coladas do Excel (tab) e avisa colunas ausentes', () => {
    const pasted = 'Data\tLink\tCurtidas\n10/09/2026\thttps://www.instagram.com/p/1/\t50\n';
    const preview = buildPreview(pasted);
    expect(preview.posts[0]).toMatchObject({ likes: 50, views: null, reach: null });
    expect(preview.warnings.join(' ')).toContain('Visualizações');
  });

  it('ignora linhas sem identificação (totais) e duplicadas', () => {
    const csv = 'Data;Link;Curtidas\n10/09/2026;https://x.com/p/1;5\n10/09/2026;https://x.com/p/1;5\n;;999\n';
    const preview = buildPreview(csv);
    expect(preview.posts).toHaveLength(1);
    expect(preview.skipped).toBe(2);
  });

  it('a planilha-modelo é reconhecida por inteiro', () => {
    const preview = buildPreview(TEMPLATE_CSV);
    expect(Object.keys(preview.mapping).sort()).toEqual(['caption', 'comments', 'likes', 'permalink', 'publishedAt', 'reach', 'saves', 'shares', 'type', 'views'].sort());
  });
});

describe('regras de honestidade da importação', () => {
  it('texto em coluna de métrica vira n/d, nunca 0 nem valor inventado', () => {
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1e9')).toBeNull();
    expect(parseNumber('-50')).toBeNull();
    expect(parseNumber('2,3 mil')).toBe(2300);
  });

  it('linha sem data válida é ignorada com aviso (não recebe a data de hoje)', () => {
    const csv = 'Data;Link;Curtidas\n10/09/2026;https://x.com/p/1;5\nsem data;https://x.com/p/2;7\n';
    const preview = buildPreview(csv);
    expect(preview.posts).toHaveLength(1);
    expect(preview.warnings.join(' ')).toContain('sem data de publicação válida');
  });

  it('só aceita links http(s)', () => {
    const csv = 'Data;Link;Curtidas\n10/09/2026;javascript:alert(1);5\n11/09/2026;https://www.instagram.com/p/OK/;7\n';
    const [a, b] = buildPreview(csv).posts;
    expect(a.permalink).toBeNull();
    expect(b.permalink).toBe('https://www.instagram.com/p/OK/');
  });
});
