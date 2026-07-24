import { WhatsappLogo, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/src/components/contact/contact-form";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFr = locale === "fr";
  const t = await getTranslations("contactForm");

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER;
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const whatsappText = encodeURIComponent(isFr ? "Bonjour, j'ai une question sur Le Shabba." : "Hi, I have a question about Le Shabba.");

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{isFr ? "Nous contacter" : "Contact us"}</h1>

      <div className="flex flex-col gap-3">
        {whatsappNumber ? (
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 font-medium text-white"
          >
            <WhatsappLogo size={20} weight="fill" />
            {isFr ? "Nous contacter sur WhatsApp" : "Contact us on WhatsApp"}
          </a>
        ) : null}

        {contactEmail ? (
          <a
            href={`mailto:${contactEmail}`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 font-medium dark:border-neutral-800"
          >
            <EnvelopeSimple size={20} />
            {contactEmail}
          </a>
        ) : null}

        {!whatsappNumber && !contactEmail && (
          <p className="text-sm text-neutral-500">
            {isFr
              ? "Les canaux de contact ne sont pas encore configurés."
              : "Contact channels aren't configured yet."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-900">
        <h2 className="text-lg font-black">{t("title")}</h2>
        <ContactForm />
      </div>
    </main>
  );
}
