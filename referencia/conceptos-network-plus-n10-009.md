# Lista maestra de conceptos — CompTIA Network+ N10-009

## Cómo usar esta lista

**No la copies entera a mano.** Transcribir es modo pasivo — el mismo que produjo
3/6 en la comprobación del Día 1.

Úsala como **índice**:
1. Escribe solo los **títulos** en la libreta, dejando espacio debajo.
2. Rellena cada definición **con tus palabras y sin mirar**, después de cubrir ese
   tema en una sesión.
3. Marca con una X los que ya puedes definir de memoria.

Una libreta con 400 definiciones copiadas no aprueba el examen. 400 títulos que
puedes definir de memoria, sí.

## Fiabilidad de esta lista

Construida desde el conocimiento del tutor sobre el examen, **no copiada del
documento oficial**. La estructura de 5 dominios y sus pesos son los que aportó
Andy.

**No incluye los números de objetivo (1.1, 1.2...) a propósito**: no se inventan.
Están exactos en el PDF oficial de objetivos N10-009, y **ese PDF es la autoridad
final**. Si algo de aquí no aparece en el PDF, gana el PDF.

Puntos marcados como inciertos más abajo: 802.11be / Wi-Fi 7.

---

# DOMINIO 1 — Networking Concepts (23%)

## Modelo OSI
- Las 7 capas: Física, Enlace de datos, Red, Transporte, Sesión, Presentación, Aplicación
- PDU de cada capa: bits, trama, paquete, segmento/datagrama, datos
- Encapsulación y desencapsulación
- Modelo TCP/IP de 4 capas y su correspondencia con OSI

## Dispositivos y funciones de red
- Router
- Switch (gestionable / no gestionable, capa 2 / multicapa)
- Firewall
- IDS / IPS
- Load balancer
- Proxy (directo e inverso)
- NAS vs SAN
- Wireless access point (AP)
- Wireless LAN controller (WLC)
- Repetidor, bridge, hub, módem
- VPN headend / concentrador
- Servidores: DNS, DHCP, NTP, syslog
- CDN
- VoIP / VTC
- QoS
- TTL / hop limit
- ICS / SCADA
- Virtualización de red: hipervisor, vSwitch, vNIC, NFV

## Conceptos de nube
- Modelos de servicio: SaaS, IaaS, PaaS
- Modelos de despliegue: pública, privada, híbrida, comunitaria
- VPC
- Grupos de seguridad de red / listas de seguridad
- Gateways de nube: internet gateway, NAT gateway
- Conectividad: VPN vs direct connect
- Escalabilidad, elasticidad, multitenancy
- NFV en nube

## Puertos y protocolos (MEMORIZACIÓN OBLIGATORIA)

| Protocolo | Puerto | TCP/UDP |
|-----------|--------|---------|
| FTP (datos / control) | 20 / 21 | TCP |
| SSH / SFTP / SCP | 22 | TCP |
| Telnet | 23 | TCP |
| SMTP | 25 | TCP |
| DNS | 53 | TCP y UDP |
| DHCP (servidor / cliente) | 67 / 68 | UDP |
| TFTP | 69 | UDP |
| HTTP | 80 | TCP |
| POP3 | 110 | TCP |
| NTP | 123 | UDP |
| IMAP | 143 | TCP |
| SNMP (consultas / traps) | 161 / 162 | UDP |
| LDAP | 389 | TCP |
| HTTPS | 443 | TCP |
| SMB | 445 | TCP |
| Syslog | 514 | UDP |
| SMTPS | 587 | TCP |
| LDAPS | 636 | TCP |
| IMAP over SSL | 993 | TCP |
| POP3 over SSL | 995 | TCP |
| SQL Server | 1433 | TCP |
| RDP | 3389 | TCP |
| SIP | 5060 / 5061 | TCP y UDP |

## Protocolos IP y tipos de tráfico
- ICMP
- TCP vs UDP (con acuse de recibo vs sin él)
- GRE
- IPSec: AH y ESP
- Unicast, multicast, anycast, broadcast

