# Flashcards — Día 1 (Modelo OSI / TCP-IP)

**Cómo usarlas:** tapa la columna de respuesta. Di la respuesta **en voz alta**
antes de destapar. Si dudas más de 3 segundos, cuenta como fallo.

**Protocolo de repaso espaciado:**
- Hoy: 3 pasadas completas, separadas por al menos 1 hora.
- Mañana: 1 pasada.
- Pasado mañana: 1 pasada.
- Antes del examen de repaso semanal: 1 pasada.

Solo pasas al Día 2 cuando consigas **8/8 sin mirar, dos pasadas seguidas**.

---

## Las 8 tarjetas del núcleo

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Qué es la IP y cambia durante el viaje? | A dónde va. **NO cambia** de extremo a extremo. |
| 2 | ¿Qué es la MAC y cambia durante el viaje? | Quién lo tiene ahora mismo. **CAMBIA en cada salto.** |
| 3 | Capa 4 — dato que usa y nombre de su PDU | El **puerto**. Segmento (TCP) / Datagrama (UDP) |
| 4 | Capa 3 — dato que usa y nombre de su PDU | La **IP**. Paquete |
| 5 | Capa 2 — dato que usa y nombre de su PDU | La **MAC**. Trama |
| 6 | ¿Qué hay en la capa 7? | Contenido del programa: contraseñas, direcciones web, archivos |
| 7 | Las 4 capas de TCP/IP y qué agrupan | Application (7,6,5) · Transport (4) · Internet (3) · Network Access (2,1) |
| 8 | ¿Qué confirma un ping que responde? | Solo la capa 3. Nada por encima. |

---

## Ganchos de memoria

**IP vs. MAC** — dos preguntas distintas:
- **IP = ¿a dónde va?** El destino final. Fijo desde el principio.
- **MAC = ¿quién lo tiene ahora?** Cambia cada vez que pasa por otro aparato.

**UDP** = **U**ser **D**atagram **P**rotocol.
La palabra "Datagrama" está dentro del propio nombre. No hay nada que memorizar.

**TCP** = con acuse de recibo (confirma la entrega, reenvía lo perdido).
**UDP** = sin acuse de recibo (rápido, para voz y vídeo).

**La escalera 4-3-2:**
```
Capa 4 -> SEGMENTO (o DATAGRAMA con UDP)   <- lleva el puerto
Capa 3 -> PAQUETE                          <- lleva la IP
Capa 2 -> TRAMA                            <- lleva la MAC
```
La IP va en el **P**aquete, y Paquete = capa **3**.

**TCP/IP suma 7:** Application(3) + Transport(1) + Internet(1) + NetworkAccess(2) = 7.
Ninguna capa se repite ni se salta. Si tu respuesta no suma 7, está mal.

---

## Trampas personales detectadas

1. **Tirar hacia la capa 4 cuando dudo.** Fallado 3 veces.
   Regla: *si el enunciado no menciona un puerto ni un programa, NO es capa 4.*
2. **Decir "segmento" para UDP.** Fallado 3 veces.
   Regla: UDP lleva "Datagram" en el nombre.
3. **Confundir la herramienta con el protocolo.** `ping` es un ejecutable, pero lo
   que viaja por el cable es ICMP, que es capa 3.

---

## Autoevaluación

| Fecha | Pasada | Aciertos /8 | Fallos (nº de tarjeta) |
|-------|--------|-------------|------------------------|
|       | 1      |             |                        |
|       | 2      |             |                        |
|       | 3      |             |                        |
|       | 4      |             |                        |
|       | 5      |             |                        |
