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

**Score: 10/15 (67%)** — por debajo del umbral estimado de aprobado (~75-80% de
aciertos; CompTIA no publica la conversión exacta a la escala 100-900).

Fallos: 2, 8, 10, 11, 13.

### Patrón de error

Identifica bien la **función** de cada capa, pero falla al mapear **objetos
concretos** a capas y al leer qué capa está **confirmada** en un escenario.

Señal clara: acertó el orden completo de encapsulación (P6) y falló el nombre de
la PDU de transporte (P2). Secuencia memorizada sin atar al número de capa.

| Fallo | Tipo de error |
|-------|---------------|
| 2 (PDU) | Nomenclatura PDU <-> capa |
| 8 (LB), 11 (ICMP) | Mapeo objeto -> capa |
| 10 (TCP/IP) | Estructura del modelo TCP/IP |
| 13 (escenario) | Confirmado vs. fallido |

El fallo 13 es el prioritario: Troubleshooting pesa 24% del examen.

## Remediales

### 1. PDU <-> capa (fallo 2)

La PDU se llama por la última cabecera añadida:

- L4 añade puertos -> **Segmento** (TCP) / **Datagrama** (UDP)
- L3 añade IPs -> **Paquete**
- L2 añade MACs + FCS -> **Trama**

**4-3-2 = Segmento, Paquete, Trama.**

Anclaje: en Wireshark cada línea es una trama; dentro el paquete IP; dentro el
segmento TCP.

### 2. Regla universal de "¿en qué capa opera X?" (fallos 8 y 11)

No preguntes "qué es este dispositivo". Pregunta **qué campo tiene que leer para
hacer su trabajo**:

| Lo que necesita leer | Capa |
|----------------------|------|
| URL, cabecera HTTP, cookie, hostname | 7 |
| Número de puerto TCP/UDP | 4 |
| Dirección IP | 3 |
| Dirección MAC | 2 |

- P8: para separar /api hay que leer la URL -> L7. Un LB L4 solo ve "puerto 443".
- P11: ICMP no tiene puerto (usa tipo/código) y va sobre IP -> L3.

Error de raíz en P11: confundir **la herramienta con el protocolo**. `ping` es un
ejecutable de usuario, pero lo que sale por el cable es ICMP sobre IP. Igual con
`traceroute`.

### 3. Modelo TCP/IP (fallo 10)

TCP/IP tiene una capa **Transport propia y separada**. Si Transport ya existe,
Application no puede incluir también la L4 — sería contar la función dos veces.

| TCP/IP | OSI |
|--------|-----|
| Application | 7, 6, 5 |
| Transport | 4 |
| Internet | 3 |
| Network Access / Link | 2, 1 |

### 4. Confirmado vs. fallido (fallo 13) — el más rentable

**Nunca puede haber una capa superior confirmada por encima de una capa que
falló.** Las capas altas dependen de las bajas; si L4 no se establece, L5-L7 ni
llegaron a ejecutarse.

Lectura del escenario P13:
1. Ping responde desde otra subred -> paquete IP enrutado ida y vuelta -> **L3
   confirmada** (y por dependencia L2, L1).
2. SYN al 443 sin SYN-ACK -> handshake intentado y no completado -> **L4 fallida**.
3. Conclusión: más alto confirmado L3, fallo en L4.

Causas L4 posibles: servicio no escucha, ACL/firewall descarta el SYN, RST.

**Regla operativa: "confirmado" = completó su función de extremo a extremo.**
Un ping que responde confirma L3 y nada más.

## Drill de refuerzo (10 preguntas)

Solo sobre los 5 puntos débiles.

1. Un analizador captura tráfico. La unidad que ya contiene la cabecera IP pero
   todavía no la cabecera Ethernet se denomina:
   a) Trama  b) Paquete  c) Segmento  d) Datagrama

2. Una aplicación de streaming envía tráfico sobre UDP. ¿Cómo se denomina la PDU
   de capa 4 en ese caso?
   a) Segmento  b) Paquete  c) Datagrama  d) Trama

