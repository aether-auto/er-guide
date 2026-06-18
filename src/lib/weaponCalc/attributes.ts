// Ported from ThomasJClark/elden-ring-weapon-calculator (MIT) — see ./LICENSE.
// https://github.com/ThomasJClark/elden-ring-weapon-calculator

export const allAttributes = ['str', 'dex', 'int', 'fai', 'arc'] as const

export type Attribute = (typeof allAttributes)[number]
export type Attributes = Record<Attribute, number>
