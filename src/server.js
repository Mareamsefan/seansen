import { createServer } from 'node:http';
import { lesAgentResultat } from './resultat.js';

try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const maksBodyLengde = 8_000;
const maksForespørslerPerVindu = 10;
const vinduMs = 60_000;
const forespørslerPerIp = new Map();
const html = `<!doctype html>
<html lang="no">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#fff">
    <title>Finn konsulenten din</title>
    <style>
      :root { color-scheme: light; font-family: Arial, sans-serif; color: #202124; background: #fff; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; }
      header { height: 64px; display: flex; align-items: center; padding: 0 28px; color: #5f6368; font-size: 14px; }
      .brand { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: #3c4043; }
      .brand-mark { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: white; font-weight: 700; background: conic-gradient(from 25deg, #4285f4 0 27%, #34a853 27% 51%, #fbbc05 51% 74%, #ea4335 74%); }
      main { width: min(760px, calc(100% - 32px)); margin: 83px auto 80px; text-align: center; }
      h1 { margin: 0; font-size: clamp(36px, 7vw, 52px); font-weight: 400; letter-spacing: -2px; }
      h1 .blue { color: #4285f4; } h1 .red { color: #ea4335; } h1 .yellow { color: #fbbc05; } h1 .green { color: #34a853; }
      .subtitle { margin: 14px 0 29px; color: #5f6368; font-size: 16px; }
      form { margin: auto; }
      .searchbox { min-height: 54px; display: flex; align-items: center; gap: 12px; padding: 0 18px; border: 1px solid #dfe1e5; border-radius: 28px; transition: box-shadow .15s, border-color .15s; }
      .searchbox:hover, .searchbox:focus-within { border-color: transparent; box-shadow: 0 1px 6px #20212447; }
      .search-icon { width: 18px; height: 18px; flex: none; color: #9aa0a6; }
      input { width: 100%; border: 0; outline: 0; background: transparent; color: #202124; font: 16px Arial, sans-serif; }
      input::placeholder { color: #80868b; }
      .buttons { display: flex; justify-content: center; gap: 12px; margin: 28px 0 14px; }
      button { min-height: 38px; padding: 0 18px; border: 1px solid #f8f9fa; border-radius: 4px; background: #f8f9fa; color: #3c4043; font: 14px Arial, sans-serif; cursor: pointer; }
      button:hover { border-color: #dadce0; box-shadow: 0 1px 1px #0000001a; }
      button:focus-visible { outline: 2px solid #4285f4; outline-offset: 2px; }
      button:disabled { opacity: .6; cursor: wait; }
      .hint { margin: 16px 0 0; color: #70757a; font-size: 13px; }
      #status { min-height: 22px; margin: 24px auto 0; color: #5f6368; font-size: 14px; }
      #results { margin: 22px auto 0; text-align: left; }
      #answer { margin: 0 auto 18px; color: #3c4043; font-size: 14px; line-height: 1.65; white-space: pre-wrap; }
      #candidate-list { display: grid; gap: 14px; }
      .candidate { display: flex; align-items: flex-start; gap: 16px; padding: 20px; border: 1px solid #dadce0; border-radius: 12px; background: white; }
      .avatar { width: 58px; height: 58px; flex: none; display: grid; place-items: center; border-radius: 50%; color: white; font-size: 19px; font-weight: 600; }
      .candidate-content { min-width: 0; flex: 1; }
      .candidate-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 7px 10px; }
      .candidate h2 { margin: 0; font-size: 18px; font-weight: 500; }
      .candidate-id { color: #80868b; font-size: 12px; }
      .meta { margin: 4px 0 11px; color: #5f6368; font-size: 13px; }
      .skills { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
      .skills li { padding: 5px 9px; border-radius: 14px; background: #f1f3f4; color: #3c4043; font-size: 12px; }
      .availability { margin: 12px 0 0; color: #188038; font-size: 13px; }
      .empty { color: #5f6368; text-align: center; padding: 20px; }
      footer { padding: 18px; color: #70757a; text-align: center; font-size: 12px; }
      @media (max-width: 520px) { header { padding: 0 18px; } main { margin-top: 60px; } .candidate { gap: 12px; padding: 15px; } .avatar { width: 48px; height: 48px; } }
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #f9f1e8; background: #130f19; }
      body { overflow-x: hidden; background: radial-gradient(ellipse at 50% 0%, #38202b 0, #1d1521 38%, #130f19 76%); }
      body::before, body::after { position: fixed; z-index: 0; pointer-events: none; font-size: 30px; opacity: .16; }
      body::before { content: "✦  ·  ☾"; top: 18%; left: 5%; color: #ff9a4d; }
      body::after { content: "·  ✦  🦇"; top: 23%; right: 6%; color: #c084fc; }
      header { position: relative; z-index: 1; border-bottom: 1px solid #ffffff0d; color: #d7c6ba; }
      .brand { color: #fff3e4; letter-spacing: .2px; }
      .brand-mark { width: 32px; height: 32px; font-size: 23px; filter: drop-shadow(0 0 12px #fb7b24aa); }
      main { position: relative; z-index: 1; width: min(1060px, calc(100% - 32px)); margin-top: 66px; }
      .eyebrow { margin: 0 0 12px; color: #ffad68; font-size: 11px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; }
      h1 { color: #fff3e4; font-family: Georgia, "Times New Roman", serif; font-size: clamp(40px, 7vw, 68px); font-weight: 500; letter-spacing: -2px; text-shadow: 0 4px 35px #f57a2940; }
      h1 span { color: #ff8a3d; }
      .subtitle { color: #c5b4aa; }
      .searchbox { min-height: 62px; border-color: #ffffff24; border-radius: 18px; background: #211a27d9; box-shadow: 0 14px 50px #00000030, inset 0 1px #ffffff08; }
      .searchbox:hover, .searchbox:focus-within { border-color: #ff9a4d88; box-shadow: 0 0 0 4px #ff8a3d12, 0 14px 50px #00000040; }
      .search-icon { width: 20px; height: 20px; color: #ffad68; }
      input { color: #fff3e4; font-family: inherit; }
      input::placeholder { color: #aa9990; }
      .buttons { margin-top: 22px; }
      button { min-height: 42px; border-color: #ffffff20; border-radius: 10px; background: #2b2230; color: #f8eee5; font-family: inherit; font-weight: 600; transition: transform .15s, box-shadow .15s, background .15s; }
      button:hover { transform: translateY(-1px); border-color: #ffad6866; background: #392839; box-shadow: 0 7px 22px #00000030; }
      button:focus-visible { outline-color: #ffad68; }
      #search { border: 0; background: linear-gradient(135deg, #ff9b50, #f06b32); color: #23140f; box-shadow: 0 5px 22px #e96d3a40; }
      #search:hover { background: linear-gradient(135deg, #ffb36b, #ff7b37); }
      #lucky { color: #ffd2ad; }
      .hint, footer { color: #a8959b; }
      #status { color: #ffc08e; }
      #results { display: grid; grid-template-columns: minmax(220px, .75fr) minmax(0, 1.5fr); gap: 18px; align-items: start; }
      #results[hidden] { display: none; }
      #follow-up, #timeline, #searches { grid-column: 1 / -1; }
      #team { grid-column: 1 / -1; }
      #team h2 { margin: 0 0 8px; color: #ffad68; font-family: Georgia, serif; font-size: 22px; font-weight: 500; }
      #follow-up { padding: 18px 20px; border: 1px solid #ffad6855; border-radius: 14px; background: #39252d; color: #ffe0c5; }
      #follow-up[hidden], #team[hidden], #timeline[hidden], #searches[hidden] { display: none; }
      #team { margin-top: 16px; padding-top: 14px; border-top: 1px solid #ffffff20; }
      #team h3, #timeline h2 { margin: 0 0 8px; color: #ffad68; font-size: 15px; }
      #team p { margin: 0; color: #f4e7de; font-size: 13px; line-height: 1.6; }
      #team-grid, #candidate-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr)); gap: 14px; }
      #candidate-list[hidden] { display: none; }
      .team-card { padding: 17px; border: 1px solid #ffffff1c; border-radius: 15px; background: linear-gradient(145deg, #302333, #1d1822); box-shadow: 0 12px 32px #00000020; }
      .team-title { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
      .team-title h3 { margin: 0; color: #fff3e4; font-size: 16px; }
      .rank { color: #ffbd76; font-size: 12px; font-weight: 700; white-space: nowrap; }
      .candidate-rank { color: #ffbd76; font-size: 12px; font-weight: 700; white-space: nowrap; }
      .rating { margin: 7px 0; color: #ffad39; letter-spacing: 2px; white-space: nowrap; }
      .rating .empty-pumpkin { opacity: .25; }
      .rating-label { margin-left: 5px; color: #d7c6ba; font-size: 11px; letter-spacing: 0; }
      .team-reason, .match-reason { margin: 8px 0 12px; color: #d7c6ba; font-size: 12px; line-height: 1.5; }
      .team-members { display: grid; gap: 9px; }
      .team-member { display: flex; align-items: center; gap: 10px; padding: 9px; border: 1px solid #ffffff12; border-radius: 11px; background: #17121c88; }
      .team-member .avatar-image, .team-member .avatar { width: 42px; height: 42px; }
      .team-member-info { min-width: 0; }
      .team-member-info strong, .team-member-info span { display: block; }
      .team-member-info strong { color: #fff3e4; font-size: 12px; }
      .team-member-info span { margin-top: 3px; color: #c3b0aa; font-size: 11px; }
      #timeline { margin-top: 4px; padding: 20px; border: 1px solid #ffad6830; border-radius: 15px; background: #211a27; }
      .timeline-list { display: flex; flex-wrap: wrap; gap: 9px; margin: 14px 0 0; padding: 0; list-style: none; }
      .timeline-list li { padding: 9px 12px; border: 1px solid #ffffff16; border-radius: 10px; background: #302333; color: #f4e7de; font-size: 12px; }
      .timeline-list time { display: block; margin-top: 4px; color: #8ce0a7; font-weight: 700; }
      #searches summary { color: #d7c6ba; cursor: pointer; font-size: 13px; }
      #search-list { display: flex; flex-wrap: wrap; gap: 7px; margin: 12px 0 0; padding: 0; list-style: none; }
      #search-list li { padding: 6px 9px; border-radius: 8px; background: #302333; color: #ffd2ad; font-size: 11px; }
      #summary { position: sticky; top: 18px; padding: 22px; border: 1px solid #ff9a4d44; border-radius: 16px; background: linear-gradient(145deg, #39252d, #211a27); box-shadow: 0 14px 42px #00000028; }
      #summary h2 { margin: 0 0 12px; color: #ffad68; font-family: Georgia, serif; font-size: 20px; font-weight: 500; }
      #answer { margin: 0; color: #f4e7de; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
      #candidate-list { display: grid; gap: 12px; }
      .candidate { gap: 15px; padding: 17px; border-color: #ffffff16; border-radius: 15px; background: linear-gradient(120deg, #241d2a, #1d1822); box-shadow: 0 12px 32px #00000020; }
      .avatar, .avatar-image { width: 70px; height: 70px; flex: none; border-radius: 50%; }
      .avatar { display: grid; place-items: center; color: white; font-size: 19px; font-weight: 700; }
      .avatar-image { object-fit: cover; border: 2px solid #ffad6866; background: #342433; }
      .candidate h2 { color: #fff3e4; font-weight: 650; }
      .candidate-id, .meta { color: #c3b0aa; }
      .skills li { border: 1px solid #ffad6824; border-radius: 8px; background: #38252d; color: #ffd2ad; font-size: 11px; }
      .availability { color: #8ce0a7; font-size: 12px; }
      .empty { border: 1px dashed #ffffff25; border-radius: 15px; color: #c3b0aa; }
      footer { position: relative; z-index: 1; }
      @media (max-width: 720px) { main { margin-top: 48px; } #results { grid-template-columns: 1fr; } #summary { position: static; } }
      @media (max-width: 520px) { main { margin-top: 38px; } .candidate { gap: 12px; padding: 14px; } .avatar, .avatar-image { width: 54px; height: 54px; } }
    </style>
  </head>
  <body>
    <header><div class="brand"><span class="brand-mark" aria-hidden="true">🎃</span>SEANSEN <span style="color:#ffad68">AFTER DARK</span></div></header>
    <main>
      <p class="eyebrow">✦ Et snev av magi. Riktig kompetanse. ✦</p>
      <h1>Finn din neste <span>helt</span></h1>
      <p class="subtitle">Fortell oss hvem du leter etter. Vi finner matchen i mørket.</p>
      <form id="form">
        <label class="searchbox" for="question">
          <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input id="question" maxlength="2000" autocomplete="off" placeholder="Beskriv hvem du leter etter ..." aria-label="Beskriv behovet ditt">
        </label>
        <div class="buttons">
          <button id="search" type="submit">Finn konsulenter</button>
          <button id="lucky" type="button">Prøv lykken din</button>
        </div>
      </form>
      <p class="hint">Tips: ta med ferdigheter, sted og når oppdraget starter.</p>
      <p id="status" role="status" aria-live="polite"></p>
      <section id="results" aria-label="Kandidater" hidden>
        <p id="follow-up" hidden></p>
        <aside id="summary"><h2>🔮 Kort oppsummert</h2><p id="answer"></p></aside>
        <div id="team" hidden><h2>🧩 Rangert teamforslag</h2><p class="meta">Matchscore er en veiledende vurdering, ikke en garanti.</p><div id="team-grid"></div></div>
        <div id="candidate-list"></div>
        <section id="timeline" hidden>
          <h2>🕰️ Hvem blir ledig når?</h2>
          <p class="meta">Kapasiteten til kandidatene i anbefalingen</p>
          <ol class="timeline-list" id="timeline-list"></ol>
        </section>
        <details id="searches" hidden>
          <summary>Se oppslagene agenten gjorde</summary>
          <ul id="search-list"></ul>
        </details>
      </section>
    </main>
    <footer>🎃 Halloween-demo · Konsulentene er fiktive. Bildene er illustrative portretter.</footer>
    <script>
      const form = document.querySelector('#form');
      const question = document.querySelector('#question');
      const buttons = [...document.querySelectorAll('.buttons button')];
      const status = document.querySelector('#status');
      const results = document.querySelector('#results');
      const answer = document.querySelector('#answer');
      const candidateList = document.querySelector('#candidate-list');
      const followUp = document.querySelector('#follow-up');
      const team = document.querySelector('#team');
      const teamGrid = document.querySelector('#team-grid');
      const timeline = document.querySelector('#timeline');
      const timelineList = document.querySelector('#timeline-list');
      const searches = document.querySelector('#searches');
      const searchList = document.querySelector('#search-list');
      const luckyPrompts = [
        'Vi trenger en Terraform- og Azure-konsulent, helst ledig fra november.',
        'Finn en erfaren React-utvikler i Bergen som kan starte snart.',
        'Vi ser etter en dataingeniør med Python og Databricks.',
        'Trenger en prosjektleder med erfaring fra offentlig sektor.',
      ];

      function lagRangering(score) {
        const vurdering = document.createElement('div');
        vurdering.className = 'rating';
        const gyldigScore = Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
        vurdering.setAttribute('role', 'img');
        vurdering.setAttribute('aria-label', gyldigScore ? 'Matchscore ' + gyldigScore + ' av 5 gresskar' : 'Matchscore ikke tilgjengelig');
        for (let nummer = 1; nummer <= 5; nummer += 1) {
          const gresskar = document.createElement('span');
          gresskar.textContent = '🎃';
          if (!gyldigScore || nummer > gyldigScore) gresskar.className = 'empty-pumpkin';
          vurdering.append(gresskar);
        }
        const tekst = document.createElement('span');
        tekst.className = 'rating-label';
        tekst.textContent = gyldigScore ? gyldigScore + '/5' : 'ikke vurdert';
        vurdering.append(tekst);
        return vurdering;
      }

      function lagKort(kandidat, rangering = null) {
        const kort = document.createElement('article');
        kort.className = 'candidate';
        if (rangering !== null) {
          const vurdering = document.createElement('div');
          const plass = document.createElement('span');
          plass.className = 'candidate-rank';
          plass.textContent = '#' + rangering;
          vurdering.append(plass, lagRangering(kandidat.score));
          kort.append(vurdering);
        }
        const avatar = document.createElement('img');
        avatar.className = 'avatar-image';
        avatar.alt = 'Illustrasjonsportrett';
        avatar.loading = 'lazy';
        const bildeNummer = Number(kandidat.id.slice(1)) % 70 + 1;
        avatar.src = 'https://i.pravatar.cc/160?img=' + bildeNummer;
        avatar.addEventListener('error', () => {
          const fallback = document.createElement('div');
          fallback.className = 'avatar';
          fallback.setAttribute('aria-hidden', 'true');
          fallback.textContent = kandidat.navn.split(/\\s+/).slice(0, 2).map((del) => del[0]).join('').toUpperCase();
          avatar.replaceWith(fallback);
        }, { once: true });

        const innhold = document.createElement('div');
        innhold.className = 'candidate-content';
        const overskrift = document.createElement('div');
        overskrift.className = 'candidate-heading';
        const navn = document.createElement('h2');
        navn.textContent = kandidat.navn;
        const id = document.createElement('span');
        id.className = 'candidate-id';
        id.textContent = kandidat.id;
        overskrift.append(navn, id);

        const meta = document.createElement('p');
        meta.className = 'meta';
        meta.textContent = [kandidat.rolle, 'Grad ' + kandidat.grad, kandidat.lokasjon].filter(Boolean).join(' · ');
        const ferdigheter = document.createElement('ul');
        ferdigheter.className = 'skills';
        for (const ferdighet of kandidat.ferdigheter.slice(0, 5)) {
          const merke = document.createElement('li');
          merke.textContent = ferdighet.ferdighet + ' · ' + ferdighet.nivå + '/5';
          ferdigheter.append(merke);
        }

        innhold.append(overskrift, meta, ferdigheter);
        if (kandidat.tilgjengelighet) {
          const tilgjengelighet = document.createElement('p');
          tilgjengelighet.className = 'availability';
          const prosent = kandidat.tilgjengelighet.ledig_prosent;
          tilgjengelighet.textContent = prosent + '% ledig fra ' + kandidat.tilgjengelighet.ledig_fra;
          innhold.append(tilgjengelighet);
        }
        if (kandidat.reason) {
          const grunn = document.createElement('p');
          grunn.className = 'match-reason';
          grunn.textContent = kandidat.reason;
          innhold.append(grunn);
        }
        kort.append(avatar, innhold);
        return kort;
      }

      function lagTeamKort(forslag, index, profiler) {
        const kort = document.createElement('article');
        kort.className = 'team-card';
        const topp = document.createElement('div');
        topp.className = 'team-title';
        const navn = document.createElement('h3');
        navn.textContent = forslag.name || 'Teamforslag ' + (index + 1);
        const plass = document.createElement('span');
        plass.className = 'rank';
        plass.textContent = '#' + (index + 1);
        topp.append(navn, plass);
        kort.append(topp, lagRangering(forslag.score));
        if (forslag.reason) {
          const grunn = document.createElement('p');
          grunn.className = 'team-reason';
          grunn.textContent = forslag.reason;
          kort.append(grunn);
        }
        const medlemmer = document.createElement('div');
        medlemmer.className = 'team-members';
        for (const medlem of forslag.members) {
          const profil = profiler.get(medlem.id);
          if (!profil) continue;
          const rad = document.createElement('div');
          rad.className = 'team-member';
          const avatar = document.createElement('img');
          avatar.className = 'avatar-image';
          avatar.alt = '';
          avatar.loading = 'lazy';
          avatar.src = 'https://i.pravatar.cc/160?img=' + (Number(profil.id.slice(1)) % 70 + 1);
          avatar.addEventListener('error', () => {
            const fallback = document.createElement('div');
            fallback.className = 'avatar';
            fallback.textContent = profil.navn.split(/\\s+/).slice(0, 2).map((del) => del[0]).join('').toUpperCase();
            avatar.replaceWith(fallback);
          }, { once: true });
          const info = document.createElement('div');
          info.className = 'team-member-info';
          const memberName = document.createElement('strong');
          memberName.textContent = profil.navn + ' · ' + profil.id;
          const role = document.createElement('span');
          role.textContent = medlem.role || profil.rolle;
          info.append(memberName, role);
          rad.append(avatar, info);
          medlemmer.append(rad);
        }
        kort.append(medlemmer);
        return kort;
      }

      async function sendSøk(tekst) {
        question.value = tekst;
        buttons.forEach((button) => { button.disabled = true; });
        status.textContent = 'Leter etter de beste kandidatene ...';
        results.hidden = true;
        answer.textContent = '';
        followUp.hidden = true;
        team.hidden = true;
        candidateList.hidden = false;
        timeline.hidden = true;
        searches.hidden = true;
        candidateList.replaceChildren();
        teamGrid.replaceChildren();
        timelineList.replaceChildren();
        searchList.replaceChildren();
        try {
          const response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: tekst }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Forespørselen feilet.');
          if (data.followUp) {
            followUp.textContent = data.followUp;
            followUp.hidden = false;
            status.textContent = 'Trenger en opplysning før jeg kan søke.';
            results.hidden = false;
            return;
          }
          answer.textContent = data.summary;
          if (data.formatError) status.textContent = 'Svaret kunne ikke rangeres automatisk.';
          const profilerPerId = new Map((data.profiles || []).map((profil) => [profil.id, profil]));
          if (data.teams?.length) {
            data.teams.forEach((forslag, index) => teamGrid.append(lagTeamKort(forslag, index, profilerPerId)));
            team.hidden = false;
          }
          if (data.candidates?.length) {
            data.candidates.forEach((kandidat, index) => candidateList.append(lagKort(kandidat, index + 1)));
          } else if (!data.teams?.length) {
            const ingen = document.createElement('p');
            ingen.className = 'empty';
            ingen.textContent = 'Ingen kandidater ble funnet. Juster behovet og prøv igjen.';
            candidateList.append(ingen);
          } else {
            candidateList.hidden = true;
          }
          const datoFormatert = (dato) => new Intl.DateTimeFormat('no-NO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dato + 'T12:00:00'));
          const kapasitetslinje = (data.timeline || []).slice().sort((a, b) => a.ledig_fra.localeCompare(b.ledig_fra));
          for (const rad of kapasitetslinje) {
            const kandidat = data.profiles.find((profil) => profil.id === rad.id);
            if (!kandidat) continue;
            const punkt = document.createElement('li');
            punkt.append(document.createTextNode(kandidat.navn + ' · ' + rad.ledig_prosent + '%'));
            const tidspunkt = document.createElement('time');
            tidspunkt.dateTime = rad.ledig_fra;
            tidspunkt.textContent = datoFormatert(rad.ledig_fra);
            punkt.append(tidspunkt);
            timelineList.append(punkt);
          }
          timeline.hidden = timelineList.children.length === 0;
          const verktøyNavn = {
            sok_kompetanse: 'Kompetanse',
            sjekk_tilgjengelighet: 'Tilgjengelighet',
            hent_cv: 'CV',
            finn_prosjekthistorikk: 'Prosjekthistorikk',
          };
          for (const kall of data.toolCalls || []) {
            const punkt = document.createElement('li');
            const søkedetalj = kall.input.ferdighet || kall.input.ider?.join(', ') || kall.input.id || '';
            punkt.textContent = (verktøyNavn[kall.name] || kall.name) + (søkedetalj ? ': ' + søkedetalj : '');
            searchList.append(punkt);
          }
          searches.hidden = searchList.children.length === 0;
          results.hidden = false;
          status.textContent = data.formatError ? 'Svaret kunne ikke rangeres automatisk.' : 'Ferdig.';
        } catch (error) {
          status.textContent = error.message || 'Noe gikk galt. Prøv igjen.';
        } finally {
          buttons.forEach((button) => { button.disabled = false; });
        }
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (question.value.trim()) sendSøk(question.value.trim());
        else question.focus();
      });

      document.querySelector('#lucky').addEventListener('click', () => {
        const tilfeldig = luckyPrompts[Math.floor(Math.random() * luckyPrompts.length)];
        sendSøk(tilfeldig);
      });
    </script>
  </body>
</html>`;