## Medios de transmisión y transceptores
- Cobre vs fibra (monomodo vs multimodo)
- Inalámbrico: 802.11, celular, satélite
- Transceptores: SFP, SFP+, QSFP, QSFP+
- Conectores: LC, SC, ST, MPO, RJ11, RJ45, F-type, BNC
- Full duplex vs half duplex

## Topologías y arquitecturas
- Malla (mesh), híbrida, estrella / hub-and-spoke
- Spine and leaf
- Punto a punto
- Jerárquica de 3 capas: core, distribución (agregación), acceso
- Collapsed core
- Flujos de tráfico: norte-sur y este-oeste

## Direccionamiento IPv4
- Públicas vs privadas
- RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- Máscara de subred y CIDR
- Subnetting, VLSM
- Clases A, B, C, D, E
- Loopback 127.0.0.1
- APIPA 169.254.0.0/16
- Default gateway
- Broadcast de subred
- NAT y PAT

## Direccionamiento IPv6
- Formato de 128 bits y reglas de abreviación
- Link-local (fe80::/10)
- Unique local
- Global unicast
- Multicast y anycast (IPv6 no tiene broadcast)
- SLAAC
- EUI-64
- Dual stack
- Tunneling
- NDP — sustituye a ARP en IPv6

## Entornos de red modernos
- SDN
- SD-WAN
- VXLAN
- DCI (interconexión de centros de datos)
- Zero Trust Architecture (ZTA)
- Autenticación y autorización basadas en políticas
- Mínimo privilegio
- SASE y SSE
- IaC (infraestructura como código)
- Automatización: playbooks, plantillas, tareas reutilizables
- Configuration drift
- Inventarios dinámicos
- Control de versiones: versionado, ramas, resolución de conflictos

---

# DOMINIO 2 — Network Implementation (20%)

## Routing
- Rutas estáticas vs dinámicas
- Ruta por defecto
- Protocolos: OSPF, EIGRP, BGP, RIP
- Selección de ruta: distancia administrativa, longitud de prefijo, métrica
- Tabla de enrutamiento
- NAT y PAT en el router
- FHRP (redundancia de primer salto)
- VIP (IP virtual)
- Subinterfaces
- Enrutamiento entre VLANs (router-on-a-stick)

## Switching
- VLAN: concepto, base de datos de VLANs
- Native VLAN
- Voice VLAN
- Etiquetado 802.1Q (trunking)
- Link aggregation / LACP
- Spanning Tree Protocol (STP) y RSTP
- Tabla MAC
- Tabla ARP
- MTU y jumbo frames
- Port mirroring
- PoE: 802.3af, 802.3at, 802.3bt — presupuesto de potencia
- Configuración de interfaz: velocidad, dúplex

## Wireless
- Bandas: 2.4 GHz, 5 GHz, 6 GHz
- Canales, ancho de canal, canales no solapados (1, 6, 11 en 2.4 GHz)
- Impacto regulatorio por región
- SSID, BSSID, ESSID
- Tipos de red: infraestructura, ad hoc, mesh, punto a punto
- Cifrado: WPA2, WPA3, AES, TKIP (obsoleto), WEP (obsoleto)
- Autenticación: PSK (personal) vs Enterprise, 802.1X, variantes de EAP
- Redes de invitados y portal cautivo
- Antenas: omnidireccional vs direccional
- AP autónomo vs lightweight (controlado)
- Roaming

## Estándares 802.11 (MEMORIZACIÓN OBLIGATORIA)

| Estándar | Nombre comercial | Banda | Velocidad máx. aprox. |
|----------|------------------|-------|----------------------|
| 802.11a | — | 5 GHz | 54 Mbps |
| 802.11b | — | 2.4 GHz | 11 Mbps |
| 802.11g | — | 2.4 GHz | 54 Mbps |
| 802.11n | Wi-Fi 4 | 2.4 y 5 GHz | 600 Mbps (MIMO) |
| 802.11ac | Wi-Fi 5 | 5 GHz | ~6.9 Gbps (MU-MIMO) |
| 802.11ax | Wi-Fi 6 / 6E | 2.4, 5 y 6 GHz | ~9.6 Gbps (OFDMA) |

