# Día 1 — Modelo OSI / TCP-IP

Objetivo N10-009 relacionado: 1.1 (Networking Concepts, 23% del examen).
Base transversal para el dominio de Troubleshooting (24%).

## Concepto

OSI no describe cómo funciona el software real (eso es TCP/IP). Es un marco de
referencia para dos cosas que CompTIA pregunta sin parar: "¿en qué capa opera X?"
y aislar fallos por capas.

### Las 7 capas

| # | Capa | Función | PDU | Direcciona por | Ejemplos |
|---|------|---------|-----|----------------|----------|
| 7 | Aplicación | Interfaz de red para el servicio | Datos | — | HTTP, FTP, SMTP, DNS, SNMP, DHCP |
| 6 | Presentación | Formato, cifrado, compresión | Datos | — | TLS/SSL, ASCII, JPEG |
| 5 | Sesión | Establece, mantiene y termina sesiones | Datos | — | RPC, NetBIOS |
| 4 | Transporte | Segmentación, flow control, fiabilidad | Segmento (TCP) / Datagrama (UDP) | Puerto | TCP, UDP |
| 3 | Red | Direccionamiento lógico y enrutamiento | Paquete | IP | IP, ICMP, routers |
| 2 | Enlace de datos | Entrega local, detección de errores | Trama | MAC | Ethernet, 802.1Q, switches |
| 1 | Física | Bits sobre el medio, señalización | Bits | — | Transceivers, hubs, repetidores |

### Encapsulación

Datos -> (+cabecera TCP/UDP con puertos) Segmento -> (+cabecera IP) Paquete ->
(+cabecera MAC +trailer FCS) Trama -> Bits.

La capa 2 es la única que añade también un trailer.

### Anclaje con operaciones de DC

La escalera de diagnóstico habitual ES el OSI:
puerto up/up (L1) -> MAC aprendida y VLAN correcta (L2) -> ping/gateway/ruta (L3)
-> puerto TCP acepta conexión (L4) -> el servicio responde (L7).
CompTIA llama a ese orden **bottom-up**.

### Dispositivos por capa

- L1: hub, repetidor
- L2: switch tradicional, bridge
- L3: router, switch multicapa (L3)
- L3/L4: firewall stateful clásico
- L7: NGFW, load balancer que decide por URL o cookie

### Zonas grises (declaradas, no asumidas)

- **ARP**: vive entre L2 y L3. CompTIA lo trata normalmente como **capa 2**.
- **TLS**: técnicamente sobre TCP, pero en preguntas conceptuales de OSI se mapea
  a **capa 6** por su función de cifrado/formato.

### Nota sobre el modelo TCP/IP

En los objetivos oficiales de N10-009, el objetivo 1.1 enumera solo las 7 capas
OSI; el modelo TCP/IP no aparece como bullet propio. Se cubre como andamiaje y
porque sí es material de CCNA.

Mapeo: Application (OSI 5-6-7), Transport (4), Internet (3), Network Access (2-1).

## Práctica (15 preguntas)

1. ¿En qué capa del modelo OSI opera un switch Ethernet tradicional no administrable?
   a) Capa 1
   b) Capa 2
   c) Capa 3
   d) Capa 4

2. ¿Cuál es la PDU de la capa de transporte cuando se usa TCP?
   a) Trama
   b) Paquete
   c) Segmento
   d) Bit

3. Un servidor recién desplegado tiene el puerto del switch en up/up, el switch
   muestra su MAC aprendida en la VLAN correcta y alcanza por ping a otro host de
   su misma subred. No alcanza ningún host de otra subred. ¿En qué capa está el
   problema más probable?
   a) Capa 1
   b) Capa 2
   c) Capa 3
   d) Capa 7

4. ¿Qué capa es responsable de la segmentación, el control de flujo y el
   reensamblado de los datos?
   a) Capa 2
   b) Capa 3
   c) Capa 4
   d) Capa 5

5. ¿Qué capa es responsable del cifrado y del formato de los datos (traducción de
   caracteres, compresión)?
   a) Capa 4
   b) Capa 5
   c) Capa 6
   d) Capa 7

