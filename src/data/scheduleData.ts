export type TripEntry = {
  id: string;
  time: string;
  user: string;
  location: string;
  type: 'S' | 'B' | '';
  contact?: string;
  registrationNumber?: number;
  passengerId?: string; // ID del pasajero para vincular con notas
};

export type ScheduleSection = {
  titleEu: string;
  titleEs: string;
  trips: TripEntry[];
};

// Phone contacts mapped by user name
export const userContacts: Record<string, string> = {
  "CANDIDO ARTOLA": "Aitor, hijo - 619463009",
  "BITXORI": "Bruno: 635 74 92 09",
  "ASUN": "Aitor, hijo - 619463009",
  "KARMELE": "Idoia - 605755066",
  "KARMELE SUKUNZA": "Idoia - 605755066",
  "JUAN MANUEL REPISO": "Mª Jose 647 852 948",
  "VALENTINA PEREZ": "Ainhoa 630 09 99 55",
  "ELENA ORTEGA": "Basil - 608493884",
  "CRISTINA NESTAR": "Fernando 688638887 / Mª Cristina 676759539",
  "CRISTINA SANCHEZ": "Maribi - 669077550",
  "JOKIN LENIZ": "Maria Mercedes 688726080",
  "PEPI ARELLANO": "649396060 / 627581299",
  "GARBIÑE CAREAGA": "Fede - 606425760 / Sandra- 632519966",
  "MIGUEL CELARAIN": "IÑAKI 629 849 431",
  "Mª ISABEL CALDERON": "Paula - 649815759",
  "Mª TERESA OLAECHEA": "Susana (hija) 660382755",
  "TERESA YOLDI": "Saioa - 678116306 / Olmara - 631775275",
  "DAVID POUSA": "Gemma 686 92 09 91",
  "JAYONE CARECHE": "Elena, hija - 667618479",
};

export const morningToCenter: ScheduleSection = {
  titleEu: "Goizeko lehenengo bidaia",
  titleEs: "Primer viaje mañanas",
  trips: [
    { id: "m1-1", time: "8:30", user: "VALENTINA PEREZ", location: "Aiete, 17", type: "B", contact: userContacts["VALENTINA PEREZ"], registrationNumber: 1 },
    { id: "m1-2", time: "8:35", user: "Mª ANTONIA MATEOS", location: "Oriamendi, 20", type: "B", registrationNumber: 2 },
    { id: "m1-3", time: "8:40", user: "ELENA ORTEGA", location: "Hotel Palacio de Aiete", type: "S", contact: userContacts["ELENA ORTEGA"], registrationNumber: 3 },
    { id: "m1-4", time: "8:50", user: "MARIA CORO MARTINEZ", location: "Dr. Marañon", type: "S", registrationNumber: 4 },
    { id: "m1-5", time: "9:00", user: "CRISTINA NESTAR", location: "Rot. Abanco", type: "B", contact: userContacts["CRISTINA NESTAR"], registrationNumber: 5 },
    { id: "m1-6", time: "9:05", user: "CRISTINA SANCHEZ", location: "Pisos Lugaritz", type: "S", contact: userContacts["CRISTINA SANCHEZ"], registrationNumber: 6 },
    { id: "m1-7", time: "9:05", user: "CANDIDO ARTOLA", location: "Errotaburu P. bus", type: "B", contact: userContacts["CANDIDO ARTOLA"], registrationNumber: 7 },
    { id: "m1-8", time: "9:05", user: "BITXORI", location: "Errotaburu P. bus", type: "S", contact: userContacts["BITXORI"], registrationNumber: 8 },
    { id: "m1-9", time: "9:05", user: "ASUN", location: "Errotaburu P. bus", type: "B", contact: userContacts["ASUN"], registrationNumber: 9 },
    { id: "m1-10", time: "9:15", user: "REZOLA", location: "", type: "" },
  ]
};

export const morningSecondTrip: ScheduleSection = {
  titleEu: "Goizeko bigarren bidaia",
  titleEs: "Segundo viaje mañanas",
  trips: [
    { id: "m2-1", time: "9:30", user: "MIGUEL CELARAIN", location: "TELEPIZZA", type: "B", contact: userContacts["MIGUEL CELARAIN"], registrationNumber: 10 },
    { id: "m2-2", time: "9:30", user: "Mª TERESA OLAECHEA", location: "Hotel Codina", type: "B", contact: userContacts["Mª TERESA OLAECHEA"], registrationNumber: 11 },
    { id: "m2-3", time: "9:30", user: "TERESA YOLDI", location: "Hotel Codina", type: "S", contact: userContacts["TERESA YOLDI"], registrationNumber: 12 },
    { id: "m2-4", time: "9:35", user: "DAVID POUSA", location: "Zumalakarregi, 9", type: "S", contact: userContacts["DAVID POUSA"], registrationNumber: 13 },
    { id: "m2-5", time: "9:35", user: "JUAN MANUEL REPISO", location: "Zumalakarregi, 9", type: "B", contact: userContacts["JUAN MANUEL REPISO"], registrationNumber: 14 },
    { id: "m2-6", time: "9:45", user: "JAYONE CARECHE", location: "Urbieta 2", type: "S", contact: userContacts["JAYONE CARECHE"], registrationNumber: 15 },
    { id: "m2-7", time: "9:55", user: "Mª ISABEL CALDERON", location: "Ambulatorio", type: "B", contact: userContacts["Mª ISABEL CALDERON"], registrationNumber: 16 },
    { id: "m2-8", time: "10:00", user: "GARBIÑE CAREAGA", location: "Magisterio", type: "B", contact: userContacts["GARBIÑE CAREAGA"], registrationNumber: 17 },
    { id: "m2-9", time: "10:05", user: "PEPI ARELLANO", location: "Arriola, 76", type: "B", contact: userContacts["PEPI ARELLANO"], registrationNumber: 18 },
    { id: "m2-10", time: "10:10", user: "KARMELE SUKUNZA", location: "Luberri", type: "S", contact: userContacts["KARMELE SUKUNZA"], registrationNumber: 19 },
    { id: "m2-11", time: "10:15", user: "JOKIN LENIZ", location: "P. Bus Bernardo Estones lasa", type: "B", contact: userContacts["JOKIN LENIZ"], registrationNumber: 20 },
    { id: "m2-12", time: "10:20", user: "REZOLA", location: "", type: "" },
  ]
};

