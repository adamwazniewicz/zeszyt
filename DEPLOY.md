# Deploy on the Ubuntu / CasaOS server

One Docker Compose stack: the `zeszyt` container plus a zrok2 agent that publishes it over HTTPS. The server stores no user data, so there is nothing to back up except `.env`.

## 1. Copy the code

From the Mac, in the project folder (replace `user@server`):

```bash
rsync -av --delete \
  --exclude node_modules --exclude dist --exclude .git \
  --exclude fixtures --exclude .env \
  ./ user@server:~/zeszyt/
```

`fixtures/` holds real IDU pages with classmates' data. It must never leave the Mac.

## 2. Configure

On the server:

```bash
cd ~/zeszyt
cp .env.example .env
openssl rand -base64 32   # paste into SESSION_SECRET
nano .env                 # set SESSION_SECRET, IDU_USER_AGENT (your real contact), ZROK2_ENABLE_TOKEN
```

The zrok containers register their own new zrok environment (separate from any zrok2 you already run on the host). Check your zrok plan allows one more environment.

## 3. Build and start

```bash
docker compose build
docker compose up -d
docker compose ps          # zeszyt should become "healthy", zrok-agent "running"
```

The containers run on the same Docker that CasaOS uses. Whether they appear as an app tile depends on the CasaOS version; they run either way. The CasaOS "Custom Install" importer can't build images from source, which is why the build happens here.

## 4. Publish with zrok (once)

```bash
docker compose exec zrok-agent zrok2 create name zeszyt
docker compose exec zrok-agent zrok2 share public http://zeszyt:8787 -n public:zeszyt
docker compose exec zrok-agent zrok2 agent status   # shows the public URL
```

If `zeszyt` is taken, pick another name. The agent restarts named shares by itself after reboots.

Then put the public URL into `.env` as `PUBLIC_ORIGIN` and run `docker compose up -d` again.

Open the URL on your phone and check:

- The app loads without a zrok warning page. If zrok.io shows an interstitial, installing the PWA may not work; the fix is a zrok frontend on your own domain.
- Logging in works, and "Dodaj do ekranu głównego" / "Zainstaluj aplikację" appears.

## Updating

Copy the code again (step 1), then:

```bash
docker compose build && docker compose up -d
```

Sessions survive updates as long as `SESSION_SECRET` stays the same. Phones pick up a new version on the second launch after an update.
