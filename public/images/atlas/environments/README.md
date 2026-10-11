# Atlas environments

Drop artwork here and the matching domain picks it up. No code change.

Filenames are listed in `app/(app)/_lib/theme/environments.ts`, together
with a one-line brief for what each image should show and the overlay it
will be dimmed by. Add the file, reload, done.

This folder ships EMPTY on purpose. Atlas probes for each image and
renders nothing when it is absent, so a missing environment leaves the
page exactly as it looks without one — there is no broken layer and no
placeholder.

## What the artwork has to be

- Wide desktop composition, 16:9 or wider. 2560x1440 is a good target.
- `.webp`, compressed. These load behind a whole page; keep each under
  roughly 400 KB.
- No text, no fake UI, no charts or numbers, no logos, no watermarks.
- Negative space through the middle, where the page's panels sit.
- Dark enough to live under white text. Each image is dimmed by its
  `overlay` value on top of that; tune it in the registry per image.

## Files the registry expects

By domain theme — the page inherits these through its theme:

home-base.webp, exploration.webp, peace.webp, reading.webp, career.webp,
trading.webp, startup.webp, chess.webp, calisthenics.webp, mercor.webp,
thesis.webp, nutrition.webp

By route — a page that earns its own room:

quests.webp

`/quests` has no theme of its own (it inherits Home Base), so without
a route entry its artwork and Mission Control's would collide on one
key. Route entries win over theme entries, longest prefix first.
