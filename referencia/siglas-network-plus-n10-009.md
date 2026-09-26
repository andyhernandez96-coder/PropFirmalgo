# Glosario de siglas — CompTIA Network+ N10-009

## Por qué esto es el atajo más rentable del examen

**En muchas siglas, la expansión ES la definición.**

Ese fue el fallo del Día 1: UDP = User **Datagram** Protocol. La respuesta a
"¿cómo se llama su PDU?" estaba dentro del nombre.

| Sigla | Expansión | Lo que te regala |
|-------|-----------|------------------|
| UDP | User **Datagram** Protocol | Su PDU es el datagrama |
| NAT | Network **Address Translation** | Traduce direcciones |
| CIDR | **Classless** Inter-Domain Routing | Sin clases |
| VLSM | **Variable Length** Subnet Mask | Máscaras de longitud variable |
| SLAAC | **Stateless** Address Autoconfiguration | Sin estado: no necesita servidor |
| OSPF | Open **Shortest Path First** | Elige el camino más corto |
| RSTP | **Rapid** Spanning Tree Protocol | La versión rápida de STP |
| MU-MIMO | **Multi-User** MIMO | Varios usuarios a la vez |

**Anotarlas en inglés.** El examen será en inglés (Illinois), y las siglas son
inglesas incluso en la versión española. Tres columnas: sigla, expansión en
inglés, significado en español.

---

## Fundamentos y protocolos base

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| OSI | Open Systems Interconnection | Modelo de referencia de 7 capas |
| PDU | Protocol Data Unit | Nombre del paquetito de datos en cada capa |
| TCP | Transmission Control Protocol | Transporte con acuse de recibo |
| UDP | User Datagram Protocol | Transporte sin acuse de recibo |
| IP | Internet Protocol | Direccionamiento lógico, capa 3 |
| ICMP | Internet Control Message Protocol | Mensajes de control (ping, traceroute) |
| MAC | Media Access Control | Dirección física de la tarjeta de red |
| ARP | Address Resolution Protocol | Traduce IP a MAC |
| NDP | Neighbor Discovery Protocol | El ARP de IPv6 |
| MTU | Maximum Transmission Unit | Tamaño máximo de trama |
| FCS | Frame Check Sequence | Campo final de la trama para detectar errores |
| CRC | Cyclic Redundancy Check | Cálculo que verifica el FCS |
| TTL | Time To Live | Saltos que le quedan al paquete antes de morir |
| QoS | Quality of Service | Priorización del tráfico |
| GRE | Generic Routing Encapsulation | Protocolo de tunelización |
| IPsec | Internet Protocol Security | Cifrado a nivel de red |
| AH | Authentication Header | Parte de IPsec: autentica, no cifra |
| ESP | Encapsulating Security Payload | Parte de IPsec: cifra el contenido |

## Direccionamiento

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| CIDR | Classless Inter-Domain Routing | Notación /24, sin clases |
| VLSM | Variable Length Subnet Mask | Subredes de tamaños distintos |
| NAT | Network Address Translation | Traduce IP privada a pública |
| PAT | Port Address Translation | NAT usando puertos para muchos equipos |
| APIPA | Automatic Private IP Addressing | Autoasignación 169.254.x.x si falla DHCP |
| DHCP | Dynamic Host Configuration Protocol | Reparte IPs automáticamente |
| SLAAC | Stateless Address Autoconfiguration | Autoconfiguración IPv6 sin servidor |
| EUI | Extended Unique Identifier | EUI-64: genera IPv6 desde la MAC |
| IPAM | IP Address Management | Herramienta de gestión de direcciones |
| RFC | Request for Comments | Documento de estándar de internet |

