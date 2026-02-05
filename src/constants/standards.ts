export interface PipeStandard {
  spec: string;
  level: string;
  unitWeight: number; // kg per pipe (assuming 6m length)
}

// GB/T 13295 (ISO 2531) Approximate weights for 6m T-type pipes
// These are illustrative values
export const PIPE_STANDARDS: PipeStandard[] = [
  // DN100
  { spec: 'DN100', level: 'K9', unitWeight: 95 },
  { spec: 'DN100', level: 'C40', unitWeight: 85 },
  { spec: 'DN100', level: 'C30', unitWeight: 80 },
  
  // DN150
  { spec: 'DN150', level: 'K9', unitWeight: 144 },
  { spec: 'DN150', level: 'C40', unitWeight: 130 },
  { spec: 'DN150', level: 'C30', unitWeight: 120 },

  // DN200
  { spec: 'DN200', level: 'K9', unitWeight: 199 },
  { spec: 'DN200', level: 'C40', unitWeight: 180 },
  { spec: 'DN200', level: 'C30', unitWeight: 170 },

  // DN300
  { spec: 'DN300', level: 'K9', unitWeight: 326 },
  { spec: 'DN300', level: 'C40', unitWeight: 300 },
  { spec: 'DN300', level: 'C30', unitWeight: 280 },
  
  // DN400
  { spec: 'DN400', level: 'K9', unitWeight: 478 },
  { spec: 'DN400', level: 'C40', unitWeight: 440 },
  { spec: 'DN400', level: 'C30', unitWeight: 410 },
  
  // DN500
  { spec: 'DN500', level: 'K9', unitWeight: 654 },
  { spec: 'DN500', level: 'C40', unitWeight: 600 },
  { spec: 'DN500', level: 'C30', unitWeight: 560 },
  
  // DN600
  { spec: 'DN600', level: 'K9', unitWeight: 852 },
  { spec: 'DN600', level: 'C40', unitWeight: 780 },
  { spec: 'DN600', level: 'C30', unitWeight: 730 },
  
  // DN800
  { spec: 'DN800', level: 'K9', unitWeight: 1320 },
  { spec: 'DN800', level: 'C40', unitWeight: 1200 },
  { spec: 'DN800', level: 'C30', unitWeight: 1100 },
  
  // DN1000
  { spec: 'DN1000', level: 'K9', unitWeight: 1880 },
  { spec: 'DN1000', level: 'C40', unitWeight: 1700 },
  { spec: 'DN1000', level: 'C25', unitWeight: 1550 },
  
  // DN1200
  { spec: 'DN1200', level: 'K9', unitWeight: 2540 },
  { spec: 'DN1200', level: 'C40', unitWeight: 2300 },
  { spec: 'DN1200', level: 'C25', unitWeight: 2100 },
];

export const getStandardWeight = (spec: string, level: string): number | undefined => {
  const standard = PIPE_STANDARDS.find(s => s.spec === spec && s.level === level);
  return standard?.unitWeight;
};
