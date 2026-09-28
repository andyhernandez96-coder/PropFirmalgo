import { type Rng, seededRng, shuffled } from '../shared/random';
import type { Raw } from './types';

/* ------------------------------------------------------------------ ports */

interface Port {
  p: string;
  full: string;
  port: string;
  tr: 'TCP' | 'UDP' | 'TCP/UDP';
  es: string;
}

// N10-009 objective 1.4 port list.
const PORTS: Port[] = [
  { p: 'FTP', full: 'File Transfer Protocol', port: '20/21', tr: 'TCP', es: 'transferir archivos sin cifrar' },
  { p: 'SSH', full: 'Secure Shell', port: '22', tr: 'TCP', es: 'acceso remoto cifrado por consola' },
  { p: 'Telnet', full: 'Telnet', port: '23', tr: 'TCP', es: 'acceso remoto por consola sin cifrar' },
  { p: 'SMTP', full: 'Simple Mail Transfer Protocol', port: '25', tr: 'TCP', es: 'enviar correo entre servidores' },
  { p: 'DNS', full: 'Domain Name System', port: '53', tr: 'TCP/UDP', es: 'traducir nombres a direcciones IP' },
  { p: 'DHCP', full: 'Dynamic Host Configuration Protocol', port: '67/68', tr: 'UDP', es: 'repartir direcciones IP automáticamente' },
  { p: 'TFTP', full: 'Trivial File Transfer Protocol', port: '69', tr: 'UDP', es: 'copiar archivos sin autenticación' },
  { p: 'HTTP', full: 'Hypertext Transfer Protocol', port: '80', tr: 'TCP', es: 'servir páginas web sin cifrar' },
  { p: 'NTP', full: 'Network Time Protocol', port: '123', tr: 'UDP', es: 'sincronizar la hora' },
  { p: 'SNMP', full: 'Simple Network Management Protocol', port: '161/162', tr: 'UDP', es: 'monitorizar dispositivos (el 162 recibe los traps)' },
  { p: 'LDAP', full: 'Lightweight Directory Access Protocol', port: '389', tr: 'TCP', es: 'consultar un directorio de usuarios' },
  { p: 'HTTPS', full: 'Hypertext Transfer Protocol Secure', port: '443', tr: 'TCP', es: 'servir páginas web cifradas con TLS' },
  { p: 'SMB', full: 'Server Message Block', port: '445', tr: 'TCP', es: 'compartir archivos e impresoras en Windows' },
  { p: 'Syslog', full: 'Syslog', port: '514', tr: 'UDP', es: 'enviar registros (logs) a un servidor central' },
  { p: 'SMTPS', full: 'Simple Mail Transfer Protocol Secure', port: '587', tr: 'TCP', es: 'enviar correo con cifrado (CompTIA lo asocia al 587)' },
  { p: 'LDAPS', full: 'Lightweight Directory Access Protocol over SSL', port: '636', tr: 'TCP', es: 'LDAP cifrado' },
  { p: 'SQL Server', full: 'Microsoft SQL Server', port: '1433', tr: 'TCP', es: 'la base de datos de Microsoft' },
  { p: 'RDP', full: 'Remote Desktop Protocol', port: '3389', tr: 'TCP', es: 'escritorio remoto de Windows' },
  { p: 'SIP', full: 'Session Initiation Protocol', port: '5060/5061', tr: 'TCP/UDP', es: 'señalizar llamadas de VoIP' },
];

const byName = (p: string) => PORTS.find((x) => x.p === p)!;
const label = (x: Port) => (x.full === x.p ? x.p : `${x.p} (${x.full})`);

function pickOthers<T>(pool: T[], exclude: (x: T) => boolean, n: number, rng: Rng): T[] {
  return shuffled(pool.filter((x) => !exclude(x)), rng).slice(0, n);
}

