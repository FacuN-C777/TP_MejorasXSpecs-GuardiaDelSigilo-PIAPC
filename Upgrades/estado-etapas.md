### Etapa 6: Integración + validación final
- Estado: completada
- Inicio: 06/10/2026
- Cierre: 06/10/2026
- Guía de la sesión: Upgrades/Etapa6/plan-etapa-6-integracion-validacion.md
- Archivos modificados:
  - tests/application/integration.test.ts (nuevo)
- Decisiones/umbrales (E6.1-E6.4):
  - E6.1: Prueba de integración 	ests/application/integration.test.ts (PATROL→INVESTIGATE→PURSUE→SEARCH→RETURN→PATROL); valida alertas (>=1, Etapa 3) y escape no nulo (PURSUE→SEARCH, Etapa 5). Sin cambios de contratos.
  - E6.2: Secuencia reproducible documentada en Upgrades/estado-etapas.md y en README.md.
  - E6.3: Política "sin ajustes sin diagnóstico y confirmación humana" mantenida.
  - E6.4: Alcance acotado (integración+docs+regresión).
- Integración (eventos cruzados): cruces E3/E4/E5/E2/E1 verificados.
- 
pm run validate: OK (typecheck + 156 pruebas + build; +1 archivo, +1 prueba).
- Notas: Verificación manual opcional con 
pm run dev siguiendo la secuencia reproducible.

## Estado final del plan
- Etapas 0-6 completadas. Las 5 mejoras (1,2,4,6,9) integradas y validadas.
- 
pm run validate finaliza sin errores.
- Prueba de integración y secuencia reproducible documentadas.
