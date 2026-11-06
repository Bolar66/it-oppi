# Sisällysluettelo – taso 1 (perusteet)

Taso 1 olettaa nolla-osaamisen. Jokaisessa yksikössä: teoria (~300 sanaa), 8–12 harjoitusta
(vähintään 3 tyyppiä), 3–6 termiä. Yksikön id: `<polku>-1-<nn>`.

Merkinnät: ▶ = `code_output`-tarkistus ajamalla, ◇ = koodia ei voi ajaa (`verified: false` tai ei
`code_output`-tehtäviä).

---

## 1. computer-basics – Tietokoneen toiminta (7) ◇

1. **Mikä tietokone on?** – syöte → käsittely → tuloste, laitteisto (hardware) ja ohjelmisto (software), tietokoneen pääosat
2. **Bitit ja tavut** – binaariluvut, bitti, tavu, kilo-/mega-/gigatavu (ja kibi-/mebitavu), tekstin esittäminen numeroina (ASCII, UTF-8)
3. **Prosessori (CPU)** – käskyjen suorittaminen, kellotaajuus, ytimet, säikeet
4. **Keskusmuisti (RAM)** – muisti vs. tallennustila, haihtuvuus, välimuisti (cache)
5. **Tallennus** – HDD vs. SSD, kapasiteetti ja nopeus, ulkoinen ja pilvitallennus
6. **Käyttöjärjestelmä** – tehtävät (resurssit, prosessit, ajurit, käyttöliittymä), yleisimmät käyttöjärjestelmät
7. **Tiedostot ja tiedostojärjestelmät** – tiedosto, kansio, polku (absoluuttinen/suhteellinen), tiedostopääte, NTFS/ext4/FAT32

## 2. networks – Verkot (7) ◇

1. **Mikä verkko on?** – LAN, WAN, Internet; reititin, kytkin, langaton ja langallinen yhteys
2. **IP-osoitteet** – IPv4:n rakenne, julkinen vs. yksityinen osoite, localhost (127.0.0.1), IPv6 lyhyesti
3. **DNS** – nimestä IP-osoitteeksi, nimipalvelin, hosts-tiedosto
4. **Portit ja protokollat** – portti, TCP vs. UDP, yleiset portit (22, 53, 80, 443)
5. **Asiakas ja palvelin (client–server)** – pyyntö ja vastaus, URL:n osat
6. **HTTP** – metodit (GET, POST, PUT, DELETE), tilakoodit (200, 301, 404, 500), otsakkeet
7. **HTTPS** – salaus, TLS, sertifikaatti, miksi HTTPS on välttämätön

## 3. linux – Komentorivi (7) ▶ bash

1. **Komentorivi ja shell** – terminaali, shell, bash, kehote, komento + argumentit + valitsimet
2. **WSL** – Linux Windowsissa, `wsl --install`, Windowsin tiedostot `/mnt/c`:ssä
3. **Hakemistot** – `pwd`, `ls`, `cd`, `mkdir`, polut, `~`, `.` ja `..`
4. **Tiedostojen käsittely** – `touch`, `cp`, `mv`, `rm`, `cat`, `less`, nano-editorin perusteet
5. **Oikeudet** – r/w/x, omistaja/ryhmä/muut, `ls -l`:n lukeminen, `chmod` (755, 644), `sudo`
6. **Prosessit** – `ps`, `top`, `kill`, Ctrl+C, taustalle ajo (`&`)
7. **Putket ja uudelleenohjaus** – `|`, `>`, `>>`, `grep`, `wc`, `sort`

## 4. programming-basics – Ohjelmoinnin perusteet (8) ▶ python

Esimerkkikielenä Python (helpoin lukea), mutta asiat esitetään kieliriippumattomasti.

1. **Mitä ohjelmointi on?** – algoritmi, ohjelma, syntaksi, kääntäjä vs. tulkki
2. **Muuttujat ja tietotyypit** – muuttuja, sijoitus, kokonaisluku, liukuluku, merkkijono, totuusarvo
3. **Operaattorit ja lausekkeet** – aritmetiikka, vertailu, loogiset operaattorit, laskujärjestys
4. **Ehtolauseet** – if/else, sisäkkäiset ehdot, totuustaulut
5. **Silmukat** – for ja while, ikuinen silmukka, break
6. **Funktiot** – parametrit, paluuarvo, näkyvyys (scope)
7. **Tietorakenteet** – lista/taulukko, indeksointi, sanakirja (map)
8. **Algoritmit** – lineaarihaku, suurimman arvon etsintä, järjestämisen idea, tehokkuuden intuitio

## 5. cpp – C++ (7) ▶ g++

