import { translations, type TranslationKey } from "@/lib/i18n";

type LocalizedTextProps =
  | { id: TranslationKey; es?: never; en?: never }
  | { id?: never; es: string; en: string };

export function LocalizedText(props: LocalizedTextProps) {
  const { es, en } = "id" in props && props.id ? translations[props.id] : props;

  return (
    <>
      <span className="lang-es">{es}</span>
      <span className="lang-en">{en}</span>
    </>
  );
}
