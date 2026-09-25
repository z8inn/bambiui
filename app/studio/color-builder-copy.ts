import type { Locale } from "./locale";

// Token, role, preset and audit IDs are data, not translated UI strings.
type Copy = {
  palette: (mode: string) => string;
  matches: string;
  workspace: string;
  visualLanguage: string;
  apply: (mode: string) => string;
  recipes: (mode: string) => string;
  derivation: string;
  textTargets: (text: string, outline: string) => string;
  builder: string;
  intro: string;
  source: string;
  picker: string;
  validHex: string;
  invalidHex: string;
  presets: string;
  generatePreset: (name: string) => string;
  generate: string;
  usePrimary: string;
  useSource: (mode: string) => string;
  generated: string;
  generatedFrom: string;
  stale: (source: string) => string;
  applyHelp: string;
  scales: (count: string) => string;
  scalesHelp: string;
  backupHelp: string;
  applied: (mode: string, source: string) => string;
  currentChecks: string;
  componentContrast: (component: string) => string;
  systemContrast: string;
  failures: (failures: string, total: string) => string;
  allPass: (total: string) => string;
  reportHelp: string;
  reviewWarnings: (count: string) => string;
  reviewPairs: string;
  pairResults: string;
  pass: string;
  belowTarget: string;
  required: string;
  on: string;
  auditPhrases: readonly (readonly [RegExp, string])[];
  modes: Record<"light" | "dark", string>;
  states: Record<"solid" | "hover" | "active" | "subtle", string>;
};