function portQuestions(rng: Rng): Raw[] {
  const out: Raw[] = [];
  const forward = ['Telnet', 'SMTP', 'DNS', 'DHCP', 'TFTP', 'NTP', 'SNMP', 'LDAP', 'SMB', 'Syslog', 'LDAPS', 'SQL Server'];
  const phrasings = [
    (x: Port) => (x.full === x.p ? `Which default port does ${x.p} use?` : `Which default port does ${x.full} (${x.p}) use?`),
    (x: Port) => `A firewall administrator must allow ${x.p} traffic through the firewall. Which port should be opened?`,
    (x: Port) => `By default, ${x.p} listens on which well-known port?`,
  ];
  forward.forEach((name, i) => {
    const x = byName(name);
    // Never offer a port that belongs to the same service (e.g. SSH and SFTP both use 22).
    const others = pickOthers(PORTS, (o) => o.port === x.port || o.p === x.p, 3, rng);
    out.push([
      '1.4',
      i % 3 === 0 ? 'e' : 'm',
      'ports,protocols',
      phrasings[i % phrasings.length](x),
      `${x.tr} ${x.port}`,
      others.map((o) => `${o.tr} ${o.port}`),
      `${label(x)} usa ${x.tr} ${x.port}. Sirve para ${x.es}.`,
      others.map((o) => `${o.tr} ${o.port} es ${label(o)}: ${o.es}.`),
    ]);
  });

  const reverse = ['Telnet', 'SMTP', 'TFTP', 'NTP', 'SMB', 'Syslog', 'SQL Server', 'RDP'];
  const scenes = [
    (x: Port) => `A packet capture shows many connections to ${x.tr} port ${x.port} on a server. Which service is most likely in use?`,
    (x: Port) => `A security scan finds ${x.tr} port ${x.port} open on a host. Which service is most likely listening?`,
  ];
  reverse.forEach((name, i) => {
    const x = byName(name);
    const others = pickOthers(PORTS, (o) => o.port === x.port || o.p === x.p, 3, rng);
    out.push([
      '1.4',
      'm',
      'ports,protocols',
      scenes[i % scenes.length](x),
      x.p,
      others.map((o) => o.p),
      `${x.tr} ${x.port} es el puerto por defecto de ${label(x)}, que sirve para ${x.es}.`,
      others.map((o) => `${o.p} usa ${o.tr} ${o.port}, no ${x.port}.`),
    ]);
  });
  return out;
}

/* ------------------------------------------------------------ subnetting */

const ipInt = (ip: string) => ip.split('.').reduce((n, o) => n * 256 + Number(o), 0);
const ipStr = (n: number) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
const maskInt = (prefix: number) => (prefix === 0 ? 0 : 2 ** 32 - 2 ** (32 - prefix));
const maskStr = (prefix: number) => ipStr(maskInt(prefix));
const size = (prefix: number) => 2 ** (32 - prefix);
const networkOf = (ip: number, prefix: number) => ip - (ip % size(prefix));
const broadcastOf = (ip: number, prefix: number) => networkOf(ip, prefix) + size(prefix) - 1;
const hosts = (prefix: number) => size(prefix) - 2;

/** "the 4th octet, block size 64" style walkthrough in Spanish. */
function blockWalkthrough(ip: number, prefix: number): string {
  const octetIndex = Math.floor((prefix - 1) / 8); // 0-based octet that the prefix ends in
  const maskOctet = Number(maskStr(prefix).split('.')[octetIndex]);
  const block = 256 - maskOctet;
  const octetValue = Number(ipStr(ip).split('.')[octetIndex]);
  const start = octetValue - (octetValue % block);
  const ord = ['1.º', '2.º', '3.º', '4.º'][octetIndex];
  return (
    `/${prefix} = máscara ${maskStr(prefix)}. El octeto "interesante" es el ${ord} (valor ${maskOctet}), ` +
    `así que el tamaño de bloque es 256 − ${maskOctet} = ${block}. ` +
    `Las subredes avanzan de ${block} en ${block} en ese octeto; el valor ${octetValue} cae en el bloque que empieza en ${start} ` +
    `y termina en ${start + block - 1}.`
  );
}

function randomPrivateIp(rng: Rng): number {
  const r = Math.floor(rng() * 3);
  const oct = () => Math.floor(rng() * 254) + 1;
  if (r === 0) return ipInt(`10.${oct()}.${oct()}.${oct()}`);
  if (r === 1) return ipInt(`172.${16 + Math.floor(rng() * 16)}.${oct()}.${oct()}`);
  return ipInt(`192.168.${oct()}.${oct()}`);
}

