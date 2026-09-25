import type { Locale } from "./locale";
import type { ComponentId } from "./tokens";
import type { PaletteMode } from "./color-engine";

type PreviewCopy = {
  components: Record<ComponentId, { name: string; description: string }>;
  modes: Record<PaletteMode, string>;
  tones: Record<"neutral" | "primary" | "success" | "warning" | "danger" | "info", string>;
  demo: { getStarted: string; allSet: string; completed: (count: number) => string };
  button: {
    secondary: string; ghost: string; outline: string; delete: string; learnMore: string;
    small: string; medium: string; large: string; addItem: string; download: string;
    saving: string; disabled: string;
  };
  input: {
    email: string; receipts: string; search: string; searchPlaceholder: string;
    url: string; urlError: string; readOnlyEmail: string; unavailable: string;
  };
  card: {
    make: string; makeDescription: string; explore: string; exploreDescription: string;
    start: string; later: string; filled: string; filledDescription: string;
  };
  badge: { published: string; draft: string; live: string };
  switch: { notifications: string; focus: string; autoSave: string; autoSaveDescription: string; compact: string };
  checkbox: { details: string; loop: string; selectAll: string; terms: string; termsError: string; smallPrint: string };
  workspace: {
    inContext: string; hint: string; settings: string; subtitle: string; plan: string;
    name: string; emailNotifications: string; weeklySummary: string; cardTitle: string;
    cardDescription: string; connected: string; saved: (count: number) => string;
    prompt: string; changesSaved: string; saveChanges: string;
  };
  showcase: { preview: (name: string) => string; liveStates: string };
  theme: { preview: (mode: string) => string; theme: (mode: string, editing: boolean) => string; edit: (mode: string) => string };
  heading: {
    systemEyebrow: (mode: string) => string; contextEyebrow: (mode: string) => string;
    overview: string; overviewIntro: string; livePreview: string; spotlight: string;
    scenario: string; scenarioIntro: (mode: string) => string;
  };
};