export const colorBuilderCopy = {
  en: {
    palette: (mode) => `${mode} palette`,
    matches: "Matches global colors",
    workspace: "Your workspace",
    visualLanguage: "A shared visual language.",
    apply: (mode) => `Apply ${mode} colors`,
    recipes: (mode) => `${mode} role recipes & contrast`,
    derivation: "The same derivation powers component hover, active, subtle and focus colors. Component overrides can produce different results; check the selected theme’s report.",
    textTargets: (text, outline) => `Text ≥ ${text}:1. Outline / focus ≥ ${outline}:1 on this palette’s background and muted surface.`,
    builder: "Color builder",
    intro: "Start with a brand color. Keep its hue; derive readable usage tones. Status colors stay green, amber, red and blue.",
    source: "Source brand color",
    picker: "Source brand color picker",
    validHex: "Six-digit hex. Your source stays separate from the adjusted primary color.",
    invalidHex: "Enter a six-digit hex color, such as #e8673c.",
    presets: "Brand color presets",
    generatePreset: (name) => `Generate ${name} palette`,
    generate: "Generate palettes",
    usePrimary: "Use current primary",
    useSource: (mode) => `Use ${mode} source`,
    generated: "Light and dark palettes generated. Review them before applying.",
    generatedFrom: "Generated from",
    stale: (source) => `Source changed. Generate again to update these recipes; they still use ${source}.`,
    applyHelp: "Apply light or dark to replace that theme’s 17 global colors and source. Its spacing, overrides and the other theme stay unchanged. Editor appearance is independent.",
    scales: (count) => `${count}-step color scales`,
    scalesHelp: "Light to dark. Scale stops are raw colors, not guaranteed text/background combinations.",
    backupHelp: "Applying records the source in that theme’s JSON backup. Unapplied candidates stay in this page only. CSS exports both themes and their derived states; raw scales are available through the recipe CLI.",
    applied: (mode, source) => `${mode} theme colors applied from ${source}. Overrides and the other theme were kept. Check current contrast below.`,
    currentChecks: "Current contrast checks",
    componentContrast: (component) => `${component} contrast`,
    systemContrast: "Current system contrast",
    failures: (failures, total) => `${failures} of ${total} checked color pairs need attention.`,
    allPass: (total) => `All ${total} checked color pairs meet their targets.`,
    reportHelp: "Selected color pairs on the global surface, including modeled mixes and enabled states. Not a complete accessibility audit; nested surfaces and other states still need review.",
    reviewWarnings: (count) => `Review ${count} contrast warnings`,
    reviewPairs: "Review checked pairs",
    pairResults: "Contrast pair results",
    pass: "Pass",
    belowTarget: "Below target",
    required: "required",
    on: "on",
    auditPhrases: [],
    modes: { light: "Light", dark: "Dark" },
    states: { solid: "Solid", hover: "Hover", active: "Active", subtle: "Subtle" },
  },
  tr: {
    palette: (mode) => `${mode} paleti`,
    matches: "Genel renklerle eşleşiyor",
    workspace: "Çalışma alanınız",
    visualLanguage: "Ortak bir görsel dil.",
    apply: (mode) => `${mode} renklerini uygula`,
    recipes: (mode) => `${mode} rol tarifleri ve kontrast`,
    derivation: "Aynı türetme, bileşenlerin hover, active, subtle ve focus renklerini oluşturur. Bileşen özelleştirmeleri farklı sonuçlar verebilir; seçili temanın raporunu kontrol edin.",
    textTargets: (text, outline) => `Metin ≥ ${text}:1. Kenarlık / odak ≥ ${outline}:1; bu paletin background ve muted yüzeylerinde.`,
    builder: "Renk oluşturucu",
    intro: "Bir marka rengiyle başlayın. Tonunu koruyarak okunabilir kullanım renkleri türetin. Durum renkleri yeşil, kehribar, kırmızı ve mavi kalır.",
    source: "Kaynak marka rengi",
    picker: "Kaynak marka rengi seçici",
    validHex: "Altı basamaklı hex. Kaynak renk, ayarlanmış primary renginden ayrı kalır.",
    invalidHex: "#e8673c gibi altı basamaklı bir hex renk girin.",
    presets: "Hazır marka renkleri",
    generatePreset: (name) => `${name} paleti oluştur`,
    generate: "Paletleri oluştur",
    usePrimary: "Mevcut primary rengini kullan",
    useSource: (mode) => `${mode} temasının kaynağını kullan`,
    generated: "Açık ve koyu paletler oluşturuldu. Uygulamadan önce inceleyin.",
    generatedFrom: "Şuradan oluşturuldu:",
    stale: (source) => `Kaynak değişti. Bu tarifleri güncellemek için yeniden oluşturun; hâlâ ${source} kullanılıyor.`,
    applyHelp: "Açık veya koyu paleti uygulamak, o temanın 17 genel rengini ve kaynağını değiştirir. Aralıklar, özelleştirmeler ve diğer tema değişmez. Düzenleyici görünümü bağımsızdır.",
    scales: (count) => `${count} adımlı renk skalaları`,
    scalesHelp: "Açıktan koyuya. Skala basamakları ham renklerdir; metin/arka plan eşleşmelerinin okunabilirliği garanti edilmez.",
    backupHelp: "Uygulama, kaynağı o temanın JSON yedeğine kaydeder. Uygulanmamış adaylar yalnızca bu sayfada kalır. CSS her iki temayı ve türetilmiş durumlarını dışa aktarır; ham skalalara tarif CLI aracılığıyla erişilebilir.",
    applied: (mode, source) => `${mode} temasının renkleri ${source} kaynağından uygulandı. Özelleştirmeler ve diğer tema korundu. Aşağıdaki mevcut kontrastı kontrol edin.`,
    currentChecks: "Mevcut kontrast kontrolleri",
    componentContrast: (component) => `${component} kontrastı`,
    systemContrast: "Mevcut sistem kontrastı",
    failures: (failures, total) => `Kontrol edilen ${total} renk çiftinden ${failures} tanesi incelenmeli.`,
    allPass: (total) => `Kontrol edilen ${total} renk çiftinin tümü hedefleri karşılıyor.`,
    reportHelp: "Modellenmiş karışımlar ve etkin durumlar dâhil genel yüzeydeki seçili renk çiftleri. Bu, eksiksiz bir erişilebilirlik denetimi değildir; iç içe yüzeyler ve diğer durumlar ayrıca incelenmelidir.",
    reviewWarnings: (count) => `${count} kontrast uyarısını incele`,
    reviewPairs: "Kontrol edilen çiftleri incele",
    pairResults: "Kontrast çifti sonuçları",
    pass: "Geçti",
    belowTarget: "Hedefin altında",
    required: "gerekli",
    on: "üzerinde",
    auditPhrases: [
      [/ on global background/g, " genel arka plan üzerinde"],
      [/ on interior surface/g, " iç yüzey üzerinde"],
      [/ on global surface/g, " genel yüzey üzerinde"],
      [/ on resolved background/g, " hesaplanan arka plan üzerinde"],
      [/ on badge background/g, " badge arka planı üzerinde"],
      [/ on track/g, " iz üzerinde"],
      [/ on fill/g, " dolgu üzerinde"],
      [/ on background/g, " background üzerinde"],
      [/ on muted/g, " muted üzerinde"],
      [/ \(normal\/hover\/active\/invalid\/focus\)/g, " (normal/hover/active/invalid/focus)"],
      [/ \(including invalid\/focus\)/g, " (invalid/focus dâhil)"],
      [/ \(also indeterminate\)/g, " (indeterminate dâhil)"],
      [/ \(all states\)/g, " (tüm durumlar)"],
      [/ offset focus ring/g, " dış odak halkası"],
      [/ enabled unchecked boundary/g, " etkin, işaretlenmemiş sınırı"],
      [/ invalid unchecked border/g, " geçersiz, işaretlenmemiş kenarlığı"],
      [/ invalid checked border/g, " geçersiz, işaretli kenarlığı"],
      [/ enabled unchecked thumb/g, " etkin, kapalı düğmesi"],
      [/ checked thumb/g, " açık düğmesi"],
      [/ checked mark/g, " işaretli imi"],
      [/ checked border/g, " işaretli kenarlığı"],
      [/ normal\/read-only border/g, " normal/salt okunur kenarlığı"],
      [/ invalid border/g, " geçersiz kenarlığı"],
      [/ outlined\/elevated/g, " outlined/elevated"],
      [/ Read-only /g, "Salt okunur "],
      [/Filled /g, "Dolgulu "],
      [/Global /g, "Genel "],
      [/Primary link/g, "Primary bağlantısı"],
      [/ resolved text/g, " hesaplanan metni"],
      [/ global text/g, " genel metni"],
      [/ solid text/g, " solid metni"],
      [/ subtle text/g, " subtle metni"],
      [/ outline text/g, " outline metni"],
      [/ hover\/active border/g, " hover/active kenarlığı"],
      [/ placeholder/g, " yer tutucusu"],
      [/ description/g, " açıklaması"],
      [/ boundary/g, " sınırı"],
      [/ border/g, " kenarlığı"],
      [/ label/g, " etiketi"],
      [/ error/g, " hata mesajı"],
      [/ text/g, " metni"],
      [/ on /g, " üzerinde "],
    ],
    modes: { light: "Açık", dark: "Koyu" },
    states: { solid: "Düz", hover: "Üzerine gelme", active: "Etkin", subtle: "Hafif" },
  },
} satisfies Record<Locale, Copy>;