function uniqueStrings(correct: string, candidates: string[], n: number): string[] {
  const out: string[] = [];
  for (const c of candidates) if (c !== correct && !out.includes(c)) out.push(c);
  return out.slice(0, n);
}

function subnetQuestions(rng: Rng): Raw[] {
  const out: Raw[] = [];

  // usable hosts
  for (const p of [22, 25, 26, 27, 28, 29, 30]) {
    const right = String(hosts(p));
    const wrong = uniqueStrings(right, [String(size(p)), String(hosts(p - 1)), String(hosts(p + 1 > 30 ? p - 2 : p + 1)), String(size(p) - 1)], 3);
    out.push([
      '1.7',
      p >= 28 ? 'e' : 'm',
      'subnetting,ipv4',
      `How many usable host addresses does a /${p} IPv4 subnet provide?`,
      right,
      wrong,
      `Con /${p} quedan ${32 - p} bits de host: 2^${32 - p} = ${size(p)} direcciones en total. Se restan 2 (la dirección de red y la de broadcast), así que quedan ${right} utilizables.`,
      wrong.map((w) =>
        Number(w) === size(p)
          ? `${w} es el total de direcciones: olvida restar la de red y la de broadcast.`
          : Number(w) === size(p) - 1
            ? `${w} solo resta una dirección; hay que restar dos (red y broadcast).`
            : `${w} son los hosts útiles de un /${32 - Math.log2(Number(w) + 2)}, no de un /${p}.`,
      ),
    ]);
  }

  // network address
  const netPrefixes = [26, 27, 28, 29, 21, 22, 23];
  netPrefixes.forEach((p, i) => {
    const ip = randomPrivateIp(rng);
    const net = networkOf(ip, p);
    const right = ipStr(net);
    const wrong = uniqueStrings(right, [ipStr(broadcastOf(ip, p)), ipStr(net + size(p)), ipStr(ip - (ip % 256)), ipStr(net + 1), ipStr(Math.max(0, net - size(p)))], 3);
    out.push([
      '1.7',
      p < 24 ? 'h' : 'm',
      'subnetting,ipv4',
      i % 2 === 0
        ? `What is the network address of the subnet that contains host ${ipStr(ip)}/${p}?`
        : `A host is configured as ${ipStr(ip)}/${p}. Which network does it belong to?`,
      right,
      wrong,
      `${blockWalkthrough(ip, p)} La dirección de red es el inicio del bloque: ${right}.`,
      wrong.map((w) =>
        w === ipStr(broadcastOf(ip, p))
          ? `${w} es la dirección de broadcast de esa subred (el final del bloque), no la de red.`
          : w === ipStr(net + 1)
            ? `${w} es el primer host utilizable, no la dirección de red.`
            : w === ipStr(ip - (ip % 256)) && p !== 24
              ? `${w} sería la red si la máscara fuera /24; con /${p} no lo es.`
              : `${w} pertenece a otro bloque (otra subred), no al que contiene ${ipStr(ip)}.`,
      ),
    ]);
  });

  // broadcast address
  [25, 26, 27, 28, 30, 22, 20].forEach((p, i) => {
    const ip = randomPrivateIp(rng);
    const bc = broadcastOf(ip, p);
    const net = networkOf(ip, p);
    const right = ipStr(bc);
    const wrong = uniqueStrings(right, [ipStr(net), ipStr(bc - 1), ipStr(bc + size(p)), ipStr(ip - (ip % 256) + 255), ipStr(bc - size(p))], 3);
    out.push([
      '1.7',
      p < 24 ? 'h' : 'm',
      'subnetting,ipv4',
      i % 2 === 0
        ? `What is the broadcast address for the subnet that contains ${ipStr(ip)}/${p}?`
        : `A technician is documenting the subnet for host ${ipStr(ip)} with mask ${maskStr(p)}. What is that subnet's broadcast address?`,
      right,
      wrong,
      `${blockWalkthrough(ip, p)} El broadcast es la última dirección del bloque: ${right}.`,
      wrong.map((w) =>
        w === ipStr(net)
          ? `${w} es la dirección de red (inicio del bloque), no la de broadcast.`
          : w === ipStr(bc - 1)
            ? `${w} es el último host utilizable, justo antes del broadcast.`
            : w === ipStr(ip - (ip % 256) + 255) && p !== 24
              ? `${w} sería el broadcast con /24; con /${p} el bloque es otro.`
              : `${w} es el broadcast de otra subred, no de la que contiene ${ipStr(ip)}.`,
      ),
    ]);
  });

  // prefix -> mask
  [19, 22, 25, 27, 29].forEach((p) => {
    const right = maskStr(p);
    const wrong = uniqueStrings(right, [maskStr(p - 1), maskStr(p + 1), maskStr(p + 2), maskStr(p - 2)], 3);
    out.push([
      '1.7',
      'e',
      'subnetting,ipv4',
      `Which subnet mask is equivalent to /${p}?`,
      right,
      wrong,
      `/${p} significa ${p} bits a 1 en la máscara. Eso da ${right}.`,
      wrong.map((w) => {
        const bits = w.split('.').reduce((n, o) => n + Number(o).toString(2).split('1').length - 1, 0);
        return `${w} tiene ${bits} bits a 1, es decir /${bits}.`;
      }),
    ]);
  });

  // mask -> prefix
  [21, 24, 26, 28].forEach((p) => {
    const right = `/${p}`;
    const wrong = uniqueStrings(right, [`/${p - 1}`, `/${p + 1}`, `/${p + 2}`, `/${p - 8}`], 3);
    out.push([
      '1.7',
      'e',
      'subnetting,ipv4',
      `A device is configured with the subnet mask ${maskStr(p)}. What is the equivalent CIDR notation?`,
      right,
      wrong,
      `Cuenta los bits a 1 de ${maskStr(p)}: son ${p}. Por eso la notación CIDR (Classless Inter-Domain Routing) es /${p}.`,
      wrong.map((w) => `${w} sería la máscara ${maskStr(Number(w.slice(1)))}.`),
    ]);
  });

  // sizing
  [[50, 'department'], [12, 'small office'], [500, 'warehouse floor']].forEach(([need, place]) => {
    const n = Number(need);
    let p = 30;
    while (hosts(p) < n) p--;
    const right = `/${p}`;
    const wrong = [`/${p + 1}`, `/${p - 1}`, `/${p - 2}`];
    out.push([
      '1.7',
      'h',
      'subnetting,ipv4,vlsm',
      `A ${place} needs ${n} usable IPv4 host addresses in one subnet. Which prefix length fits the hosts while wasting the fewest addresses?`,
      right,
      wrong,
      `Busca el prefijo más largo cuyo número de hosts útiles (2^bits de host − 2) llegue a ${n}. /${p} da ${hosts(p)} hosts, suficiente; /${p + 1} solo da ${hosts(p + 1)}.`,
      [
        `/${p + 1} solo ofrece ${hosts(p + 1)} hosts útiles: no alcanza para ${n}.`,
        `/${p - 1} ofrece ${hosts(p - 1)} hosts: sirve, pero desperdicia más direcciones que /${p}.`,
        `/${p - 2} ofrece ${hosts(p - 2)} hosts: sirve, pero desperdicia muchas más direcciones.`,
      ],
    ]);
  });

  // valid host
  [27, 28, 29].forEach((p) => {
    const ip = randomPrivateIp(rng);
    const net = networkOf(ip, p);
    const bc = broadcastOf(ip, p);
    const valid = ipStr(net + 1 + Math.floor(rng() * (hosts(p) - 1)));
    out.push([
      '1.7',
      'm',
      'subnetting,ipv4',
      `Which of the following addresses can be assigned to a host in the subnet ${ipStr(net)}/${p}?`,
      valid,
      [ipStr(net), ipStr(bc), ipStr(bc + 2)],
      `${blockWalkthrough(net, p)} Los hosts válidos van de ${ipStr(net + 1)} a ${ipStr(bc - 1)}; ${valid} está dentro.`,
      [
        `${ipStr(net)} es la dirección de red: no se asigna a un host.`,
        `${ipStr(bc)} es la dirección de broadcast: no se asigna a un host.`,
        `${ipStr(bc + 2)} ya pertenece a la siguiente subred.`,
      ],
    ]);
  });

  return out;
}

export function generatedQuestions(): Raw[] {
  const rng = seededRng(20260928);
  return [...portQuestions(rng), ...subnetQuestions(rng)];
}
