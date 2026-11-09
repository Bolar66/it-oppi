# it-oppi

Suomenkielinen oppimissovellus tietotekniikan alalle: tietokoneen toiminnasta, verkoista ja komentorivistä ohjelmointiin (Python, C++, JavaScript/TypeScript).

**Avaa sovellus:** https://bolar66.github.io/it-oppi/

Puhelimessa: avaa linkki Safarissa ja valitse **Jaa → Lisää Koti-valikkoon**. Sovellus toimii myös ilman verkkoyhteyttä, ja edistyminen tallentuu laitteelle.

## Kehitys

```bash
pnpm install
pnpm dev                 # kehityspalvelin
pnpm test                # testit
pnpm validate-content    # sisällön tarkistus
pnpm verify-code         # koodiesimerkkien tulosteet ajamalla (vaatii WSL:n)
```

Jokainen push `main`-haaraan tarkistetaan ja julkaistaan automaattisesti GitHub Pagesiin.
