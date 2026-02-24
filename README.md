# Prompterest

AI destekli prompt yönetim ve keşif uygulaması. Image-generation promptlarını kaydet, paylaş, AI ile yeniden yaz ve sürüm geçmişini takip et.

**Canlı:** https://www.sinanakcan.com/prompterest

---

## Özellikler

- **Feed** — Herkese açık promptları TikTok tarzı dikey scroll ile keşfet
- **AI Refactor** — LLM ile promptun belirli ifadelerini alternatiflerle değiştir
- **Image Generation** — FLUX.1-schnell ile promptu görselleştir
- **Versiyon Geçmişi** — Her kaydetme yeni versiyon oluşturur, geçmişe dönülebilir
- **Koleksiyon** — Beğenilen promptları bookmarkla

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React + Vite + Tailwind + Framer Motion |
| Backend | Node.js + Hono.js |
| ORM | Drizzle ORM |
| Database | Neon Cloud PostgreSQL (serverless) |
| Auth | JWT (jose, 30 gün) |
| LLM | OpenRouter (primary) + HuggingFace (fallback) |
| Image Gen | HuggingFace FLUX.1-schnell |
| Deploy | Docker + Nginx (VPS) |

## Kurulum

```bash
# Backend
cd backend
cp ../.env.example .env   # değerleri doldur
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

`.env.example` dosyasında gerekli environment variable'lar açıklanmıştır.

## Mimari

```
sinanakcan.com (Vercel) → /prompterest/* rewrite → VPS
                                                      │
                                              Nginx (port 80)
                                              ├── /*     → React SPA
                                              └── /api/* → Hono.js backend
                                                               │
                                                         Neon Cloud PostgreSQL
```

## Veritabanı

4 tablo: `users`, `prompts`, `prompt_versions`, `saved_prompts`

Her prompt oluşturulduğunda otomatik `v1` versiyonu oluşur. "Apply → New Version" ile yeni versiyon eklenir, geçmişe her zaman ulaşılabilir.

## AI Entegrasyonu

**Refactor:** OpenRouter API (birincil) → HuggingFace Router (fallback: Llama-3.1-8B, Qwen3-Coder, DeepSeek-V3)

**Image:** HuggingFace Inference API — `black-forest-labs/FLUX.1-schnell`

AI çağrıları tamamen frontend tarafında yapılır; API key'ler Vite build-time'da bundle'a gömülür.

## Dökümantasyon

Detaylı dökümantasyon için [DOCUMENTATION.md](./DOCUMENTATION.md) dosyasına bakınız.