## Servicios y protocolos de aplicación

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| DNS | Domain Name System | Traduce nombres a IPs |
| FTP | File Transfer Protocol | Transferencia de archivos, sin cifrar |
| SFTP | SSH File Transfer Protocol | Transferencia sobre SSH |
| TFTP | Trivial File Transfer Protocol | Versión simple sobre UDP |
| SCP | Secure Copy Protocol | Copia segura sobre SSH |
| SSH | Secure Shell | Acceso remoto cifrado por consola |
| SMTP | Simple Mail Transfer Protocol | Envío de correo |
| POP3 | Post Office Protocol v3 | Recepción de correo (descarga y borra) |
| IMAP | Internet Message Access Protocol | Recepción de correo (mantiene en servidor) |
| HTTP | HyperText Transfer Protocol | Web sin cifrar |
| HTTPS | HTTP Secure | Web cifrada |
| TLS | Transport Layer Security | El cifrado que usa HTTPS |
| SSL | Secure Sockets Layer | Predecesor de TLS, obsoleto |
| SMB | Server Message Block | Compartición de archivos en Windows |
| NTP | Network Time Protocol | Sincronización de hora |
| SNMP | Simple Network Management Protocol | Monitorización de dispositivos |
| MIB | Management Information Base | Catálogo de datos que expone SNMP |
| OID | Object Identifier | Identificador de un dato concreto en la MIB |
| LDAP | Lightweight Directory Access Protocol | Consulta de directorio de usuarios |
| RDP | Remote Desktop Protocol | Escritorio remoto de Windows |
| SIP | Session Initiation Protocol | Señalización de llamadas VoIP |
| VoIP | Voice over IP | Telefonía sobre red de datos |
| VTC | Video Teleconferencing | Videoconferencia |
| CDN | Content Delivery Network | Red de servidores que cachean contenido |

## Routing

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| OSPF | Open Shortest Path First | Protocolo de enrutamiento interno |
| EIGRP | Enhanced Interior Gateway Routing Protocol | Protocolo interno de Cisco |
| BGP | Border Gateway Protocol | Enrutamiento entre proveedores de internet |
| RIP | Routing Information Protocol | Protocolo antiguo, por número de saltos |
| FHRP | First Hop Redundancy Protocol | Gateway redundante |
| HSRP | Hot Standby Router Protocol | FHRP de Cisco |
| VRRP | Virtual Router Redundancy Protocol | FHRP estándar abierto |
| GLBP | Gateway Load Balancing Protocol | FHRP de Cisco con balanceo |
| VIP | Virtual IP | IP compartida por varios dispositivos |

## Switching

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| VLAN | Virtual Local Area Network | Red separada por configuración |
| STP | Spanning Tree Protocol | Evita bucles entre switches |
| RSTP | Rapid Spanning Tree Protocol | Versión rápida de STP |
| BPDU | Bridge Protocol Data Unit | Mensaje que usa STP |
| LACP | Link Aggregation Control Protocol | Agrupa varios enlaces en uno |
| PoE | Power over Ethernet | Alimentación por el cable de red |
| CAM | Content Addressable Memory | La memoria de la tabla MAC |
| SVI | Switched Virtual Interface | IP de una VLAN dentro del switch |
| DAI | Dynamic ARP Inspection | Protección contra ARP spoofing |

## Wireless

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| WAP | Wireless Access Point | Punto de acceso |
| WLC | Wireless LAN Controller | Controlador central de APs |
| SSID | Service Set Identifier | Nombre visible de la red Wi-Fi |
| BSSID | Basic Service Set Identifier | MAC del AP concreto |
| ESSID | Extended Service Set Identifier | Mismo SSID en varios APs |
| WEP | Wired Equivalent Privacy | Cifrado obsoleto e inseguro |
| WPA | Wi-Fi Protected Access | Cifrado actual (WPA2, WPA3) |
| TKIP | Temporal Key Integrity Protocol | Cifrado antiguo de WPA, obsoleto |
| AES | Advanced Encryption Standard | Cifrado fuerte de WPA2/WPA3 |
| EAP | Extensible Authentication Protocol | Marco de autenticación empresarial |
| PSK | Pre-Shared Key | Contraseña compartida (modo personal) |
| MIMO | Multiple Input Multiple Output | Varias antenas simultáneas |
| MU-MIMO | Multi-User MIMO | MIMO para varios clientes a la vez |
| OFDMA | Orthogonal Frequency Division Multiple Access | Multiplexación de Wi-Fi 6 |
| RSSI | Received Signal Strength Indicator | Intensidad de señal recibida |
| SNR | Signal-to-Noise Ratio | Relación señal-ruido |
| RF | Radio Frequency | Radiofrecuencia |

