// Słowniki ujednolicenia łacina/archaizm -> współczesny polski.
// Projekt historyczny: Księga radziecka Wiśnicza 1712-1736.

// --- IMIONA: formy łacińskie i archaiczne -> polski mianownik ---
// Klucze znormalizowane do małych liter. Uwzględniono przypadki zależne
// (Joannis, Agnetis, Adalberti, Michaelis, Adalbertum) sprowadzone do mianownika.
export const IMIONA = {
  // Jan
  joannes: 'Jan', joannis: 'Jan', joanni: 'Jan', ioannes: 'Jan', joannem: 'Jan',
  // Józef
  josephus: 'Józef', jospehus: 'Józef', josephi: 'Józef', jozephus: 'Józef', iosephus: 'Józef',
  // Tomasz
  thomas: 'Tomasz', thomae: 'Tomasz', thomasz: 'Tomasz', thomam: 'Tomasz',
  // Kazimierz
  casimirus: 'Kazimierz', casimiri: 'Kazimierz', kazimirus: 'Kazimierz',
  // Andrzej
  andreas: 'Andrzej', andreae: 'Andrzej', andrea: 'Andrzej',
  // Wojciech (Adalbertus)
  adalbertus: 'Wojciech', adalberti: 'Wojciech', adalbertum: 'Wojciech', albertus: 'Wojciech', alberti: 'Wojciech',
  woyciech: 'Wojciech',
  // Jakub
  jacobus: 'Jakub', jacobi: 'Jakub', iacobus: 'Jakub',
  // Marcin
  martinus: 'Marcin', marthinus: 'Marcin', martini: 'Marcin',
  // Franciszek
  franciscus: 'Franciszek', francisci: 'Franciszek',
  // Piotr
  petrus: 'Piotr', petri: 'Piotr',
  // Paweł
  paulus: 'Paweł', pauli: 'Paweł', paulum: 'Paweł',
  // Wawrzyniec (Laurentius)
  laurentius: 'Wawrzyniec', laurentii: 'Wawrzyniec',
  // Maciej (Mathias)
  mathias: 'Maciej', matias: 'Maciej', mathiae: 'Maciej', matthias: 'Maciej',
  // Walenty (Valentinus)
  valentinus: 'Walenty', valentini: 'Walenty',
  // Błażej (Blasius)
  blasius: 'Błażej', blasy: 'Błażej', blasii: 'Błażej',
  // Stefan (Stephanus)
  stephanus: 'Stefan', stefanus: 'Stefan', stephani: 'Stefan',
  // Michał (Michael)
  michael: 'Michał', michaelis: 'Michał', michaeli: 'Michał',
  // Antoni
  antonius: 'Antoni', antonii: 'Antoni',
  // Sebastian
  sebastianus: 'Sebastian', sobestianus: 'Sebastian', sobestyian: 'Sebastian', sebastiani: 'Sebastian',
  // Łukasz (Lucas)
  lucas: 'Łukasz', lucae: 'Łukasz',
  // Bartłomiej (Bartholomeus)
  bartholomeus: 'Bartłomiej', bartolomeus: 'Bartłomiej', bartholomei: 'Bartłomiej',
  // Aleksander
  alexander: 'Aleksander', alexandrus: 'Aleksander', alexandri: 'Aleksander',
  // Grzegorz (Gregorius)
  gregorius: 'Grzegorz', gregorii: 'Grzegorz',
  // Dominik
  dominicus: 'Dominik', dominici: 'Dominik',
  // Florian
  florianus: 'Florian', floriani: 'Florian',
  // Jacek (Hyacinthus)
  hiacintus: 'Jacek', hyacinthus: 'Jacek',
  // Szymon (Simon)
  simon: 'Szymon', simonis: 'Szymon',
  // Mikołaj (Nicolaus)
  nicolaus: 'Mikołaj', nicolai: 'Mikołaj',
  // --- Imiona żeńskie ---
  agnes: 'Agnieszka', agnetis: 'Agnieszka', agnete: 'Agnieszka',
  sophia: 'Zofia', sophiae: 'Zofia',
  catharina: 'Katarzyna', catharinae: 'Katarzyna',
  regina: 'Regina', reina: 'Regina', reginae: 'Regina',
  anna: 'Anna', annae: 'Anna',
  barbara: 'Barbara', barbarae: 'Barbara',
  theresia: 'Teresa', teresa: 'Teresa',
  elisabetha: 'Elżbieta', elisabeth: 'Elżbieta',
  marianna: 'Marianna', mariannae: 'Marianna',
  hedvigis: 'Jadwiga', hedwigis: 'Jadwiga',
  // --- archaiczna/wariantywna pisownia polskich imion -> współczesna ---
  thomasz: 'Tomasz',
  jozef: 'Józef',
  agneszka: 'Agnieszka',
  woyciech: 'Wojciech',
  matias: 'Maciej',
  sobestyian: 'Sebastian',
}

// --- STAN SPOŁECZNY: łac. -> pol. (z zachowaniem znaczenia stanowego) ---
export const STAN = {
  honestus: 'uczciwy', honesta: 'uczciwa',
  famatus: 'sławetny', famata: 'sławetna',
  laboriosus: 'pracowity', laboriosa: 'pracowita',
  infidelis: 'niewierny', // określenie Żydów w aktach
  generosus: 'urodzony', generosa: 'urodzona',
  nobilis: 'szlachetny', nobilus: 'szlachetny', nobila: 'szlachetna',
  reverendus: 'wielebny',
  spectabilis: 'okazały',
  providus: 'opatrzny',
  'wielmożny': 'wielmożny',
  'ksiądz': 'ksiądz',
}

// --- NAZWISKA: normalizacja archaicznej pisowni -> współczesna ---
// Reguły ostrożne, stosowane do CAŁEGO członu nazwiska. Celem jest spójność,
// nie "poprawianie" tożsamości. Warianty tej samej rodziny ujednolicamy.
export const NAZWISKA_WPROST = {
  // warianty pisowni tego samego nazwiska -> forma współczesna
  zierkowski: 'Zierkowski', zerkowski: 'Zierkowski',
  zierkowska: 'Zierkowska', zerkowska: 'Zierkowska',
  dziedzicowic: 'Dziedzicowicz', // ucięta forma -> pełna
  koziałkowicz: 'Koziołkiewicz', koziołkiewicz: 'Koziołkiewicz', // warianty
  kołaczkowicz: 'Kołaczkiewicz', kołaczkiewicz: 'Kołaczkiewicz',
  michałkowicz: 'Michałkiewicz', michałkiewicz: 'Michałkiewicz',
}

// Reguły ortograficzne dla archaizmów w nazwiskach (gdy brak wpisu wprost):
export function normalizeSurname(word) {
  const key = word.toLowerCase()
  if (NAZWISKA_WPROST[key]) return NAZWISKA_WPROST[key]
  let w = word
  // Woy- -> Woj-  (Woyciechowski -> Wojciechowski)
  w = w.replace(/^Woy/, 'Woj').replace(/^woy/, 'woj')
  // wewnętrzne -oy- -> -oj-
  w = w.replace(/oy/g, 'oj')
  return w
}
