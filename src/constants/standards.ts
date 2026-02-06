export interface PipeStandard {
  spec: string;
  level: string;
  unitWeight?: number; // kg per pipe (assuming 6m length)
}

// GB/T 13295-2019 (ISO 2531) Standard Weights for 6m T-type pipes
// Note: Weights are approximate theoretical weights including socket (Bell).
// Actual weights may vary by manufacturer and specific design.

// Base K9 Weights (Reference)
const K9_WEIGHTS: Record<string, number> = {
  'DN40': 42, 'DN50': 51, 'DN60': 60, 'DN65': 65,
  'DN80': 77, 'DN100': 95, 'DN125': 115, 'DN150': 144, 'DN200': 194,
  'DN250': 255, 'DN300': 323, 'DN350': 403, 'DN400': 482, 'DN450': 577,
  'DN500': 669, 'DN600': 882, 'DN700': 1123, 'DN800': 1394, 'DN900': 1690,
  'DN1000': 2017, 'DN1100': 2370, 'DN1200': 2758, 'DN1400': 3669,
  'DN1500': 4160, 'DN1600': 4668, 'DN1800': 5780, 'DN2000': 6980,
  'DN2200': 8280, 'DN2400': 9680, 'DN2600': 11200
};

const SPECS = [
  'DN40', 'DN50', 'DN60', 'DN65', 
  'DN80', 'DN100', 'DN125', 'DN150', 'DN200', 'DN250', 'DN300', 
  'DN350', 'DN400', 'DN450', 'DN500', 'DN600', 
  'DN700', 'DN800', 'DN900', 'DN1000', 
  'DN1100', 'DN1200', 'DN1400', 'DN1500', 'DN1600', 'DN1800', 'DN2000', 
  'DN2200', 'DN2400', 'DN2600'
];

const LEVELS = [
  'K7', 'K8', 'K9', 'K10', 'K11', 'K12',
  'C20', 'C25', 'C30', 'C40', 'C50', 'C64', 'C100'
];

export const PIPE_STANDARDS: PipeStandard[] = [];

// Generate mappings
SPECS.forEach(spec => {
  LEVELS.forEach(level => {
    let weight: number | undefined = undefined;

    // 1. K-Class Calculation
    if (level.startsWith('K') && K9_WEIGHTS[spec]) {
      const kVal = parseInt(level.substring(1));
      if (!isNaN(kVal)) {
        // Approximate: W_Kx = W_K9 * (Kx/9)
        // This is a rough estimation for UI convenience
        weight = Math.round(K9_WEIGHTS[spec] * (kVal / 9));
      }
    }
    
    // 2. C-Class Mapping (Common defaults based on ISO 2531 preferred classes)
    // In many cases, C-class pipes use standard K9 molds or specific thicknesses close to K9/K8
    else if (level.startsWith('C') && K9_WEIGHTS[spec]) {
      const dn = parseInt(spec.replace('DN', ''));
      
      // Heuristic mapping for weights
      if (level === 'C40') {
         // C40 often used for small diameters, weight close to K9
         weight = K9_WEIGHTS[spec];
      } else if (level === 'C30') {
         // C30 slightly lighter or same as K9 for mid range
         weight = dn >= 350 ? Math.round(K9_WEIGHTS[spec] * 0.95) : K9_WEIGHTS[spec];
      } else if (level === 'C25') {
         // C25 for large diameters
         weight = Math.round(K9_WEIGHTS[spec] * 0.92);
      } else if (level === 'C20') {
         weight = Math.round(K9_WEIGHTS[spec] * 0.90);
      } else if (['C50', 'C64', 'C100'].includes(level)) {
         // High pressure, heavier
         weight = Math.round(K9_WEIGHTS[spec] * 1.1);
      }
    }

    PIPE_STANDARDS.push({ spec, level, unitWeight: weight });
  });
});

export const getStandardWeight = (spec: string, level: string): number | undefined => {
  const standard = PIPE_STANDARDS.find(s => s.spec === spec && s.level === level);
  return standard?.unitWeight;
};