3. Un switch multicapa con SVIs enruta tráfico entre la VLAN 10 y la VLAN 20.
   ¿En qué capa opera al realizar esa función?
   a) Capa 1  b) Capa 2  c) Capa 3  d) Capa 4

4. Un host envía una solicitud ARP para resolver una IP de su misma subred.
   Según el tratamiento habitual de CompTIA, ¿en qué capa opera ARP?
   a) Capa 1  b) Capa 2  c) Capa 3  d) Capa 4

5. Un proxy inverso examina la cabecera Host: de las peticiones entrantes para
   decidir el backend de destino. ¿En qué capa opera?
   a) Capa 3  b) Capa 4  c) Capa 6  d) Capa 7

6. En el modelo TCP/IP, ¿a qué capa corresponde la capa 4 del OSI?
   a) Application  b) Transport  c) Internet  d) Network Access

7. La capa Network Access (Link) del modelo TCP/IP agrupa qué capas del OSI?
   a) Solo la 1  b) Capas 1 y 2  c) Capas 1, 2 y 3  d) Capas 2 y 3

8. Un usuario se conecta por RDP. El ping responde, DNS resuelve, la conexión TCP
   al 3389 se establece con handshake completo, pero el servidor rechaza las
   credenciales. ¿En qué capa está el fallo?
   a) Capa 3  b) Capa 4  c) Capa 6  d) Capa 7

9. Un servidor no responde a ping desde ningún host. El puerto está up/up y la MAC
   aparece en la tabla del switch en la VLAN esperada. ¿Qué está confirmado y
   dónde buscar?
   a) Confirmadas 1 y 2; buscar en capa 3
   b) Confirmada solo la 1; buscar en capa 2
   c) Confirmadas 1, 2 y 3; buscar en capa 4
   d) Confirmadas 1, 2 y 3; buscar en capa 7

10. Un técnico afirma: "la aplicación web funciona porque el servidor responde al
    ping". ¿Por qué es incorrecto?
    a) Porque el ping usa TCP y la web usa UDP
    b) Porque el ping solo confirma hasta la capa 3, y el servicio web depende
       además de las capas 4 y 7
    c) Porque el ping confirma la capa 7 pero no las inferiores
    d) Porque ICMP y HTTP usan números de puerto distintos

## Answer Key del drill

**1. Correcta: b) Paquete**
- b): la PDU se nombra por la última cabecera añadida; con IP presente y Ethernet
  ausente es un paquete de capa 3.
- a) mal: sería trama solo tras añadir cabecera MAC y trailer FCS, y el enunciado
  dice que Ethernet aún no está.
- c) mal: el segmento es la unidad *antes* de añadir la cabecera IP.
- d) mal: datagrama es la PDU de capa 4 con UDP, no una unidad de capa 3.

**2. Correcta: c) Datagrama**
- c): con UDP la PDU de L4 se llama datagrama. Es el matiz que faltó en P2.
- a) mal: "segmento" corresponde a TCP; ambos son L4 pero CompTIA distingue el
  nombre según el protocolo.
- b) mal: el paquete es L3, sea cual sea el transporte.
- d) mal: la trama es L2 y tampoco depende del transporte.

**3. Correcta: c) Capa 3**
- c): cruzar de la VLAN 10 a la 20 exige consultar la IP de destino y enrutar.
  Por eso el dispositivo se llama switch *multicapa*.
- a) mal: la capa 1 no lee direcciones.
- b) mal: conmutar dentro de una misma VLAN sí es L2, pero una VLAN es por
  definición un dominio de broadcast separado; cruzarlas requiere enrutamiento.
- d) mal: no hay decisión por número de puerto en el enunciado.

**4. Correcta: b) Capa 2**
- b): zona gris declarada. ARP resuelve L3 -> L2 y CompTIA lo sitúa habitualmente
  en capa 2. Si el examen enfrenta 2 contra 3, marca 2.
