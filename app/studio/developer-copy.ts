import type { Locale } from "./locale";
import type { ComponentId } from "./tokens";
import type { PaletteMode } from "./color-engine";

const englishNotes = {
  size: "Shared size scale; density for Card.",
  content: "Component content.",
  className: "Applied to the root; the field wrapper for labelled controls.",
  icons: "Content before / after the label or value.",
  label: "Visible accessible label.",
  hideLabel: "Visually hides the label, retaining its accessible name.",
  description: "Linked helper / error text. A truthy error marks the field invalid.",
  states: "Disable interaction / prevent changes / require a value.",
  name: "Form submission name.",
  labelPosition: "Side of the control on which the label appears.",
  checked: "Controlled / initial uncontrolled checked state.",
  onCheckedChange: "Receives the next checked state and event details.",
  value: "Form submission value, not the checked state.",
  hierarchy: "Visual hierarchy.",
  disabled: "Blocks activation.",
  loading: "Blocks activation, keeps focus, sets aria-busy and replaces the start icon with a spinner.",
  fullWidth: "Stretches to container width.",
  iconOnly: "Square icon control; requires aria-label when true. Hides endIcon.",
  render: "Base UI element composition.",
  inputType: "Native input type.",
  placeholder: "Hint, not a replacement for label.",
  inputValue: "Controlled / initial uncontrolled value.",
  onValueChange: "Receives the next value and event details.",
  indeterminate: "Displays a mixed-state indicator.",
  fill: "Fill style.",
  tone: "Semantic color role.",
  dot: "Decorative leading status dot; provide meaningful text.",
  startIcon: "Leading icon content.",
  surface: "Surface treatment.",
} as const;

export type NoteKey = keyof typeof englishNotes;

type DeveloperCopy = {
  notes: Record<NoteKey, string>;
  componentNotes: Record<ComponentId, string>;
  developerReference: string;
  systemTokens: string;
  componentIntro: string;
  overviewIntro: string;
  system: string;
  theme: string;
  modeName: Record<PaletteMode, string>;
  source: string;
  reactUsage: string;
  copyReactCode: string;
  reactDescription: string;
  copying: string;
  copied: string;
  copyError: string;
  propsAndDefaults: string;
  propsDescription: string;
  propReference: string;
  prop: string;
  type: string;
  default: string;
  behavior: string;
  required: string;
  baseUIDefaults: string;
  baseUIDefault: string;
  tokenInheritance: string;
  globalTokenReference: string;
  componentTokensDescription: string;
  globalTokensDescription: string;
  baseTokenAliases: string;
  globalCSSVariables: string;
  aliasCSSName: string;
  cssName: string;
  sourceColumn: string;
  resolvedValue: string;
  inherited: string;
  componentOverride: string;
  globalValue: string;
  derivedColors: string;
  derivedDescription: (mode: PaletteMode) => string;
  derivedThemeVariables: string;
  runtimeVariables: string;
  cssVariable: string;
  valueColumn: string;
  cssVariableExport: string;
  exportBeforeCode: string;
  exportAfterCode: string;
  showFullSystem: string;
  fullSystemExport: string;
  usageRegion: (name: string) => string;
  propsRegion: (name: string) => string;
  tokensRegion: (name: string) => string;
};