1. **Ensimmäinen C++-ohjelma** – `main`, `#include <iostream>`, `std::cout`, kääntäminen g++:lla
2. **Muuttujat ja tyypit** – `int`, `double`, `char`, `bool`, `std::string`, `auto`
3. **Operaattorit ja syöte** – aritmetiikka, kokonaislukujako ja jakojäännös, `std::cin`
4. **Ehdot** – if/else, `switch`
5. **Silmukat** – for, while, do-while
6. **Funktiot** – määrittely, paluuarvo, parametrit arvona ja viittauksena (`&`)
7. **Vektorit** – `std::vector`, `push_back`, `size`, range-for

## 6. python – Python (8) ▶ python3

1. **Ensimmäinen ohjelma: print ja muuttujat** *(valmis)*
2. **Syöte ja tyyppimuunnokset** – `input()`, `int()`, `str()`, f-merkkijonot
3. **Ehdot** – if/elif/else, vertailut, `and`/`or`/`not`
4. **Silmukat** – for, `range()`, while
5. **Listat** – indeksointi, `append`, `len`, läpikäynti
6. **Sanakirjat ja tuplet** – avain–arvo, läpikäynti, muuttuva vs. muuttumaton
7. **Funktiot** – `def`, parametrit, `return`, oletusarvot
8. **Merkkijonojen käsittely** – metodit, viipalointi (slicing), `split` ja `join`

(pandas ja numpy tasolla 2.)

## 7. javascript – JavaScript ja TypeScript (8) ▶ node / tsx

1. **JavaScript ja sen ajaminen** – selain ja Node.js, `console.log`
2. **Muuttujat ja tyypit** – `let`, `const`, primitiivityypit, `typeof`
3. **Operaattorit ja vertailu** – `===` vs. `==`, totuudellisuus (truthy/falsy)
4. **Ehdot ja silmukat** – if/else, for, for...of, while
5. **Funktiot** – funktiomäärittely, nuolifunktiot, parametrit
6. **Taulukot** – `push`, `map`, `filter`, `find`, `length`
7. **Oliot** – ominaisuudet, metodit, JSON
8. **TypeScriptin perusteet** – tyyppimerkinnät, miksi TypeScript, tyyppivirheet ennen ajoa

## 8. react – React (6) ◇ (JS-esimerkit ajetaan, JSX ei)

1. **Mikä React on?** – komponentit, deklaratiivinen käyttöliittymä, projekti Vitellä
2. **JSX** – HTML:n kaltainen syntaksi, lausekkeet `{}`:ssä, `className`
3. **Komponentit ja props** – funktiokomponentti, propsit, koostaminen
4. **Tila: useState** – tila, päivitys, uudelleenrenderöinti
5. **Tapahtumat ja lomakkeet** – `onClick`, `onChange`, kontrolloitu syötekenttä
6. **Listat ja ehdollinen renderöinti** – `map`, `key`, `&&` ja ternäärioperaattori

(Muut hookit, Context ja reducer tasolla 2.)

## 9. kotlin – Kotlin (7) ◇ (Kotlin ei asennettu → `verified: false`)

1. **Kotlin ja ensimmäinen ohjelma** – `fun main`, `println`, mihin Kotlinia käytetään
2. **Muuttujat** – `val` vs. `var`, tyypit, tyyppipäättely
3. **Ehdot ja when** – if lausekkeena, `when`
4. **Silmukat ja välit** – for, `..`, `until`, `step`, while
5. **Funktiot** – `fun`, parametrit, oletusarvot, lausekefunktiot
6. **Kokoelmat** – `listOf`, `mutableListOf`, `mapOf`, `forEach`
7. **Null-turvallisuus** – `?`, `?.`, `?:`, `!!`

(Jetpack Compose tasolla 2.)

## 10. web – Web (7) ◇

1. **Miten verkkosivu toimii?** – HTML, CSS ja JavaScript; selain hakee ja piirtää sivun
2. **HTML:n rakenne** – elementit, attribuutit, `head` ja `body`
3. **Sisältö ja semantiikka** – otsikot, linkit, kuvat, listat, semanttiset elementit
4. **Lomakkeet** – `form`, `input`, `label`, `button`
5. **CSS:n perusteet** – valitsimet, värit, fontit, laatikkomalli (box model)
6. **Asettelu Flexboxilla** – `display: flex`, suunta, tasaus
7. **Responsiivisuus** – viewport, media queryt, mobiili ensin

(Tailwind ja Next.js tasolla 2.)

## 11. backend – Backend (7) ▶ node

1. **Mikä backend on?** – palvelin, API, tietokanta, frontendin ja backendin työnjako
2. **Node.js** – JavaScript palvelimella, npm, moduulit (`import`/`require`)
3. **HTTP-palvelin Nodella** – `http`-moduuli, pyyntö ja vastaus
4. **Express ja reitit** – `app.get`/`app.post`, reittiparametrit
5. **REST** – resurssit, metodit, tilakoodit
6. **JSON ja pyynnön data** – `express.json()`, `req.params`, `req.query`, `req.body`
7. **Middleware ja virheet** – middleware-ketju, virheenkäsittely, 404

