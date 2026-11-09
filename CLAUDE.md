# IT-oppimissovellus (Duolingo-tyylinen)

Henkilökohtainen oppimissovellus tietotekniikan alalle: perusteista syventäviin aiheisiin.
Käyttäjä: yksi henkilö (Ville). Käyttö sekä puhelimella (iPhone, PWA) että koneella selaimessa.
Edistymisen pitää synkronoitua laitteiden välillä.

## Tekniikka

- Vite + React + TypeScript, Tailwind CSS
- PWA: vite-plugin-pwa (asennettavissa iPhonen Koti-valikkoon, toimii offline)
- Reititys: React Router
- Sisällön validointi: Zod (kaikki JSON-sisältö validoidaan latauksessa ja testeissä)
- Tallennus: local-first (IndexedDB, esim. Dexie), synkronointi Supabaseen (vaihe 5)
- Paketinhallinta: pnpm. Ympäristö: WSL Ubuntu
- Ennen jokaista committia: `pnpm lint && tsc --noEmit && pnpm test`

## Sisällön rakenne

Polku (path) → taso (1 perusteet, 2 syventävä, 3 edistynyt) → yksikkö (unit) → oppitunti + harjoitukset → tason koe

```
content/
  paths.json                 # polkujen lista ja järjestys
  <path-id>/
    path.json                # nimi, kuvaus, tasot, tasotesti
    units/<unit-id>.json     # teoria + harjoitukset
    exams/level-<n>.json     # tason koe
    terms.json               # polun termit (termiosio, vaihe 3b)
```

### Polut

1. computer-basics – Tietokoneen toiminta: rauta, CPU/muisti/tallennus, käyttöjärjestelmä, tiedostojärjestelmät
2. networks – Verkot: IP, DNS, HTTP/HTTPS, portit, client–server
3. linux – Komentorivi, WSL, oikeudet, prosessit, nano
4. programming-basics – Kieliriippumaton: muuttujat, ehdot, silmukat, funktiot, tietorakenteet, algoritmit
5. cpp – C++
6. python – Python, pandas, numpy
7. javascript – JavaScript ja TypeScript
8. react – React, hookit, Context, reducer, Vite
9. kotlin – Kotlin ja Jetpack Compose
10. web – HTML, CSS, Tailwind, Next.js
11. backend – Node.js, Express, REST, JWT, Swagger/OpenAPI
12. databases – SQL, PostgreSQL, SQLite, Prisma
13. devops – Git, GitLab CI/CD, Docker, Docker Compose, deploy
14. dev-tools – VS Code, Android Studio, Spyder/Anaconda, debuggerit
15. ai – Tekoälyn perusteet, koneoppiminen, Decision Tree, Random Forest, LLM:t
16. iot – IoT: sensorit, yhteydet, MQTT, tietoturva (ei Arduino-tehtäviä)
17. security – Tietoturvan perusteet: salasanat ja hashaus (argon2), injektiot, XSS, HTTPS

### Yksikön JSON-muoto

```json
{
  "id": "python-1-03",
  "title": "Listat",
  "level": 1,
  "theory": "Lyhyt teoria markdownina (max ~300 sanaa).",
  "exercises": [
    { "id": "e1", "type": "multiple_choice", "prompt": "...", "options": ["a", "b", "c", "d"], "answer": 1, "explanation": "..." },
    { "id": "e2", "type": "code_output", "language": "python", "code": "print([1,2][0])", "answer": "1", "verified": true, "explanation": "..." },
    { "id": "e3", "type": "fill_blank", "language": "python", "code": "nums.___(5)", "answers": ["append"], "explanation": "..." },
    { "id": "e4", "type": "order_lines", "language": "python", "lines": ["for x in nums:", "    print(x)"], "explanation": "..." },
    { "id": "e5", "type": "match_pairs", "pairs": [["list", "muuttuva"], ["tuple", "muuttumaton"]], "explanation": "..." },
    { "id": "e6", "type": "find_bug", "language": "python", "code": "...", "bugLine": 3, "explanation": "..." }
  ]
}
```

- `order_lines`: rivit annetaan oikeassa järjestyksessä, sovellus sekoittaa ne.
- `match_pairs`: sovellus sekoittaa oikean sarakkeen.
- Jokaisessa harjoituksessa on `explanation`, joka näytetään vastauksen jälkeen.

