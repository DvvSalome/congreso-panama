# I Congreso Internacional de Derecho Procesal Contemporáneo

Sitio web de una sola página (one-page) reconstruido a partir del sitio original de Canva.

- **Evento:** 25 y 26 de septiembre de 2026
- **Sede:** Centro de Convenciones ATLAPA, Ciudad de Panamá
- **Organizan:** Cámara de Comercio Panamá–Mercosur · María Morales, Henao Abogados & Asociados

## Estructura

```
site/
├── index.html      # Marcado y contenido
├── styles.css      # Estilos, paleta y animaciones
├── script.js       # Datos (conferencistas, agenda…), interacciones y animaciones
└── assets/img/     # Logos, fotos de conferencistas y sede
```

Todo el contenido dinámico (conferencistas, agenda, precios, aliados) vive en los arrays
al inicio de `script.js`: editar ahí actualiza la página automáticamente.

## Cómo verlo en local

Abrir `index.html` en el navegador, o servirlo:

```bash
cd site
python3 -m http.server 8080
# visita http://localhost:8080
```

## Publicar

Es un sitio estático: sube la carpeta `site/` a cualquier hosting (Netlify, Vercel,
GitHub Pages, Cloudflare Pages, un bucket S3, etc.). No requiere build ni servidor.

## Notas

- Tipografías vía Google Fonts (Libre Baskerville + Montserrat).
- Paleta: azul marino `#1D2549` / `#00215F`, oro `#E8B447` / `#F0B215`, crema `#F6F3EA`.
- Menú de navegación con anclas a secciones de la misma página (scroll suave + scrollspy).
- Animaciones: reveal al hacer scroll, contadores, cuenta regresiva al evento,
  partículas doradas en el hero, filtros de conferencistas y pestañas de agenda.
- Respeta `prefers-reduced-motion`.
- Verifica el número de cuenta y ABA bancarios antes de publicar (tomados del sitio original).
