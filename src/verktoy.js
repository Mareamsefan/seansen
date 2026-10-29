// Verktøyene til seansen. Hvert verktøy er en definisjon (det modellen ser) og
// en kjør-funksjon (det som faktisk skjer). kjør: null betyr stub: verktøyet
// sendes ikke til modellen før dere har implementert det.
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.join(import.meta.dirname, '..', 'data');
const lesJson = (fil) => JSON.parse(fs.readFileSync(path.join(DATA, fil), 'utf8'));

const konsulenter = lesJson('konsulenter.json');
const konsulentIder = new Set(konsulenter.map((k) => k.id));
const tilgjengelighet = lesJson('tilgjengelighet.json');
const prosjekthistorikk = lesJson('prosjekthistorikk.json');

export { konsulenter as profiler, tilgjengelighet, prosjekthistorikk };

const validerId = (id) => {
  if (typeof id !== 'string' || !/^k\d{3}$/i.test(id.trim())) {
    throw new Error('Ugyldig konsulent-id. Bruk formatet «k007».');
  }
  const normalisertId = id.trim().toLowerCase();
  if (!konsulentIder.has(normalisertId)) {
    throw new Error(`Ukjent konsulent-id «${normalisertId}».`);
  }
  return normalisertId;
};

export const system = `Du er bemanningsagenten i et konsulentselskap med kontorer i Oslo, Bergen, Trondheim og Stavanger.
Du får et behov i naturlig språk og skal finne de beste kandidatene.

- Før du søker: sjekk om det finnes minst én konkret ferdighet/rolle og nok kontekst til å finne relevante personer.
- Hvis behovet er så vagt at et søk blir gjetning, ikke bruk verktøy. Still ett kort, konkret oppfølgingsspørsmål og svar kun slik: «OPPFØLGING: [spørsmålet]».
- Når behovet er søkbart, bryt det ned i ferdigheter, tidspunkt, grad og sted. Søk på hver nødvendig ferdighet separat, sammenlign treffene, sjekk tilgjengelighet og bruk CV/prosjekthistorikk der erfaring påvirker anbefalingen.
- Foreslå et helt team når oppdraget trenger flere fagområder eller brukeren ber om et team. Sett sammen komplementære roller, ikke bare flere av samme profil. For et smalt behov anbefaler du én kandidat.
- Kandidatene må være faktiske profiler fra verktøyresultatene. Ta med ID (for eksempel k007), rangér maks fem team eller kandidater, og si kort hva hver dekker og hva som eventuelt mangler.
- Gi hver kandidat eller hvert team en skjønnsmessig matchscore fra 1 til 5 basert på dokumentert kompetanse, erfaring, kravoppfyllelse og tilgjengelighet. 5 betyr svært god match. Ikke presenter scoren som en garanti.
- Tidslinjen vises automatisk av grensesnittet fra tilgjengelighetsdata. Ikke finn på datoer eller kapasitet.
- Svar kort på norsk og ikke gjenta hele profilene.
- Når du trenger avklaring, svar kun med gyldig JSON: {"type":"follow_up","followUp":"ett konkret spørsmål","summary":"","teams":[],"candidates":[]}.
- Når du er ferdig, svar kun med gyldig JSON uten markdown-gjerde, med denne strukturen:
{"type":"team eller person","summary":"kort oppsummering og viktigste forbehold","teams":[{"name":"kort teamnavn","score":1,"reason":"kort begrunnelse","members":[{"id":"k007","role":"rolle i teamet","reason":"hva personen bidrar med"}]}],"candidates":[{"id":"k007","score":1,"reason":"kort matchgrunn og eventuelt hva som mangler"}]}
- For teamforslag: fyll ut teams og la candidates være tom. Foreslå opptil tre ulike, komplementære teams, rangert best først.
- For et individuelt behov: fyll ut candidates og la teams være tom. Rangér opptil fem personer.
- Hvis ingen kandidat er perfekt, foreslå nest beste og si tydelig hva som mangler.
- Si tydelig fra hvis du mangler et verktøy for å kontrollere et viktig krav.
- Grad går fra A (junior) til E (mest senior).`;

export const eksempelOppgave = 'Vi trenger noen som kan Terraform og Azure, ledig fra november, helst C-grad eller over.';

