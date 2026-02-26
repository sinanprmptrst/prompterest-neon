# SonarQube Scan Rehberi

## Ön Koşullar
- Docker Desktop açık ve çalışıyor
- SonarQube container running (port 9000)
  - Kontrol: http://localhost:9000 açılıyor olmalı

## Adım 1 — Frontend testleri çalıştır (coverage üret)

```powershell
cd frontend
npm run test:coverage
```

Beklenen: `frontend/coverage/lcov.info` oluşur.

## Adım 2 — Backend testleri çalıştır (coverage üret)

```powershell
cd backend
npm run test:coverage
```

Beklenen: `backend/coverage/lcov.info` oluşur.

## Adım 3 — SonarQube Scanner çalıştır

Proje kökünden (PowerShell):

```powershell
docker run --rm --network host -v "${PWD}:/usr/src" sonarsource/sonar-scanner-cli
```

> **Not (Docker Desktop / Windows):** `--network host` yalnızca Linux'ta host network'ü paylaşır. Docker Desktop üzerinde bağlantı sorunu yaşanırsa, `--network host`'u kaldırıp şu parametreyi ekle:
> ```
> -Dsonar.host.url=http://host.docker.internal:9000
> ```

## Adım 4 — Sonuçları görüntüle

http://localhost:9000/dashboard?id=prompterest-sonarqube

---

## Özet — hepsini sırayla çalıştır

```powershell
# Proje kökündeyken
cd frontend; npm run test:coverage
cd ../backend; npm run test:coverage
cd ..
docker run --rm --network host -v "${PWD}:/usr/src" sonarsource/sonar-scanner-cli
```

---

## Token / Credentials

- SonarQube token: `sonar-project.properties` dosyasında mevcut
- URL: http://localhost:9000
- Project key: `prompterest-sonarqube`
