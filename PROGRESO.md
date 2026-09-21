# Progreso — Network+ (N10-009) → CCNA (200-301)

**Fase actual:** 1 — Network+ N10-009
**Estado:** Semana 1, Día 1 sin cerrar. Examen 10/15, drill 5/10, comprobación 3/6.
Cambio de método a recuerdo activo + repaso espaciado (ver `flashcards-dia01.md`).
No avanzar al Día 2 hasta 8/8 en las flashcards, dos pasadas seguidas.

## Fase 1 — Network+ (3 semanas)

### Semana 1 — Fundamentos
| Día | Tema | Estado | Score práctica | Notas / temas flojos |
|-----|------|--------|----------------|----------------------|
| 1 | Modelo OSI / TCP-IP | **bloqueante** | 10/15 → 5/10 → 3/6 | Reducido a 8 hechos núcleo + flashcards. Persiste: IP vs MAC en tránsito, PDU de UDP, IP=L3 |
| 2 | Tipos de red y topologías (repaso rápido) | pendiente | — | — |
| 3 | IP addressing fundamentals | pendiente | — | — |
| 4 | Subnetting IPv4 (drills a mano) | pendiente | — | — |
| 5 | Subnetting IPv4 — VLSM / práctica | pendiente | — | — |
| 6 | Puertos y protocolos comunes | pendiente | — | — |
| 7 | Examen de repaso Semana 1 + reporte | pendiente | — | — |

### Semana 2 — Implementación / Operaciones / Seguridad
| Día | Tema | Estado | Score práctica | Notas |
|-----|------|--------|----------------|-------|
| 8 | Wireless standards | pendiente | — | — |
| 9 | Routing básico | pendiente | — | — |
| 10 | Switching básico (VLANs, STP intro) | pendiente | — | — |
| 11 | Network Operations: monitoreo y documentación | pendiente | — | — |
| 12 | Alta disponibilidad y disaster recovery | pendiente | — | — |
| 13 | Network Security: firewalls, VPN, autenticación, ataques | pendiente | — | — |
| 14 | Examen de repaso Semana 2 + reporte | pendiente | — | — |

### Semana 3 — Troubleshooting y simulacros
| Día | Tema | Estado | Score práctica | Notas |
|-----|------|--------|----------------|-------|
| 15 | Troubleshooting methodology (pasos en orden) | pendiente | — | — |
| 16 | Troubleshooting por capa: L1-L2 | pendiente | — | — |
| 17 | Troubleshooting por capa: L3-L7 + herramientas CLI | pendiente | — | — |
| 18 | Repaso general de dominios débiles | pendiente | — | — |
| 19 | Simulacro completo cronometrado #1 | pendiente | — | — |
| 20 | Simulacro completo cronometrado #2 | pendiente | — | — |
| 21 | Repaso de huecos final | pendiente | — | — |

## Fase 2 — CCNA 200-301

Bloqueada hasta que Andy diga explícitamente **"pasamos a CCNA"**.

## Dominios — autoevaluación N10-009

| Dominio | Peso | Nivel actual |
|---------|------|--------------|
| Networking Concepts | 23% | 67% examen / 50% drill — muy por debajo del umbral |
| Network Implementation | 20% | sin evaluar |
| Network Operations | 19% | sin evaluar |
| Network Security | 14% | sin evaluar |
| Network Troubleshooting | 24% | punto débil: confunde capa confirmada con capa fallida |

## MÉTODO DE ESTUDIO (crítico — cambiado tras el Día 1)

Diagnóstico del Día 1: **acierta las preguntas de razonamiento y falla las de
recuerdo directo.** No es un problema de comprensión sino de retención — leer
explicaciones y responder opción múltiple produce reconocimiento, no memoria.

Reglas para todas las sesiones siguientes:

1. **Máximo ~8-10 hechos núcleo por sesión.** Todo lo demás es contexto, no se
   evalúa. El Día 1 soltó ~40 datos sueltos: dosis imposible de retener.
2. **Cerrar cada sesión con flashcards** en `sesiones/network-plus/flashcards-diaXX.md`.
3. **Incluir siempre preguntas de recuerdo abierto** (sin opciones), no solo
   opción múltiple.
4. **No avanzar de día** hasta 8/8 en las flashcards del día anterior, dos
   pasadas seguidas.
5. **Repaso espaciado**: cada sesión empieza con una pasada rápida a las
   flashcards de los días previos.

## Calibración de nivel (crítico)

La experiencia de data center de Andy fue **netamente hardware**: sin
configuración, sin troubleshooting, sin Wireshark ni CLI de equipos de red.
**Tratarlo como principiante absoluto en todo lo que no sea hardware físico.**

- Definir cada término la primera vez que aparezca.
- Analogía y modelo mental **antes** de la tabla a memorizar.
- No dar por sabidos comandos ni herramientas en las preguntas de práctica.

## Errores recurrentes a vigilar

1. **Modelo TCP/IP** — fallado 3 veces (examen P10, drill P6 y P7). Usar la regla
   de comprobación: las 4 capas suman exactamente 7 sin repetir ninguna.
2. **Herramienta vs. protocolo** — `ping`/`traceroute` son ejecutables de usuario,
   pero el protocolo en el cable es ICMP sobre IP (L3).
3. **PDU por número de capa** — 4-3-2 = Segmento, Paquete, Trama. UDP -> datagrama.
4. **Tendencia a elegir L4 al dudar** — fallado 3 veces. Regla: si el enunciado no
   menciona un puerto ni un programa, NO es capa 4.
5. **"Segmento" para UDP** — fallado 3 veces. UDP = User **Datagram** Protocol.
6. **IP vs MAC en tránsito** — la IP no cambia (a dónde va), la MAC cambia en cada
   salto (quién lo tiene ahora).
7. **Confirmado vs. fallido** — nunca hay capa superior confirmada por encima de
   una capa que falló.

## Nota de calendario

Con el punto de partida real (sin experiencia de configuración) y el ritmo del
Día 1, las 3 semanas del plan original no son realistas. Estimación honesta:
**4-5 semanas** al mismo ritmo semanal de horas. Decisión de Andy; si mantiene
las 3 semanas, no volver a sacar el tema.