export const verktøy = [
  {
    definisjon: {
      name: 'sok_kompetanse',
      description: `Søker etter konsulenter som har en bestemt ferdighet i kompetanseprofilen sin.
Søket matcher på deler av ferdighetsnavnet uten å skille på store og små bokstaver, så «azure» treffer også «Azure DevOps» og «Azure Bicep».
Søk på én ferdighet om gangen. Trenger du to ferdigheter, gjør to søk og se hvem som går igjen.
Nivå er selvvurdert fra 1 (kjent med) til 5 (ekspert). Grad går fra A (junior) til E (mest senior).
Returnerer id, navn, grad, lokasjon og de matchende ferdighetene, sortert med høyest nivå først. Ikke hele profilen.
Sier ingenting om hvem som er ledig.`,
      input_schema: {
        type: 'object',
        properties: {
          ferdighet: { type: 'string', description: 'Ferdigheten du leter etter, f.eks. «Terraform» eller «React».' },
          min_niva: { type: 'integer', minimum: 1, maximum: 5, description: 'Laveste nivå som teller. Standard er 1.' },
          maks_treff: { type: 'integer', minimum: 1, maximum: 50, description: 'Hvor mange treff du vil ha tilbake. Standard er 15.' },
        },
        required: ['ferdighet'],
      },
    },
    kjør: async ({ ferdighet, min_niva = 1, maks_treff = 15 }) => {
      if (typeof ferdighet !== 'string' || !ferdighet.trim()) {
        throw new Error('Mangler eller ugyldig «ferdighet». Oppgi en ferdighet å søke på, f.eks. {"ferdighet": "Terraform"}.');
      }
      const søk = ferdighet.trim().toLowerCase();
      const treff = konsulenter
        .map((k) => ({
          id: k.id, navn: k.navn, grad: k.grad, lokasjon: k.lokasjon,
          ferdigheter: k.kompetanse.filter((f) => f.ferdighet.toLowerCase().includes(søk) && f.nivå >= min_niva),
        }))
        .filter((k) => k.ferdigheter.length)
        .sort((a, b) => Math.max(...b.ferdigheter.map((f) => f.nivå)) - Math.max(...a.ferdigheter.map((f) => f.nivå)));
      if (!treff.length) return `Ingen treff på «${ferdighet}» med nivå ${min_niva} eller høyere. Prøv et annet ord eller lavere nivå.`;
      return { antall_treff: treff.length, viser: Math.min(treff.length, maks_treff), treff: treff.slice(0, maks_treff) };
    },
  },
  {
    definisjon: {
      name: 'sjekk_tilgjengelighet',
      description: `Sjekker når konsulenter blir ledige. Gi en liste med id-er fra sok_kompetanse.
Returnerer for hver: nåværende oppdrag (kunde og sluttdato, eller null), dato de er ledige fra, og hvor mange prosent de er ledige.
Merk at noen bare er delvis ledige, og at enkelte har en kommentar som begrenser hva de kan ta.`,
      input_schema: {
        type: 'object',
        properties: { ider: { type: 'array', items: { type: 'string' }, description: 'Konsulent-id-er, f.eks. ["k007", "k023"].' } },
        required: ['ider'],
      },
    },
    kjør: async ({ ider }) => {
      if (!Array.isArray(ider) || ider.some((id) => typeof id !== 'string' || !/^k\d{3}$/i.test(id.trim()))) {
        throw new Error('«ider» må være en liste med konsulent-id-er i formatet «k007».');
      }

      const ønskedeIder = [...new Set(ider.map((id) => id.trim().toLowerCase()))];
      const raderPerId = new Map(tilgjengelighet.map((rad) => [rad.id, rad]));
      const treff = ønskedeIder.flatMap((id) => {
        const rad = raderPerId.get(id);
        return rad ? [rad] : [];
      });

      return {
        antall_treff: treff.length,
        treff,
        ukjente_ider: ønskedeIder.filter((id) => !konsulentIder.has(id)),
        mangler_tilgjengelighetsdata: ønskedeIder.filter((id) => konsulentIder.has(id) && !raderPerId.has(id)),
      };
    },
  },
  {
    definisjon: {
      name: 'hent_cv',
      description: `Henter CV-sammendraget til én konsulent som markdown.
Ikke alle har CV. Mangler den, får du beskjed om det, og da må du klare deg med profilen og prosjekthistorikken.
CV-en kan være mer oppdatert, eller mindre, enn kompetanseprofilen. Si fra hvis de spriker.`,
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Konsulent-id, f.eks. "k007".' } },
        required: ['id'],
      },
    },
    kjør: async ({ id }) => {
      const konsulentId = validerId(id);
      const fil = path.join(DATA, 'cv', `${konsulentId}.md`);
      if (!fs.existsSync(fil)) return `Ingen CV for ${konsulentId}.`;
      return fs.readFileSync(fil, 'utf8');
    },
  },
  {
    definisjon: {
      name: 'finn_prosjekthistorikk',
      description: `Henter tidligere prosjekter for én konsulent: kunde, bransje, år, rolle og teknologier.
Nyttig for å se om noen faktisk har brukt en teknologi i et oppdrag, ikke bare oppgitt den i profilen.
Juniorer har ofte ingen historikk ennå.`,
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Konsulent-id, f.eks. "k007".' } },
        required: ['id'],
      },
    },
    kjør: async ({ id }) => {
      const konsulentId = validerId(id);
      return prosjekthistorikk.find((historikk) => historikk.konsulent_id === konsulentId)?.prosjekter ?? [];
    },
  },
];
