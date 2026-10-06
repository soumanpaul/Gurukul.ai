export type ProductVersion = 'v1' | 'v2';
export const productVersion: ProductVersion = 'v2';

export function featuresFor(version: ProductVersion) {
  return { fullStudy: version === 'v2', buddy: true, settings: true, splash: true };
}

export const productFeatures = featuresFor(productVersion);
