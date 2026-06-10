# Slash Commands — Cuándo Usar Cada Uno

---

## 🟦 PLAN — Antes de escribir una sola línea de código

| Comando | Cuándo usarlo | Qué hace |
|---------|--------------|----------|
| `/office-hours` | **Primera parada siempre** — tienes una idea nueva | 6 preguntas que fuerzan claridad: qué construyes, para quién, por qué, qué no incluye, cómo sabrás que funcionó |
| `/superpowers:brainstorm` | Después de office-hours, para profundizar el spec | Diálogo socrático para refinar la idea, propone 2-3 enfoques con trade-offs |
| `/superpowers:write-plan` | Cuando el spec está aprobado | Convierte el spec en plan de implementación con tareas, archivos, código y tests exactos |
| `/plan-ceo-review` | Feature que toca UX o experiencia del usuario | Revisión estilo Brian Chesky "¿esto es una experiencia de 10 estrellas?" |
| `/plan-eng-review` | Feature técnicamente compleja o que toca múltiples módulos | Engineering manager revisa scope, edge cases, criterios de éxito |

---

## 🟨 BUILD — Mientras construyes

| Comando | Cuándo usarlo | Qué hace |
|---------|--------------|----------|
| `/superpowers:execute-plan` | Tienes el plan, listo para implementar | Ejecuta con TDD (tests fallan primero) + subagent review en 2 etapas |
| `/design` | Nueva pantalla, componente visual o flujo de UI | Genera diseño production-grade antes de tocar código |
| `/design-review` | Terminaste una UI y quieres feedback | Revisión de diseño: ¿se ve bien?, ¿es consistente?, ¿funciona en mobile? |
| `/frontend-design` | *(Auto-activo)* — cualquier trabajo de frontend | Se invoca solo. Evita el look genérico de AI — tipografía, color, animaciones |

---

## 🟥 SHIP — Antes de hacer merge o deploy

| Comando | Cuándo usarlo | Qué hace |
|---------|--------------|----------|
| `/code-review` | Antes de abrir un PR con cualquier feature | 5 agentes paralelos: compliance, bugs, historial git, patterns de PRs pasados, comentarios de código |
| `/security-review` | El cambio toca: auth, datos de usuario, inputs externos, pagos | Escaneo de vulnerabilidades: SQL injection, XSS, secrets, PII, crypto débil |
| `/qa` | Feature lista — quieres probarla exhaustivamente | Testing automatizado con edge cases, estados vacíos, errores |
| `/browse` | QA visual — quieres ver cómo se ve en el navegador | Playwright compilado ~20x más rápido que Chrome MCP |
| `/ship` | **Último paso siempre** — todo revisado y aprobado | Un comando: sync main → tests → push branch → abrir PR |

---

## 🟩 MAINTAIN — Operación continua

| Comando | Cuándo usarlo | Qué hace |
|---------|--------------|----------|
| `/retro` | Fin de semana / sprint | Retrospectiva estructurada: qué se shippó, qué salió mal, qué mejorar |
| `/investigate` | Bug raro o comportamiento inesperado en prod | Investigación profunda con análisis de root cause |

---

## Flujos de Referencia Rápida

### Feature nueva (flujo completo)
```
/office-hours → /superpowers:brainstorm → /superpowers:write-plan
→ /design (si tiene UI) → /superpowers:execute-plan
→ /code-review → /security-review (si aplica) → /qa → /ship
```

### Bug en producción
```
/investigate → fix → /code-review → /security-review → /ship
```

### Picking up donde te quedaste (nueva sesión)
```
claude-mem carga contexto automáticamente
→ /retro (si pasó más de una semana) → continuar feature
```

### Solo tienes 10 minutos
```
/office-hours → código → /ship
```

---

> **Regla de oro:** Si vas a escribir código → `/office-hours` primero.  
> Si vas a hacer merge → `/code-review` + `/ship` siempre.