## Cableado y medios

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| UTP | Unshielded Twisted Pair | Par trenzado sin apantallar |
| STP | Shielded Twisted Pair | Par trenzado apantallado |
| SFP | Small Form-factor Pluggable | Transceptor intercambiable |
| QSFP | Quad Small Form-factor Pluggable | Transceptor de 4 canales |
| SMF | Single-Mode Fiber | Fibra monomodo, larga distancia |
| MMF | Multimode Fiber | Fibra multimodo, corta distancia |
| TDR | Time Domain Reflectometer | Localiza fallos en cable de cobre |
| OTDR | Optical TDR | Lo mismo para fibra |
| EMI | Electromagnetic Interference | Interferencia electromagnética |
| MDF | Main Distribution Frame | Distribuidor principal |
| IDF | Intermediate Distribution Frame | Distribuidor intermedio |

## Tipos de red y arquitectura

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| LAN | Local Area Network | Red local |
| WAN | Wide Area Network | Red de área amplia |
| MAN | Metropolitan Area Network | Red metropolitana |
| PAN | Personal Area Network | Red personal (Bluetooth) |
| CAN | Campus Area Network | Red de campus |
| WLAN | Wireless LAN | Red local inalámbrica |
| SAN | Storage Area Network | Red dedicada a almacenamiento |
| NAS | Network Attached Storage | Almacenamiento conectado a la red |
| NIC | Network Interface Card | Tarjeta de red |
| SDN | Software-Defined Networking | Red controlada por software |
| SD-WAN | Software-Defined WAN | WAN gestionada por software |
| VXLAN | Virtual Extensible LAN | VLANs sobre red IP, para centros de datos |
| DCI | Data Center Interconnect | Interconexión entre centros de datos |
| NFV | Network Functions Virtualization | Funciones de red como software |
| VPN | Virtual Private Network | Túnel cifrado sobre internet |
| VPC | Virtual Private Cloud | Red privada dentro de una nube pública |
| IaC | Infrastructure as Code | Infraestructura definida en archivos |
| SASE | Secure Access Service Edge | Red y seguridad como servicio en nube |
| SSE | Security Service Edge | La parte de seguridad de SASE |
| ZTA | Zero Trust Architecture | No confiar en nada por defecto |
| SaaS | Software as a Service | Software en nube |
| IaaS | Infrastructure as a Service | Infraestructura en nube |
| PaaS | Platform as a Service | Plataforma de desarrollo en nube |

## Seguridad

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| CIA | Confidentiality, Integrity, Availability | Las 3 metas de la seguridad |
| IAM | Identity and Access Management | Gestión de identidades y accesos |
| MFA | Multi-Factor Authentication | Varios factores de autenticación |
| 2FA | Two-Factor Authentication | Dos factores |
| SSO | Single Sign-On | Un login para varios servicios |
| RADIUS | Remote Authentication Dial-In User Service | Servidor de autenticación centralizada |
| TACACS+ | Terminal Access Controller Access-Control System Plus | Alternativa de Cisco a RADIUS |
| SAML | Security Assertion Markup Language | Estándar para SSO web |
| RBAC | Role-Based Access Control | Permisos según el rol |
| PKI | Public Key Infrastructure | Sistema de certificados |
| CA | Certificate Authority | Quien emite los certificados |
| ACL | Access Control List | Lista de reglas permitir/denegar |
| NAC | Network Access Control | Controla qué equipos entran en la red |
| IDS | Intrusion Detection System | Detecta ataques, solo avisa |
| IPS | Intrusion Prevention System | Detecta y bloquea |
| SIEM | Security Information and Event Management | Correlaciona logs de seguridad |
| DMZ | Demilitarized Zone | Subred aislada (ahora screened subnet) |
| DoS | Denial of Service | Ataque de denegación de servicio |
| DDoS | Distributed DoS | DoS desde muchos orígenes |
| MitM | Man in the Middle | Ataque interponiéndose (on-path) |
| NGFW | Next-Generation Firewall | Firewall que inspecciona capa 7 |
| UTM | Unified Threat Management | Dispositivo todo-en-uno de seguridad |
| BYOD | Bring Your Own Device | Uso de equipos personales |
| CVE | Common Vulnerabilities and Exposures | Catálogo público de vulnerabilidades |
| PCI DSS | Payment Card Industry Data Security Standard | Normativa de tarjetas de pago |
| GDPR | General Data Protection Regulation | Reglamento europeo de datos (RGPD) |