6. ¿Cuál es el orden correcto de encapsulación al bajar por la pila?
   a) Datos -> paquete -> segmento -> trama -> bits
   b) Datos -> segmento -> paquete -> trama -> bits
   c) Datos -> trama -> paquete -> segmento -> bits
   d) Bits -> trama -> paquete -> segmento -> datos

7. El contador de un puerto de switch muestra errores CRC/FCS incrementándose en
   las tramas recibidas. ¿En qué capa se **detecta** ese error?
   a) Capa 1
   b) Capa 2
   c) Capa 3
   d) Capa 4

8. Un balanceador envía las peticiones cuya ruta empieza por /api a un pool y el
   resto a otro pool. ¿En qué capa opera?
   a) Capa 3
   b) Capa 4
   c) Capa 6
   d) Capa 7

9. ¿Qué capa establece, mantiene y termina el diálogo entre dos hosts?
   a) Capa 3
   b) Capa 4
   c) Capa 5
   d) Capa 6

10. ¿A qué capas del OSI corresponde la capa de Aplicación del modelo TCP/IP?
    a) Solo la capa 7
    b) Capas 6 y 7
    c) Capas 5, 6 y 7
    d) Capas 4, 5, 6 y 7

11. ¿En qué capa opera ICMP?
    a) Capa 2
    b) Capa 3
    c) Capa 4
    d) Capa 7

12. Un firewall stateful tradicional filtra por IP de origen, IP de destino y
    número de puerto. ¿En qué capas opera?
    a) Capas 1 y 2
    b) Capas 2 y 3
    c) Capas 3 y 4
    d) Capas 4 y 7

13. Desde otra subred, el ping a un servidor web responde correctamente. Al
    conectar por HTTPS, la captura muestra SYN al puerto 443 sin SYN-ACK de
    vuelta. ¿Capa más alta confirmada y dónde está el fallo?
    a) Confirmada capa 2; fallo en capa 3
    b) Confirmada capa 3; fallo en capa 4
    c) Confirmada capa 4; fallo en capa 7
    d) Confirmada capa 7; fallo en capa 6

14. ¿Qué afirmación describe correctamente el direccionamiento en el OSI?
    a) La capa 2 usa direcciones lógicas y la capa 3 usa direcciones físicas
    b) La capa 2 usa direcciones MAC y la capa 3 usa direcciones IP
    c) La capa 3 usa direcciones MAC y la capa 4 usa direcciones IP
    d) La capa 1 usa direcciones MAC y la capa 2 usa direcciones IP

15. Un técnico verifica primero el estado del enlace, después la tabla MAC,
    después la IP y el gateway, y por último el servicio de la aplicación.
    ¿Qué enfoque de troubleshooting aplica?
    a) Top-to-bottom
    b) Bottom-to-top
    c) Divide and conquer
    d) Follow the path

## Answer Key

**1. Correcta: b) Capa 2**
- b): el switch decide por MAC de destino contra su tabla MAC; MAC y trama son L2.
  Que sea administrable o no es irrelevante: la gestión corre en capas altas, la
  conmutación es L2.
- a) mal: L1 solo regenera bits sin leer direcciones — eso es un hub, que inunda
  todo por todos los puertos precisamente porque no puede leer la trama.
- c) mal: L3 implica leer la cabecera IP y enrutar entre subredes; eso es un router
  o switch multicapa.
- d) mal: L4 implica decisiones por puerto TCP/UDP, propio de firewalls y LB L4.

**2. Correcta: c) Segmento**
- c): la PDU de L4 con TCP es el segmento. Matiz que CompTIA distingue: con **UDP**
  la PDU es el **datagrama**.
- a) mal: la trama es PDU de L2, con cabecera MAC y trailer FCS.
- b) mal: el paquete es PDU de L3, ya con cabecera IP.
- d) mal: el bit es la unidad de L1, no una PDU con cabeceras.

