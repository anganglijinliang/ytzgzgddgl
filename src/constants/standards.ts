export interface PipeStandard {
  spec: string;
  level: string;
  unitWeight: number; // kg per pipe (assuming 6m length)
}

// GB/T 13295-2019 (ISO 2531) Standard Weights for 6m T-type pipes
// Note: Weights are approximate theoretical weights including socket (Bell).
// Actual weights may vary by manufacturer and specific design.
export const PIPE_STANDARDS: PipeStandard[] = [
  // DN80
  { spec: 'DN80', level: 'K9', unitWeight: 77 },
  { spec: 'DN80', level: 'C', unitWeight: 77 }, // Usually min thickness applies

  // DN100
  { spec: 'DN100', level: 'K9', unitWeight: 95 },
  { spec: 'DN100', level: 'C40', unitWeight: 95 },
  { spec: 'DN100', level: 'C30', unitWeight: 95 },
  
  // DN125
  { spec: 'DN125', level: 'K9', unitWeight: 115 },
  { spec: 'DN125', level: 'C40', unitWeight: 115 },
  { spec: 'DN125', level: 'C30', unitWeight: 110 },

  // DN150
  { spec: 'DN150', level: 'K9', unitWeight: 144 },
  { spec: 'DN150', level: 'C40', unitWeight: 144 }, // Min thickness often applies
  { spec: 'DN150', level: 'C30', unitWeight: 135 },

  // DN200
  { spec: 'DN200', level: 'K9', unitWeight: 194 },
  { spec: 'DN200', level: 'C40', unitWeight: 194 },
  { spec: 'DN200', level: 'C30', unitWeight: 185 },

  // DN250
  { spec: 'DN250', level: 'K9', unitWeight: 255 },
  { spec: 'DN250', level: 'C40', unitWeight: 250 },
  { spec: 'DN250', level: 'C30', unitWeight: 240 },

  // DN300
  { spec: 'DN300', level: 'K9', unitWeight: 323 },
  { spec: 'DN300', level: 'C40', unitWeight: 315 },
  { spec: 'DN300', level: 'C30', unitWeight: 300 },
  
  // DN350
  { spec: 'DN350', level: 'K9', unitWeight: 403 },
  { spec: 'DN350', level: 'C40', unitWeight: 395 },
  { spec: 'DN350', level: 'C30', unitWeight: 380 },

  // DN400
  { spec: 'DN400', level: 'K9', unitWeight: 482 },
  { spec: 'DN400', level: 'C40', unitWeight: 470 },
  { spec: 'DN400', level: 'C30', unitWeight: 450 },
  
  // DN450
  { spec: 'DN450', level: 'K9', unitWeight: 577 },
  { spec: 'DN450', level: 'C40', unitWeight: 565 },
  { spec: 'DN450', level: 'C30', unitWeight: 540 },

  // DN500
  { spec: 'DN500', level: 'K9', unitWeight: 669 },
  { spec: 'DN500', level: 'C40', unitWeight: 650 },
  { spec: 'DN500', level: 'C30', unitWeight: 620 },
  
  // DN600
  { spec: 'DN600', level: 'K9', unitWeight: 882 },
  { spec: 'DN600', level: 'C40', unitWeight: 860 },
  { spec: 'DN600', level: 'C30', unitWeight: 820 },
  
  // DN700
  { spec: 'DN700', level: 'K9', unitWeight: 1123 },
  { spec: 'DN700', level: 'C40', unitWeight: 1100 },
  { spec: 'DN700', level: 'C30', unitWeight: 1050 },

  // DN800
  { spec: 'DN800', level: 'K9', unitWeight: 1394 },
  { spec: 'DN800', level: 'C40', unitWeight: 1360 },
  { spec: 'DN800', level: 'C30', unitWeight: 1300 },
  
  // DN900
  { spec: 'DN900', level: 'K9', unitWeight: 1690 },
  { spec: 'DN900', level: 'C40', unitWeight: 1650 },
  { spec: 'DN900', level: 'C30', unitWeight: 1580 },

  // DN1000
  { spec: 'DN1000', level: 'K9', unitWeight: 2017 },
  { spec: 'DN1000', level: 'C40', unitWeight: 1980 },
  { spec: 'DN1000', level: 'C25', unitWeight: 1880 },
  
  // DN1100
  { spec: 'DN1100', level: 'K9', unitWeight: 2370 },
  { spec: 'DN1100', level: 'C40', unitWeight: 2320 },
  { spec: 'DN1100', level: 'C25', unitWeight: 2200 },

  // DN1200
  { spec: 'DN1200', level: 'K9', unitWeight: 2758 },
  { spec: 'DN1200', level: 'C40', unitWeight: 2700 },
  { spec: 'DN1200', level: 'C25', unitWeight: 2560 },

  // DN1400
  { spec: 'DN1400', level: 'K9', unitWeight: 3669 },
  { spec: 'DN1400', level: 'C40', unitWeight: 3600 },
  { spec: 'DN1400', level: 'C25', unitWeight: 3400 },

  // DN1500
  { spec: 'DN1500', level: 'K9', unitWeight: 4160 },
  { spec: 'DN1500', level: 'C40', unitWeight: 4100 },
  { spec: 'DN1500', level: 'C25', unitWeight: 3900 },

  // DN1600
  { spec: 'DN1600', level: 'K9', unitWeight: 4668 },
  { spec: 'DN1600', level: 'C40', unitWeight: 4600 },
  { spec: 'DN1600', level: 'C25', unitWeight: 4400 },

  // DN1800
  { spec: 'DN1800', level: 'K9', unitWeight: 5780 },
  { spec: 'DN1800', level: 'C40', unitWeight: 5700 },
  { spec: 'DN1800', level: 'C25', unitWeight: 5500 },

  // DN2000
  { spec: 'DN2000', level: 'K9', unitWeight: 6980 },
  { spec: 'DN2000', level: 'C40', unitWeight: 6900 },
  { spec: 'DN2000', level: 'C25', unitWeight: 6700 },

  // DN2200
  { spec: 'DN2200', level: 'K9', unitWeight: 8280 },
  { spec: 'DN2200', level: 'C40', unitWeight: 8200 },
  { spec: 'DN2200', level: 'C25', unitWeight: 8000 },

  // DN2400
  { spec: 'DN2400', level: 'K9', unitWeight: 9680 },
  { spec: 'DN2400', level: 'C40', unitWeight: 9600 },
  { spec: 'DN2400', level: 'C25', unitWeight: 9400 },

  // DN2600
  { spec: 'DN2600', level: 'K9', unitWeight: 11200 },
  { spec: 'DN2600', level: 'C40', unitWeight: 11100 },
  { spec: 'DN2600', level: 'C25', unitWeight: 10900 },
];

export const getStandardWeight = (spec: string, level: string): number | undefined => {
  const standard = PIPE_STANDARDS.find(s => s.spec === spec && s.level === level);
  return standard?.unitWeight;
};
