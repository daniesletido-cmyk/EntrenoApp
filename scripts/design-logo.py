"""Genera el logo de EntrenoApp: un pictograma de corredor en blanco sobre
un fondo cuadrado con esquinas redondeadas y degradado azul->naranja
(energia + rendimiento). Produce:
  - assets/logo-source.png   (1024x1024, para usar en la app / marketing)
  - assets/icon.ico          (multi-resolucion 16-256px, para Windows/Electron)
  - public/brand/logo-mark.png (256x256, para la cabecera dentro de la app)
  - src/app/favicon.ico
Es un icono provisional: si al usuario no le convence, se puede sustituir
facilmente por uno propio (mismo patron que "M Wealth" en FinanzasApp).
"""
import math
from PIL import Image, ImageDraw

SIZE = 1024
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

# --- Fondo: cuadrado redondeado con degradado diagonal azul -> naranja ---
bg = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
grad = Image.new("RGB", (SIZE, SIZE))
c1 = (23, 58, 115)   # azul oscuro
c2 = (37, 99, 235)   # azul medio
c3 = (249, 115, 22)  # naranja
for y in range(SIZE):
    for x in range(0, SIZE, 4):
        t = (x + y) / (2 * SIZE)
        if t < 0.55:
            tt = t / 0.55
            r = int(c1[0] + (c2[0] - c1[0]) * tt)
            g = int(c1[1] + (c2[1] - c1[1]) * tt)
            b = int(c1[2] + (c2[2] - c1[2]) * tt)
        else:
            tt = (t - 0.55) / 0.45
            r = int(c2[0] + (c3[0] - c2[0]) * tt)
            g = int(c2[1] + (c3[1] - c2[1]) * tt)
            b = int(c2[2] + (c3[2] - c2[2]) * tt)
        for xx in range(x, min(x + 4, SIZE)):
            grad.putpixel((xx, y), (r, g, b))

mask = Image.new("L", (SIZE, SIZE), 0)
mdraw = ImageDraw.Draw(mask)
radius = int(SIZE * 0.22)
mdraw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=radius, fill=255)
bg.paste(grad, (0, 0))
bg.putalpha(mask)

draw = ImageDraw.Draw(bg)

# --- Pictograma de corredor, estilo señalizacion deportiva, en blanco ---
WHITE = (255, 255, 255, 255)
cx, cy = SIZE * 0.46, SIZE * 0.50
scale = SIZE * 0.34


def pt(dx, dy):
    return (cx + dx * scale, cy + dy * scale)


def thick_line(p1, p2, width):
    draw.line([p1, p2], fill=WHITE, width=width)
    r = width / 2
    draw.ellipse([p1[0] - r, p1[1] - r, p1[0] + r, p1[1] + r], fill=WHITE)
    draw.ellipse([p2[0] - r, p2[1] - r, p2[0] + r, p2[1] + r], fill=WHITE)


LIMB_W = int(scale * 0.20)

# Cabeza
head_c = pt(0.32, -0.95)
head_r = scale * 0.17
draw.ellipse(
    [head_c[0] - head_r, head_c[1] - head_r, head_c[0] + head_r, head_c[1] + head_r],
    fill=WHITE,
)

# Torso (inclinado hacia delante, sensacion de movimiento)
neck = pt(0.20, -0.72)
hip = pt(-0.18, -0.05)
thick_line(neck, hip, LIMB_W)

# Brazo adelantado (hacia atras, doblado) y brazo trasero (hacia delante)
shoulder = pt(0.14, -0.66)
elbow_back = pt(-0.28, -0.55)
hand_back = pt(-0.10, -0.30)
thick_line(shoulder, elbow_back, int(LIMB_W * 0.8))
thick_line(elbow_back, hand_back, int(LIMB_W * 0.8))

elbow_front = pt(0.46, -0.50)
hand_front = pt(0.30, -0.24)
thick_line(shoulder, elbow_front, int(LIMB_W * 0.8))
thick_line(elbow_front, hand_front, int(LIMB_W * 0.8))

# Pierna trasera (extendida hacia atras, empuje)
knee_back = pt(-0.42, 0.28)
foot_back = pt(-0.62, 0.62)
thick_line(hip, knee_back, LIMB_W)
thick_line(knee_back, foot_back, LIMB_W)

# Pierna delantera (rodilla elevada)
knee_front = pt(0.30, 0.10)
foot_front = pt(0.16, 0.58)
thick_line(hip, knee_front, LIMB_W)
thick_line(knee_front, foot_front, LIMB_W)

# --- Linea de progreso / pista debajo, sugiriendo avance ---
track_y = SIZE * 0.86
draw.line(
    [(SIZE * 0.18, track_y), (SIZE * 0.82, track_y)],
    fill=(255, 255, 255, 160),
    width=int(SIZE * 0.014),
)
draw.line(
    [(SIZE * 0.60, track_y), (SIZE * 0.82, track_y)],
    fill=(255, 255, 255, 255),
    width=int(SIZE * 0.014),
)

bg.save("assets/logo-source.png")
print("Logo base generado en assets/logo-source.png")