### Termien JSON-muoto (`terms.json`)

```json
{
  "terms": [
    {
      "id": "dns",
      "term": "DNS",
      "en": "Domain Name System",
      "definition": "Palvelu, joka muuntaa verkkotunnuksen (esim. google.com) IP-osoitteeksi.",
      "example": "Selain kysyy DNS:ltä, mikä IP-osoite vastaa nimeä.",
      "level": 1,
      "unit": "networks-1-02"
    }
  ]
}
```

- `en` (englanninkielinen nimi/aukikirjoitus) ja `example` ovat valinnaisia.
- `unit` = yksikkö, jossa termi opetetaan; termi aukeaa harjoiteltavaksi, kun yksikkö on suoritettu.
- Termit noudattavat samoja laatusääntöjä kuin muu sisältö (ei keksittyjä määritelmiä).

## Sisällön laatusäännöt (tärkeä)

- Kieli suomi, alan englanninkieliset termit suluissa ensimmäisellä kerralla.
- Kaikki `code_output`-vastaukset TARKISTETAAN AJAMALLA koodi (python3, node, g++ jne.).
  Jos kieltä ei voi ajaa ympäristössä, merkitse `"verified": false`.
- Ei keksittyjä faktoja. Jos aiheesta ei ole varmuutta, jätä kysymys pois.
- Taso 1 olettaa nolla-osaamisen; taso 3 vastaa työelämän osaamista.
- Yksi yksikkö = 8–12 harjoitusta, sekoitus eri tyyppejä.
- Tee validointiskripti (`pnpm validate-content`), joka ajaa Zod-skeemat kaikkiin tiedostoihin.
- Yksikössä vähintään 3 eri harjoitustyyppiä (validate-content: virhe). Varoitukset: teoria > 350 sanaa,
  yksiköllä ei termejä, tasolta puuttuu exams/level-n.json.

- Tason 1 sisällysluettelo: `docs/syllabus.md` (hyväksytty). programming-basics käyttää esimerkkikielenä Pythonia.

### Sisällön tarkistus

- `pnpm validate-content` – Zod-skeemat, ristiintarkistukset ja laatusäännöt.
- `pnpm verify-code` – ajaa kaikki `code_output`-koodit ja vertaa tulosteeseen (`--find-bug` listaa
  myös kaatumattomat find_bug-koodit käsin tarkistettaviksi). Säännöt: ajettava kieli → `verified: true`
  ja tulosteen pitää täsmätä; ei-ajettava kieli → `verified: false`.
- Ajoympäristöt: python3, g++ (C++20) ja bash WSL:ssä; JavaScript/TypeScript Nodella (tsx);
  `sql` = SQLite-yhteensopiva (ajetaan Pythonin sqlite3:lla, tuloste kuten sqlite3-CLI: sarakkeet `|`-merkillä,
  NULL tyhjänä); `postgresql` = PostgreSQL-kohtainen (ei ajettavissa → `verified: false`);
  pandas/numpy-koodi Windows-venvillä `~/.venvs/it-oppi` (Python 3.13). Kotlin ei ajettavissa → `verified: false`.
