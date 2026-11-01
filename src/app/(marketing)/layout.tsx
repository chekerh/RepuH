import { SiteHeader } from "@/components/site-header";
import { PublicFooter } from "@/components/chrome";
import { currentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <div className="min-h-dvh">
      <SiteHeader signedIn={Boolean(user?.profile.onboardingComplete)} />
      <main id="main" className="mx-auto w-full max-w-[72rem] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
