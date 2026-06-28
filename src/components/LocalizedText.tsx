export function LocalizedText({ es, en }: { es: string; en: string }) {
  return (
    <>
      <span className="lang-es">{es}</span>
      <span className="lang-en">{en}</span>
    </>
  );
}
