import { NewPasswordForm } from "@/components/new-password-form";

export default function NuevaContrasenaPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-void px-margin py-12">
      {/* Cyber-grid en perspectiva */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[length:40px_40px] bg-[linear-gradient(rgba(0,220,229,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(0,220,229,0.15)_1px,transparent_1px)] opacity-40 [transform:perspective(600px)_rotateX(60deg)] [transform-origin:bottom_center]"
      />

      {/* Glows ambientales */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-[50%] bg-primary-fixed opacity-10 mix-blend-screen blur-[200px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-[50%] bg-secondary-container opacity-10 mix-blend-screen blur-[200px]"
      />

      <main className="relative z-10 w-full max-w-lg">
        <div className="mb-12 text-center">
          <h1 className="font-display text-display-lg uppercase text-primary-fixed drop-shadow-[0_0_20px_rgba(99,247,255,0.9)]">
            Arcade Vault
          </h1>
          <p className="mt-4 font-body text-label-lg uppercase tracking-[0.2em] text-primary-fixed">
            Elige tu nueva contraseña
          </p>
        </div>

        <div className="relative">
          {/* Bezel arcade */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 -z-10 border-[16px] border-[#080808] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_2px_10px_rgba(255,255,255,0.05),inset_0_0_30px_rgba(0,0,0,1)]"
          />

          <div className="relative z-10 border border-primary-fixed-dim bg-[rgba(5,5,8,0.85)] p-10 shadow-[0_0_40px_rgba(0,220,229,0.2)] backdrop-blur-md sm:p-12">
            {/* Scanlines de la tarjeta */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(99,247,255,0.03)_2px,rgba(99,247,255,0.03)_4px)]"
            />

            <NewPasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