**INCIERTO:** no se ha confirmado si 802.11be (Wi-Fi 7) entra en N10-009.
Comprobar en el PDF oficial antes de estudiarlo.

## Estándares de cable Ethernet

| Categoría | Velocidad | Distancia |
|-----------|-----------|-----------|
| Cat 5 | 100 Mbps | 100 m |
| Cat 5e | 1 Gbps | 100 m |
| Cat 6 | 1 Gbps / 10 Gbps | 100 m / 55 m |
| Cat 6a | 10 Gbps | 100 m |
| Cat 7 | 10 Gbps | 100 m |
| Cat 8 | 25-40 Gbps | 30 m |

- Nomenclatura: 10BASE-T, 100BASE-TX, 1000BASE-T, 10GBASE-T
- Fibra: 100BASE-FX, 1000BASE-SX / LX, 10GBASE-SR / LR
- Apantallado (STP) vs no apantallado (UTP)
- Cable plenum

## Instalaciones físicas
*(Andy domina esto por experiencia — solo memorizar la terminología del examen)*
- IDF y MDF
- PDU, UPS, carga de potencia, voltaje
- Control ambiental: temperatura, humedad, supresión de incendios

---

# DOMINIO 3 — Network Operations (19%)

## Documentación
- Diagramas físicos vs lógicos
- Diagramas de capa 1, capa 2 y capa 3
- Diagramas de rack
- Mapas de cableado
- Inventario de activos
- IPAM
- SLA
- Site survey y mapa de calor
- Configuraciones de referencia (baseline)

## Gestión del ciclo de vida
- EOL (fin de vida) vs EOS (fin de soporte)
- Gestión de software: parches, firmware, sistema operativo
- Decomisionado

## Gestión de cambios y configuración
- Proceso de gestión de cambios
- Gestión de configuración
- Ventana de mantenimiento
- Plan de reversión (rollback)

## Monitorización
- SNMP: polling vs traps, MIB, OID
- Flow data (NetFlow)
- Captura de paquetes
- Métricas de referencia (baseline)
- Agregación de logs
- Syslog y niveles de severidad
- SIEM
- Integración por API
- Port mirroring
- Alertas
- Métricas de rendimiento: CPU, memoria, ancho de banda, estado de interfaz
- Sensores ambientales: temperatura, humedad

## Alta disponibilidad y recuperación ante desastres
- Balanceo de carga vs multipathing
- Activo-activo vs activo-pasivo
- NIC teaming
- Clústeres y hardware redundante
- Métricas: **RPO, RTO, MTTR, MTBF**
- Pruebas: tabletop exercises, pruebas de validación
- Copias de seguridad: completa, incremental, diferencial, snapshot
- Sitios alternativos: **cold site, warm site, hot site**, sitio en nube

---

# DOMINIO 4 — Network Security (14%)

## Seguridad lógica
- Cifrado de datos en tránsito y en reposo
- PKI y certificados, certificados autofirmados
- IAM
- Autenticación: MFA, SSO, RADIUS, TACACS+, LDAP, SAML, Kerberos
- Autorización: mínimo privilegio, RBAC
- Autenticación basada en tiempo
- Geofencing

## Seguridad física
- Cámaras, cerraduras, control de acceso, mantrap

## Tecnologías de engaño
- Honeypot
- Honeynet

## Terminología de seguridad
- Riesgo, vulnerabilidad, exploit, amenaza
- Tríada CIA: confidencialidad, integridad, disponibilidad
- Auditorías y cumplimiento normativo
- Localidad de datos (data locality)
- PCI DSS, GDPR
- Segmentación de red: IoT / IIoT, SCADA / ICS / OT, invitados, BYOD

## Tipos de ataque (MEMORIZACIÓN OBLIGATORIA)
- DoS y DDoS, botnet, pico de tráfico
- On-path / man-in-the-middle
- VLAN hopping
- ARP spoofing / ARP poisoning
- MAC flooding
- MAC spoofing
- DNS poisoning / DNS spoofing
- Rogue AP y evil twin
- Deauthentication attack
- Ingeniería social: phishing, vishing, smishing, tailgating, shoulder surfing,
  dumpster diving, pretexting
