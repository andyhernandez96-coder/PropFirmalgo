import { describe, expect, it } from 'vitest';
import { extractAnswerLetters, parseQuestionText } from '../shared/textParser';

describe('parseQuestionText', () => {
  it('1. options on one line with "A)" markers, Answer and Explanation', () => {
    const [q] = parseQuestionText(`1. Which protocol uses port 3389?
A) SSH  B) RDP  C) Telnet  D) SMB
Answer: B
Explanation: RDP uses TCP 3389.`);
    expect(q.question).toBe('Which protocol uses port 3389?');
    expect(q.options).toEqual(['SSH', 'RDP', 'Telnet', 'SMB']);
    expect(q.correct).toEqual([1]);
    expect(q.explanation).toBe('RDP uses TCP 3389.');
    expect(q.errors).toEqual([]);
  });

  it('2. one option per line with "A." markers', () => {
    const [q] = parseQuestionText(`1) What does DNS resolve?
A. MAC addresses to IPs
B. Hostnames to IP addresses
C. IPs to MAC addresses
D. Ports to services
Answer: B`);
    expect(q.options).toHaveLength(4);
    expect(q.options[1]).toBe('Hostnames to IP addresses');
    expect(q.correct).toEqual([1]);
  });

  it('3. "(A)" markers and "Correct answer:" label', () => {
    const [q] = parseQuestionText(`Q1: Which layer does a router operate at?
(A) Layer 1
(B) Layer 2
(C) Layer 3
(D) Layer 4
Correct answer: C`);
    expect(q.options).toEqual(['Layer 1', 'Layer 2', 'Layer 3', 'Layer 4']);
    expect(q.correct).toEqual([2]);
  });

  it('4. "Choose TWO" with "Answer: B, D"', () => {
    const [q] = parseQuestionText(`1. Which of the following are private IPv4 ranges? (Choose TWO)
A) 8.8.8.0/24
B) 10.0.0.0/8
C) 169.254.0.0/16
D) 192.168.0.0/16
Answer: B, D`);
    expect(q.correct).toEqual([1, 3]);
    expect(q.selectCount).toBe(2);
    expect(q.errors).toEqual([]);
  });

  it('5. "Select two" with "Answers: A and C"', () => {
    const [q] = parseQuestionText(`1. Select two protocols that use UDP.
A) DHCP  B) SSH  C) TFTP  D) HTTPS
Answers: A and C`);
    expect(q.correct).toEqual([0, 2]);
    expect(q.selectCount).toBe(2);
  });

  it('6. lowercase options and a Spanish answer key section (tutor format)', () => {
    const qs = parseQuestionText(`## Día 1 — Modelo OSI

### Concepto
1. Recuerdo activo, no reconocimiento.
2. Repaso espaciado.

| 7 | Aplicación |

### Práctica (2 preguntas)

1. ¿En qué capa opera un switch tradicional?
   a) Capa 1
   b) Capa 2
   c) Capa 3
   d) Capa 4

2. ¿Cuál es la PDU de TCP?
   a) Trama
   b) Paquete
   c) Segmento
   d) Bit

### Answer Key

1. Respuesta correcta: b)
   Por qué b) es correcta: decide por MAC.
   Por qué a), c), d) están mal: no leen MAC.

2. Respuesta correcta: c)
   Por qué c) es correcta: segmento es L4.`);
    expect(qs).toHaveLength(2);
    expect(qs[0].question).toBe('¿En qué capa opera un switch tradicional?');
    expect(qs[0].options).toEqual(['Capa 1', 'Capa 2', 'Capa 3', 'Capa 4']);
    expect(qs[0].correct).toEqual([1]);
    expect(qs[0].explanation).toContain('decide por MAC');
    expect(qs[0].explanation).toContain('no leen MAC');
    expect(qs[1].correct).toEqual([2]);
    expect(qs[1].explanation).not.toContain('decide por MAC');
  });

  it('7. bold answer-key entries like "**1. Correcta: b) Capa 2**"', () => {
    const [q] = parseQuestionText(`1. ¿En qué capa opera ICMP?
   a) Capa 2
   b) Capa 3
   c) Capa 4
   d) Capa 7

## Answer Key
**1. Correcta: b) Capa 3**
- b): ICMP va sobre IP.
- c) mal: ICMP no usa puertos.`);
    expect(q.correct).toEqual([1]);
    expect(q.explanation).toContain('ICMP va sobre IP');
    expect(q.explanation).toContain('no usa puertos');
  });

  it('8. numbered steps inside an explanation do not become questions', () => {
    const qs = parseQuestionText(`1. What comes after "establish a theory"?
A) Document
B) Test the theory
C) Escalate
D) Verify
Answer: B
Explanation: The order is:
1. Identify the problem
2. Establish a theory
3. Test the theory
4. Establish a plan

2. What does APIPA indicate?
A) DNS failure
B) No DHCP server reached
C) Duplicate IP
D) Bad gateway
Answer: B`);
    expect(qs).toHaveLength(2);
    expect(qs[0].explanation).toContain('4. Establish a plan');
    expect(qs[1].question).toBe('What does APIPA indicate?');
    expect(qs[1].correct).toEqual([1]);
  });

  it('9. options on the same line as the question', () => {
    const [q] = parseQuestionText('1. Which port does HTTPS use? A) 80 B) 443 C) 22 D) 25\nAnswer: B');
    expect(q.question).toBe('Which port does HTTPS use?');
    expect(q.options).toEqual(['80', '443', '22', '25']);
    expect(q.correct).toEqual([1]);
  });

  it('10. domain and objective lines are detected', () => {
    const [q] = parseQuestionText(`Question 1. Which standard is Wi-Fi 6?
Objective: 2.3
A) 802.11n
B) 802.11ac
C) 802.11ax
D) 802.11g
Answer: C`);
    expect(q.objective).toBe('2.3');
    expect(q.domain).toBe('2.0');
  });

  it('11. multi-line explanation and wrapped option text', () => {
    const [q] = parseQuestionText(`1. Which metric defines acceptable data loss?
A) RPO, the recovery point
   objective
B) RTO
C) MTTR
D) MTBF
Correct answer is A
Explanation: RPO measures data loss.
RTO measures downtime.`);
    expect(q.options[0]).toBe('RPO, the recovery point objective');
    expect(q.correct).toEqual([0]);
    expect(q.explanation).toBe('RPO measures data loss.\nRTO measures downtime.');
  });

  it('12. reports an error when "Choose TWO" has only one answer', () => {
    const [q] = parseQuestionText(`1. Choose TWO wireless encryption standards.
A) WPA3  B) Telnet  C) AES  D) FTP
Answer: A`);
    expect(q.errors.some((e) => e.includes('choose 2'))).toBe(true);
  });

  it('13. reports a missing answer and an out-of-range letter', () => {
    const qs = parseQuestionText(`1. First?
A) x  B) y
2. Second?
A) x  B) y
Answer: E`);
    expect(qs[0].errors.some((e) => e.includes('no answer found'))).toBe(true);
    expect(qs[1].errors.some((e) => e.includes('does not exist'))).toBe(true);
  });

  it('14. plain English "Answer Key" block with "1 - B" style entries', () => {
    const qs = parseQuestionText(`1. Which protocol syncs time?
A) SNMP  B) NTP  C) SMTP  D) LDAP
2. Which protocol sends email?
A) SNMP  B) NTP  C) SMTP  D) LDAP

Answer Key
1 - B (NTP uses UDP 123)
2 - C`);
    expect(qs[0].correct).toEqual([1]);
    expect(qs[0].explanation).toBe('(NTP uses UDP 123)');
    expect(qs[1].correct).toEqual([2]);
  });
});

describe('extractAnswerLetters', () => {
  it('stops at the first word that is not an option letter', () => {
    expect(extractAnswerLetters('b) Capa 2')).toEqual({ letters: [1], remainder: 'Capa 2' });
    expect(extractAnswerLetters('B y D')).toEqual({ letters: [1, 3], remainder: '' });
    expect(extractAnswerLetters('A, because it is')).toEqual({ letters: [0], remainder: 'because it is' });
  });
});
