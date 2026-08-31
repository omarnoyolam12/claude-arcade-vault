---
name: Arcade Vault
colors:
  surface: '#131318'
  surface-dim: '#131318'
  surface-bright: '#39383e'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b20'
  surface-container: '#1f1f25'
  surface-container-high: '#2a292f'
  surface-container-highest: '#35343a'
  on-surface: '#e4e1e9'
  on-surface-variant: '#b9caca'
  inverse-surface: '#e4e1e9'
  inverse-on-surface: '#303036'
  outline: '#849495'
  outline-variant: '#3a494a'
  surface-tint: '#00dce5'
  primary: '#e9feff'
  on-primary: '#003739'
  primary-container: '#00f5ff'
  on-primary-container: '#006c71'
  inverse-primary: '#00696e'
  secondary: '#ffb2bf'
  on-secondary: '#660028'
  secondary-container: '#ff4d80'
  on-secondary-container: '#5a0022'
  tertiary: '#fdffb5'
  on-tertiary: '#303300'
  tertiary-container: '#dee700'
  on-tertiary-container: '#616600'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#63f7ff'
  primary-fixed-dim: '#00dce5'
  on-primary-fixed: '#002021'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#ffd9de'
  secondary-fixed-dim: '#ffb2bf'
  on-secondary-fixed: '#3f0016'
  on-secondary-fixed-variant: '#90003b'
  tertiary-fixed: '#e3ec00'
  tertiary-fixed-dim: '#c7cf00'
  on-tertiary-fixed: '#1c1d00'
  on-tertiary-fixed-variant: '#474a00'
  background: '#131318'
  on-background: '#e4e1e9'
  surface-variant: '#35343a'
typography:
  display-lg:
    fontFamily: anybody
    fontSize: 48px
    fontWeight: '900'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: anybody
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-md:
    fontFamily: anybody
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: courierPrime
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: courierPrime
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: courierPrime
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  label-sm:
    fontFamily: courierPrime
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
spacing:
  unit: 4px
  gutter: 24px
  margin: 32px
  container-max: 1280px
---

## Brand & Style
The design system for this product is a love letter to the golden age of coin-op cabinets, blending **80s Retro-Future** aesthetics with modern **Vaporwave** and **Cyberpunk** sensibilities. The brand personality is nostalgic yet high-energy, designed to evoke the feeling of walking into a dark arcade at midnight—smelling of ozone and lit only by the hum of neon displays.

The UI utilizes a **Neon-Brutalist** approach: heavy borders, intense color saturation, and deliberate structural grit. To simulate the analog hardware of the era, the design system employs "CRT FX" including scanline overlays, slight chromatic aberration on hover, and vibrant outer glows that bleed into the deep black void of the interface.

## Colors
This design system operates exclusively in **Dark Mode**. The foundation is a "True Black" (#0a0a0f) to maximize the contrast of the glowing elements.

- **Electric Cyan (Primary):** Used for primary actions (JUGAR), active states, and "player 1" indicators.
- **Hot Magenta (Secondary):** Used for "player 2" elements, high-score alerts, and critical UI accents.
- **Acid Yellow (Tertiary):** Reserved for "Salón de la Fama" (Hall of Fame) rankings, currency, and rare items.
- **Surface:** A slightly lighter charcoal (#12121a) used to differentiate card backgrounds from the main void.

## Typography
*Note: Due to system availability, "Anybody" is used as a high-impact, variable substitute for headline roles to maintain the aggressive, wide-set arcade feel, while "Courier Prime" handles all technical and narrative data.*

All headers must use **Uppercase** to mimic the restricted character sets of 8-bit machines. Headlines should utilize a text-shadow in Primary or Secondary colors to create a "bloom" effect. Body text should be kept strictly monochromatic (White or Primary Cyan) to ensure legibility against scanline overlays. 

For the Spanish localization, ensure that glyphs for "Ñ" and accented vowels (Á, É, Í, Ó, Ú) maintain the same monospaced width as standard characters in the UI.

## Layout & Spacing
The layout follows a **Rigid Grid** philosophy. Elements are aligned to a 4px baseline to simulate pixel-perfection. 

- **Grid:** 12-column system for desktop, 4-column for mobile.
- **Margins:** Generous outer margins (32px+) to give the "cabinet screen" a centered, focused feel.
- **Gutters:** 24px fixed gutters to allow neon glows from adjacent cards to overlap slightly without muddying the content.
- **Mobile Reflow:** On mobile, complex sidebars collapse into a "Command Terminal" overlay. Spacing tightens to 16px margins to maximize play area.

## Elevation & Depth
Depth in this design system is achieved through **Luminance and Glow**, rather than realistic shadows.

1.  **The Void (Z-0):** The base black background.
2.  **The Cabinet (Z-1):** Surface containers with 1px solid borders in a dimmed primary color.
3.  **Active Elements (Z-2):** High-saturation borders with a `box-shadow` blur of 10px-20px in the primary or secondary color.
4.  **CRT Overlay:** A global pseudo-element across the entire viewport providing a subtle horizontal scanline pattern and a faint "vignette" to the corners of the screen.
5.  **Glow-on-Hover:** When interactive elements are hovered, they should appear to "warm up," increasing the blur radius and brightness of their neon borders.

## Shapes
This design system uses a **Sharp (0)** roundedness level. There are no circles or soft corners in the "Arcade Vault." All buttons, inputs, and cards are strictly rectangular to honor the pixel-grid and the industrial design of 1980s hardware. 

"Pill" shapes are strictly forbidden; use 45-degree chamfered corners (clipped corners) if a variation from a standard rectangle is required for specialized HUD elements.

## Components

### Buttons
- **Default:** 2px solid border (Cyan), Uppercase text (Courier Prime).
- **Hover:** The border glows (Cyan box-shadow); text gains a subtle "glitch" flicker.
- **Primary (JUGAR):** Cyan border and text.
- **Secondary (SALIR):** Magenta border and text.

### Cards
- **Structure:** Solid black background, 1px Cyan border.
- **Overlay:** A permanent 10% opacity scanline texture. 
- **Effect:** 3D Tilt on hover (5-degree max) to give the card a "floating" glass feel.

### Input Fields
- **Style:** "Terminal" style. No background, just a bottom border (Cyan). 
- **Cursor:** A solid block cursor (█) that blinks at a 500ms interval.
- **Labels:** Small labels (SALÓN DE LA FAMA) placed directly above the input in Acid Yellow.

### Chips / Tags
- Small rectangular boxes with a solid Cyan background and Black text. Used for genre tags (SHOOTER, RPG, PLATAFORMAS).

### Progress Bars (Loading)
- Segmented bars (rather than smooth) to look like bit-mapped loading sequences. Acid Yellow for progress fill.