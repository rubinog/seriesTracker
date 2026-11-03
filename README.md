<div align="center">
  <img src="web/public/icon-512.png" alt="Icona di Series Tracker" width="160" height="160">
  <h1>Series Tracker</h1>
  <p><strong>Tutte le tue serie. Un posto solo.</strong></p>
  <p>La tua lista, i prossimi episodi e le statistiche — con il tuo server, i tuoi dati.</p>
  <p>
    <img alt="PWA" src="https://img.shields.io/badge/PWA-installabile-7657e8">
    <img alt="Docker Compose" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white">
    <img alt="React" src="https://img.shields.io/badge/React-TypeScript-3178C6?logo=react&logoColor=white">
    <img alt="Licenza TMDB" src="https://img.shields.io/badge/dati-TMDB-01b4e4">
  </p>
</div>

---

Series Tracker è una web app **mobile-first** per organizzare le serie che guardi. Installala come app sul telefono o sul desktop e sincronizza la tua libreria con un server che gestisci tu.

## ✨ Cosa puoi fare

| | |
|---|---|
| 📺 **La tua libreria** | Organizza le serie in corso, da vedere, completate e abbandonate. |
| ⏭️ **Prossimi episodi** | Scopri cosa guardare e segna gli episodi con un tocco. |
| 🔎 **Cerca e scopri** | Cerca per titolo, filtra per genere, anno e voto, o ricevi consigli personalizzati. |
| ⭐ **Voti e statistiche** | Dai un voto alle serie e scopri generi e serie più seguiti e il tempo di visione stimato. |
| 🎨 **Il tuo stile** | Scegli tema chiaro, scuro o automatico e personalizza il colore d'accento. |
| ☁️ **Self-hosted** | Account multiutente e libreria sincronizzata nel tuo database SQLite. |
| 📲 **PWA** | Installabile su smartphone e desktop; interfaccia pensata prima per mobile. |

## 🚀 Avvio rapido con Docker Compose

### 1. Crea una chiave API TMDB

Series Tracker usa [The Movie Database (TMDB)](https://www.themoviedb.org/) per i dati delle serie, gli episodi e i poster.

1. [Crea un account TMDB](https://www.themoviedb.org/signup) e verifica l'email.
2. Accedi e apri [Impostazioni → API](https://www.themoviedb.org/settings/api).
3. Registra un'applicazione per uso **Developer**, se richiesto.
4. Copia la **API Read Access Token** (Bearer token) o la **API Key (v3 auth)**.

Entrambi i formati sono supportati. La chiave è utilizzata dal backend, **mai esposta al browser**: custodiscila come una password. Per approfondire, consulta la [documentazione TMDB](https://developer.themoviedb.org/docs).

### 2. Configura il server

Clona il repository e crea la configurazione locale:

```powershell
git clone https://github.com/rubinog/seriesTracker.git
cd seriesTracker
Copy-Item .env.example .env
```

Apri `.env` e inserisci la chiave:

```dotenv
TMDB_API_KEY=incolla_qui_la_tua_chiave
ALLOW_SIGNUP=true
```

`.env` contiene segreti e viene escluso da Git. **Non condividerlo e non inserirlo nel repository.**

### 3. Avvia l'app

```powershell
docker compose up -d --build
```

### Pubblicazione automatica su Docker Hub

Il repository GitHub include un workflow che costruisce e pubblica `ilrubio/seriestracker` a ogni push su `main`. Produce i tag `latest` e l'abbreviazione del commit; la versione mostrata nell'app corrisponde al commit sorgente.

Per abilitarlo:

1. Crea un **Access Token** Docker Hub con permesso di scrittura sul repository `ilrubio/seriestracker`.
2. Nel repository GitHub apri **Settings → Secrets and variables → Actions → New repository secret**.
3. Crea il secret `DOCKERHUB_TOKEN` e incolla il token Docker Hub. Il token non va aggiunto a `.env` o al codice.
4. Esegui un push su `main`, oppure avvia manualmente **Actions → Publish Docker image → Run workflow**.

Il workflow si occupa di autenticarsi, costruire l'immagine e pubblicarla. Puoi controllarne l'esito nella scheda **Actions** di GitHub.

Sul server, per usare l'immagine pubblicata, sostituisci in `docker-compose.yml` la sezione `build` con:

```yaml
image: ilrubio/seriestracker:latest
```

Mantieni il resto del servizio (in particolare `.env` e il volume `./data:/data`) e aggiorna l'installazione con:

```powershell
docker compose pull
docker compose up -d
```

Per installare una versione precisa, usa il tag abbreviato del commit al posto di `latest`.

Apri [http://localhost:3000](http://localhost:3000) e crea il tuo account.

Comandi utili:

```powershell
docker compose logs -f       # segui i log
docker compose down          # ferma l'app, conserva i dati
docker compose up -d --build # ricostruisci dopo un aggiornamento
```

### Aggiornamenti e versione

La versione mostrata in **Altro** corrisponde all'abbreviazione del commit che ha generato la build. In sviluppo viene rilevata automaticamente da Git. Per creare un container con la versione corretta, dalla cartella del repository esegui:

```powershell
$env:APP_VERSION = (git rev-parse --short HEAD)
docker compose up -d --build
Remove-Item Env:APP_VERSION
```

Se non imposti `APP_VERSION`, la build Docker mostra `dev`.

## 🔒 Pubblicazione sicura

Docker Compose espone l'app sulla porta `3000`. Per raggiungerla da altri dispositivi o da Internet, mettila dietro un reverse proxy come Caddy, Traefik o nginx e abilita **HTTPS**: è necessario per installare la PWA e protegge le credenziali. Evita di esporre il container direttamente su Internet senza TLS.

Dopo aver creato gli account desiderati, puoi chiudere le nuove registrazioni impostando in `.env`:

```dotenv
ALLOW_SIGNUP=false
```

Applica la modifica con `docker compose up -d`.

### Dati e backup

Database SQLite e segreto di firma dei token sono conservati in `./data`, montata nel container. Per creare un backup coerente:

```powershell
docker compose down
Copy-Item -Recurse data data-backup
docker compose up -d
```

Proteggi il backup: contiene i dati degli account. **Non eliminare `data`** durante gli aggiornamenti.

## 🧑‍💻 Sviluppo locale

Richiede **Node.js 24 o superiore** (`node:sqlite`). Apri due terminali PowerShell nella cartella del repository.

**Terminale 1 — backend**

```powershell
cd server
npm ci
$env:TMDB_API_KEY = "la_tua_chiave"
node --disable-warning=ExperimentalWarning index.mjs
```

**Terminale 2 — frontend**

```powershell
cd web
npm ci
npm run dev -- --host
```

Apri l'indirizzo mostrato da Vite (di solito [http://localhost:5173](http://localhost:5173)). Vite inoltra `/api` al server locale su `localhost:3000`.

Controlli frontend:

```powershell
cd web
npm run build
npm run lint
```

## 🧰 Tecnologie

**React · TypeScript · Vite · Tailwind CSS · PWA · Fastify · Node.js 24 · SQLite · Docker Compose · TMDB API**

## 🎬 Attribuzione

Questo prodotto utilizza l'API TMDB, ma non è approvato né certificato da TMDB. Serie, immagini e metadati sono forniti da TMDB; consulta i [termini d'uso](https://www.themoviedb.org/documentation/api/terms-of-use) e le relative linee guida.
