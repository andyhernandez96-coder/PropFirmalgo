# Progreso — Network+ (N10-009) → CCNA (200-301)

**Fase actual:** 1 — Network+ N10-009
**Estado:** Semana 1 en curso. Día 1 corregido (10/15). Drill de refuerzo entregado, pendiente de resolver.

## Fase 1 — Network+ (3 semanas)

### Semana 1 — Fundamentos
| Día | Tema | Estado | Score práctica | Notas / temas flojos |
|-----|------|--------|----------------|----------------------|
| 1 | Modelo OSI / TCP-IP | corregido | **10/15 (67%)** | Flojo: nomenclatura PDU, mapeo objeto→capa (ICMP, LB L4 vs L7), modelo TCP/IP, confirmado vs. fallido |
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
| Networking Concepts | 23% | 67% en Día 1 — por debajo del umbral |
| Network Implementation | 20% | sin evaluar |
| Network Operations | 19% | sin evaluar |
| Network Security | 14% | sin evaluar |
| Network Troubleshooting | 24% | punto débil: confunde capa confirmada con capa fallida |

## Errores recurrentes a vigilar

1. **Herramienta vs. protocolo** — `ping`/`traceroute` son ejecutables de usuario,
   pero el protocolo en el cable es ICMP sobre IP (L3). Falló en Día 1 P11 pese a
   aviso previo. Revisar en cada repaso.
2. **PDU por número de capa** — 4-3-2 = Segmento, Paquete, Trama. UDP -> datagrama.
3. **Confirmado vs. fallido** — nunca hay capa superior confirmada por encima de
   una capa que falló.
