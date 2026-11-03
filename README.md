# Series Tracker

Una web app **mobile-first** per tenere traccia delle serie TV, degli episodi visti e dei propri voti. Si installa come PWA e si può ospitare sul proprio server con Docker Compose.

Interfaccia in italiano, tema chiaro/scuro, ricerca e consigli personalizzati, statistiche e sincronizzazione multiutente tramite un server self-hosted.

## Funzionalità

- Libreria personale: in corso, da vedere, completate e abbandonate.
- Elenco dei prossimi episodi, con azione rapida per segnarli come visti.
- Ricerca per titolo, filtri per genere/anno/voto e consigli basati sulla libreria.
- Voti personali, statistiche su episodi, generi e tempo di visione stimato.
- Tema chiaro, scuro o automatico e colore d'accento personalizzabile.
- PWA installabile su telefono e desktop.
- Account multiutente e dati salvati nel database SQLite sul proprio server.

## Requisiti

- Docker Engine con il plugin Docker Compose (oppure Docker Desktop su Windows/macOS).
- Un account TMDB per richiedere una chiave API.
- Un browser aggiornato. Per installare la PWA sui dispositivi, il sito deve essere servito tramite HTTPS (localhost è un'eccezione per lo sviluppo).

## Ottenere una chiave API TMDB

Series Tracker usa [The Movie Database (TMDB)](https://www.themoviedb.org/) per cercare le serie e mostrare poster, stagioni, episodi e generi. La chiave viene usata **solo dal server** e non viene inclusa nel frontend.

1. Crea un account su [themoviedb.org/signup](https://www.themoviedb.org/signup) e verifica l'indirizzo email.
2. Accedi e apri **Impostazioni** → **API**: [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
3. Se richiesto, registra una nuova applicazione scegliendo l'uso **Developer** e compilando le informazioni richieste.
4. Copia la **API Read Access Token** (Bearer token) oppure la **API Key (v3 auth)**. Entrambe sono accettate dal server. Trattale come credenziali private e non inserirle nel codice o in un commit.

Per informazioni sulle API consulta la [documentazione ufficiale TMDB](https://developer.themoviedb.org/docs).

> This product uses the TMDB API but is not endorsed or certified by TMDB.

## Avvio con Docker Compose

Clona il repository e spostati nella sua cartella:

```powershell
git clone https://github.com/rubinog/seriesTracker.git
cd seriesTracker
```

In alternativa, scarica il repository come ZIP ed estrailo.

1. Crea il file `.env` partendo dal modello:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Apri `.env` e inserisci la tua chiave TMDB:

   ```dotenv
   TMDB_API_KEY=incolla_qui_la_tua_api_read_access_token
   ALLOW_SIGNUP=true
   ```

   Il file `.env` è ignorato da Git e resta sul tuo server. Non pubblicarlo né inviare la chiave a terzi.

3. Costruisci e avvia l'app:

   ```powershell
   docker compose up -d --build
   ```

4. Apri [http://localhost:3000](http://localhost:3000) e crea il primo account.

Per controllare i log:

```powershell
docker compose logs -f
```

Per fermare il servizio senza rimuovere i dati:

```powershell
docker compose down
```

L'applicazione è esposta sulla porta `3000`. Per renderla raggiungibile da Internet, configura un reverse proxy (per esempio Caddy, Traefik o nginx) con HTTPS; evita di esporre direttamente il servizio senza TLS. Dopo aver creato gli account desiderati, puoi impostare `ALLOW_SIGNUP=false` in `.env` e ricreare il container:

```powershell
docker compose up -d
```

I dati persistenti, inclusi il database e il segreto di firma dei token, sono conservati in `./data`. Per un backup coerente, ferma prima il servizio, copia la cartella `data`, quindi riavvialo:

```powershell
docker compose down
Copy-Item -Recurse data data-backup
docker compose up -d
```

Conserva i backup in un luogo sicuro: contengono i dati degli account. Non cancellare `data` per aggiornare l'app.

## Sviluppo locale

Serve Node.js 24 o superiore (il backend usa `node:sqlite`). Apri due terminali PowerShell dalla cartella del repository.

Terminale 1, backend:

```powershell
cd server
npm ci
$env:TMDB_API_KEY = "la_tua_chiave"
node --disable-warning=ExperimentalWarning index.mjs
```

Terminale 2, frontend:

```powershell
cd web
npm ci
npm run dev -- --host
```

Apri l'indirizzo indicato da Vite, di solito [http://localhost:5173](http://localhost:5173). Il server di sviluppo inoltra le richieste `/api` al backend su `localhost:3000`.

Per verificare il frontend:

```powershell
cd web
npm run build
npm run lint
```

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS e `vite-plugin-pwa`.
- Backend: Node.js 24, Fastify e SQLite (`node:sqlite`).
- Metadati serie: API TMDB.

## Licenza e attribuzione

I dati e le immagini delle serie sono forniti da TMDB. Series Tracker non è affiliato, approvato o certificato da TMDB. Consulta i [termini e le linee guida TMDB](https://www.themoviedb.org/documentation/api/terms-of-use) per i dettagli sull'uso dei dati e del marchio.
