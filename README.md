# SkillSync mobilapp

Valódi React Native / Expo alkalmazás iOS-re és Androidra. A fiókokat és az adatokat a Supabase kezeli.

## Első indítás

1. Hozz létre egy Supabase-projektet a [Supabase Dashboardban](https://supabase.com/dashboard).
2. A projekt SQL Editorában futtasd a [`supabase/schema.sql`](supabase/schema.sql) teljes tartalmát.
3. Ha még nem futtattad, futtasd a [`supabase/privacy-migration.sql`](supabase/privacy-migration.sql) fájlt, utána a [`supabase/images-migration.sql`](supabase/images-migration.sql) fájlt. Ezek kellenek a meghívásos csoportokhoz és a privát képtárhelyhez.
4. A projekt Connect paneljéről másold ki a Project URL-t és a publishable key-t. Másold a `.env.example` fájlt `.env` néven, majd töltsd ki:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
   ```

   Az alkalmazásban csak a publishable kulcs szerepelhet. **A `service_role` titkos kulcsot ne illeszd ide.**

5. A Supabase Dashboard **Authentication → URL Configuration → Redirect URLs** részén engedélyezd ezt a visszatérési címet:

   ```text
   exp://**
   http://localhost:8081/**
   skillsync://sign-in
   ```

   Az `exp://**` az Expo Go, a `http://localhost:8081/**` a helyi böngészős próba, a `skillsync://sign-in` pedig a telepített iOS/Android app visszairányításához kell. Éles webes cím esetén azt is add hozzá a listához.

6. Node.js LTS és pnpm telepítése után:

   ```sh
   pnpm install
   pnpm start
   ```

6. Olvasd be a terminálban megjelenő QR-kódot az Expo Go alkalmazással a felület előnézetéhez. E-mailes visszalépéshez és telepíthető iOS/Android apphoz fejlesztői build szükséges; az Expo Go saját ideiglenes címe nem egyezik a `skillsync://` sémával.

## Megnyitás számítógépen

Az app mappájában indítsd el:

```sh
npm run web
```

A böngészős próba általában a `http://localhost:8081` címen nyílik meg. Ezt a címet csak az a számítógép éri el, amelyiken fut a fejlesztői szerver. Ahhoz, hogy mások is kipróbálják interneten keresztül, közzé kell tenni a webes buildet egy tárhelyen; a `dist/` mappa tartalmazza a feltöltendő fájlokat.

## Letölthető mobilalkalmazás

Az Expo Go csak fejlesztői előnézet. App Store- és Google Play-letöltéshez aláírt iOS- és Android-buildet kell készíteni, majd feltölteni az áruházakba. Ez külön kiadási folyamat; a webes próba önmagában nem publikálja a mobilappot.

## Mit tud az első változat?

- E-mailes regisztráció, bejelentkezés és kijelentkezés.
- Közös, Supabase-adatbázisból töltött projektfolyam, keresés és témaszűrés.
- Projektek létrehozása, tagként csatlakozás és kilépés.
- Reakciók és projekt-hozzászólások.
- Csoportok létrehozása, böngészése és csatlakozás.
- Profilnév és bemutatkozás szerkesztése.
- Profilkép, csoportkép és projektkép feltöltése, valamint alkotói profilok megtekintése.
- Supabase Row Level Security szabályok minden felhasználói adatra.

## E-mail-megerősítés

A Supabase Auth alapértelmezett e-mail-megerősítése bekapcsolva maradhat. A regisztráció után a felhasználónak meg kell erősítenie az e-mail-címét, majd be kell lépnie az appba.

## Projektfelépítés

- `src/app/` — Expo Router képernyők és navigáció.
- `src/components/` — közös felületi elemek.
- `src/lib/` — Supabase kliens, bejelentkezési állapot és megosztott típusok.
- `supabase/schema.sql` — adatbázistáblák, profil létrehozó trigger és RLS szabályok.
- `.env.example` — szükséges, publikus Supabase kapcsolati beállítások.
