/**
 * Cores de marca de dados (marks), separadas das cores de texto/UI (que continuam
 * vindo das classes Tailwind do tema). Trio azul/laranja/aqua validado com o script
 * validate_palette.js do skill de dataviz contra as superficies reais do app
 * (branco no claro, #1A2330 no escuro), --pairs all (varios cards com cores
 * diferentes na mesma tela, nao so pares adjacentes numa unica legenda):
 * CVD all-pairs >=9.2, normal-vision all-pairs >=24.0, contraste >=3:1 (aqua fica
 * em 2.82 no claro - por isso o valor sempre vem com label direto, nunca so a cor).
 */
export const CHART_SERIES_1 = '#2a78d6'
export const CHART_SERIES_2 = '#eb6834'
export const CHART_SERIES_3 = '#1baf7a'

export const CHART_SERIES_1_WASH = 'rgba(42, 120, 214, 0.1)'
export const CHART_SERIES_1_TRACK = 'rgba(42, 120, 214, 0.14)'
export const CHART_SERIES_2_TRACK = 'rgba(235, 104, 52, 0.14)'
export const CHART_SERIES_3_TRACK = 'rgba(27, 175, 122, 0.14)'

export const CHART_GRID = '#e1e0d9'

/**
 * Status (bom/ruim) - reservado, nao entra na rotacao categorica acima. Do
 * palette.md do skill: good/critical, contraste >=3:1 nos dois modos.
 */
export const CHART_GOOD = '#0ca30c'
export const CHART_CRITICAL = '#d03b3b'