**3. Correcta: c) Capa 3**
- c): el enunciado confirma L1 (up/up) y L2 (MAC, VLAN), y que la comunicación
  intra-subred funciona. Que falle solo el tráfico inter-subred apunta a
  enrutamiento: gateway ausente/incorrecto o ruta de retorno inexistente.
- a) mal: un fallo L1 rompería todo el tráfico y el puerto no estaría up/up.
- b) mal: si L2 fallara, el ping dentro de la misma subred también fallaría.
- d) mal: un fallo L7 afectaría a un servicio concreto, no a toda la conectividad
  inter-subred; el enunciado ni menciona un servicio.

**4. Correcta: c) Capa 4**
- c): transporte parte el flujo en segmentos, numera para reensamblar en orden y
  gestiona flow control con ventanas (windowing) en TCP.
- a) mal: L2 detecta errores con FCS y entrega local por MAC; no segmenta el flujo
  de aplicación ni gestiona ventanas.
- b) mal: L3 enruta y direcciona. Puede fragmentar por MTU, pero fragmentación IP
  != segmentación de transporte.
- d) mal: L5 gestiona el ciclo de vida de la sesión, no el troceado ni la tasa.

**5. Correcta: c) Capa 6**
- c): presentación es la traductora — formato, codificación, compresión, cifrado.
  "Cifrado", "formato" y "compresión" son las palabras gatillo de L6.
- a) mal: L4 gestiona entrega fiable y puertos; no transforma el contenido.
- b) mal: L5 abre y cierra la sesión, no altera el formato de lo transportado.
- d) mal: L7 es la interfaz del servicio; puede pedir cifrado, pero la función de
  cifrar se mapea a L6.

**6. Correcta: b) Datos -> segmento -> paquete -> trama -> bits**
- b): L4 añade puertos (segmento), L3 añade IPs (paquete), L2 añade MACs + FCS
  (trama), L1 convierte a bits.
- a) mal: invierte segmento y paquete; la cabecera IP se añade después de la TCP
  porque el paquete transporta al segmento, no al revés.
- c) mal: coloca la trama antes que el paquete, invirtiendo L2 y L3.
- d) mal: describe la **desencapsulación** (subir la pila en el receptor).
  Distractor clásico: siempre lee la dirección del flujo.

**7. Correcta: b) Capa 2**
- b): el FCS es el trailer de la trama Ethernet y la comprobación CRC contra ese
  campo es función de L2; la trama se descarta ahí.
- a) mal: la **causa raíz** suele ser física (señal degradada, duplex mismatch),
  pero la pregunta es dónde se *detecta*, y L1 no conoce tramas ni campos de
  verificación. Distinguir detección de origen es lo que se evalúa.
- c) mal: L3 tiene checksum de cabecera IP, pero no evalúa el FCS; la trama
  corrupta ya fue descartada antes de llegar a L3.
- d) mal: TCP tiene checksum propio, pero no valida la trama Ethernet.

**8. Correcta: d) Capa 7**
- d): decidir por la ruta /api exige abrir y leer la petición HTTP, contenido L7.
  URL, cabeceras HTTP, cookies o hostname => L7.
- a) mal: una decisión L3 se basaría solo en IP de destino, sin ver contenido.
- b) mal: un LB L4 reparte por IP y puerto; puede mandar todo el 443 a un pool
  pero no distinguir /api, porque no inspecciona el payload.
- c) mal: aunque haya TLS (L6), el criterio de reparto es el contenido de la
  aplicación. Si el LB termina TLS, lo hace *para poder* leer L7.

**9. Correcta: c) Capa 5**
- c): sesión establece, mantiene y termina el diálogo, incluyendo control de
  quién transmite y reanudación. "Establecer, mantener, terminar" = gatillo L5.
- a) mal: L3 entrega paquetes sin estado ni concepto de conversación.
- b) mal: distractor fuerte — TCP hace handshake para "establecer conexión", pero
  en vocabulario OSI la *conexión* de transporte es L4 y la *sesión* o diálogo es
  L5. Si dice "sesión"/"diálogo" -> 5; si dice "fiabilidad"/"puertos"/"handshake
  TCP" -> 4.
