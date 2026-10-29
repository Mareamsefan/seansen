# Seansen 🔮

![Megakart over oppgaven](kart.jpg)

Bygg en agent som svarer på «hvem kan ta denne jobben?» ved å lete i kompetanse-, tilgjengelighets- og CV-data for 80 oppdiktede konsulenter.

## Kom i gang

```bash
npm install
cp .env.example .env        # lim inn API-nøkkelen
npm start                   # kjører eksempelbehovet
npm start -- "Vi trenger en React-utvikler i Bergen fra desember"
```

Krever Node 20.12 eller nyere.

## Hva ligger her

| Fil | Hva |
|---|---|
| `src/agent.js` | Agentløkka: spør modellen, kjør verktøy, send svar tilbake, gjenta. |
| `src/verktoy.js` | Systemprompt, eksempelbehov og verktøyene. Her jobber dere. |
| `src/index.js` | Startpunkt for `npm start`. |
| `data/konsulenter.json` | Profiler: grad, rolle, avdeling, lokasjon, kompetanse (nivå 1–5), sertifiseringer, språk. |
| `data/tilgjengelighet.json` | Nåværende oppdrag, ledig fra-dato og ledig prosent per konsulent. |
| `data/prosjekthistorikk.json` | Tidligere prosjekter: kunde, bransje, år, rolle, teknologier. |
| `data/cv/<id>.md` | Korte CV-sammendrag. Bare rundt 20 har CV. |

Alle fire verktøyene er implementert: kompetansesøk, tilgjengelighet, CV og prosjekthistorikk. All data er syntetisk, og den er ikke helt ryddig: CV og profil sier ikke alltid det samme.

Webdemoen viser en kort oppsummering ved siden av kandidatprofilene. Profilbildene er illustrative bilder lastet fra Pravatar, ikke bilder av de fiktive konsulentene. Nettleseren må ha tilgang til `i.pravatar.cc` for å vise dem; initialer vises hvis bildehentingen feiler.

Agenten spør om én viktig avklaring før søk når behovet er for vagt. Ellers bruker den relevante verktøyoppslag, kan foreslå et komplementært team ved brede oppdrag, og viser tilgjengeligheten til anbefalte kandidater i en tidslinje. «Se oppslagene agenten gjorde» viser hvilke verktøy og søk som faktisk ble brukt.

Teamforslag og individuelle kandidater rangeres med 1–5 gresskar. Dette er en veiledende AI-vurdering basert på profildata, ikke en objektiv måling eller garanti.

## Host demoen på Azure

Webgrensesnittet startes med `npm run start:web` og er åpent uten innlogging, både lokalt og på Azure. API-et begrenser hver IP til 10 forespørsler per minutt per app-instans, men dette er ikke en fullgod kostnads- eller misbruksbeskyttelse. `ANTHROPIC_API_KEY` skal bare settes i App Service-innstillinger, aldri i nettleseren eller i Git.

1. Opprett en **Web App** i Azure Portal. Velg **Code**, **Linux**, og en Node.js-versjon på 20.12 eller nyere.
2. Deploy repoet fra GitHub med Deployment Center, eller fra VS Code med Azure App Service-utvidelsen. Pass på at `package.json`, `package-lock.json`, `src/` og `data/` blir deployet.
3. I Web App: åpne **Settings → Environment variables** (kan hete **Configuration** i noen portalvisninger) og legg til `ANTHROPIC_API_KEY`. Lagre; Azure kan starte appen på nytt.
4. Sett startup command til `npm run start:web` under **Configuration → General settings**, hvis Azure ikke starter den automatisk. Appen lytter på `PORT` som Azure setter.
5. Åpne `https://<app-navn>.azurewebsites.net` og prøv et behov i skjemaet. Demoen er offentlig tilgjengelig uten innlogging.
6. Ved feil: se **Monitoring → Log stream** i Azure. Ikke lim inn eller del API-nøkkelen i logger, skjermbilder eller GitHub.

App Service-hosting og Anthropic API-bruk kan medføre separate kostnader. Fordi demoen er åpen for alle, følg nøye med på forbruket og sett passende varsler og grenser der leverandørene tilbyr det. Den innebygde grensen gjelder per IP og instans og må ikke regnes som sterk beskyttelse.

**Grad:** Vi antar at A er graduate/junior og E er mest senior (A, B, C, D, E i stigende ansiennitet). Stemmer ikke det med deres virkelighet, rett det i `system` i `src/verktoy.js` og i verktøybeskrivelsen.

## Legg til et verktøy

Finn stubben i `src/verktoy.js` og bytt ut `kjør: null` med en funksjon. Den sendes til modellen fra neste kjøring.

```js
const tilgjengelighet = lesJson('tilgjengelighet.json');

// i sjekk_tilgjengelighet:
kjør: async ({ ider }) => {
  if (!ider?.length) throw new Error('Oppgi minst én id.');
  return tilgjengelighet.filter((t) => ider.includes(t.id));
},
```

Kaster funksjonen en feil, får modellen meldingen tilbake som et feilresultat og kan prøve på nytt. Beskrivelsen er det modellen leser for å forstå verktøyet, så skriv den som til en ny kollega.

## Hvis du ikke bruker JavaScript

Dataene er ren JSON og markdown. Ta med `data/`-mappa og bygg løkka i det språket dere vil. `src/agent.js` er rundt 80 linjer og viser hele mønsteret.

## Tips

- MVP er to verktøy og én løkke. `sok_kompetanse` og `sjekk_tilgjengelighet` holder til en god demo.
- Vis verktøykallene i demoen. Det er der publikum ser at agenten faktisk jobber.
- `MAX_ITERASJONER` i `.env` stopper en agent som går i ring (standard 10).
- `.env` committes aldri. Den står i `.gitignore`, la den bli der.
