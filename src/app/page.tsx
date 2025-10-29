"use client";
import { useState } from 'react';

interface MigrationResponse {
  file: string;
  error?: string;
}

type DbFields =
  | {
      type: 'mysql' | 'postgresql';
      fields: { host: string; port: string; user: string; password: string; database: string };
    }
  | {
      type: 'mssql';
      fields: {
        server: string;
        port: string;
        user: string;
        password: string;
        database: string;
        encrypt: boolean;
      };
    }
  | {
      type: 'mongodb';
      fields: { uri: string; database: string };
    }
  | {
      type: 'oracle';
      fields: { user: string; password: string; connectString: string };
    };

const defaultDbFields = {
  mysql: { host: '', port: '3306', user: '', password: '', database: '' },
  postgresql: { host: '', port: '5432', user: '', password: '', database: '' },
  mssql: {
    server: '',
    port: '1433',
    user: '',
    password: '',
    database: '',
    encrypt: false,
  },
  mongodb: { uri: '', database: '' },
  oracle: { user: '', password: '', connectString: '' },
};

export default function HomePage() {
  const [sourceType, setSourceType] = useState('mysql');
  const [targetType, setTargetType] = useState('mssql');
  const [fields, setFields] = useState<any>(defaultDbFields['mysql']);
  const [status, setStatus] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Alanlar her veritabanı türü değişiminde yeniden sıfırlanmalı
  const handleSourceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const t = e.target.value;
    setSourceType(t);
    setFields(defaultDbFields[t as keyof typeof defaultDbFields]);
  };
  const handleFieldChange = (field: string, value: string | boolean) => {
    setFields((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleSample = () => {
    // Örnek doldurma
    switch (sourceType) {
      case 'mysql':
        setFields({ host: 'localhost', port: '3306', user: 'root', password: 'password', database: 'mydb' });
        break;
      case 'postgresql':
        setFields({ host: 'localhost', port: '5432', user: 'postgres', password: 'password', database: 'mydb' });
        break;
      case 'mssql':
        setFields({ server: 'localhost', port: '1433', user: 'sa', password: 'password', database: 'mydb', encrypt: false });
        break;
      case 'mongodb':
        setFields({ uri: 'mongodb://localhost:27017', database: 'mydb' });
        break;
      case 'oracle':
        setFields({ user: 'system', password: 'oracle', connectString: 'localhost/XEPDB1' });
        break;
    }
  };
  const getConfigObj = () => {
    switch (sourceType) {
      case 'mysql':
      case 'postgresql':
        return {
          host: fields.host,
          port: parseInt(fields.port, 10),
          user: fields.user,
          password: fields.password,
          database: fields.database,
        };
      case 'mssql':
        return {
          server: fields.server,
          port: parseInt(fields.port, 10),
          user: fields.user,
          password: fields.password,
          database: fields.database,
          encrypt: Boolean(fields.encrypt),
        };
      case 'mongodb':
        return { uri: fields.uri, database: fields.database };
      case 'oracle':
        return { user: fields.user, password: fields.password, connectString: fields.connectString };
      default:
        return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Dönüştürme işlemi başlatılıyor...');
    setError('');
    setDownloadUrl('');
    let configObj = getConfigObj();
    try {
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: { type: sourceType, config: configObj }, target: { type: targetType } }),
      });
      const data: MigrationResponse = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Bilinmeyen hata');
      }
      setStatus('Dönüştürme tamamlandı.');
      const encoded = encodeURIComponent(data.file);
      setDownloadUrl(`/api/migrate?file=${encoded}`);
    } catch (err: any) {
      setError(err.message);
      setStatus('');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Veritabanı Dönüştürme Sihirbazı</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sourceType" className="block font-medium mb-1">
              Kaynak Veritabanı Tipi
            </label>
            <select
              id="sourceType"
              className="w-full border rounded px-3 py-2"
              value={sourceType}
              onChange={handleSourceTypeChange}
            >
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mssql">MSSQL</option>
              <option value="mongodb">MongoDB</option>
              <option value="oracle">Oracle</option>
            </select>
          </div>
          <div>
            <label htmlFor="targetType" className="block font-medium mb-1">
              Hedef Veritabanı Tipi
            </label>
            <select
              id="targetType"
              className="w-full border rounded px-3 py-2"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
            >
              <option value="mssql">MSSQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="oracle">Oracle</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block font-medium mb-1">Kaynak Bağlantı Ayarları</label>
          {/* Alanlar dinamik olarak gösterilecek */}
          {sourceType === 'mysql' || sourceType === 'postgresql' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Host"
                className="border rounded px-3 py-2 w-full"
                value={fields.host}
                onChange={(e) => handleFieldChange('host', e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Port"
                className="border rounded px-3 py-2 w-full"
                value={fields.port}
                onChange={(e) => handleFieldChange('port', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Kullanıcı Adı"
                className="border rounded px-3 py-2 w-full"
                value={fields.user}
                onChange={(e) => handleFieldChange('user', e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Şifre"
                className="border rounded px-3 py-2 w-full"
                value={fields.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Veritabanı Adı"
                className="border rounded px-3 py-2 w-full"
                value={fields.database}
                onChange={(e) => handleFieldChange('database', e.target.value)}
                required
              />
            </div>
          ) : null}
          {sourceType === 'mssql' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Server"
                className="border rounded px-3 py-2 w-full"
                value={fields.server}
                onChange={(e) => handleFieldChange('server', e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Port"
                className="border rounded px-3 py-2 w-full"
                value={fields.port}
                onChange={(e) => handleFieldChange('port', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Kullanıcı Adı"
                className="border rounded px-3 py-2 w-full"
                value={fields.user}
                onChange={(e) => handleFieldChange('user', e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Şifre"
                className="border rounded px-3 py-2 w-full"
                value={fields.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Veritabanı Adı"
                className="border rounded px-3 py-2 w-full"
                value={fields.database}
                onChange={(e) => handleFieldChange('database', e.target.value)}
                required
              />
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={fields.encrypt}
                  onChange={(e) => handleFieldChange('encrypt', e.target.checked)}
                />
                Encrypt
              </label>
            </div>
          )}
          {sourceType === 'mongodb' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="URI"
                className="border rounded px-3 py-2 w-full"
                value={fields.uri}
                onChange={(e) => handleFieldChange('uri', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Veritabanı Adı"
                className="border rounded px-3 py-2 w-full"
                value={fields.database}
                onChange={(e) => handleFieldChange('database', e.target.value)}
                required
              />
            </div>
          )}
          {sourceType === 'oracle' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Kullanıcı Adı"
                className="border rounded px-3 py-2 w-full"
                value={fields.user}
                onChange={(e) => handleFieldChange('user', e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Şifre"
                className="border rounded px-3 py-2 w-full"
                value={fields.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Bağlantı Dizesi (Connect String)"
                className="border rounded px-3 py-2 w-full"
                value={fields.connectString}
                onChange={(e) => handleFieldChange('connectString', e.target.value)}
                required
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleSample}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Örnek ayarları doldur
          </button>
        </div>
        <div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Başlat
          </button>
        </div>
      </form>
      {status && <div className="mt-4 text-green-600">{status}</div>}
      {error && <div className="mt-4 text-red-600">Hata: {error}</div>}
      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            className="text-blue-600 underline"
          >
            Dönüştürülen paketi indir
          </a>
        </div>
      )}
      <div className="mt-8 p-4 border rounded bg-yellow-50 text-yellow-700 text-sm">
        <h3 className="font-semibold mb-2">Nasıl kullanılır?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kaynak veritabanı türünü seçin ve bağlantı bilgilerini form olarak girin.</li>
          <li>Hedef veritabanı türünü seçin.</li>
          <li>“Başlat” butonuna tıklayın. Dönüştürme tamamlandığında bir indirme bağlantısı görüntülenecektir.</li>
          <li>İndirilen arşivdeki <code>schema.sql</code> dosyasını hedef veritabanında çalıştırın ve CSV dosyalarını içe aktarın.</li>
        </ul>
      </div>
    </div>
  );
}