- d) mal: L6 transforma el formato, no gestiona el ciclo de vida del diálogo.

**10. Correcta: c) Capas 5, 6 y 7**
- c): TCP/IP colapsa Sesión, Presentación y Aplicación en una sola capa
  Application. Transport = L4, Internet = L3, Network Access = L2+L1.
- a) mal: dejaría sesión y presentación sin correspondencia.
- b) mal: incluye presentación pero omite sesión, que también queda absorbida.
- d) mal: la L4 del OSI mapea a Transport, una capa distinta y separada.

**11. Correcta: b) Capa 3**
- b): ICMP es la mensajería de control de la capa de red (ping, traceroute,
  Destination Unreachable, Time Exceeded). Va encapsulado directamente en IP.
- a) mal: L2 no maneja direcciones IP, e ICMP opera íntegramente sobre IP.
- c) mal: error más frecuente — ICMP **no usa puertos** ni cabecera de transporte;
  usa campos de tipo y código. "El puerto de ICMP" es una premisa falsa.
- d) mal: ping es una utilidad de usuario, pero lo que viaja por el cable es un
  protocolo L3, no uno de aplicación como HTTP o DNS.

**12. Correcta: c) Capas 3 y 4**
- c): filtrar por IP origen/destino es L3; filtrar por puerto es L4. El rastreo de
  estado de la conexión TCP también es información L4.
- a) mal: L1 y L2 no ven IPs ni puertos; ahí se filtraría por MAC (port security).
- b) mal: acierta la 3 pero sustituye la 4 por la 2, y el enunciado menciona
  explícitamente números de puerto.
- d) mal: incluye L7, que exigiría inspección del contenido de aplicación — eso es
  un NGFW o proxy, y el enunciado dice "stateful tradicional" limitado a IP y
  puerto.

**13. Correcta: b) Confirmada capa 3; fallo en capa 4**
- b): el ping con respuesta desde otra subred prueba enrutamiento, direccionamiento
  IP y todo lo inferior => L3 confirmada. SYN sin SYN-ACK significa que la conexión
  TCP no se establece: puerto cerrado, servicio no escuchando en 443, ACL o
  firewall bloqueando => L4.
- a) mal: infravalora lo confirmado; una respuesta de ping inter-subred demuestra
  L3 funcional, no solo L2.
- c) mal: L4 **no** está confirmada, precisamente porque el handshake no se
  completó; sin sesión TCP no puede haber tráfico de aplicación.
- d) mal: no se intercambió ni un byte de datos de aplicación, así que nada por
  encima de L3 está confirmado.

**14. Correcta: b) La capa 2 usa direcciones MAC y la capa 3 usa direcciones IP**
- b): la MAC es la dirección física de la NIC, con alcance al segmento local; la IP
  es la lógica, asignada por configuración, y permite enrutar entre redes.
- a) mal: invierte los términos; L2 usa físicas y L3 lógicas.
- c) mal: desplaza ambas una capa arriba; L4 direcciona por puerto, nunca por IP.
- d) mal: L1 no direcciona nada, y L2 usa MAC, no IP.

**15. Correcta: b) Bottom-to-top**
- b): arranca en L1 y sube ordenadamente hasta L7. Es el enfoque razonable cuando
  se sospecha problema físico o de infraestructura, como en un despliegue nuevo.
- a) mal: top-to-bottom es el orden inverso — empezar por el servicio y descender;
  se usa cuando falla una aplicación concreta y el resto de la red va bien.
- c) mal: divide and conquer empieza en una capa intermedia (normalmente L3 con un
  ping) y decide hacia dónde moverse según el resultado; aquí el recorrido es
  secuencial desde abajo.
- d) mal: follow the path traza el camino del tráfico salto a salto entre origen y
  destino; recorre dispositivos, no capas.

## Resultado

- Score: pendiente (Andy resuelve y reporta)
- Temas flojos detectados: pendiente