- a) mal: la capa 1 no maneja direcciones.
- c) mal: defendible técnicamente (ARP trabaja con IPs) pero no es la respuesta
  esperada por CompTIA.
- d) mal: ARP no usa puertos ni protocolo de transporte.

**5. Correcta: d) Capa 7**
- d): la cabecera Host: es parte de la petición HTTP; leerla exige inspeccionar el
  payload -> L7.
- a) mal: una decisión L3 solo miraría la IP, y varios hostnames comparten IP —
  ese es justamente el escenario que el proxy resuelve.
- b) mal: L4 ve el puerto 80/443, idéntico para todos los hostnames.
- c) mal: si hay TLS, el proxy termina el cifrado (L6) *para poder* leer L7; la
  decisión sigue siendo L7.

**6. Correcta: b) Transport**
- b): correspondencia uno a uno; TCP y UDP en ambos modelos.
- a) mal: error de P10 original. Application agrupa 5, 6 y 7, nunca la 4, porque
  Transport ya existe como capa separada.
- c) mal: Internet corresponde a la capa 3 (IP, ICMP, enrutamiento).
- d) mal: Network Access corresponde a las capas 2 y 1.

**7. Correcta: b) Capas 1 y 2**
- b): agrupa acceso al medio y entrega local — física y enlace de datos.
- a) mal: dejaría la capa 2 sin correspondencia, y Ethernet/MACs tienen que estar
  en alguna capa del modelo.
- c) mal: incluye la 3, que en TCP/IP es su propia capa (Internet).
- d) mal: omite la 1 e incluye incorrectamente la 3.

**8. Correcta: d) Capa 7**
- d): el enunciado confirma L3 (ping), resolución de nombres y L4 (handshake
  completo). Solo falla la autenticación, dentro del diálogo de aplicación -> L7.
- a) mal: el ping responde, L3 confirmada.
- b) mal: el handshake se completó; L4 cumplió su función.
- c) mal: no hay nada sobre cifrado, formato ni codificación.

Contraste con P13 del examen original: allí el handshake **no** se completaba y el
fallo era L4; aquí sí se completa y el fallo sube a L7. Los separa una sola línea
del enunciado.

**9. Correcta: a) Confirmadas 1 y 2; buscar en capa 3**
- a): up/up confirma L1; MAC aprendida en la VLAN correcta confirma L2. El ping
  falla, así que L3 no está confirmada: revisar IP, máscara, gateway o firewall
  del host.
- b) mal: infravalora lo confirmado; la MAC en la tabla del switch prueba L2.
- c) mal: L3 no puede estar confirmada cuando el ping, que es la prueba de L3,
  está fallando.
- d) mal: mismo error que c), y además salta a L7 con el fallo mucho más abajo.

**10. Correcta: b)**
- b): un ping confirma alcanzabilidad por IP y nada más. El servicio web puede
  estar caído, el 443 filtrado o el proceso sin arrancar, y el ping respondería
  igual.
- a) mal: premisa falsa doble — ping usa ICMP, no TCP; HTTP/HTTPS usan TCP, no UDP.
- c) mal: invierte el razonamiento; el ping confirma capas bajas, nunca la 7.
- d) mal: premisa falsa — ICMP no usa números de puerto.

### Resultado del drill

**Score: 5/10.** Fallos: 2, 3, 6, 7, 8.

| # | Respuesta de Andy | Correcta |
|---|-------------------|----------|
| 1 | B | B |
| 2 | A | C |
| 3 | D | C |
| 4 | B | B |
| 5 | D | D |
| 6 | A | B |
| 7 | C | B |
| 8 | C | D |
| 9 | A | A |
| 10 | B | B |

Los fallos 6 y 7 son el modelo TCP/IP: el mismo error que en P10 del examen
original. No se fijó porque se dio una tabla para memorizar en lugar de un
modelo mental.

## RESET PEDAGÓGICO — calibración de nivel

