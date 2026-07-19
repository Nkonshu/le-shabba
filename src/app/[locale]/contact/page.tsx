import { WhatsappLogo, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFr = locale === "fr";

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
    </main>
  );
}
