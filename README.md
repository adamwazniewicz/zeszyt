# Zeszyt

Nieoficjalny, tylko-do-odczytu klient dla uczniów jednego instance IDU. Własny interfejs (PWA), własne ikony, własny kod. **Niezwiązany z IDU ani DAG s.c.**

Ten plik jest napisany tak, żeby dało się go pokazać nauczycielowi informatyki: co aplikacja robi, czego **nie** kopiuje, i gdzie lądują dane ucznia.

## Dla nauczyciela: prawo autorskie i dane

### To nie jest kopia IDU

W repozytorium **nie ma** kodu, CSS, logo, ikon ani szablonów z `idu.edu.pl`. Wszystko, co widać w aplikacji (układ, kolory, ikona zeszytu, teksty UI), powstało od zera.

Aplikacja **nie ściąga** zasobów IDU do pokazania w UI. Serwer pobiera wyłącznie HTML zalogowanego ucznia, wyciąga z niego **jego** plan / oceny / obecności / aktualności i oddaje czysty JSON. Artykuły newsów są czyszczone na serwerze (bez skryptów, bez stylów IDU, bez obrazków hostowanych na IDU).

Mapa stron IDU (`docs/IDU_HANDOFF.md`) opisuje publicznie dostępne po zalogowaniu adresy HTML — tak jak przeglądarka ucznia. To nie jest oficjalne API.

### Serwer nie przechowuje danych uczniów

| Co | Gdzie jest |
| --- | --- |
| Hasło IDU | Tylko w żądaniu logowania do IDU. Nigdy nie zapisywane. |
| Sesja IDU | Zaszyfrowana (AES-256-GCM) w ciasteczku `httpOnly` na urządzeniu ucznia. Serwer trzyma wyłącznie klucz `SESSION_SECRET`. |
| Plan, oceny, obecności, newsy | IndexedDB **na telefonie / komputerze ucznia**. Po reinstalacji aplikacji trzeba zsynchronizować od nowa. |
| Baza danych na serwerze | **Nie ma.** Brak Postgres / SQLite / plików z treścią. |
| Logi treści | Spec zabrania logowania haseł i treści. |

Restart kontenera nie wylogowuje uczniów (sesja jest w ich ciasteczku), o ile `SESSION_SECRET` się nie zmienia. Restart **nie** zostawia na dysku ocen ani wiadomości.

### Co uczeń widzi

Tylko to, do czego i tak ma dostęp po zalogowaniu na IDU swoim loginem. Aplikacja nie omija uprawnień i nie pobiera danych innych uczniów.

## Jak to działa

```
telefon (PWA)  --JSON-->  Zeszyt (Node / Hono)  --HTML-->  IDU (Rails)
     ^                         |                              |
     |                    parser HTML → JSON                  |
     +----- dane w IndexedDB, nic nie zostaje na serwerze ----+
```

- `apps/web` — Vite + React, instalowalna PWA, interfejs po polsku.
- `apps/server` — Hono. Logowanie, **stała lista** dozwolonych ścieżek IDU (to nie jest otwarty proxy), parsowanie, limit żądań.
- `packages/shared` — wspólne typy TypeScript.

Kod, który pokazuje nauczycielowi „nic nie zapisujemy”, jest w `apps/server/src/session/` (pieczętowanie ciasteczka) i `apps/web/src/store.ts` (IndexedDB).

## Uruchomienie lokalne

Potrzebny Node 22+. **Nie commituj** pliku `.env` ani folderu `fixtures/raw/` (surowe HTML z prawdziwymi nazwiskami).

```bash
cp .env.example .env
# ustaw SESSION_SECRET (dowolny długi ciąg na lokalny development)
npm install
npm test          # 25 testów, w tym fikcyjne HTML bez prawdziwych osób
npm run typecheck
npm run dev       # web + API; UI: http://localhost:5173
```

Logowanie używa prawdziwego konta IDU ucznia. Do testów parserów wystarczą pliki w `apps/server/test/fixtures/` (wymyslone imiona).

## Testy

`npm test` odpala Vitest. Pokryte są m.in.:

- logowanie i pieczętowanie sesji (fałszywy serwer IDU, bez sieci),
- parser planu, ocen, obecności i newsów na syntetycznym HTML,
- czyszczenie HTML artykułu (odrzucone `script`, `style`, obrazki z hosta IDU).

Test `raw.test.ts` odpala się tylko gdy lokalnie istnieją zignorowane przez git zrzuty `fixtures/raw/`.

## Ile osób naraz

Wąskim gardłem nie jest RAM ani CPU serwera, tylko **IDU** (każde odświeżenie to 1–3 żądania HTML na `s{N}.idu.edu.pl` z jednego adresu IP) oraz ewentualnie tunel (zrok).

Na maszynie w stylu i5-7500 (4 wątki) i ~16 GB wolnego RAM:

| Sytuacja | Ocena |
| --- | --- |
| Jedna klasa, kilka osób w aplikacji naraz | spokojnie |
| Cała szkoła ma ikonę, otwierają rano w ciągu kilku minut | powinno przejść; burst ~50–100 zapytań do IDU |
| Setki osób odświeżających w tej samej sekundzie | IDU albo zrok zwolni / zacznie odrzucać, nie Node |

Kontener Zeszyta zajmuje rzędu 100–200 MB. Node obsługuje wiele zapytań naraz (I/O), a parsowanie HTML jest tanie względem czekania na IDU. **Nie było load testu** — to szacunek z architektury, nie pomiar.

## Deployment

Jeden kontener Docker + opcjonalnie zrok. Instrukcja: [`DEPLOY.md`](DEPLOY.md). Spełnienie (zakres, zasady): [`SPEC.md`](SPEC.md).

## Licencja

Kod Zeszyta: [MIT](LICENSE).  
IDU / DAG s.c. zachowują prawa do swojej platformy, znaków i treści szkolnych. Ta aplikacja ich nie przedrukowuje.