Andy corrigió una asunción incorrecta del tutor: su experiencia de data center
fue **netamente hardware**. Nunca hizo configuración ni troubleshooting, nunca
usó Wireshark ni CLI de equipos de red.

El Día 1 se explicó usando Wireshark, `up/up`, tablas MAC, SVIs, ACLs y
handshakes como vocabulario conocido. Eso invalidó parte de las explicaciones y
de las preguntas. `CLAUDE.md` actualizado con la calibración.

### Glosario base (lo que faltaba definir)

| Término | Definición llana |
|---------|------------------|
| Dirección IP | Número que identifica a un equipo en la red. Se configura, se cambia. |
| Dirección MAC | Número grabado de fábrica en la tarjeta de red. No se cambia. |
| Puerto | Número que identifica **qué programa** dentro del equipo (80 web, 443 web segura, 3389 escritorio remoto). Nada que ver con puertos físicos. |
| Subred | Grupo de equipos que se hablan directamente. "Un barrio". |
| Gateway | La salida del barrio. Normalmente un router. |
| Switch | Reparte tráfico **dentro** de un barrio. |
| Router | Conecta **barrios distintos**. |
| VLAN | Barrio virtual, creado por configuración. |
| Wireshark | Programa que captura el tráfico y lo muestra línea por línea. |
| up/up | Estado de puerto en un switch. 1º up = hay señal. 2º up = los datos se entienden. |
| Tabla MAC | Lista del switch: "por este puerto tengo a este equipo". |
| Handshake TCP | Saludo de 3 pasos: SYN ("¿hablamos?"), SYN-ACK ("sí"), ACK ("empiezo"). |
| ACL | Lista de reglas de permitir/denegar. Un filtro. |
| SVI | IP asignada a una VLAN dentro de un switch, para poder enrutar entre VLANs. |
| PDU | Nombre que recibe el paquetito de datos en cada capa. |

### Re-explicación: la analogía postal

Enviar un documento a una persona concreta de una empresa en otra ciudad.

- **L7 Aplicación** — el documento en sí. El contenido.
- **L6 Presentación** — el idioma en que está escrito y el sobre lacrado (cifrado).
- **L5 Sesión** — la correspondencia: abrirla, mantenerla, cerrarla.
- **L4 Transporte** — el **departamento** dentro del edificio (= puerto) y el tipo
  de envío: TCP = certificado con acuse de recibo; UDP = carta normal al buzón.
  Si el documento es largo, aquí se parte en trozos numerados.
- **L3 Red** — la **dirección postal** de la ciudad destino (= IP).
- **L2 Enlace** — el **camión de este tramo concreto** (= MAC). Cambia en cada
  oficina de correos intermedia.
- **L1 Física** — la carretera. Cable, fibra, radio.

**Concepto central del Día 1:**
> La IP (L3) es el destino final y NO cambia en todo el trayecto.
> La MAC (L2) es el vehículo del tramo actual y CAMBIA en cada salto.

### Por qué las PDU cambian de nombre

```
Tus datos
   ↓ L4 le pone el número de departamento (puerto)
SEGMENTO  (o DATAGRAMA si es UDP)
   ↓ L3 le pone la dirección postal (IP)
PAQUETE
   ↓ L2 le pone la matrícula del camión (MAC)
TRAMA
   ↓ L1 lo convierte en señal
BITS
```

### Modelo TCP/IP — con lógica, no con tabla

OSI tiene 7 capas y es teórico. TCP/IP tiene 4 y es el que se usa de verdad.
TCP/IP no inventó nada: solo **agrupó** capas contiguas del OSI.

```
OSI (7 capas)              TCP/IP (4 capas)
7 Aplicación   ┐
6 Presentación ├──────►    APPLICATION
5 Sesión       ┘
4 Transporte   ───────►    TRANSPORT
3 Red          ───────►    INTERNET
2 Enlace       ┐
1 Física       ┴──────►    NETWORK ACCESS
```

Ninguna capa se mueve, se salta ni aparece en dos grupos.

