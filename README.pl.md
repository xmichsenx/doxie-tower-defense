<div align="center">

# Jamniki kontra Odkurzacze

**Tower defense w pixel arcie, w którym dzielne jamniki rzucają kośćmi w armię odkurzaczy.**

[English](README.md) · **Polski**

### [▶ Zagraj w przeglądarce](https://xmichsenx.github.io/doxie-tower-defense/)

![Rozgrywka: jamniki bronią salonu przed odkurzaczami i bossem MEGA SSAK](docs/screenshot.png)

[![Deploy](https://github.com/xmichsenx/doxie-tower-defense/actions/workflows/deploy.yml/badge.svg)](https://github.com/xmichsenx/doxie-tower-defense/actions/workflows/deploy.yml)

</div>

Odkurzacze chcą wciągnąć psie legowisko. Na drodze stoi im siedem jamników, każdy z własną sztuczką i dwiema ścieżkami ulepszeń. Przetrwaj 40 fal, pokonaj MEGA SSAKA i graj dalej w trybie bez końca.

Gra uruchamia się po angielsku, jeśli przeglądarka nie jest ustawiona na polski. Język zmienisz w prawym górnym rogu menu głównego.

## Co jest w grze

- **7 jamników:** Rzucacz, Snajper, Kopacz, Szczekacz, Kucharz, Strażak i Piekarz. Każdy ma 2 ścieżki ulepszeń po 3 poziomy. Gdy jedna ścieżka dojdzie do 3. poziomu, druga zostaje na 1.
- **8 odkurzaczy:** zniszczony duży odkurzacz rozpada się na mniejsze. Wśród nich są szybkie roboty, roboty-cienie z kamuflażem, opancerzone przemysłowe, parowe odporne na wodę i boss MEGA SSAK.
- **3 mapy:**
  - **Salon:** długi, kręty dywan.
  - **Kuchnia:** krótsza trasa, a meble zabierają miejsce.
  - **Ogród:** dwie ścieżki naraz ze wspólnym pasem pośrodku.
- **Tryby gry:** 3 poziomy trudności, 40 fal plus tryb bez końca, prędkość ×1/×2/×3, automatyczny start fal i tryby celowania.
- **Grafika i dźwięk:** wszystko jest rysowane i syntezowane w kodzie (pixel art, dźwięki 8-bit). Nie ma żadnych plików graficznych ani dźwiękowych.
- **Języki:** polski i angielski, do przełączenia w menu głównym.

## Sterowanie

| Klawisz / akcja | Co robi |
|---|---|
| **1–7**, potem klik | Wybór i postawienie jamnika (Shift + klik stawia kilka) |
| Klik na jamnika | Ulepszenia, zmiana celu, sprzedaż |
| **Spacja** | Start fali (w trakcie fali: zmiana prędkości) |
| **F** | Prędkość gry ×1 / ×2 / ×3 |
| **Tab** | Zmiana trybu celowania zaznaczonego jamnika |
| **Delete** | Sprzedaż zaznaczonego jamnika |
| **P** / **Esc** | Pauza |
| **M** | Wyciszenie |
| Prawy przycisk / **Esc** | Anuluj |

Ciasteczka Piekarza można klikać, żeby zebrać je od razu.

**Na telefonie** gra przechodzi w układ pionowy: mapa jest u góry, a sklep i ulepszenia pod nią. Przeciągnij jamnika ze sklepu na mapę i puść, żeby go postawić. Podgląd unosi się nad palcem, żeby było widać, gdzie wyląduje, a czerwony zasięg oznacza, że tu nie można. Stuknij jamnika, żeby go ulepszyć albo sprzedać, a ciasteczka zbierasz stuknięciem.

## Uruchomienie lokalne

```bash
npm install
npm run dev        # http://localhost:5173
```

| Komenda | Opis |
|---|---|
| `npm test` | Testy (Vitest) |
| `npm run coverage` | Testy z raportem pokrycia |
| `npm run typecheck` | Sprawdzenie typów |
| `npm run build` / `npm run preview` | Wersja produkcyjna w `dist/` |

Dopisz `?debug` do adresu, żeby dostać dużo pieniędzy, skok do dowolnej fali, hitboxy (H) i `window.app` w konsoli. Bot do testów balansu jest w [`tools/bot.ts`](tools/bot.ts): `(await import('/tools/bot.ts')).runBot('ogrod', 'normal')`.

## Jak to jest zbudowane

TypeScript (strict), Vite i Canvas 2D. Bez silnika gier i bez frameworka UI.

- `src/core`: matematyka, ścieżki, ziarnisty RNG
- `src/data`: jamniki, odkurzacze, mapy i fale (czyste dane)
- `src/sim`: cała logika gry. Nie używa DOM i jest deterministyczna (stały krok 1/60 s), więc da się ją w pełni testować.
- `src/render`: sprite'y pixel art budowane w kodzie, renderer i efekty
- `src/ui`, `src/audio`, `src/i18n.ts`, `src/app.ts`: interfejs, dźwięk, tłumaczenia i pętla gry
- `tests/`: testy jednostkowe i symulacje bez przeglądarki

Każdy push na `main` jest testowany i wdrażany na GitHub Pages przez [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
