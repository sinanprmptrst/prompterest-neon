# Prompterest — Proje Dökümantasyonu

> AI destekli prompt yönetim ve keşif uygulaması. Kullanıcılar image-generation promptlarını kaydeder, paylaşır, AI ile yeniden yazar ve sürüm geçmişlerini takip eder.

---

## İçindekiler

1. [Proje Genel Bakış](#1-proje-genel-bakış)
2. [Mimari & Deploy](#2-mimari--deploy)
3. [Docker & Containerization](#3-docker--containerization)
4. [Backend Nasıl Çalışır](#4-backend-nasıl-çalışır)
5. [Frontend Nasıl Çalışır](#5-frontend-nasıl-çalışır)
6. [Veritabanı Yapısı](#6-veritabanı-yapısı)
7. [Kullanılan Modeller ve AI Entegrasyonu](#7-kullanılan-modeller-ve-ai-entegrasyonu)
8. [Ekranlar ve Paneller](#8-ekranlar-ve-paneller)
9. [Butonların Çalışma Mantığı](#9-butonların-çalışma-mantığı)
10. [User Flow](#10-user-flow)
11. [API Referansı](#11-api-referansı)

---

## 1. Proje Genel Bakış

Prompterest, Midjourney, DALL-E, Stable Diffusion gibi image-generation araçları için yazılan promptların yönetildiği bir platformdur. Temel özellikler:

- **Keşif Feed'i** — Herkese açık promptları TikTok tarzı dikey scroll ile görüntüle
- **AI Refactor** — LLM kullanarak promptun belirli kelime/ifadelerini alternatiflerle değiştir
- **Image Generation** — Promptu görsel olarak test et (FLUX.1-schnell modeli)
- **Sürüm Geçmişi** — Her kaydetme yeni bir versiyon oluşturur, geri alınabilir
- **Kayıt & Koleksiyon** — Beğenilen promptları bookmarkla

---

## 2. Mimari & Deploy

### Genel Akış

```
Kullanıcı
   │
   ▼
sinanakcan.com (Vercel / Next.js)
   │  /prompterest/* → rewrite
   ▼
VPS: 87.106.219.54
   │
   ▼
Nginx (Docker, port 80)
   ├── /* → sinan-frontend:80 (React SPA)
   └── /api/* → sinan-backend:3000 (Hono.js)
                      │
                      ▼
               Neon Cloud PostgreSQL
```

### Bileşenler

| Bileşen | Teknoloji | Nerede |
|---------|-----------|--------|
| Frontend | React + Vite + Tailwind | Docker container (sinan-frontend) |
| Backend | Node.js + Hono.js | Docker container (sinan-backend) |
| Database | PostgreSQL | Neon Cloud (serverless, dışarıda) |
| Reverse Proxy | Nginx | Docker container |
| Domain | Vercel (Next.js rewrite) | sinanakcan.com |

### Neden Bu Mimari?

- **Neon Cloud**: Serverless PostgreSQL, sıfır yönetim, otomatik uyku/uyanma. Veritabanı için ayrı container veya VPS gerektirmez.
- **Docker**: Frontend ve backend ayrı container'larda → bağımsız güncelleme.
- **Vercel Rewrite**: sinanakcan.com ana domain'i altında `/prompterest` path'iyle servis edilir, farklı subdomain gerektirmez.

---

## 3. Docker & Containerization

Proje iki ayrı Docker container'dan oluşur. Her ikisi de **multi-stage build** kullanır — build araçları final image'a dahil edilmez, image boyutu küçük kalır.

### Backend Dockerfile

```
Stage 1 (builder): node:20-alpine
  ├── npm install          ← tüm bağımlılıklar (devDependencies dahil)
  ├── npm run build        ← TypeScript → JavaScript (dist/)
  └── çıktı: dist/

Stage 2 (production): node:20-alpine
  ├── dist/ kopyalanır
  ├── npm install --omit=dev  ← sadece prod bağımlılıkları
  └── CMD: node dist/src/index.js
```

Build araçları (tsc, ts-node vb.) final image'da olmaz. Sadece derlenmiş JS ve runtime bağımlılıkları kalır.

### Frontend Dockerfile

```
Stage 1 (builder): node:20-alpine
  ├── npm install
  ├── ARG VITE_* ← API key'ler build argümanı olarak alınır
  ├── ENV VITE_API_URL=/prompterest
  ├── npm run build:web  ← Vite → statik HTML/CSS/JS (web/)
  └── çıktı: web/

Stage 2 (serve): nginx:alpine
  ├── web/ → /usr/share/nginx/html  ← statik dosyalar nginx'e kopyalanır
  └── nginx.conf → /etc/nginx/conf.d/default.conf
```

**Neden API key'ler ARG olarak alınır?**
Vite, environment variable'ları build sırasında JavaScript bundle'ına gömer (`import.meta.env.VITE_*`). Yani key'lerin build anında bilinmesi gerekir — container çalışırken env var olarak verilmesi çalışmaz.

### Frontend nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;

    # SPA fallback — tüm route'lar index.html'e düşer
    location / {
        try_files $uri $uri/ /index.html;
    }

    # /api/* → backend container (Docker internal DNS)
    location /api/ {
        proxy_pass http://backend:3000;
    }
}
```

React SPA'da URL yenileme (`/prompterest/saved` gibi) index.html'e düşürülür, React Router devralır. `/api/*` istekleri ise `backend` hostname'ine yönlendirilir — bu isim Docker Compose'un internal DNS'inden çözümlenir.

### docker-compose.yml

```
services:
  backend  → sinan-internal ağına bağlı, dışarıya kapalı (expose: 3000)
  frontend → nginx-proxy + sinan-internal ağlarına bağlı (expose: 80)

networks:
  nginx-proxy    → external (VPS'teki global nginx buradan erişir)
  sinan-internal → bridge (frontend ↔ backend arası iletişim)
```

**İki ağın rolü:**
- `sinan-internal`: Frontend container'ı `/api/*` isteklerini `http://backend:3000`'e iletir. Backend dışarıdan erişilemez.
- `nginx-proxy`: VPS'teki global nginx reverse proxy, frontend container'ı bu ağ üzerinden bulur ve trafiği yönlendirir.

### Build & Deploy Akışı

```
1. Lokal → docker compose build
           (API key'ler .env'den ARG olarak geçer)

2. Lokal → docker save | gzip → frontend.tar.gz / backend.tar.gz

3. Lokal → tar.gz dosyaları SSH ile VPS'e gönderilir

4. VPS   → docker load < frontend.tar.gz
         → docker compose down && docker compose up -d
```

Docker Hub veya registry kullanılmaz. Image'lar tar arşivi olarak taşınır.

---

## 4. Backend Nasıl Çalışır

### Teknoloji Stack

- **Runtime**: Node.js
- **Framework**: [Hono.js](https://hono.dev/) — Express'e benzer, ancak çok daha hafif ve TypeScript-native
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) — tip güvenli SQL sorguları
- **Auth**: JWT (jose kütüphanesi, HS256 algoritması, 30 gün geçerlilik)
- **Şifreleme**: SHA-256 + random salt (Node.js native `crypto` modülü)

### Klasör Yapısı

```
backend/src/
├── index.ts          ← Hono app başlangıcı, route kayıtları
├── db/
│   ├── index.ts      ← Neon bağlantısı (drizzle instance)
│   └── schema.ts     ← Tablo tanımları (users, prompts, promptVersions, savedPrompts)
└── routes/
    ├── auth.ts       ← /api/auth/register, /api/auth/login
    └── prompts.ts    ← /api/prompts/* (CRUD + save/unsave + versions)
```

### Neon Bağlantısı (`db/index.ts`)

```
DATABASE_URL (env) → neon() → drizzle()
```

Neon'un serverless sürücüsü kullanılır. HTTP üzerinden bağlantı kurduğu için WebSocket gerektirmez, Vercel/Edge ortamlarında da çalışır.

### Auth Sistemi

1. **Register**: Email + username + password → sha256(password + salt) → DB'ye kayıt → JWT döner
2. **Login**: Email + password → DB'den hash çek → verify → JWT döner
3. **Korumalı endpoint'ler**: `Authorization: Bearer <token>` header'ı → `verifyToken()` → userId
4. **Token süresi**: 30 gün (JWT exp claim)

Şifre hash formatı: `{16-byte-hex-salt}:{sha256-hex-hash}`

---

## 5. Frontend Nasıl Çalışır

### Teknoloji Stack

- **Framework**: React 18
- **Build**: Vite (`vite.config.web.ts` — web için özel config)
- **Styling**: Tailwind CSS (custom renk paleti: surface-0, accent-violet, accent-emerald, accent-amber, accent-cyan, accent-rose)
- **Animasyon**: Framer Motion (sayfa geçişleri, swipe, panel açılımları)
- **State**: Zustand (`frontend/src/store/useStore.ts`)
- **Deploy**: nginx container içinde statik SPA olarak serve edilir

### Build Konfigürasyonu

`vite.config.web.ts` kullanılır (`npm run build:web`):
- `base: '/prompterest'` — tüm asset URL'leri `/prompterest/` prefix'i ile başlar
- `VITE_API_URL=/prompterest` — API istekleri `/prompterest/api/*` olarak gider

### Routing (SPA)

Sayfa yönlendirmesi URL tabanlı değil, **Zustand state tabanlı**dır:

```
activeTab: 'feed' | 'saved' | 'profile'
editorPromptId: string | null      ← editor açık mı?
newPromptOpen: boolean             ← yeni prompt formu açık mı?
```

`App.tsx` bu state'e göre hangi ekranı göstereceğine karar verir. Overlay ekranlar (`AnimatePresence`) diğerlerinin üzerine açılır.

### State Yönetimi (Zustand)

| State | Açıklama |
|-------|----------|
| `user` | Giriş yapan kullanıcı (null = misafir) |
| `prompts` | Feed'deki tüm promptlar |
| `savedPromptIds` | Kullanıcının kaydettiği prompt ID'leri (Set) |
| `activeTab` | Aktif tab (feed/saved/profile) |
| `editorPromptId` | Açık prompt editörünün ID'si |
| `activeVersionId` | Feed'de seçili versiyon (sürüm geçmişinden) |
| `versionHistory` | RightPanel için yüklenen versiyon listesi |

---

## 6. Veritabanı Yapısı

**Veritabanı**: Neon Cloud PostgreSQL (serverless)
**ORM**: Drizzle ORM (schema-first, tip güvenli)

### Tablolar

#### `users`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | UUID (PK) | Auto-generated |
| email | TEXT (UNIQUE) | Giriş için |
| username | TEXT (UNIQUE) | Görünen ad |
| password_hash | TEXT | `salt:sha256hash` formatı |
| avatar | TEXT | Avatar URL (opsiyonel) |
| created_at | TIMESTAMP | Kayıt tarihi |

#### `prompts`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK→users) | Sahibi, cascade delete |
| title | TEXT | Prompt başlığı |
| content | TEXT | Prompt metni |
| image_url | TEXT | Base64 data URL (Neon'da saklanır) |
| tags | TEXT[] | Tag listesi |
| is_public | BOOLEAN | Feed'de görünsün mü? (default: true) |
| current_version_id | UUID | Aktif versiyon ID'si |
| created_at | TIMESTAMP | — |
| updated_at | TIMESTAMP | — |

#### `prompt_versions`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | UUID (PK) | Auto-generated |
| prompt_id | UUID (FK→prompts) | Ait olduğu prompt, cascade delete |
| content | TEXT | Bu versiyondaki prompt metni |
| image_url | TEXT | Bu versiyona ait görsel |
| version_name | TEXT | `v1`, `v2`, `v3`... |
| created_at | TIMESTAMP | — |

#### `saved_prompts`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK→users) | Kaydeden kullanıcı |
| prompt_id | UUID (FK→prompts) | Kaydedilen prompt |
| created_at | TIMESTAMP | — |

### İlişkiler

```
users
  ├── prompts (1:N) — bir kullanıcının birden fazla prompt'u
  │     └── prompt_versions (1:N) — bir prompt'un birden fazla versiyonu
  └── saved_prompts (1:N) — kullanıcının bookmarkları
```

### Sürümleme Mantığı

Prompt oluşturulduğunda otomatik olarak `v1` versiyonu da oluşturulur ve `current_version_id` güncellenir. Kullanıcı "Apply → New Version" dediğinde yeni bir `prompt_versions` satırı eklenir ve `current_version_id` güncellenir. Tüm geçmişe RightPanel'den erişilebilir.

### Görsel Saklama

Görseller **base64 data URL** olarak doğrudan Neon PostgreSQL'de saklanır (`image_url` kolonu). Ayrı bir dosya sunucusu (S3, Cloudinary vb.) kullanılmaz.

---

## 7. Kullanılan Modeller ve AI Entegrasyonu

AI özellikleri **tamamen frontend tarafında** çalışır — backend AI çağrısı yapmaz. API key'ler Vite environment variable olarak build'e gömülür.

### LLM (Prompt Refactor)

**Sağlayıcı 1: OpenRouter** (birincil)

- API URL: `https://openrouter.ai/api/v1/chat/completions`
- Default model: `nvidia/nemotron-3-nano-30b-a3b:free`
- Env var: `VITE_OPENROUTER_KEY`, `VITE_CHAT_MODEL`
- Free tier mevcut

**Sağlayıcı 2: HuggingFace Router** (fallback)

- API URL: `https://router.huggingface.co/v1/chat/completions`
- Env var: `VITE_HF_TOKEN`
- Denenen modeller (sırayla):
  1. `meta-llama/Llama-3.1-8B-Instruct` — Cerebras üzerinde, en hızlı
  2. `Qwen/Qwen3-Coder-Next` — JSON output kalitesi iyi
  3. `deepseek-ai/DeepSeek-V3.2` — Yüksek kalite, JSON'ı markdown içine sarabilir (parser halleder)

**Fallback Mantığı**: OpenRouter → hata/key yok → HF model 1 → rate limit → HF model 2 → rate limit → HF model 3. Her HF modelinde 2 deneme yapılır.

**System Prompt**:
```
You are a prompt engineering expert. The user gives you an image generation prompt.
Pick 3 short phrases from it and suggest 3 alternatives for each.

Reply ONLY with this exact JSON format:
{"segments":[{"original":"phrase from prompt","alternatives":["alt1","alt2","alt3"]}, ...]}

Rules:
- No explanation, no markdown, no thinking, ONLY the JSON object
- "original" must be an exact substring from the user's prompt
- Exactly 3 segments, exactly 3 alternatives each
```

**JSON Parser**: LLM yanıtı `<think>` blokları, `<reasoning>` tagları veya markdown code fence içerebilir. `parseRawSegments()` fonksiyonu bunları temizler ve JSON'ı çıkarır. İki farklı format desteklenir:
- Format 1: `{"segments": [{"original": "...", "alternatives": [...]}]}`
- Format 2 (flat): `{"phrase": ["alt1","alt2","alt3"]}`

### Image Generation

- **Model**: `black-forest-labs/FLUX.1-schnell`
- **Sağlayıcı**: HuggingFace Inference API
- **API URL**: `https://router.huggingface.co/hf-inference/models/{model}`
- **Env var**: `VITE_HF_TOKEN`, `VITE_IMAGE_MODEL`
- **Çıktı**: Binary image blob → `FileReader` ile base64 data URL'e çevrilir → Neon'a kaydedilir

---

## 8. Ekranlar ve Paneller

### FeedScreen (Ana Ekran)

**Davranış**: Dikey scroll, her prompt tam ekranı kaplar. `scroll-snap` ile her kaydırmada tam bir kart görünür.

- Prompts feed'den yüklenir (tüm public promptlar, max 50, en yeni önce)
- Sağ üstte `X / Y` sayfa indikatörü
- Her kart bir `FeedCard` bileşenidir

### FeedCard (Swipe Kartı)

Bir promptun tam ekran görünümüdür. **Swipe ile paneller açılır**:

| Hareket | Sonuç |
|---------|-------|
| Sağa swipe (>60px) | Sol panel açılır (Prompt metni + Copy) |
| Sola swipe (>60px) | Sağ panel açılır (Versiyon geçmişi) |
| Karta tıkla | Açık panel kapanır |

Kart üzerinde:
- Arka planda oluşturulan görsel (image_url)
- Alt kısımda: Prompt başlığı, kısa metin preview
- Bookmark butonu (sağ alt)
- "Refactor" butonu (giriş yapmış kullanıcılara) → Prompt Editörü açar
- Üstte: Aktif versiyon adı (v1, v2...)

Framer Motion `useMotionValue` ile swipe sırasında kart scale ve borderRadius animasyonu uygulanır (arka planda image görünür hale gelir).

### LeftPanel (Prompt Detay Paneli)

Sağa swipe ile açılır. İçerik:
- Prompt başlığı
- Tam prompt metni (scroll edilebilir)
- **Copy butonu** — `navigator.clipboard.writeText()` ile kopyalar, 2 sn "Copied" gösterir

### RightPanel (Versiyon Geçmişi Paneli)

Sola swipe ile açılır. İçerik:
- Tüm versiyon listesi (en yeni önce)
- Her versiyonun adı, tarihi, metin preview'ı, thumbnail görseli
- **Versiyon seçimi**: Bir versiyona tıklanınca `activeVersionId` state'i güncellenir → feed'deki kart o versiyonun içeriğini/görselini gösterir
- Tekrar tıklama → seçim kaldırılır (en güncel versiyon gösterilir)

### PromptEditorScreen (Prompt Editörü)

Feed'den "Refactor" butonuna basınca tam ekran açılır. Üç farklı çalışma modu:

1. **Normal mod**: Mevcut prompt metni okunabilir olarak gösterilir
2. **Refactor modu**: AI segmentleri renklendirerek gösterir, tıklanabilir alternatifler
3. **Manual Edit modu**: Kullanıcı doğrudan textarea'da düzenler

### SavedScreen

Kullanıcının bookmarkladığı promptların listesi. Her öğeye tıklanınca feed'de o prompt'a gidilir (`currentFeedIndex` güncellenir).

### ProfileScreen

Kullanıcı bilgileri ve giriş/çıkış. Giriş yapılmamışsa login/register formu gösterilir.

### NewPromptScreen

Yeni prompt oluşturma formu:
- Başlık
- Prompt metni
- Tag ekleme

---

## 9. Butonların Çalışma Mantığı

### Bookmark Butonu (FeedCard)

```
Tıkla → toggleSave(promptId)
       → Backend: POST /api/prompts/:id/save
       → Kayıtlıysa sil (saved: false), değilse ekle (saved: true)
       → Zustand savedPromptIds güncellenir
```

### Refactor Butonu (FeedCard → PromptEditorScreen)

```
Tıkla → openEditor(promptId) [store]
       → PromptEditorScreen açılır
       → "Refactor" butonuna bas
       → refactorPrompt(content) çağrılır [api.ts]
       → OpenRouter veya HuggingFace'e istek
       → 3 segment + 3 alternatif JSON döner
       → HighlightedPrompt bileşeni segmentleri renklendirir
       → Kullanıcı renklere tıklar → alternatif seçer → metin anlık güncellenir
```

### Generate Butonu (PromptEditorScreen)

```
Tıkla → generateImage(currentContent) [api.ts]
       → HuggingFace FLUX.1-schnell'e POST
       → Blob döner → base64'e çevir
       → Preview olarak gösterilir
       → "Apply" yapılırsa versiyona eklenir
```

### Edit / Discard Butonu (PromptEditorScreen)

```
"Edit" tıkla  → isManualEdit = true
               → textarea aktif, refactor iptal edilir
               → Başlık "EDIT" badge gösterir

"Discard" tıkla → isManualEdit = false
                → Manuel değişiklikler atılır
```

### Apply → New Version Butonu (PromptEditorScreen)

```
Tıkla (değişiklik varsa aktif)
     → applyRefactorResult(promptId, newContent, imageUrl) [store]
     → Backend: POST /api/prompts/:id/versions
               body: { content, versionName: "v2", imageUrl }
     → Backend: prompts tablosunda current_version_id güncellenir
     → Store'daki prompt güncellenir
     → Editor kapanır, feed'de yeni versiyon aktif görünür
```

---

## 10. User Flow

### Misafir Kullanıcı

```
Uygulama açılır
    │
    ├─ Feed otomatik yüklenir (auth gerektirmez)
    │      → Public promptları kaydır
    │      → Sağa swipe → Prompt metnini gör, kopyala
    │      → Sola swipe → Versiyon geçmişini gör, seçim yap
    │
    └─ Bookmark veya Refactor butonuna basarsa
           → Giriş yapması gerektiğini belirten durum (kullanıcı yönlendirilir)
```

### Kayıtlı Kullanıcı

```
Giriş yap (Profile tab)
    │
    ├─ Feed
    │    ├─ Bookmark → kendi koleksiyonuna ekle/çıkar
    │    └─ Refactor → Prompt Editörü aç
    │              ├─ AI Refactor → alternatifleri seç → Preview
    │              ├─ Generate Image → FLUX ile görselleştir
    │              ├─ Manuel Düzenle → textarea ile değiştir
    │              └─ Apply → Yeni versiyon kaydet (backend'e yazılır)
    │
    ├─ Saved Tab → Bookmarklanan promptları listele → tıkla → feed'e git
    │
    └─ New Prompt (+ butonu)
             → Başlık + içerik + tag gir → Kaydet
             → Backend: POST /api/prompts → v1 otomatik oluşur
             → Feed'de görünür
```

### Versiyon Seçme Flow'u

```
Feed'de bir kartta sola swipe → RightPanel açılır
    │
    └─ Versiyon listesi yüklenir (GET /api/prompts/:id/versions)
         │
         └─ Bir versiyona tıkla
               → activeVersionId store'da güncellenir
               → Kart kapanmadan feed görünümündeki içerik/görsel değişir
               → Tekrar tıkla → seçim sıfırlanır, en güncel versiyon döner
```

---

## 11. API Referansı

### Auth

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/api/auth/register` | — | Kayıt ol |
| POST | `/api/auth/login` | — | Giriş yap |

**Register body**: `{ email, username, password }`
**Login body**: `{ email, password }`
**Her ikisi de döner**: `{ token: string, user: { id, email, username } }`

### Prompts

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/prompts` | — | Public feed (max 50, yeni→eski) |
| GET | `/api/prompts/:id` | — | Tek prompt detayı |
| POST | `/api/prompts` | ✓ | Yeni prompt oluştur |
| GET | `/api/prompts/:id/versions` | — | Versiyon listesi |
| POST | `/api/prompts/:id/versions` | ✓ | Yeni versiyon kaydet |
| GET | `/api/prompts/saved/list` | ✓ | Kullanıcının bookmarkları |
| POST | `/api/prompts/:id/save` | ✓ | Toggle bookmark |
| GET | `/api/health` | — | Sağlık kontrolü |

### Hata Formatı

Tüm hatalar `{ error: string }` formatında JSON döner.

---

*Canlı URL: https://www.sinanakcan.com/prompterest*
