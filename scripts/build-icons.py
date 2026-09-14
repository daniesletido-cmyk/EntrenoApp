from PIL import Image

src = Image.open("assets/logo-source.png").convert("RGBA")

# Icono de sistema (ventana Electron, .exe, instalador).
# Importante: se llama .save() sobre la imagen ORIGINAL de alta resolucion
# (no sobre una ya reducida) — Pillow genera cada tamano de "sizes" a partir
# de esa fuente. Guardarlo desde una copia ya pequena (p. ej. 16x16) produce
# un .ico borroso/mal escalado en el resto de tamanos.
sizes = [16, 24, 32, 48, 64, 128, 256]
src.save("build/icon.ico", format="ICO", sizes=[(s, s) for s in sizes])
src.save("electron/icon.ico", format="ICO", sizes=[(s, s) for s in sizes])

# Favicon web (Next.js sirve src/app/favicon.ico automaticamente)
fav_sizes = [16, 32, 48]
src.save("src/app/favicon.ico", format="ICO", sizes=[(s, s) for s in fav_sizes])

# Logo para la cabecera dentro de la app
src.resize((256, 256), Image.LANCZOS).save("public/brand/logo-mark.png")
src.resize((512, 512), Image.LANCZOS).save("public/brand/logo-mark-512.png")

print("Iconos generados: build/icon.ico, electron/icon.ico, src/app/favicon.ico, public/brand/logo-mark*.png")
