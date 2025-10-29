import { createWriteStream } from 'fs';
import archiver from 'archiver';

/**
 * Verilen dosya yollarını bir zip arşivine ekler ve zip dosyası oluşturur.
 * @param outputPath oluşturulacak zip dosyası yolu
 * @param files dosya yolu ve içerik bilgilerinin listesi
 */
export async function createZip(outputPath: string, files: { name: string; content: string | Buffer }[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }
    archive.finalize();
  });
}