(JWT ja Swagger/OpenAPI tasolla 2.)

## 12. databases – Tietokannat (7) ▶ SQLite

1. **Mikä tietokanta on?** – taulu, rivi, sarake, relaatiotietokanta, SQL
2. **SELECT** – sarakkeiden valinta, `*`, `AS`
3. **WHERE ja ORDER BY** – ehdot, `AND`/`OR`, `LIKE`, järjestys, `LIMIT`
4. **Datan muokkaus** – `INSERT`, `UPDATE`, `DELETE`
5. **Avaimet** – pääavain (primary key), viiteavain (foreign key)
6. **JOIN** – taulujen yhdistäminen, `INNER JOIN`, `LEFT JOIN`
7. **Yhteenvedot** – `COUNT`, `SUM`, `AVG`, `GROUP BY`

(PostgreSQL ja Prisma tasolla 2.)

## 13. devops – Git, Docker, CI/CD (7) ◇

1. **Versionhallinta** – miksi, repositorio, commit, historia
2. **Gitin perusteet** – `init`, `status`, `add`, `commit`, `log`, `.gitignore`
3. **Haarat** – `branch`, `switch`, `merge`, konfliktin idea
4. **Etärepositoriot** – `clone`, `push`, `pull`, GitLab ja GitHub
5. **Kontit ja Docker** – image vs. container, miksi kontit
6. **Docker-komennot ja Dockerfile** – `docker run`, `ps`, `build`, Dockerfilen perusrivit
7. **CI/CD** – jatkuva integraatio ja toimitus, pipeline, GitLab CI:n idea

## 14. dev-tools – Kehitystyökalut (6) ◇

1. **Kehitysympäristö** – editori vs. IDE, mitä työkaluja ohjelmoija tarvitsee
2. **VS Code** – komentopaletti, pikanäppäimet, laajennukset, integroitu terminaali
3. **Debuggauksen perusteet** – keskeytyskohta (breakpoint), askellus, muuttujien seuranta
4. **Virheilmoitusten lukeminen** – stack trace, rivinumero, virhetyyppi
5. **Android Studio** – projekti, emulaattori, Gradle lyhyesti
6. **Anaconda ja Spyder** – ympäristöt, conda vs. pip, Spyderin muuttujanäkymä

## 15. ai – Tekoäly (7) ▶ python

1. **Mitä tekoäly on?** – kapea vs. yleinen tekoäly, mihin sitä käytetään
2. **Koneoppiminen** – data, malli, opettaminen; ohjattu, ohjaamaton ja vahvistusoppiminen
3. **Data ja piirteet** – piirre (feature), luokka (label), opetus- ja testidata
4. **Päätöspuu** – solmut ja lehdet, jakosäännöt, tulkittavuus
5. **Satunnaismetsä** – monta puuta, äänestys, miksi parempi kuin yksi puu
6. **Mallin arviointi** – tarkkuus (accuracy), ylisovitus (overfitting)
7. **Suuret kielimallit** – tokenit, seuraavan tokenin ennustaminen, hallusinaatiot

## 16. iot – Esineiden internet (6) ◇ (ei Arduino-tehtäviä)

1. **Mitä IoT on?** – laite, sensori, verkko, pilvi; esimerkkejä
2. **Sähkön perusteet** – jännite, virta, vastus, Ohmin laki, LED ja etuvastus
3. **Sensorit ja toimilaitteet** – digitaalinen vs. analoginen signaali, AD-muunnos, yleisiä sensoreita
4. **Yhteydet** – Wi-Fi, Bluetooth, LoRaWAN, sarjaliikenne; virrankulutus ja kantama
5. **MQTT** – välittäjä (broker), julkaise/tilaa, aihe (topic), QoS
6. **IoT:n tietoturva** – oletussalasanat, päivitykset, verkon eriyttäminen

## 17. security – Tietoturva (7) ◇ (+ python-esimerkkejä)

1. **Tietoturvan perusteet** – luottamuksellisuus, eheys, saatavuus (CIA)
2. **Salasanat** – vahva salasana, salasanojen hallinta, monivaiheinen tunnistautuminen (MFA)
3. **Hashaus** – hash vs. salaus, suola (salt), argon2/bcrypt, miksi ei MD5:tä salasanoille
4. **Salaus ja HTTPS** – symmetrinen ja asymmetrinen salaus, TLS
5. **Injektiot** – SQL-injektio, parametrisoidut kyselyt
6. **XSS** – haitallinen skripti sivulla, syötteen koodaus (escaping), CSP lyhyesti
7. **Turvallinen kehitys** – päivitykset, vähimmät oikeudet, salaisuudet `.env`:ssä

---

**Yhteensä:** 17 polkua, 119 yksikköä (noin 1 200 harjoitusta ja 500 termiä).