function svar(res, status, innhold, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(innhold) : innhold);
}

async function lesBody(req) {
  const biter = [];
  let lengde = 0;
  for await (const bit of req) {
    lengde += bit.length;
    if (lengde > maksBodyLengde) throw new Error('Forespørselen er for stor.');
    biter.push(bit);
  }
  return Buffer.concat(biter).toString('utf8');
}

const { ANTHROPIC_API_KEY } = process.env;
if (!ANTHROPIC_API_KEY) {
  console.error('Mangler ANTHROPIC_API_KEY. Sett den som miljøvariabel i Azure App Service.');
  process.exit(1);
}

const { kjørAgent } = await import('./agent.js');
const { system, verktøy, profiler, tilgjengelighet } = await import('./verktoy.js');

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    svar(res, 200, html, 'text/html; charset=utf-8');
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/ask') {
    svar(res, 404, { error: 'Fant ikke siden.' });
    return;
  }

  const nå = Date.now();
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'ukjent';
  const vindu = forespørslerPerIp.get(ip);
  if (!vindu || nå - vindu.start >= vinduMs) {
    forespørslerPerIp.set(ip, { start: nå, antall: 1 });
  } else if (vindu.antall >= maksForespørslerPerVindu) {
    svar(res, 429, { error: 'For mange forespørsler. Vent litt og prøv igjen.' });
    return;
  } else {
    vindu.antall += 1;
  }

  const protokoll = req.headers['x-forwarded-proto']?.split(',')[0] === 'https' ? 'https' : 'http';
  const forventetOrigin = `${protokoll}://${req.headers.host}`;
  if (req.headers.origin !== forventetOrigin) {
    svar(res, 403, { error: 'Forespørselen ble avvist.' });
    return;
  }
  if (!req.headers['content-type']?.startsWith('application/json')) {
    svar(res, 415, { error: 'Forventet JSON-data.' });
    return;
  }

  try {
    const data = JSON.parse(await lesBody(req));
    if (!data || typeof data.question !== 'string' || !data.question.trim() || data.question.length > 2000) {
      svar(res, 400, { error: 'Skriv inn et spørsmål på mellom 1 og 2000 tegn.' });
      return;
    }

    const agentSvar = await kjørAgent({ system, oppgave: data.question.trim(), verktøy });
    const agentTekst = agentSvar?.content
      ?.filter((blokk) => blokk.type === 'text')
      .map((blokk) => blokk.text)
      .join('\n\n');
    const resultat = lesAgentResultat(agentTekst);
    if (resultat.formatError) console.warn('Agenten returnerte ikke forventet resultatformat.');
    if (resultat.type === 'follow_up') {
      svar(res, 200, { followUp: resultat.followUp || 'Kan du beskrive hvilke ferdigheter eller roller du trenger?' });
      return;
    }

    const profilerPerId = new Map(profiler.map((profil) => [profil.id, profil]));
    const profilForId = (id) => {
        const profil = profilerPerId.get(id);
        return profil ? {
        id: profil.id,
        navn: profil.navn,
        grad: profil.grad,
        rolle: profil.rolle,
        lokasjon: profil.lokasjon,
        ferdigheter: [...profil.kompetanse].sort((a, b) => b.nivå - a.nivå).slice(0, 5),
        tilgjengelighet: tilgjengelighet.find((rad) => rad.id === profil.id) ?? null,
        } : null;
    };
    const candidates = resultat.candidates.flatMap((candidate) => {
      const profil = profilForId(candidate.id);
      return profil ? [{ ...profil, score: candidate.score, reason: candidate.reason }] : [];
    }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const teams = resultat.teams.map((team) => ({
      ...team,
      members: team.members.flatMap((member) => {
        const profil = profilForId(member.id);
        return profil ? [{ ...profil, role: member.role || profil.rolle, contribution: member.reason }] : [];
      }),
    })).filter((team) => team.members.length > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const profileIds = new Set([
      ...candidates.map((candidate) => candidate.id),
      ...teams.flatMap((team) => team.members.map((member) => member.id)),
    ]);
    const profiles = [...profileIds].map(profilForId).filter(Boolean);
    svar(res, 200, {
      type: resultat.type,
      formatError: resultat.formatError,
      summary: resultat.summary || 'Søket er ferdig. Se forslagene under.',
      teams,
      candidates,
      profiles,
      timeline: profiles
        .map((profil) => profil.tilgjengelighet)
        .filter(Boolean)
        .map(({ id, ledig_fra, ledig_prosent }) => ({ id, ledig_fra, ledig_prosent })),
      toolCalls: agentSvar?.toolCalls ?? [],
    });
  } catch (error) {
    console.error('Forespørselen til bemanningsagenten feilet:', error.message);
    svar(res, 500, { error: 'Agenten kunne ikke fullføre forespørselen. Prøv igjen senere.' });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`Bemanningsagenten lytter på port ${port}.`);
});