export const previewCopy = {
  en: {
    components: {
      button: { name: "Button", description: "A little nudge to take the next step." },
      input: { name: "Input", description: "Make room for a good idea." },
      card: { name: "Card", description: "A home for things that belong together." },
      badge: { name: "Badge", description: "Small details. Just enough context." },
      switch: { name: "Switch", description: "A simple choice, on or off." },
      checkbox: { name: "Checkbox", description: "Keep the important things in check." },
    },
    modes: { light: "Light", dark: "Dark" },
    tones: { neutral: "Neutral", primary: "Primary", success: "Success", warning: "Warning", danger: "Danger", info: "Info" },
    demo: { getStarted: "Get started", allSet: "All set", completed: (count) => `Demo action completed successfully (${count}).` },
    button: { secondary: "Secondary", ghost: "Ghost", outline: "Outline", delete: "Delete", learnMore: "Learn more", small: "Small", medium: "Medium", large: "Large", addItem: "Add item", download: "Download", saving: "Saving", disabled: "Disabled" },
    input: { email: "Email address", receipts: "We only use it for receipts.", search: "Search", searchPlaceholder: "Search components…", url: "Workspace URL", urlError: "Enter a full URL, including https://", readOnlyEmail: "Read-only workspace email", unavailable: "Unavailable" },
    card: { make: "Make something great", makeDescription: "Good design starts with a few thoughtful details.", explore: "Space to explore", exploreDescription: "Your next idea starts right here.", start: "Start", later: "Later", filled: "Filled, small", filledDescription: "A quieter surface for secondary content." },
    badge: { published: "Published", draft: "Draft", live: "Live" },
    switch: { notifications: "Notifications", focus: "Focus mode", autoSave: "Auto-save", autoSaveDescription: "Saves every change as you go.", compact: "Compact rows" },
    checkbox: { details: "Include the details", loop: "Keep me in the loop", selectAll: "Select all", terms: "I accept the terms", termsError: "Please accept the terms to continue.", smallPrint: "Small print" },
    workspace: { inContext: "IN CONTEXT", hint: "The little things, together", settings: "Workspace settings", subtitle: "A small space for your next big thing.", plan: "Pro plan", name: "Workspace name", emailNotifications: "Email notifications", weeklySummary: "Send me a weekly summary", cardTitle: "A little more you.", cardDescription: "Your colors, your rhythm. One system that makes every detail feel at home.", connected: "All connected", saved: (count) => `Saved locally in this preview · ${count}`, prompt: "Make it yours. Try a few changes.", changesSaved: "Changes saved", saveChanges: "Save changes" },
    showcase: { preview: (name) => `${name} preview`, liveStates: "Live states · Try the controls to see how they feel." },
    theme: { preview: (mode) => `${mode} preview`, theme: (mode, editing) => `${mode} theme${editing ? " · editing" : ""}`, edit: (mode) => `Edit ${mode} theme` },
    heading: { systemEyebrow: (mode) => `${mode.toUpperCase()} · YOUR SYSTEM, IN ACTION`, contextEyebrow: (mode) => `${mode.toUpperCase()} · YOUR SYSTEM, IN CONTEXT`, overview: "Small pieces. Endless possibilities.", overviewIntro: "A living collection, shaped by your design decisions.", livePreview: "Live preview", spotlight: "COMPONENT SPOTLIGHT", scenario: "One system. A real workspace.", scenarioIntro: (mode) => `All six components share this theme. Changes in the inspector affect the ${mode} theme only.` },
  },
  tr: {
    components: {
      button: { name: "Düğme", description: "Bir sonraki adım için küçük bir teşvik." },
      input: { name: "Giriş alanı", description: "Güzel bir fikre yer açın." },
      card: { name: "Kart", description: "Bir arada olması gerekenlere bir yuva." },
      badge: { name: "Rozet", description: "Küçük ayrıntılar. Tam gerektiği kadar bağlam." },
      switch: { name: "Anahtar", description: "Basit bir seçim: açık ya da kapalı." },
      checkbox: { name: "Onay kutusu", description: "Önemli şeyleri gözden kaçırmayın." },
    },
    modes: { light: "Açık", dark: "Koyu" },
    tones: { neutral: "Nötr", primary: "Birincil", success: "Başarı", warning: "Uyarı", danger: "Tehlike", info: "Bilgi" },
    demo: { getStarted: "Başlayın", allSet: "Tamamdır", completed: (count) => `Örnek işlem başarıyla tamamlandı (${new Intl.NumberFormat("tr-TR").format(count)}).` },
    button: { secondary: "İkincil", ghost: "Şeffaf", outline: "Çerçeveli", delete: "Sil", learnMore: "Daha fazla bilgi", small: "Küçük", medium: "Orta", large: "Büyük", addItem: "Öğe ekle", download: "İndir", saving: "Kaydediliyor", disabled: "Devre dışı" },
    input: { email: "E-posta adresi", receipts: "Yalnızca makbuzlar için kullanıyoruz.", search: "Ara", searchPlaceholder: "Bileşenleri ara…", url: "Çalışma alanı URL'si", urlError: "https:// dahil tam bir URL girin", readOnlyEmail: "Salt okunur çalışma alanı e-postası", unavailable: "Kullanılamıyor" },
    card: { make: "Harika bir şey yaratın", makeDescription: "İyi tasarım birkaç özenli ayrıntıyla başlar.", explore: "Keşfetmek için alan", exploreDescription: "Bir sonraki fikriniz tam burada başlıyor.", start: "Başla", later: "Sonra", filled: "Dolgulu, küçük", filledDescription: "İkincil içerik için daha sakin bir yüzey." },
    badge: { published: "Yayında", draft: "Taslak", live: "Canlı" },
    switch: { notifications: "Bildirimler", focus: "Odak modu", autoSave: "Otomatik kaydet", autoSaveDescription: "Yaptığınız her değişikliği kaydeder.", compact: "Sıkı satırlar" },
    checkbox: { details: "Ayrıntıları ekle", loop: "Beni haberdar et", selectAll: "Tümünü seç", terms: "Koşulları kabul ediyorum", termsError: "Devam etmek için koşulları kabul edin.", smallPrint: "Küçük yazı" },
    workspace: { inContext: "BAĞLAM İÇİNDE", hint: "Küçük ayrıntılar bir arada", settings: "Çalışma alanı ayarları", subtitle: "Bir sonraki büyük fikriniz için küçük bir alan.", plan: "Pro paketi", name: "Çalışma alanı adı", emailNotifications: "E-posta bildirimleri", weeklySummary: "Bana haftalık özet gönder", cardTitle: "Biraz daha siz.", cardDescription: "Renkleriniz, ritminiz. Her ayrıntıyı bir bütünün parçası gibi hissettiren tek bir sistem.", connected: "Her şey bağlı", saved: (count) => `Bu önizlemede yerel olarak kaydedildi · ${new Intl.NumberFormat("tr-TR").format(count)}`, prompt: "Kendinize göre uyarlayın. Birkaç değişiklik deneyin.", changesSaved: "Değişiklikler kaydedildi", saveChanges: "Değişiklikleri kaydet" },
    showcase: { preview: (name) => `${name} önizlemesi`, liveStates: "Canlı durumlar · Nasıl hissettirdiklerini görmek için kontrolleri deneyin." },
    theme: { preview: (mode) => `${mode} tema önizlemesi`, theme: (mode, editing) => `${mode} tema${editing ? " · düzenleniyor" : ""}`, edit: (mode) => `${mode} temayı düzenle` },
    heading: { systemEyebrow: (mode) => `${mode.toLocaleUpperCase("tr")} · SİSTEMİNİZ İŞ BAŞINDA`, contextEyebrow: (mode) => `${mode.toLocaleUpperCase("tr")} · SİSTEMİNİZ BAĞLAM İÇİNDE`, overview: "Küçük parçalar. Sonsuz olasılıklar.", overviewIntro: "Tasarım kararlarınızla şekillenen canlı bir koleksiyon.", livePreview: "Canlı önizleme", spotlight: "BİLEŞEN ODAKTA", scenario: "Tek sistem. Gerçek bir çalışma alanı.", scenarioIntro: (mode) => `Altı bileşenin tümü bu temayı paylaşır. Denetçideki değişiklikler yalnızca ${mode.toLocaleLowerCase("tr")} temayı etkiler.` },
  },
} satisfies Record<Locale, PreviewCopy>;

export type { PreviewCopy };
