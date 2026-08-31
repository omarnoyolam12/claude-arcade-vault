/**
 * Fondo decorativo de `/acerca-de`: rejilla cian proyectada en perspectiva.
 * Portado del `<div>` con `background-image` de líneas del mockup `resources/about`.
 * Sin animación, sin `<style>`, sin CSS nuevo: solo `className` / `style` inline.
 */
export function PerspectiveGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 origin-top opacity-20 [transform:perspective(500px)_rotateX(60deg)_scale(2)] [mask-image:linear-gradient(to_bottom,transparent,black)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black)]"
      style={{
        backgroundImage:
          "linear-gradient(var(--color-primary-fixed-dim) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary-fixed-dim) 1px, transparent 1px)",
        backgroundSize: "50px 50px",
      }}
    />
  );
}
