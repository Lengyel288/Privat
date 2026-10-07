# Signfactory zákazky – nasadenie na Netlify

Projekt obsahuje stránku (`public/`), server (`netlify/functions/`) a databázu (`netlify/database/`).
Prihlásenie je vlastné: mená a heslá sa nastavia v Netlify, nie v kóde.

## 1. GitHub (zadarmo, cez web)
1. Zaregistruj sa na github.com.
2. Vpravo hore **+ → New repository**, názov napr. `zakazky`, zvoľ **Private**, potvrď.
3. Klikni **uploading an existing file** a presuň tam **obsah** rozbaleného priečinka
   (priečinky `public`, `netlify` a súbory `netlify.toml`, `package.json`, `README.md`). Potvrď **Commit changes**.
   Skontroluj, že na GitHube vidíš priečinok `netlify` s podpriečinkami `functions`, `lib`, `database`.

## 2. Netlify
1. V Netlify: **Add new project → Import an existing project → GitHub** a vyber repozitár `zakazky`.
2. Nastavenia zostanú podľa `netlify.toml`, nič nemeň.
3. **Pred prvým nasadením** otvor **Environment variables** a pridaj dve premenné:
   - `SESSION_SECRET` = dlhý náhodný reťazec (aspoň 32 znakov, napr. z správcu hesiel)
   - `APP_USERS` = `meno:heslo,meno2:heslo2` (bez medzier; v hesle nepoužívaj `,` ani `:`)
4. Klikni **Deploy**. Balík `@netlify/database` spôsobí, že Netlify sám vytvorí databázu a spustí migráciu.
5. Po nasadení otvor adresu stránky, prihlás sa a skús vytvoriť zákazku.
   V Netlify skontroluj aj sekciu **Database**, či tam databáza je.

## 3. Prvé kroky v systéme
- Tlačidlo **Firma** – vyplň údaje a logo.
- **Import klientov** – nahraj `klienti.xlsx` zo SuperFaktúry.

## Dôležité
- Zákazky a klienti zo skúšobnej verzie na claude.ai sa **neprenesú automaticky**. Klientov naimportuješ znova, zákazky by sa prepísali ručne (alebo si vyžiadaj exportný nástroj).
- Prílohy: max. 4 MB na súbor, ukladajú sa do databázy.
- Zálohy: skontroluj v Netlify, aké zálohy databázy tvoj plán obsahuje, a pravidelne si exportuj dáta.
- Heslo zmeníš úpravou `APP_USERS` a novým nasadením (Deploys → Trigger deploy).
- Kľúče ku SuperFaktúre (API) tu zatiaľ nie sú. Pridajú sa neskôr rovnako ako premenné prostredia.
