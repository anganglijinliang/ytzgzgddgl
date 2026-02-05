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
  
  // DN150
  { spec: 'DN150', level: 'K9', unitWeight: 144 },
  { spec: 'DN150', level: 'C40', unitWeight: 144 }, // Min thickness often applies
  { spec: 'DN150', level: 'C30', unitWeight: 135 },

  // DN200
  { spec: 'DN200', level: 'K9', unitWeight: 199 },
  { spec: 'DN200', level: 'C40', unitWeight: 194 },
  { spec: 'DN200', level: 'C30', unitWeight: 185 },

  // DN300
  { spec: 'DN300', level: 'K9', unitWeight: 335 }, // Updated
  { spec: 'DN300', level: 'C40', unitWeight: 320 },
  { spec: 'DN300', level: 'C30', unitWeight: 300 },
  
  // DN400
  { spec: 'DN400', level: 'K9', unitWeight: 495 }, // Updated
  { spec: 'DN400', level: 'C40', unitWeight: 460 },
  { spec: 'DN400', level: 'C30', unitWeight: 430 },
  
  // DN500
  { spec: 'DN500', level: 'K9', unitWeight: 680 }, // Updated
  { spec: 'DN500', level: 'C40', unitWeight: 620 },
  { spec: 'DN500', level: 'C30', unitWeight: 580 },
  
  // DN600
  { spec: 'DN600', level: 'K9', unitWeight: 885 }, // Updated
  { spec: 'DN600', level: 'C40', unitWeight: 800 },
  { spec: 'DN600', level: 'C30', unitWeight: 750 },
  
  // DN800
  { spec: 'DN800', level: 'K9', unitWeight: 1370 }, // Updated
  { spec: 'DN800', level: 'C40', unitWeight: 1250 },
  { spec: 'DN800', level: 'C30', unitWeight: 1150 },
  
  // DN1000
  { spec: 'DN1000', level: 'K9', unitWeight: 1960 }, // Updated
  { spec: 'DN1000', level: 'C40', unitWeight: 1780 },
  { spec: 'DN1000', level: 'C25', unitWeight: 1600 },
  
  // DN1200
  { spec: 'DN1200', level: 'K9', unitWeight: 2760 }, // Updated to match vendor/calculation
  { spec: 'DN1200', level: 'C40', unitWeight: 2500 },
  { spec: 'DN1200', level: 'C25', unitWeight: 2300 },
];

export const getStandardWeight = (spec: string, level: string): number | undefined => {
  const standard = PIPE_STANDARDS.find(s => s.spec === spec && s.level === level);
  return standard?.unitWeight;
};
