"use client"
import { useState } from "react"
import type React from "react"

import {
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Play,
  Settings,
  History,
  Zap,
  Shield,
  Clock,
  FileText,
  ChevronRight,
  TestTube,
} from "lucide-react"

interface MigrationResponse {
  file: string
  error?: string
}

type DbType = "mysql" | "postgresql" | "mssql" | "mongodb" | "oracle"

const defaultDbFields = {
  mysql: { host: "", port: "3306", user: "", password: "", database: "" },
  postgresql: { host: "", port: "5432", user: "", password: "", database: "" },
  mssql: {
    server: "",
    port: "1433",
    user: "",
    password: "",
    database: "",
    encrypt: false,
  },
  mongodb: { uri: "", database: "" },
  oracle: { user: "", password: "", connectString: "" },
}

const dbIcons: Record<DbType, string> = {
  mysql: "🐬",
  postgresql: "🐘",
  mssql: "🗄️",
  mongodb: "🍃",
  oracle: "🔶",
}

const dbNames: Record<DbType, string> = {
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  mssql: "MS SQL Server",
  mongodb: "MongoDB",
  oracle: "Oracle",
}

export default function HomePage() {
  const [step, setStep] = useState(1)
  const [sourceType, setSourceType] = useState<DbType>("mysql")
  const [targetType, setTargetType] = useState<DbType>("mssql")
  const [fields, setFields] = useState<any>(defaultDbFields["mysql"])
  const [status, setStatus] = useState<string>("")
  const [downloadUrl, setDownloadUrl] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [connectionTested, setConnectionTested] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"success" | "error" | "">("")
  const [connectionMessage, setConnectionMessage] = useState<string>("")

  const handleSourceTypeChange = (type: DbType) => {
    setSourceType(type)
    setFields(defaultDbFields[type])
    setConnectionTested(false)
  }

  const handleFieldChange = (field: string, value: string | boolean) => {
    setFields((prev: any) => ({ ...prev, [field]: value }))
    setConnectionTested(false)
  }

  const handleSample = () => {
    switch (sourceType) {
      case "mysql":
        setFields({ host: "localhost", port: "3306", user: "root", password: "password", database: "mydb" })
        break
      case "postgresql":
        setFields({ host: "localhost", port: "5432", user: "postgres", password: "password", database: "mydb" })
        break
      case "mssql":
        setFields({
          server: "localhost",
          port: "1433",
          user: "sa",
          password: "password",
          database: "mydb",
          encrypt: false,
        })
        break
      case "mongodb":
        setFields({ uri: "mongodb://localhost:27017", database: "mydb" })
        break
      case "oracle":
        setFields({ user: "system", password: "oracle", connectString: "localhost/XEPDB1" })
        break
    }
  }

  const testConnection = async () => {
    setTestingConnection(true)
    setError("")
    setConnectionMessage("")

    const cfg = getConfigObj()
    const missing: string[] = []
    switch (sourceType) {
      case "mysql":
      case "postgresql": {
        if (!cfg.host) missing.push("host")
        if (!cfg.port) missing.push("port")
        if (!cfg.user) missing.push("user")
        if (!cfg.database) missing.push("database")
        break
      }
      case "mssql": {
        if (!cfg.server) missing.push("server")
        if (!cfg.port) missing.push("port")
        if (!cfg.user) missing.push("user")
        if (!cfg.database) missing.push("database")
        break
      }
      case "mongodb": {
        if (!cfg.uri) missing.push("uri")
        if (!cfg.database) missing.push("database")
        break
      }
      case "oracle": {
        if (!cfg.user) missing.push("user")
        if (!cfg.password) missing.push("password")
        if (!cfg.connectString) missing.push("connectString")
        break
      }
    }

    if (missing.length) {
      setConnectionStatus("error")
      setConnectionMessage(`Eksik alanlar: ${missing.join(", ")}`)
      setTestingConnection(false)
      setConnectionTested(false)
      return
    }

    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: sourceType, config: cfg }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Bağlantı başarısız")
      }
      setConnectionStatus("success")
      setConnectionMessage(data.message || "Bağlantı başarılı")
      setConnectionTested(true)
    } catch (e: any) {
      setConnectionStatus("error")
      setConnectionMessage(e.message || "Bağlantı kurulamadı")
      setConnectionTested(false)
    } finally {
      setTestingConnection(false)
    }
  }

  const getConfigObj = () => {
    switch (sourceType) {
      case "mysql":
      case "postgresql":
        return {
          host: fields.host,
          port: Number.parseInt(fields.port, 10),
          user: fields.user,
          password: fields.password,
          database: fields.database,
        }
      case "mssql":
        return {
          server: fields.server,
          port: Number.parseInt(fields.port, 10),
          user: fields.user,
          password: fields.password,
          database: fields.database,
          encrypt: Boolean(fields.encrypt),
        }
      case "mongodb":
        return { uri: fields.uri, database: fields.database }
      case "oracle":
        return { user: fields.user, password: fields.password, connectString: fields.connectString }
      default:
        return {}
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setStatus("Dönüştürme işlemi başlatılıyor...")
    setError("")
    setDownloadUrl("")
    const configObj = getConfigObj()
    try {
      const res = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: { type: sourceType, config: configObj }, target: { type: targetType } }),
      })
      const data: MigrationResponse = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Bilinmeyen hata")
      }
      setStatus("Dönüştürme tamamlandı!")
      const encoded = encodeURIComponent(data.file)
      setDownloadUrl(`/api/migrate?file=${encoded}`)
      setStep(4)
    } catch (err: any) {
      setError(err.message)
      setStatus("")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Database className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-balance">DataFlow Pro</h1>
                <p className="text-xs text-muted-foreground">Veritabanı Geçiş Platformu</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <History className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: "Kaynak Seçimi" },
              { num: 2, label: "Bağlantı Ayarları" },
              { num: 3, label: "Hedef Seçimi" },
              { num: 4, label: "Dönüştürme" },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      step >= s.num
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <span className="text-xs mt-2 text-muted-foreground">{s.label}</span>
                </div>
                {idx < 3 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-all ${step > s.num ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Source Selection */}
            {step === 1 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
                <h2 className="text-2xl font-bold mb-2 text-balance">Kaynak Veritabanını Seçin</h2>
                <p className="text-muted-foreground mb-6">Verilerinizi hangi veritabanından aktarmak istiyorsunuz?</p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {(Object.keys(dbNames) as DbType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSourceTypeChange(type)}
                      className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                        sourceType === type
                          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                          : "border-border bg-secondary/50 hover:border-primary/50"
                      }`}
                    >
                      <div className="text-4xl mb-2">{dbIcons[type]}</div>
                      <div className="text-sm font-medium">{dbNames[type]}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    Devam Et
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Connection Settings */}
            {step === 2 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-balance">Bağlantı Ayarları</h2>
                    <p className="text-muted-foreground">
                      {dbIcons[sourceType]} {dbNames[sourceType]} bağlantı bilgilerini girin
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSample}
                    className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    <Zap className="w-4 h-4" />
                    Örnek Doldur
                  </button>
                </div>

                <div className="space-y-4">
                  {sourceType === "mysql" || sourceType === "postgresql" ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Host</label>
                          <input
                            type="text"
                            placeholder="localhost"
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.host}
                            onChange={(e) => handleFieldChange("host", e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Port</label>
                          <input
                            type="number"
                            placeholder={sourceType === "mysql" ? "3306" : "5432"}
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.port}
                            onChange={(e) => handleFieldChange("port", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Kullanıcı Adı</label>
                          <input
                            type="text"
                            placeholder="username"
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.user}
                            onChange={(e) => handleFieldChange("user", e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Şifre</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.password}
                            onChange={(e) => handleFieldChange("password", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Veritabanı Adı</label>
                        <input
                          type="text"
                          placeholder="database_name"
                          className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          value={fields.database}
                          onChange={(e) => handleFieldChange("database", e.target.value)}
                          required
                        />
                      </div>
                    </>
                  ) : null}

                  {sourceType === "mssql" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Server</label>
                          <input
                            type="text"
                            placeholder="localhost"
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.server}
                            onChange={(e) => handleFieldChange("server", e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Port</label>
                          <input
                            type="number"
                            placeholder="1433"
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.port}
                            onChange={(e) => handleFieldChange("port", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Kullanıcı Adı</label>
                          <input
                            type="text"
                            placeholder="sa"
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.user}
                            onChange={(e) => handleFieldChange("user", e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Şifre</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.password}
                            onChange={(e) => handleFieldChange("password", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Veritabanı Adı</label>
                        <input
                          type="text"
                          placeholder="database_name"
                          className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          value={fields.database}
                          onChange={(e) => handleFieldChange("database", e.target.value)}
                          required
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fields.encrypt}
                          onChange={(e) => handleFieldChange("encrypt", e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm">SSL/TLS Şifreleme Kullan</span>
                      </label>
                    </>
                  )}

                  {sourceType === "mongodb" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Connection URI</label>
                        <input
                          type="text"
                          placeholder="mongodb://localhost:27017"
                          className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          value={fields.uri}
                          onChange={(e) => handleFieldChange("uri", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Veritabanı Adı</label>
                        <input
                          type="text"
                          placeholder="database_name"
                          className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          value={fields.database}
                          onChange={(e) => handleFieldChange("database", e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {sourceType === "oracle" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Kullanıcı Adı</label>
                          <input
                            type="text"
                            placeholder="system"
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.user}
                            onChange={(e) => handleFieldChange("user", e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Şifre</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            value={fields.password}
                            onChange={(e) => handleFieldChange("password", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Connect String</label>
                        <input
                          type="text"
                          placeholder="localhost/XEPDB1"
                          className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          value={fields.connectString}
                          onChange={(e) => handleFieldChange("connectString", e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Connection Test */}
                <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TestTube className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Bağlantı Testi</p>
                        <p className="text-xs text-muted-foreground">Ayarlarınızı doğrulayın</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={testConnection}
                      disabled={testingConnection}
                      className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Test Ediliyor...
                        </>
                      ) : connectionTested ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          Başarılı
                        </>
                      ) : (
                        "Bağlantıyı Test Et"
                      )}
                    </button>
                  </div>
                  {connectionStatus === "success" && (
                    <div className="mt-4 p-3 bg-success/20 rounded-lg border border-success/30 text-success text-sm">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {connectionMessage}
                    </div>
                  )}
                  {connectionStatus === "error" && (
                    <div className="mt-4 p-3 bg-destructive/20 rounded-lg border border-destructive/30 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {connectionMessage}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Geri
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    Devam Et
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Target Selection */}
            {step === 3 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
                <h2 className="text-2xl font-bold mb-2 text-balance">Hedef Veritabanını Seçin</h2>
                <p className="text-muted-foreground mb-6">Verilerinizi hangi veritabanına aktarmak istiyorsunuz?</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(["mssql", "postgresql", "mysql", "oracle"] as DbType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTargetType(type)}
                      className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                        targetType === type
                          ? "border-accent bg-accent/10 shadow-lg shadow-accent/20"
                          : "border-border bg-secondary/50 hover:border-accent/50"
                      }`}
                    >
                      <div className="text-4xl mb-2">{dbIcons[type]}</div>
                      <div className="text-sm font-medium">{dbNames[type]}</div>
                    </button>
                  ))}
                </div>

                {/* Migration Summary */}
                <div className="mt-8 p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5" />
                    Dönüştürme Özeti
                  </h3>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="text-4xl mb-2">{dbIcons[sourceType]}</div>
                      <div className="text-sm font-medium">{dbNames[sourceType]}</div>
                      <div className="text-xs text-muted-foreground mt-1">Kaynak</div>
                    </div>
                    <ArrowRight className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <div className="text-4xl mb-2">{dbIcons[targetType]}</div>
                      <div className="text-sm font-medium">{dbNames[targetType]}</div>
                      <div className="text-xs text-muted-foreground mt-1">Hedef</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Geri
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/30"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Dönüştürmeyi Başlat
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Processing/Complete */}
            {step === 4 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
                {isProcessing ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 relative">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                      <Database className="w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Dönüştürme İşlemi Devam Ediyor</h3>
                    <p className="text-muted-foreground mb-6">{status}</p>
                    <div className="max-w-md mx-auto">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-accent animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                ) : downloadUrl ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-success" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Dönüştürme Tamamlandı!</h3>
                    <p className="text-muted-foreground mb-8">Veritabanınız başarıyla dönüştürüldü.</p>

                    <a
                      href={downloadUrl}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/30"
                    >
                      <Download className="w-5 h-5" />
                      Dönüştürülen Paketi İndir
                    </a>

                    <div className="mt-8 p-4 bg-secondary/50 rounded-lg border border-border text-left max-w-2xl mx-auto">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Paket İçeriği
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-success flex-shrink-0" />
                          <span>
                            <code className="text-foreground">schema.sql</code> - Hedef veritabanında çalıştırılacak DDL
                            komutları
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-success flex-shrink-0" />
                          <span>Her tablo için CSV dosyaları - Veri aktarımı için</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-success flex-shrink-0" />
                          <span>
                            <code className="text-foreground">README.md</code> - Kurulum talimatları
                          </span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStep(1)
                        setDownloadUrl("")
                        setStatus("")
                        setConnectionTested(false)
                      }}
                      className="mt-6 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                    >
                      Yeni Dönüştürme Başlat
                    </button>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
                      <AlertCircle className="w-10 h-10 text-destructive" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Bir Hata Oluştu</h3>
                    <p className="text-muted-foreground mb-8">{error}</p>

                    <button
                      type="button"
                      onClick={() => {
                        setStep(2)
                        setError("")
                      }}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Ayarları Düzenle
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </form>

          {/* Features Grid */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="p-6 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Hızlı Dönüştürme</h3>
                <p className="text-sm text-muted-foreground">
                  Gelişmiş algoritmalarla saniyeler içinde veritabanı dönüştürme
                </p>
              </div>
              <div className="p-6 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">Güvenli İşlem</h3>
                <p className="text-sm text-muted-foreground">Verileriniz şifrelenir ve güvenli bir şekilde işlenir</p>
              </div>
              <div className="p-6 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold mb-2">7/24 Erişim</h3>
                <p className="text-sm text-muted-foreground">İstediğiniz zaman, istediğiniz yerden dönüştürme yapın</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-border bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DataFlow Pro. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Dokümantasyon
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                API
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Destek
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