export const afternoonFromCenter: ScheduleSection = {
  titleEu: "Arratsaldeko lehenengo bidaia",
  titleEs: "Primer viaje tardes",
  trips: [
    { id: "a1-1", time: "16:05", user: "REZOLA", location: "", type: "" },
    { id: "a1-2", time: "16:15", user: "CANDIDO ARTOLA", location: "Errotaburu P. bus", type: "B", contact: userContacts["CANDIDO ARTOLA"], registrationNumber: 1 },
    { id: "a1-3", time: "16:15", user: "BITXORI", location: "Errotaburu P. bus", type: "S", contact: userContacts["BITXORI"], registrationNumber: 2 },
    { id: "a1-4", time: "16:15", user: "ASUN", location: "Errotaburu P. bus", type: "B", contact: userContacts["ASUN"], registrationNumber: 3 },
    { id: "a1-5", time: "16:25", user: "KARMELE", location: "P. bus Magisterio", type: "S", contact: userContacts["KARMELE"], registrationNumber: 4 },
    { id: "a1-6", time: "16:25", user: "JUAN MANUEL REPISO", location: "P. Bus Esclavas", type: "B", contact: userContacts["JUAN MANUEL REPISO"], registrationNumber: 5 },
    { id: "a1-7", time: "16:35", user: "VALENTINA PEREZ", location: "Aiete, 17", type: "B", contact: userContacts["VALENTINA PEREZ"], registrationNumber: 6 },
    { id: "a1-8", time: "16:40", user: "Mª ANTONIA MATEOS", location: "Oriamendi, 20", type: "B", registrationNumber: 7 },
    { id: "a1-9", time: "16:45", user: "ELENA ORTEGA", location: "Goiko galtzada berria 16", type: "S", contact: userContacts["ELENA ORTEGA"], registrationNumber: 8 },
    { id: "a1-10", time: "16:50", user: "MARIA CORO MARTINEZ", location: "Dr. Marañon", type: "S", registrationNumber: 9 },
    { id: "a1-11", time: "16:55", user: "CRISTINA NESTAR", location: "Rot. Abanco", type: "B", contact: userContacts["CRISTINA NESTAR"], registrationNumber: 10 },
    { id: "a1-12", time: "17:00", user: "CRISTINA SANCHEZ", location: "Pisos Lugaritz", type: "S", contact: userContacts["CRISTINA SANCHEZ"], registrationNumber: 11 },
  ]
};

export const afternoonSecondTrip: ScheduleSection = {
  titleEu: "Arratsaldeko bigarren bidaia",
  titleEs: "Segundo viaje tardes",
  trips: [
    { id: "a2-1", time: "17:15", user: "REZOLA", location: "", type: "" },
    { id: "a2-2", time: "17:20", user: "JOKIN LENIZ", location: "P. Bus Bernardo Estones lasa", type: "B", contact: userContacts["JOKIN LENIZ"], registrationNumber: 12 },
    { id: "a2-3", time: "17:30", user: "PEPI ARELLANO", location: "Arriola, 76", type: "B", contact: userContacts["PEPI ARELLANO"], registrationNumber: 13 },
    { id: "a2-4", time: "17:35", user: "GARBIÑE CAREAGA", location: "Frente Magisterio", type: "B", contact: userContacts["GARBIÑE CAREAGA"], registrationNumber: 14 },
    { id: "a2-5", time: "17:40", user: "MIGUEL CELARAIN", location: "P. Bus Telepizza", type: "B", contact: userContacts["MIGUEL CELARAIN"], registrationNumber: 15 },
    { id: "a2-6", time: "17:40", user: "Mª ISABEL CALDERON", location: "P. Bus Telepizza", type: "B", contact: userContacts["Mª ISABEL CALDERON"], registrationNumber: 16 },
    { id: "a2-7", time: "17:45", user: "Mª TERESA OLAECHEA", location: "Hotel Codina", type: "B", contact: userContacts["Mª TERESA OLAECHEA"], registrationNumber: 17 },
    { id: "a2-8", time: "17:50", user: "TERESA YOLDI", location: "Hotel Codina", type: "S", contact: userContacts["TERESA YOLDI"], registrationNumber: 18 },
    { id: "a2-9", time: "17:55", user: "DAVID POUSA", location: "Esclavas", type: "S", contact: userContacts["DAVID POUSA"], registrationNumber: 19 },
    { id: "a2-10", time: "18:00", user: "JAYONE CARECHE", location: "Urbieta 2", type: "S", contact: userContacts["JAYONE CARECHE"], registrationNumber: 20 },
  ]
};
