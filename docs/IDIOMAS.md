# Idiomas

El juego está en **español** y en **inglés**.

- **Qué idioma ve cada jugador:** si el móvil está en español, catalán, gallego o euskera, español; si no, inglés. Se puede cambiar en **Ajustes → Idioma** (se guarda en el móvil y la app se recarga).
- **Moneda del juego:** € en español y $ en inglés (`money()`). Los premios reales de la Liga son siempre en euros (`euros()`).
- **Textos legales** (privacidad y bases de la Liga): solo en español, que es la versión oficial. En inglés el panel lo indica.
- **Analítica:** el evento `session_start` lleva `lang`, así se puede ver cuántos jugadores hay de cada idioma.

## Cómo está hecho

| Qué | Dónde |
| --- | --- |
| `t()`, `money()`, `euros()`, idioma activo y textos de `index.html` | `src/i18n.ts` |
| Diccionario inglés (clave = frase en español) | `src/i18n/en.ts` |
| Contenido en inglés (negocios, ciudades, misiones, logros, tutorial, tienda…) | `src/i18n/data.ts` |
| Test que avisa si falta una traducción o un `{marcador}` | `tests/i18n.test.ts` |

## Añadir o cambiar un texto

1. Escribe el texto en español dentro de `t()`: `t("Nivel {n}", { n: lvl })`. Para dinero, `money(n)` (nunca `${fmt(n)} €`).
2. Añade la traducción en `src/i18n/en.ts`: `"Nivel {n}": "Level {n}"`.
3. `npm test`: si falta algo, el test `i18n` dice qué frase.

Si cambias una frase en español, cambia también su clave en `en.ts` (si no, se verá en español en inglés y el test avisará).

## Añadir otro idioma (p. ej. portugués)

1. Copia `src/i18n/en.ts` como `pt.ts` y traduce los valores. Igual con los textos de `data.ts`.
2. En `src/i18n.ts`, añade `"pt"` a `Lang` y a `LANGS`, la regla de detección y el diccionario en `t()`.
3. Amplía el test para el nuevo diccionario.