export const developerCopy = {
  en: {
    notes: englishNotes,
    componentNotes: {
      button: "Also accepts Base UI Button props and native button attributes. An icon-only button must have an aria-label. No tone prop is defined.",
      input: "Also accepts Base UI Input props except its className, size and type, which the wrapper replaces. Icons are decorative. No variant or tone prop is defined.",
      switch: "Also accepts Base UI Switch.Root props except className and children. The wrapper supplies the thumb and label; use label rather than children. No variant or tone prop is defined.",
      checkbox: "Also accepts Base UI Checkbox.Root props except className and children. The wrapper supplies the indicator and label; use label rather than children. No variant or tone prop is defined.",
      badge: "Also accepts native span props. Badge has no endIcon, loading or disabled behavior.",
      card: "Also accepts native article props. Compose Card.Icon (span), Card.Header (div), Card.Title (strong, not a heading), Card.Description (p), Card.Content (div) and Card.Footer (div). Each part accepts its native element props. No tone prop is defined.",
    },
    developerReference: "Developer reference",
    systemTokens: "System tokens",
    componentIntro: "React usage, component props and live token inheritance.",
    overviewIntro: "Select a component in the studio to see its React usage and API reference.",
    system: "System",
    theme: "theme",
    modeName: { light: "light", dark: "dark" },
    source: "source",
    reactUsage: "React usage",
    copyReactCode: "Copy React code",
    reactDescription: "Examples from snippets.ts. Imports refer to this project; this is not a published component package.",
    copying: "Copying React code…",
    copied: "React code copied to clipboard.",
    copyError: "Could not copy React code. Select and copy the code below manually.",
    propsAndDefaults: "Props and defaults",
    propsDescription: "Wrapper API from the component sources and docs/component-api.md. A dash means no wrapper default; inherited Base UI defaults are identified separately.",
    propReference: "prop reference",
    prop: "Prop",
    type: "Type",
    default: "Default",
    behavior: "Behavior",
    required: "Required",
    baseUIDefaults: "Base UI defaults",
    baseUIDefault: "Base UI default",
    tokenInheritance: "Token inheritance",
    globalTokenReference: "Global token reference",
    componentTokensDescription: "Live base aliases for this component. Overrides replace inheritance, even when equal to the global value. Variants, tones, sizes and states may use additional tokens; these are not computed element styles.",
    globalTokensDescription: "Current global CSS variables. Numeric token values are exported in pixels.",
    baseTokenAliases: "base token aliases",
    globalCSSVariables: "Global CSS variables",
    aliasCSSName: "Alias CSS name",
    cssName: "CSS name",
    sourceColumn: "Source",
    resolvedValue: "Resolved value",
    inherited: "Inherited",
    componentOverride: "Component override",
    globalValue: "Global value",
    derivedColors: "Derived colors and system constants",
    derivedDescription: (mode) => `Computed from the ${mode === "light" ? "light" : "dark"} theme’s current values; these are not manual component overrides.`,
    derivedThemeVariables: "Derived theme variables",
    runtimeVariables: "runtime variables",
    cssVariable: "CSS variable",
    valueColumn: "Value",
    cssVariableExport: "CSS variable export",
    exportBeforeCode: "Both themes, including aliases, derived state colors and system constants. Light is the root default; set ",
    exportAfterCode: " on your theme container for dark mode. Component markup and style rules are not included.",
    showFullSystem: "Show full-system CSS variables",
    fullSystemExport: "Full-system CSS variable export",
    usageRegion: (name) => `${name} React usage`,
    propsRegion: (name) => `${name} props and defaults`,
    tokensRegion: (name) => `${name} token inheritance`,
  },
  tr: {
    notes: {
      size: "Ortak boyut ölçeği; Card için yoğunluğu belirler.",
      content: "Bileşen içeriği.",
      className: "Kök öğeye; etiketli kontrollerde alan kapsayıcısına uygulanır.",
      icons: "Etiketin veya değerin öncesindeki / sonrasındaki içerik.",
      label: "Görünür, erişilebilir etiket.",
      hideLabel: "Erişilebilir adı koruyarak etiketi görsel olarak gizler.",
      description: "İlişkilendirilmiş yardımcı / hata metni. Dolu bir error değeri alanı geçersiz olarak işaretler.",
      states: "Etkileşimi devre dışı bırakır / değişiklikleri önler / değer girilmesini zorunlu kılar.",
      name: "Form gönderiminde kullanılan ad.",
      labelPosition: "Etiketin kontrolün hangi tarafında görüneceği.",
      checked: "Kontrollü / başlangıçtaki kontrolsüz işaretli durumu.",
      onCheckedChange: "Yeni işaretli durumu ve olay ayrıntılarını alır.",
      value: "İşaretli durum değil, form gönderimindeki değer.",
      hierarchy: "Görsel hiyerarşi.",
      disabled: "Etkinleştirmeyi engeller.",
      loading: "Etkinleştirmeyi engeller, odağı korur, aria-busy ayarlar ve başlangıç simgesini yükleme göstergesiyle değiştirir.",
      fullWidth: "Kapsayıcının genişliğini doldurur.",
      iconOnly: "Kare simge kontrolü; true olduğunda aria-label gerektirir. endIcon öğesini gizler.",
      render: "Base UI öğe bileşimi.",
      inputType: "Yerel giriş türü.",
      placeholder: "İpucu; etiketin yerini tutmaz.",
      inputValue: "Kontrollü / başlangıçtaki kontrolsüz değer.",
      onValueChange: "Yeni değeri ve olay ayrıntılarını alır.",
      indeterminate: "Karma durum göstergesi görüntüler.",
      fill: "Dolgu biçimi.",
      tone: "Anlamsal renk rolü.",
      dot: "Dekoratif durum noktası; anlamlı bir metin sağlayın.",
      startIcon: "Baştaki simge içeriği.",
      surface: "Yüzey görünümü.",
    },
    componentNotes: {
      button: "Base UI Button prop'larını ve yerel button özniteliklerini de kabul eder. Yalnızca simge içeren bir button için aria-label gerekir. tone prop'u tanımlı değildir.",
      input: "Kapsayıcının değiştirdiği className, size ve type dışında Base UI Input prop'larını da kabul eder. Simgeler dekoratiftir. variant veya tone prop'u tanımlı değildir.",
      switch: "className ve children dışında Base UI Switch.Root prop'larını da kabul eder. Kapsayıcı, düğmeyi ve etiketi sağlar; children yerine label kullanın. variant veya tone prop'u tanımlı değildir.",
      checkbox: "className ve children dışında Base UI Checkbox.Root prop'larını da kabul eder. Kapsayıcı, göstergeyi ve etiketi sağlar; children yerine label kullanın. variant veya tone prop'u tanımlı değildir.",
      badge: "Yerel span prop'larını da kabul eder. Badge için endIcon, loading veya disabled davranışı yoktur.",
      card: "Yerel article prop'larını da kabul eder. Card.Icon (span), Card.Header (div), Card.Title (başlık olmayan strong), Card.Description (p), Card.Content (div) ve Card.Footer (div) parçalarını birleştirin. Her parça kendi yerel öğe prop'larını kabul eder. tone prop'u tanımlı değildir.",
    },
    developerReference: "Geliştirici başvuru kılavuzu",
    systemTokens: "Sistem tokenları",
    componentIntro: "React kullanımı, bileşen prop'ları ve canlı token kalıtımı.",
    overviewIntro: "React kullanımını ve API başvuru kılavuzunu görmek için stüdyodan bir bileşen seçin.",
    system: "Sistem",
    theme: "tema",
    modeName: { light: "açık", dark: "koyu" },
    source: "kaynak",
    reactUsage: "React kullanımı",
    copyReactCode: "React kodunu kopyala",
    reactDescription: "snippets.ts dosyasından örnekler. İçe aktarımlar bu projeye aittir; bu yayımlanmış bir bileşen paketi değildir.",
    copying: "React kodu kopyalanıyor…",
    copied: "React kodu panoya kopyalandı.",
    copyError: "React kodu kopyalanamadı. Aşağıdaki kodu seçip elle kopyalayın.",
    propsAndDefaults: "Prop'lar ve varsayılanlar",
    propsDescription: "Bileşen kaynakları ve docs/component-api.md dosyasındaki kapsayıcı API'si. Tire, kapsayıcıda varsayılan değer olmadığını gösterir; Base UI'dan devralınan varsayılanlar ayrı belirtilir.",
    propReference: "prop başvuru kılavuzu",
    prop: "Prop",
    type: "Tür",
    default: "Varsayılan",
    behavior: "Davranış",
    required: "Zorunlu",
    baseUIDefaults: "Base UI varsayılanları",
    baseUIDefault: "Base UI varsayılanı",
    tokenInheritance: "Token kalıtımı",
    globalTokenReference: "Genel token başvuru kılavuzu",
    componentTokensDescription: "Bu bileşenin canlı temel takma adları. Geçersiz kılmalar, genel değere eşit olsalar bile kalıtımın yerini alır. Varyantlar, tonlar, boyutlar ve durumlar ek tokenlar kullanabilir; bunlar hesaplanmış öğe stilleri değildir.",
    globalTokensDescription: "Geçerli genel CSS değişkenleri. Sayısal token değerleri piksel cinsinden dışa aktarılır.",
    baseTokenAliases: "temel token takma adları",
    globalCSSVariables: "Genel CSS değişkenleri",
    aliasCSSName: "Takma ad CSS adı",
    cssName: "CSS adı",
    sourceColumn: "Kaynak",
    resolvedValue: "Çözümlenmiş değer",
    inherited: "Devralındı",
    componentOverride: "Bileşen geçersiz kılması",
    globalValue: "Genel değer",
    derivedColors: "Türetilmiş renkler ve sistem sabitleri",
    derivedDescription: (mode) => `${mode === "light" ? "açık" : "koyu"} temasının geçerli değerlerinden hesaplanır; bunlar elle yapılan bileşen geçersiz kılmaları değildir.`,
    derivedThemeVariables: "Türetilmiş tema değişkenleri",
    runtimeVariables: "çalışma zamanı değişkenleri",
    cssVariable: "CSS değişkeni",
    valueColumn: "Değer",
    cssVariableExport: "CSS değişkenlerini dışa aktar",
    exportBeforeCode: "Takma adlar, türetilmiş durum renkleri ve sistem sabitleriyle birlikte her iki tema. Kök öğede varsayılan tema açıktır; koyu mod için tema kapsayıcısına ",
    exportAfterCode: " atayın. Bileşen işaretlemesi ve stil kuralları dahil değildir.",
    showFullSystem: "Sistemin tüm CSS değişkenlerini göster",
    fullSystemExport: "Sistemin tüm CSS değişkenlerinin dışa aktarımı",
    usageRegion: (name) => `${name} React kullanımı`,
    propsRegion: (name) => `${name} prop'ları ve varsayılanları`,
    tokensRegion: (name) => `${name} token kalıtımı`,
  },
} satisfies Record<Locale, DeveloperCopy>;