## Operaciones y continuidad

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| SLA | Service Level Agreement | Acuerdo de nivel de servicio |
| MOU | Memorandum of Understanding | Acuerdo previo no vinculante |
| NDA | Non-Disclosure Agreement | Acuerdo de confidencialidad |
| AUP | Acceptable Use Policy | Política de uso aceptable |
| RPO | Recovery Point Objective | Cuántos datos puedes permitirte perder |
| RTO | Recovery Time Objective | Cuánto puedes tardar en recuperarte |
| MTTR | Mean Time To Repair | Tiempo medio de reparación |
| MTBF | Mean Time Between Failures | Tiempo medio entre fallos |
| BCP | Business Continuity Plan | Plan de continuidad de negocio |
| DRP | Disaster Recovery Plan | Plan de recuperación ante desastres |
| UPS | Uninterruptible Power Supply | Batería de respaldo |
| PDU | Power Distribution Unit | Regleta de distribución eléctrica |
| EOL | End of Life | Fin de vida del producto |
| EOS | End of Support | Fin de soporte |

## Industrial e IoT

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| IoT | Internet of Things | Dispositivos conectados de consumo |
| IIoT | Industrial IoT | Versión industrial |
| ICS | Industrial Control System | Sistema de control industrial |
| SCADA | Supervisory Control and Data Acquisition | Supervisión de procesos industriales |
| OT | Operational Technology | Tecnología de planta, separada de IT |

## WAN y proveedores

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| ISP | Internet Service Provider | Proveedor de internet |
| CPE | Customer Premises Equipment | Equipo en casa del cliente |
| DSL | Digital Subscriber Line | Internet por línea telefónica |
| PPP | Point-to-Point Protocol | Protocolo de enlace punto a punto |
| PPPoE | PPP over Ethernet | PPP sobre Ethernet |
| MPLS | Multiprotocol Label Switching | WAN por etiquetas |
| LTE | Long-Term Evolution | Red celular 4G |
| GSM | Global System for Mobile Communications | Estándar celular |

## Generales

| Sigla | Expansión | Qué es |
|-------|-----------|--------|
| CLI | Command Line Interface | Interfaz de línea de comandos |
| GUI | Graphical User Interface | Interfaz gráfica |
| API | Application Programming Interface | Interfaz para que programas se comuniquen |

---

# Las 5 colisiones peligrosas

Siglas con **dos significados distintos**. El examen las usa para confundir.
Anotarlas en página aparte, marcadas.

| Sigla | Significado 1 | Significado 2 |
|-------|---------------|---------------|
| **PDU** | Protocol Data Unit (trama, paquete...) | Power Distribution Unit (regleta) |
| **STP** | Spanning Tree Protocol (evita bucles) | Shielded Twisted Pair (cable apantallado) |
| **AD** | Administrative Distance (routing) | Active Directory (Microsoft) |
| **EOS** | End of Support | End of Sale |
| **MTTR** | Mean Time To Repair | Mean Time To Recovery (se usan ambas) |

El contexto decide: si la pregunta habla de capas, PDU es Protocol Data Unit; si
habla de racks y electricidad, es la regleta.

---

# Las 25 con las que empezar

No escribir las ~170 de golpe. Estas aparecen en preguntas de todos los dominios:

OSI · PDU · TCP · UDP · IP · ICMP · MAC · ARP · DNS · DHCP · NAT · PAT · CIDR ·
VLAN · STP · ACL · VPN · LAN · WAN · SSID · PoE · SNMP · RPO · RTO · MTU

El resto se añaden al cubrir cada tema, para que lleguen con contexto.

---

# Práctica — 12 de recuerdo abierto

Sin opciones. Escribir la expansión en inglés y qué es. Si no sale, "no sé".

1. UDP
2. NAT
3. ARP
4. CIDR
5. PDU (los dos significados)
6. SSID
7. PoE
8. RPO y RTO (y en qué se diferencian)
9. STP (los dos significados)
10. SNMP
11. ICMP
12. MTU

- Score: pendiente (Andy resuelve y reporta)
