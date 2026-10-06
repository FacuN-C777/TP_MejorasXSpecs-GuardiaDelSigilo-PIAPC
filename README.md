---
id: laboratorio-guardia-sigilo
titulo: Laboratorio Guardia de Sigilo
tipo: indice
audiencia: estudiante
acceso: publico
version: 3
---

# Laboratorio Guardia de Sigilo

Proyecto can贸nico de PIAPC 2026 para aplicar desarrollo ag茅ntico e inteligencia artificial de videojuegos.

## Estado

H0 a H4 implementados: escenario base, repositorio preparado para agentes, navegaci贸n A*, percepci贸n con memoria y m谩quina de estados del guardia (patrullar, investigar, perseguir, buscar, regresar y capturar). La comparaci贸n de t茅cnicas se incorpora en H5.

## Ejecuci贸n

Requiere Node.js 22 o superior.

```bash
npm ci
npm run dev
```

Validaci贸n completa:

```bash
npm run validate
```

En la escena:

- WASD o flechas: mover al jugador.
- Q: emitir un sonido desde el jugador (el guardia investiga si lo oye).
- R: reiniciar el escenario.
- El HUD muestra el estado actual, el anterior, la 煤ltima causa y el objetivo del guardia.

## Prop贸sito

Construir un juego 2D cenital m铆nimo donde un guardia:

- patrulla puntos definidos;
- percibe al jugador mediante visi贸n y sonido;
- conserva una 煤ltima posici贸n conocida;
- navega mediante A*;
- sigue caminos sin mezclar b煤squeda y locomoci贸n;
- decide mediante una m谩quina de estados;
- expone telemetr铆a suficiente para comprender y probar su conducta.

El proyecto no busca producir un videojuego comercial. Es un entorno de experimentaci贸n controlado, reproducible y apto para personas y agentes de desarrollo.

## Documentos

- [Especificaci贸n del producto](specs/01-producto.md)
- [Especificaci贸n pedag贸gica](specs/02-pedagogica.md)
- [Arquitectura](docs/arquitectura.md)
- [Hitos](docs/hitos.md)
- [Contrato para proyectos alternativos](docs/contrato-proyecto-alternativo.md)
- [Decisiones t茅cnicas](docs/decisiones-tecnicas.md)
- [Auditor铆a H1](docs/auditoria-h1.md)
- [Permisos recomendados](docs/permisos-recomendados.md)
- [Registro de intervenci贸n](docs/plantillas/registro-intervencion.md)
- [Evidencia de pruebas](docs/plantillas/evidencia-pruebas.md)
- [H3: percepci贸n y movimiento](docs/h3-percepcion-movimiento.md)
- [Intervenci贸n H3](docs/evidencias/h3-intervencion.md)
- [Validaci贸n H3](docs/evidencias/h3-validacion.md)
- [Intervenci贸n H4](docs/evidencias/h4-intervencion.md)
- [Validaci贸n H4](docs/evidencias/h4-validacion.md)

## Tecnolog铆a de referencia

- Phaser con TypeScript.
- Vite para desarrollo y compilaci贸n.
- Vitest para pruebas de dominio.
- Node.js 22 o superior.
- npm y archivo de bloqueo para instalaciones reproducibles.

El estudiante puede adoptar Unity u otro entorno si cumple el contrato de equivalencia.

## Restricci贸n principal

La l贸gica de navegaci贸n, percepci贸n y decisi贸n no depender谩 de Phaser. El motor ser谩 un adaptador de entrada, tiempo, colisiones y representaci贸n visual.

## Secuencia reproducible - 5 mejoras

1. Iniciar: 
pm run dev (escena cenital, HUD activo).
2. Provocar sonido (Q): activar INVESTIGATE (pausa/mirada E1, cono E2 reactivo, alertas E3 posibles).
3. Ser visto: pasar a PURSUE con visi髇 v醠ida (alerta E3 seg鷑 intensidad).
4. Romper l韓ea con cobertura: moverse hacia cobertura para perder visi髇 (rango efectivo reducido E4).
5. Escape de 鷏timo momento: al perder visi髇 cerca en PURSUE?SEARCH, se registra escape ultimo momento (E5, E5.4 puede suprimir VFX search-start).
6. B鷖queda y regreso: SEARCH agota duraci髇 ? RETURN ? PATROL.
7. Reinicio (R): restaura todos los elementos.

Verificar HUD: estado/anterior/causa, objetivo, fase (PAUSA/MIRADA/AVANCE), alerta, escape, visi髇, sonido, memoria, cobertura y cono.

