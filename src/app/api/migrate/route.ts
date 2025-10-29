import { NextRequest, NextResponse } from 'next/server';
import { createConnector } from '../../../connectors';
import { generateDDL } from '@/generators/ddl';
import { createZip } from '@/utils/zip';
import { writeFile, mkdtemp, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, basename } from 'path';

/**
 * API endpoint: POST /api/migrate
 * Body: { source: { type: string, config: any }, target: { type: string } }
 * Döndürülen değer: { file: string } – oluşturulan zip dosyasının temp yolunu belirtir.
 */
export async function POST(req: NextRequest) {
  try {
    const { source, target } = await req.json();
    if (!source || !target) {
      return NextResponse.json({ error: 'Geçersiz parametreler' }, { status: 400 });
    }
    const srcConnector = await createConnector({ type: source.type, config: source.config });
    await srcConnector.connect();
    const schema = await srcConnector.getSchema();
    // Create DDL for target
    const ddl = generateDDL(schema, target.type);
    const files: { name: string; content: string | Buffer }[] = [];
    files.push({ name: 'schema.sql', content: ddl });
    // Export data per table to CSV
    for (const table of schema.tables) {
      const cols = table.columns.map((c) => c.name);
      let csv = '';
      csv += cols.join(',') + '\n';
      for await (const row of srcConnector.exportTable(table.name)) {
        const line = cols
          .map((col) => {
            const value = (row as any)[col];
            if (value === null || value === undefined) return '';
            // Escape double quotes and wrap in quotes if necessary
            const str = String(value).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',');
        csv += line + '\n';
      }
      files.push({ name: `${table.name}.csv`, content: csv });
    }
    await srcConnector.close();
    // Create temporary directory
    const tmpDir = await mkdtemp(join(tmpdir(), 'migration-'));
    // YENİ: daha anlamlı zip ismi
    function safeName(s: string) {
      return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    const srcDb = safeName(schema.dbName || source.config.database || source.type);
    const tgtDb = safeName(target.type);
    const zipName = `${srcDb}_db_${tgtDb}_${Date.now()}.zip`;
    const zipPath = join(tmpDir, zipName);
    await createZip(zipPath, files);
    // Return relative path for downloading via GET
    return NextResponse.json({ file: zipPath });
  } catch (error: any) {
    console.error('Migration error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * API endpoint: GET /api/migrate
 * Query: file=tmpFilePath
 * Zip dosyasını indirmenizi sağlar.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('file');
  if (!filePath) {
    return new NextResponse('Dosya parametresi eksik', { status: 400 });
  }
  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${basename(filePath)}"`,
      },
    });
  } catch (err: any) {
    return new NextResponse(`Dosya okunamadı: ${err.message}`, { status: 500 });
  }
}