**Regla de comprobación:** suma las capas de los 4 grupos y tiene que dar
exactamente 7 sin repetir. 3 + 1 + 1 + 2 = 7.

- Fallo P6: la L4 tiene grupo propio (Transport); no puede estar además en
  Application — estaría en dos sitios a la vez.
- Fallo P7: la L3 tiene grupo propio (Internet); Network Access es solo L2 + L1.

### Fallo P3 — switch multicapa entre VLANs

VLAN = barrio. Ir de la VLAN 10 a la VLAN 20 es ir **de un barrio a otro**, y eso
exige mirar la dirección postal (IP) = **capa 3**. "Multicapa" significa que el
switch, además de L2, sabe hacer L3.

Andy respondió L4. Pista general: **si el enunciado no menciona puertos ni
programas, la capa 4 casi nunca es la respuesta.**

### Fallo P8 — RDP rechaza credenciales

1. Ping responde -> la dirección postal funciona -> **L3 confirmada**.
2. DNS resuelve -> el nombre se traduce bien.
3. Handshake TCP completo al 3389 -> llegó al departamento y le abrieron ->
   **L4 confirmada**.
4. Credenciales rechazadas -> usuario y contraseña son parte de la conversación
   **del programa** -> **L7**.

Andy respondió L6 porque "credenciales" suena a seguridad. Pero L6 sería un fallo
de cifrado: contenido ilegible o desacuerdo en cómo cifrar. Aquí el mensaje llegó
perfectamente legible y el servidor **decidió** rechazarlo. Decisión de
aplicación = L7.

### Reglas maestras (versión sin jerga)

**¿Qué dato tiene que mirar para hacer su trabajo?**

| Si mira... | Capa |
|------------|------|
| Contenido del programa (usuario/contraseña, dirección web, nombre del sitio) | 7 |
| Número de puerto (80, 443, 3389) | 4 |
| Dirección IP | 3 |
| Dirección MAC | 2 |
| Nada, solo mueve señal | 1 |

**En escenarios de avería:** solo está confirmado lo que terminó su trabajo
completo, y nunca funciona algo de arriba si algo de abajo falló. Ping que
responde = capa 3 confirmada, ni una más.

## Comprobación final (6 preguntas)

1. Un mensaje viaja de Madrid a Chicago pasando por varios routers. ¿Qué ocurre
   con las direcciones durante el trayecto?
   a) La IP y la MAC cambian en cada salto
   b) La IP se mantiene de extremo a extremo; la MAC cambia en cada salto
   c) La MAC se mantiene de extremo a extremo; la IP cambia en cada salto
   d) Ni la IP ni la MAC cambian

2. Una llamada de voz por internet usa UDP. ¿Cómo se llama su PDU de capa 4?
   a) Segmento  b) Paquete  c) Datagrama  d) Trama

3. Sumando las capas OSI que agrupa cada capa de TCP/IP, ¿cuántas quedan
   cubiertas en total?
   a) 4  b) 5  c) 7  d) 9

4. Un aparato decide hacia dónde enviar el tráfico mirando únicamente la IP de
   destino. ¿En qué capa opera?
   a) Capa 1  b) Capa 2  c) Capa 3  d) Capa 4

5. Un usuario accede a una aplicación web, escribe su contraseña y el sistema
   dice que es incorrecta. Todo lo demás funciona. ¿En qué capa está el fallo?
   a) Capa 2  b) Capa 3  c) Capa 4  d) Capa 7

6. Un técnico ve que un servidor responde al ping y concluye que su servicio de
   correo funciona. ¿Por qué es incorrecto?
   a) Porque el ping no funciona con servidores de correo
   b) Porque el ping confirma alcanzabilidad por IP (capa 3), pero no dice nada
      del programa de correo (capas 4 y 7)
   c) Porque el ping confirma la capa 7 pero no las inferiores
   d) Porque el correo no usa direcciones IP

- Score: pendiente (Andy resuelve y reporta)