- Malware: virus, gusano, troyano, ransomware
- Ataques a contraseñas: fuerza bruta, diccionario
- Amenaza interna (insider threat)
- Zero-day

## Endurecimiento de dispositivos (hardening)
- Deshabilitar puertos y servicios sin usar
- Cambiar contraseñas por defecto
- 802.1X
- Filtrado MAC
- ACLs
- Filtrado de URL y de contenido
- Port security
- DHCP snooping
- Dynamic ARP Inspection (DAI)
- VLANs privadas
- Screened subnet (antes DMZ)
- NAC
- Gestión de claves

---

# DOMINIO 5 — Network Troubleshooting (24% — EL QUE MÁS PESA)

## Metodología de troubleshooting (los 7 pasos, EN ORDEN EXACTO)
1. Identificar el problema
2. Establecer una teoría de la causa probable
3. Probar la teoría para determinar la causa
4. Establecer un plan de acción
5. Implementar la solución o escalar
6. Verificar la funcionalidad completa del sistema
7. Documentar hallazgos, acciones y resultados

**Enfoques:** bottom-to-top, top-to-bottom, divide and conquer, follow the path

## Problemas de cableado
- Atenuación
- Interferencia (EMI, crosstalk)
- Pérdida en decibelios (dB loss)
- Pinout incorrecto
- Opens y shorts
- Puerto defectuoso
- Indicadores LED de estado
- Límites de velocidad, distancia y throughput
- Cables de aplicación: rollover / consola, crossover, straight-through

## Herramientas físicas
- Cable tester
- Toner probe
- Tap
- TDR y OTDR
- Empalmadora de fusión
- Medidor de luz
- Analizador de espectro
- Multímetro

## Herramientas y comandos de software
- Analizador de protocolos (Wireshark)
- ping
- traceroute / tracert
- nslookup / dig
- ipconfig / ifconfig / ip
- arp
- netstat
- tcpdump
- nmap
- hostname
- route
- telnet
- tshark
- Wi-Fi analyzer
- Test de velocidad / ancho de banda

## Problemas comunes

**Switching:**
- Bucles de conmutación
- Tormentas de broadcast
- Problemas de STP
- VLAN mal asignada / VLAN mismatch
- Native VLAN mismatch
- Desajuste de velocidad o dúplex
- Puerto en err-disabled

**Routing:**
- Tabla de enrutamiento incorrecta
- Falta de ruta por defecto
- Enrutamiento asimétrico

**Configuración IP:**
- IP, máscara o gateway incorrectos
- IP duplicada
- Agotamiento del ámbito DHCP
- Problemas de DNS
- Dirección APIPA (síntoma de que no hay DHCP)

**Rendimiento:**
- Ancho de banda insuficiente
- Latencia
- Jitter
- Pérdida de paquetes
- Problemas de MTU / MTU black hole

**Wireless:**
- Interferencia y solapamiento de canales
- Intensidad de señal / RSSI
- Relación señal-ruido (SNR)
- Desasociación del cliente
- Roaming mal configurado
- Densidad de clientes excesiva
- Atenuación por obstáculos

**Otros:**
- Fallo de hardware
- Problemas de PoE (presupuesto insuficiente)
- Certificado expirado o no confiable
- Bloqueo por ACL o firewall

---

# Los 8 bloques de memorización pura

Máximo retorno por hora invertida:

1. **Puertos y protocolos** — la tabla completa
2. **Los 7 pasos de troubleshooting, en orden**
3. **Estándares 802.11** con banda y velocidad
4. **Categorías de cable** con velocidad y distancia
5. **Rangos privados RFC 1918 + APIPA + loopback**
6. **Tabla de subnetting** (CIDR <-> máscara <-> número de hosts)
7. **RPO, RTO, MTTR, MTBF** y cold/warm/hot site
8. **Tipos de ataque** con definición de una línea
