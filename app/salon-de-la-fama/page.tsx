import { HallOfFameTabs } from "@/components/hall-of-fame-tabs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SalonDeLaFamaPage() {
  return (
    <>
      <SiteHeader active="salon" />

      <main className="relative z-10 mx-auto w-full max-w-arcade px-margin pb-margin pt-32">
        <h1 className="mb-12 text-center font-display text-display-lg uppercase text-primary-fixed drop-shadow-[0_0_20px_rgba(99,247,255,0.9)]">
          Salón de la Fama
        </h1>

        <HallOfFameTabs />
      </main>

      <SiteFooter />
    </>
  );
}
