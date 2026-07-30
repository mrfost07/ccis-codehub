# Certificate assets

Images the completion-certificate generator draws. Institutional marks live
here and are committed; anything personal does not (see **Signature** below).

Rendering is done with **Pillow**, not WeasyPrint. WeasyPrint is listed in
`requirements.txt` but needs pango/cairo system libraries, and installing those
means `apt`, which this deployment cannot currently run. Pillow has no system
dependencies, is already installed, and renders the PNG shown in a profile plus
the PDF that gets downloaded from the same draw.

## Files

| file | status | notes |
|---|---|---|
| `codehub-logo.png` | present | Copy of `frontend/public/logo/ccis-logo.png`, the mark used in the navbar. White outline on transparency. |
| `codehub-logo-dark.png` | present | The same mark recoloured to violet-800 (`#5b21b6`). **Use this one** — the original is white and disappears on a light certificate. Regenerate with the snippet at the bottom if the source logo changes. |
| `snsu-logo.png` | **needed** | Surigao del Norte State University seal. Square, transparent background, at least 600x600. |
| `ccis-logo.png` | **needed** | College of Computing and Information Sciences seal. Square, transparent background, at least 600x600. |

Both missing files are institutional seals supplied by the owner. The generator
skips any asset it cannot find and still produces a valid certificate, so it
does not break while they are absent — but the layout expects all three marks.

## Signature

The CEO signature is **deliberately not stored here**, because this directory is
committed to git. A handwritten signature in a repository can be lifted by
anyone who can read that repository, and on a public GitHub remote that means
anyone at all.

It belongs in `backend/media/certificates/signatures/`, which `.gitignore`
already excludes (`/media`, `backend/media/`). Upload it there rather than
committing it, and back it up outside the repo.

Preparation, easiest first:

1. Sign a sheet of white paper with a black pen, photograph it straight-on in
   even light, and save the photo into the repo temporarily. Run
   `manage.py prepare_signature <photo>` (see that command) to crop it,
   drop the paper background, and write a transparent PNG to the media path.
2. Draw it on a phone or tablet in any drawing app and export a PNG with a
   transparent background.
3. Use a browser signature pad and download the PNG.

Whichever route, the generator expects a transparent-background PNG roughly
1000x300, dark ink.

## Fonts

The generator resolves a font in this order, so it works with none of them
installed:

1. any `*.ttf` in `certificate_assets/fonts/` (drop an open-licensed font here
   for the nicest result — EB Garamond or Playfair Display suit a certificate)
2. common Linux paths — DejaVu, Liberation
3. `PIL.ImageFont.load_default(size=...)`, which is scalable from Pillow 10.1
   and legible, just plain

## Regenerating the dark logo

```python
from PIL import Image
img = Image.open('codehub-logo.png').convert('RGBA')
target = (91, 33, 182)  # violet-800
img.putdata([(*target, a) if a else (0, 0, 0, 0) for *_rgb, a in img.getdata()])
img.save('codehub-logo-dark.png')
```