- Sisällön tiedostot kirjoitetaan Write/Edit-työkalulla, ei Bash-heredocilla (heredoc muuttaa `\\` → `\`).
- Sovellus lataa sisältöindeksin (polut, termit, kokeet, yksiköiden otsikot) käynnistyksessä ja
  yksiköiden sisällön tarvittaessa omina paloinaan (`src/content/loader.ts`, `content-plugin.ts`).

## Pelimekaniikka

- XP: oikea vastaus +10, virheetön oppitunti +20 bonus
- Päiväputki (streak) ja päivätavoite (esim. 50 XP)
- Avaukset: yksikkö aukeaa, kun edellinen on suoritettu. Taso 2 aukeaa, kun tason 1 koe ≥ 80 %.
- Tasotesti: jokaisessa polussa voi hypätä tason 1 yli testillä (≥ 80 %).
- Kertaus: väärin menneet harjoitukset menevät kertausjonoon (Leitner-laatikot: 1, 3, 7, 14 päivää).
- Kokeet: 20 kysymystä tason yksiköistä, ei vihjeitä, tulos ja virheiden läpikäynti lopuksi.
- "Ilmoita virheestä" -nappi jokaisessa harjoituksessa → tallentuu listaan, jonka voi korjata myöhemmin.
  (IndexedDB:ssä vaiheesta 3 alkaen.)
- Putki kasvaa jokaisena päivänä, jona on ansaittu XP:tä (päivätavoitetta ei vaadita).
- Kertaus ja kokeet: +10 XP per oikea; virheettömyysbonus +20 vain oppitunneista.
- Yksikkö on suoritettu, kun oppitunti on viety loppuun (pisteistä riippumatta).
- Kertauskierroksessa enintään 20 erääntynyttä harjoitusta.
- Oppitunnilla väärin menneet kysytään uudelleen lopussa; XP ja virheettömyys lasketaan 1. yrityksistä.
- Termit: harjoittelutilat kortit (flashcards), tunnista termi määritelmästä (4 vaihtoehtoa, häiriövaihtoehdot
  saman polun termeistä) ja parit (match_pairs). Termeillä on omat Leitner-laatikot (1, 3, 7, 14 päivää).
  Oikea vastaus +5 XP päivätavoitteeseen. Opittu termi (14 pv laatikko) jää 14 pv kiertoon, ei poistu.
  Kierroksessa 10 termiä (ensin erääntyneet, sitten uudet). Päänappi = sekoitus (uudet kortteina,
  tutut tunnistuksena/pareina), lisäksi yksittäinen tila valittavissa. Sanastossa kaikki termit, lukitut merkitty.

## Ulkoasu

- Teema seuraa laitetta (vaalea/tumma). Värit vain tokeneina (`src/index.css`): `bg`, `surface`, `ink`, `muted`,
  `primary` (kaikki toiminnot), `good`/`bad` (vain palaute). Ei kovakoodattuja Tailwind-värejä (slate-, green- jne.).
- Jokaisella polulla oma sävy ja kuvake: `src/ui/pathStyle.ts` (lisää uusi polku sinne). Polun väri näkyy
  kuvakkeessa, polkukartalla, oppitunnin otsikossa ja edistymispalkeissa (`path-tone` + `pathTone(id)`).
- Yhteiset osat: `src/ui/components.tsx` (PageHeader, PathIcon, ProgressBar, EmptyState, ActionBar),
  `src/ui/runner.tsx` (harjoitusnäkymän yläpalkki, palaute, tulosnäkymä), `src/ui/styles.ts` (buttonClass, surface).
- Fontit (niputettu, toimivat offline): Bricolage Grotesque otsikoille ja luvuille, Atkinson Hyperlegible Next
  tekstille, JetBrains Mono koodille. Kuvakkeet: lucide-react, ei emojeja.
- Rauhallinen ja asiallinen tyyli; tyhjät tilat kertovat, mitä tehdä seuraavaksi.

## Näkymät

- Etusivu: päivän tavoite, putki, "jatka siitä mihin jäit", kertausjonon koko
- Polkukartta (Duolingo-tyylinen polku yksiköistä)
- Oppitunti: teoria → harjoitukset yksi kerrallaan → yhteenveto
- Koe
- Tilastot: XP historia, osaaminen per polku, heikoimmat aiheet
- Termit (oma välilehti alanavigaatiossa): polun valinta, harjoittelutilat ja haettava sanasto
- Asetukset: synkka, datan vienti/tuonti JSONina, virheilmoitusten lista

## Toteutusvaiheet

1. Pohja: projekti, PWA, reititys, Zod-skeemat, sisällön lataus, 1 esimerkkiyksikkö
2. Kaikki 6 harjoitustyyppiä + oppitunnin kulku ja palaute (mobiili ensin)
3. Edistyminen: IndexedDB, XP, putki, avaukset, kokeet, tasotesti, kertausjono, tilastot
3b. Termiosio: terms.json-skeema ja validointi, Termit-näkymä, harjoittelutilat, termien Leitner-kertaus
4. Sisältö: ensin taso 1 kaikkiin polkuihin, sitten taso 2 ja 3. Termit kirjoitetaan yksiköiden rinnalla. Jokainen erä validoidaan.
5. Synkka: Supabase (auth + progress-taulu), local-first, konfliktissa uusin voittaa
6. Deploy (staattinen hostaus) ja asennus iPhoneen

Toteuta yksi vaihe kerrallaan. Jokaisen vaiheen lopuksi: testit, lint, tsc ja commit "Phase N completed".
