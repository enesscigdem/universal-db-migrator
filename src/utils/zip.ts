import 'server-only'
import { createWriteStream } from 'fs';

/**
 * Verilen dosya yollarını bir zip arşivine ekler ve zip dosyası oluşturur.
 * @param outputPath oluşturulacak zip dosyası yolu
 * @param files dosya yolu ve içerik bilgilerinin listesi
 */
export async function createZip(outputPath: string, files: { name: string; content: string | Buffer }[]): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const output = createWriteStream(outputPath);
    let archiverFactory: any;
    try {
      const mod = await import('archiver');
      archiverFactory = (mod as any).default ?? mod;
    } catch (err: any) {
      const help = 'Archiver kütüphanesi bulunamadı. Lütfen `npm install archiver` komutunu çalıştırın.';
      err.message = `${help} Ayrıntı: ${err.message}`;
      reject(err);
      return;
    }
    const archive = archiverFactory('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', (err: unknown) => reject(err));
    archive.pipe(output);
    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }
    archive.finalize();
  });
}
