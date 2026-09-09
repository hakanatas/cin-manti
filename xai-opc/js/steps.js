import { Ink, axes, plot, dot, title } from './clinic.js';

/**
 * XAI-OPC, bölüm bölüm.
 *
 * Buradaki bütün sayılar projenin düzeltilmiş nihai raporundan alınmıştır;
 * hiçbiri yaklaşık değildir. Kaynak tablo numaraları yorumlarda yazılıdır.
 */

// --- renkler ---------------------------------------------------------------
const SAFE = '#5b7c99'; // sağkalım
const RISK = '#c4623d'; // vefat
const MUTE = '#b6a695';
const GOOD = '#3f8a5b';
const WARN = '#d99a2b';
const DARK = '#3b2f27';

// --- rapordan gelen sayılar ------------------------------------------------
const N = 606;
const DEAD = 259; // %42.7
const ALIVE = N - DEAD; // 347
const TEST = { n: 122, alive: 70, dead: 52 };

// Tablo 3 — karar eşiğinin bu test setindeki etkisi
const TH = [
  { t: 0.2, sens: 0.962, spec: 0.414, acc: 0.648, f1: 0.699, fn: 2, fp: 41 },
  { t: 0.25, sens: 0.942, spec: 0.457, acc: 0.664, f1: 0.705, fn: 3, fp: 38 },
  { t: 0.3, sens: 0.923, spec: 0.543, acc: 0.705, f1: 0.727, fn: 4, fp: 32 },
  { t: 0.35, sens: 0.885, spec: 0.629, acc: 0.738, f1: 0.742, fn: 6, fp: 26 },
  { t: 0.4, sens: 0.731, spec: 0.714, acc: 0.721, f1: 0.691, fn: 14, fp: 20 },
  { t: 0.45, sens: 0.635, spec: 0.743, acc: 0.697, f1: 0.641, fn: 19, fp: 18 },
  { t: 0.5, sens: 0.635, spec: 0.786, acc: 0.721, f1: 0.66, fn: 19, fp: 15 },
  { t: 0.55, sens: 0.558, spec: 0.8, acc: 0.697, f1: 0.611, fn: 23, fp: 14 },
  { t: 0.6, sens: 0.519, spec: 0.814, acc: 0.689, f1: 0.587, fn: 25, fp: 13 },
  { t: 0.65, sens: 0.404, spec: 0.829, acc: 0.648, f1: 0.494, fn: 31, fp: 12 },
  { t: 0.7, sens: 0.346, spec: 0.871, acc: 0.648, f1: 0.456, fn: 34, fp: 9 },
  { t: 0.75, sens: 0.25, spec: 0.929, acc: 0.639, f1: 0.371, fn: 39, fp: 5 },
  { t: 0.8, sens: 0.231, spec: 0.957, acc: 0.648, f1: 0.358, fn: 40, fp: 3 },
];

// Tablo 4 — eşik taraması, 30 bağımsız bölünmenin ortalaması
const TH30 = [
  { t: 0.3, f1: 0.6802, sd: 0.037, sens: 0.887, spec: 0.531, miss: 5.9, alarm: 32.8 },
  { t: 0.35, f1: 0.7054, sd: 0.035, sens: 0.849, spec: 0.6, miss: 7.9, alarm: 28.0 },
  { t: 0.4, f1: 0.7223, sd: 0.039, sens: 0.81, spec: 0.658, miss: 9.9, alarm: 23.9 },
  { t: 0.45, f1: 0.7344, sd: 0.036, sens: 0.772, spec: 0.71, miss: 11.9, alarm: 20.3 },
  { t: 0.5, f1: 0.7332, sd: 0.039, sens: 0.714, spec: 0.756, miss: 14.9, alarm: 17.1 },
  { t: 0.55, f1: 0.7276, sd: 0.037, sens: 0.651, spec: 0.801, miss: 18.1, alarm: 13.9 },
  { t: 0.6, f1: 0.715, sd: 0.037, sens: 0.578, spec: 0.846, miss: 21.9, alarm: 10.8 },
  { t: 0.65, f1: 0.692, sd: 0.041, sens: 0.504, spec: 0.878, miss: 25.8, alarm: 8.6 },
];

// Tablo 1 — model karşılaştırması (aynı test seti, eşik 0.50)
const MODELS = [
  { name: 'Hep "yaşar" diyen', acc: 57.38, f1d: 0.0, auc: 0.5, cv: null, base: true },
  { name: 'Yalnızca evre', acc: 57.38, f1d: 0.0, auc: 0.47, cv: null, base: true },
  { name: 'Naive Bayes', acc: 67.21, f1d: 0.636, auc: 0.756, cv: '70.38 ± 3.7' },
  { name: 'KNN', acc: 68.03, f1d: 0.581, auc: 0.739, cv: '69.82 ± 3.5' },
  { name: 'Gradient Boosting', acc: 68.85, f1d: 0.635, auc: 0.733, cv: '71.60 ± 3.9' },
  { name: 'Random Forest', acc: 69.67, f1d: 0.641, auc: 0.787, cv: '73.22 ± 3.2' },
  { name: 'SVM', acc: 70.49, f1d: 0.654, auc: 0.775, cv: '70.84 ± 3.4' },
  { name: 'Topluluk', acc: 72.13, f1d: 0.66, auc: 0.784, cv: '73.28 ± 3.4', ours: true },
];

// Tablo 14 — SHAP ağırlıkları (13 değişkenin tamamı)
const SHAP = [
  { k: 'Age', tr: 'Yaş', v: 0.08865, up: true },
  { k: 'Smoking', tr: 'Sigara yükü', v: 0.06541, up: true },
  { k: 'Chemotherapy', tr: 'Kemoterapi', v: 0.06187, up: false },
  { k: 'Drinking_Hx', tr: 'Alkol geçmişi', v: 0.06153, up: false },
  { k: 'Tumor_Size', tr: 'T evresi', v: 0.06059, up: true },
  { k: 'Lymph_N', tr: 'Lenf nodu', v: 0.02833, up: true },
  { k: 'Smoking_Hx', tr: 'Sigara geçmişi', v: 0.01993, up: false },
  { k: 'Subsite', tr: 'Tümör yeri', v: 0.01757, up: true },
  { k: 'Dose', tr: 'RT dozu', v: 0.01635, up: false },
  { k: 'Stage', tr: 'TNM evresi', v: 0.01111, up: true },
  { k: 'Number_F', tr: 'Fraksiyon', v: 0.00797, up: true },
  { k: 'RT_Tech', tr: 'RT tekniği', v: 0.00426, up: false },
  { k: 'Sex', tr: 'Cinsiyet', v: 0.00402, up: false },
];

// Tablo 12 — kat-dışı risk gruplarının Kaplan-Meier tahminleri
const KM = [
  { name: 'Düşük risk', n: 202, y2: 0.97, y5: 0.913, median: null, color: SAFE },
  { name: 'Orta risk', n: 202, y2: 0.819, y5: 0.673, median: 10.5, color: WARN },
  { name: 'Yüksek risk', n: 202, y2: 0.624, y5: 0.391, median: 2.9, color: RISK },
];

const pct = (v) => `%${(v * 100).toFixed(1).replace('.', ',')}`;
const range = (a, b) => {
  const out = [];
  for (let i = a; i < b; i++) out.push(i);
  return out;
};
const teacher = (html) => `<details class="teacher"><summary>Rapordaki karşılığı</summary>${html}</details>`;

/** Test setini karmaşıklık matrisinin dört kutusuna dizer. */
function layoutMatrix(c, fp, fn) {
  const g = c.clinic;
  const tn = TEST.alive - fp;
  const tp = TEST.dead - fn;
  const alive = range(0, TEST.alive);
  const dead = range(TEST.alive, TEST.n);
  const o = { gap: 0.27, stagger: 0.004 };
  // sol sütun = model "düşük risk" dedi, sağ sütun = "yüksek risk" dedi
  g.grid(alive.slice(0, tn), -1.85, -1.2, 12, { ...o, color: SAFE });
  g.grid(alive.slice(tn), 1.85, -1.2, 8, { ...o, color: SAFE });
  g.grid(dead.slice(tp), -1.85, 1.0, 8, { ...o, color: RISK });
  g.grid(dead.slice(0, tp), 1.85, 1.0, 10, { ...o, color: RISK });
  return { tn, fp, fn, tp };
}

function matrixFrame(c, { tn, fp, fn, tp }, showLabels = true) {
  const g = c.clinic;
  g.zone(-1.85, -1.2, 3.6, 1.9, SAFE, { opacity: 0.1 });
  g.zone(1.85, -1.2, 2.6, 1.9, WARN, { opacity: 0.12 });
  g.zone(-1.85, 1.0, 3.6, 1.9, RISK, { opacity: 0.12 });
  g.zone(1.85, 1.0, 2.6, 1.9, GOOD, { opacity: 0.1 });
  g.label('model: düşük risk', g.p(-1.85, -2.95, 0.12), 'tag--axis');
  g.label('model: yüksek risk', g.p(1.85, -2.95, 0.12), 'tag--axis');
  if (!showLabels) return;
  g.label(`Doğru: ${tn} sağkalım`, g.p(-1.85, -2.1, 0.12), 'tag--measure');
  g.label(`Yanlış alarm: ${fp}`, g.p(1.85, -2.1, 0.12), 'tag--measure');
  g.label(`Gözden kaçan: ${fn}`, g.p(-1.85, 1.95, 0.12), 'tag--measure');
  g.label(`Doğru: ${tp} riskli`, g.p(1.85, 1.95, 0.12), 'tag--measure');
}

export const STEPS = [
  // ---------------------------------------------------------------- 1
  {
    id: 'soru',
    label: 'Soru',
    title: '606 hasta, bir tek soru',
    body: `
      <p>Masadaki her jeton bir hasta. Hepsinde <b>orofaringeal kanser</b> var: boğazın üst kısmında, bademciklerin ve dil kökünün olduğu bölgede çıkan bir kanser. Kayıtlar bir görüntü arşivinden (TCIA) geliyor.</p>
      <p>Soru şu: <b>bu hastanın gidişatı ağır mı olacak?</b> Hekim bunu bilirse takibi sıklaştırır, tedaviyi ona göre planlar. Düğmeye bas, hastaların gerçekte ne olduğunu görelim.</p>
      ${teacher('<p>Veri: TCIA, 606 hasta, yapılandırılmış klinik/evreleme/tedavi verisi. Doku düzeyinde patolojik değişken yok. Olay (vefat) 259 hasta, %42.7 (§2.1, Tablo 10).</p>')}`,
    focus: 'wide',
    say: 'Altı yüz altı hasta. Hangisi için endişelenmeliyiz?',
    mood: 'curious',
    action: 'Gerçeği göster',
    secondary: 'Modeli çalıştır',
    enter(c) {
      c.clinic.clear();
      c.shown = false;
      const all = c.clinic.pile(N, 0, 0.1, 34, { gap: 0.165, stagger: 0.0015 });
      c.clinic.color(all, MUTE);
      c.stats([
        { label: 'Hasta', value: '606' },
        { label: 'Bilgi', value: '13' },
        { label: 'Vefat', value: '259' },
      ]);
    },
    act(c) {
      if (c.shown) return;
      c.shown = true;
      c.clinic.clear();
      c.clinic.grid(range(0, ALIVE), -1.95, 0.1, 17, { gap: 0.2, color: SAFE, stagger: 0.001 });
      c.clinic.grid(range(ALIVE, N), 1.95, 0.1, 15, { gap: 0.2, color: RISK, stagger: 0.001 });
      c.clinic.label('347 hasta yaşıyor', c.clinic.p(-1.95, 2.3, 0.12), 'tag--big');
      c.clinic.label('259 hasta kaybedildi · %42,7', c.clinic.p(1.95, 2.3, 0.12), 'tag--big');
      c.sound.play('drip', { volume: 0.6 });
      c.bidik.react('worried', 1.6);
      c.say('Neredeyse her iki hastadan biri. Bu yüzden erken haber vermek önemli.', 5);
    },
    act2(c) {
      c.clinic.clear();
      c.shown = false;
      const all = range(0, N);
      c.clinic.grid(all.slice(0, 120), -2.4, 0.6, 12, { gap: 0.19, color: MUTE, stagger: 0.001 });
      c.clinic.scale(all.slice(120), 0.001);
      const box = c.clinic.block(0.4, 0.4, 1.9, 1.5, 1.1, DARK);
      c.clinic.label('MODEL', c.clinic.p(0.4, 0.4, 1.35), 'tag--big');
      c.clinic.label('Yüksek risk', c.clinic.p(2.6, 0.4, 0.5), 'tag--measure');
      c.clinic.label('Neden? — cevap yok', c.clinic.p(2.6, 1.15, 0.5), 'tag--axis');
      c.clinic.link(c.clinic.p(-1.3, 0.4, 0.02), c.clinic.p(-0.6, 0.4, 0.02), '#b9a996');
      c.clinic.link(c.clinic.p(1.4, 0.4, 0.02), c.clinic.p(2.1, 0.4, 0.02), '#b9a996');
      c.readout(
        'Sıradan bir model sadece sonucu söyler: <b>yüksek risk</b>. Gerekçesini soramazsınız. Buna <b>kara kutu</b> denir, ve hekimin bir kara kutuya güvenmesi için hiçbir sebebi yoktur.'
      );
      c.sound.play('grab', { volume: 0.6 });
      c.say('İşte bu projenin asıl derdi: kutuyu açmak.', 5);
      void box;
    },
  },

  // ---------------------------------------------------------------- 2
  {
    id: 'veri',
    label: 'Veri',
    title: 'Modele ne verdik, neyi çöpe attık?',
    body: `
      <p>Model, hastadan yalnızca <b>13 bilgi</b> görüyor: yaşı, sigara yükü, tümörün yeri ve evresi, aldığı tedavi… Hepsi bu. Ama asıl öğretici olan, <b>çıkarılan</b> sütunlar.</p>
      <p>Alttaki düğmelere bas: her biri masadan kalkan bir sütunu ve kalkma sebebini gösteriyor.</p>
      ${teacher('<p>13 öznitelik: Age, Sex, Smoking, Smoking_Hx, Drinking_Hx, Subsite, Tumor_Size, Lymph_N, Stage, Chemotherapy, Dose, Number_F, RT_Tech (§2.1). Çıkarılanlar §2.2 ve Ek-A #1, #11, #18.</p>')}`,
    focus: 'top',
    say: 'Bir modeli anlamak için önce ne görmediğini bilmek gerekir.',
    mood: 'curious',
    toggles: [
      { id: 'sabit', label: 'Sabit sütunlar' },
      { id: 'tarih', label: 'Tarihler' },
      { id: 'sizinti', label: 'Takip süresi' },
      { id: 'hpv', label: 'HPV' },
    ],
    enter(c) {
      c.clinic.clear();
      c.clinic.use(N);
      c.clinic.grid(range(0, N), 0, 2.22, 72, { gap: 0.082, color: MUTE, stagger: 0.0004 });
      this.draw(c);
    },
    onToggle(c) {
      this.draw(c);
      const on = Object.keys(c.toggle).filter((k) => c.toggle[k]);
      const texts = {
        sabit: '<b>Ds_Site, Metastasis, Path, Primary_T.</b> Bu dört sütun 606 hastanın hepsinde aynı değeri taşıyor. Sıfır varyans, sıfır bilgi: SHAP katkıları tam olarak 0,00000. Bunlar hastayı tanımlayan değişken değil, çalışmaya kimin alındığını anlatan seçim ölçütü.',
        tarih: '<b>RT_Start, RT_End.</b> Radyoterapinin başlangıç ve bitiş tarihleri. Bir hastanın tedaviye hangi takvim gününde başladığı, hastalığın gidişatı hakkında hiçbir şey söylemez.',
        sizinti:
          '<b>Date_Fu — en sinsi olanı.</b> Takip süresi hedefe yapışık: vefat edenlerde ortalama 1115 gün, yaşayanlarda 2769 gün. Model bunu görürse hastalığı değil çalışmanın izlem düzenini öğrenir ve sahte bir yüksek doğruluk üretir. Üstelik yeni bir hastanın nihai takip süresi tahmin anında zaten bilinemez. Buna <b>veri sızıntısı</b> denir.',
        hpv: '<b>HPV — burada olmayan ama en çok özlenen bilgi.</b> HPV virüsü ilişkili orofaringeal kanserler belirgin biçimde daha iyi seyreder. Bu veri setinde HPV sütunu yok, yani model bunu hiç görmüyor. Çalışmanın en ağır kısıtı bu; arayüzdeki HPV kutusu da bu yüzden kaldırıldı. 11. bölümde başka bir kohortta ölçüyoruz.',
      };
      c.readout(on.length ? on.map((k) => `<p>${texts[k]}</p>`).join('') : '');
      if (on.includes('sizinti')) c.say('Sızıntı yakalamak, doğruluk artırmaktan daha değerlidir.', 5);
    },
    draw(c) {
      c.clinic.clear();
      // modele giren 13 bilgi: ayakta duran bloklar
      SHAP.forEach((f, i) => {
        const x = -3.0 + i * 0.5;
        c.clinic.block(x, -1.5, 0.34, 0.34, 0.55 + (i % 2) * 0.12, SAFE, { delay: i * 0.03 });
      });
      c.clinic.label('modele giren 13 bilgi', c.clinic.p(0, -0.62, 0.12), 'tag--big');
      // masadan kaldırılanlar: yatık, soluk bloklar
      const dropped = [
        { name: 'Ds_Site', tag: 'sabit' },
        { name: 'Metastasis', tag: 'sabit' },
        { name: 'Path', tag: 'sabit' },
        { name: 'Primary_T', tag: 'sabit' },
        { name: 'RT_Start', tag: 'tarih' },
        { name: 'RT_End', tag: 'tarih' },
        { name: 'Date_Fu', tag: 'sizinti' },
        { name: 'HPV durumu', tag: 'hpv' },
      ];
      dropped.forEach((d, i) => {
        const lit = !!c.toggle[d.tag];
        const x = -2.62 + i * 0.75;
        c.clinic.block(x, 0.75, 0.62, 0.42, lit ? 0.62 : 0.1, lit ? RISK : '#a2937f', { delay: i * 0.03 });
        if (lit) c.clinic.label(d.name, c.clinic.p(x, 0.75, 0.85), 'tag--measure');
      });
      c.clinic.label('çıkarılan 8 sütun', c.clinic.p(0, 1.45, 0.12), 'tag--big');
      c.instant();
    },
  },

  // ---------------------------------------------------------------- 3
  {
    id: 'oylama',
    label: 'Oylama',
    title: 'Üç uzman, tek karar',
    body: `
      <p>Tek bir algoritmaya güvenmek yerine üçü birden çalıştırılıyor. Her biri farklı bir mantıkla bakıyor: <b>Random Forest</b> yüzlerce karar ağacının ortalamasını alır, <b>Gradient Boosting</b> kendi hatalarını sırayla düzeltir, <b>SVM</b> iki grubu ayıran sınırı çizmeye çalışır.</p>
      <p>Her biri bir etiket değil, bir <b>olasılık</b> söyler. Kaydırıcılarla oynayıp ortak kararın nasıl çıktığını gör. Random Forest'ın oyu iki kat sayılıyor, çünkü tek başına en iyi ayıran o.</p>
      ${teacher('<p>Soft Voting, ağırlıklar [2, 1, 1] (§2.3). Ağırlıklandırmanın makro F1 etkisi yaklaşık +0.005; tercih performans değil gerekçelendirilebilirlik temelli. Dengesizlik için RF ve SVM\'de class_weight, Gradient Boosting\'de sample_weight.</p>')}`,
    focus: 'desk',
    say: 'Üç görüş, ağırlıklı bir ortalama. Karar tek başına kimsenin değil.',
    mood: 'curious',
    sliders: [
      { id: 'rf', label: 'RF', min: 0, max: 100, value: 72 },
      { id: 'gb', label: 'GB', min: 0, max: 100, value: 48 },
      { id: 'svm', label: 'SVM', min: 0, max: 100, value: 35 },
    ],
    enter(c) {
      c.clinic.use(1);
      c.clinic.grid([0], -2.9, 0.1, 1, { size: 0.34, color: MUTE });
      this.onSlider(c, { rf: 72, gb: 48, svm: 35 });
    },
    onSlider(c, v) {
      c.clinic.clear();
      const vote = (2 * v.rf + v.gb + v.svm) / 4;
      const models = [
        { n: 'Random Forest', w: 2, p: v.rf, color: SAFE, z: -1.35 },
        { n: 'Gradient Boosting', w: 1, p: v.gb, color: WARN, z: 0.1 },
        { n: 'SVM', w: 1, p: v.svm, color: GOOD, z: 1.55 },
      ];
      for (const m of models) {
        c.clinic.block(-1.5, m.z, 1.5, 0.9, 0.5, m.color);
        c.clinic.label(`${m.n} · oy ×${m.w}`, c.clinic.p(-1.5, m.z, 0.75), 'tag--measure');
        c.clinic.bar(0.15, m.z, 0.25 + (m.p / 100) * 1.9, m.color, { w: 0.34, d: 0.34 });
        c.clinic.label(`%${m.p}`, c.clinic.p(0.15, m.z, 0.45 + (m.p / 100) * 1.9), 'tag--measure');
        c.clinic.link(c.clinic.p(-0.72, m.z, 0.02), c.clinic.p(-0.05, m.z, 0.02));
        c.clinic.link(c.clinic.p(0.35, m.z, 0.02), c.clinic.p(2.1, 0.1, 0.02), 'rgba(185,169,150,0.55)', { w: 0.02 });
      }
      const high = vote >= 45;
      c.clinic.bar(2.5, 0.1, 0.3 + (vote / 100) * 2.4, high ? RISK : SAFE, { w: 0.62, d: 0.62 });
      c.clinic.label('ORTAK KARAR', c.clinic.p(2.5, 1.5, 0.12), 'tag--axis');
      c.clinic.label(`%${vote.toFixed(1).replace('.', ',')} · ${high ? 'yüksek risk' : 'düşük risk'}`, c.clinic.p(2.5, 0.1, 0.5 + (vote / 100) * 2.4), 'tag--big');
      c.instant();
      c.readout(
        `<span class="big">(2 × %${v.rf} + %${v.gb} + %${v.svm}) ÷ 4 = %${vote.toFixed(1).replace('.', ',')}</span>` +
          `Eşik %45 olduğu için bu hasta <b class="${high ? 'bad' : 'ok'}">${high ? 'yüksek risk' : 'düşük risk'}</b> grubuna giriyor. Eşiğin neden 45 olduğunu 6. bölümde seçeceğiz.`
      );
      if (high !== c.lastHigh) {
        c.lastHigh = high;
        c.bidik.react(high ? 'worried' : 'joy', 1.4);
      }
    },
  },

  // ---------------------------------------------------------------- 4
  {
    id: 'bolme',
    label: 'Bölme',
    title: 'Sınav için 122 hasta ayırdık',
    body: `
      <p>Bir modeli kendi çalıştığı hastalarla sınamak, öğrenciye çıkmış soruları vermek gibidir. Bu yüzden 606 hastanın <b>%80'i eğitim</b>, <b>%20'si sınav</b> için ayrılıyor: 484 hasta ile öğreniyor, hiç görmediği 122 hasta ile sınanıyor.</p>
      <p>Bir incelik daha var: ayırırken iki grubun oranı korunmalı. Buna <b>tabakalı bölme</b> denir. Düğmeyle kapatıp neye mal olduğunu gör.</p>
      ${teacher('<p>%80/%20, seed 42, stratify=True → test setinde 70 sağkalım / 52 vefat. Tabakalamasız bölünme 76/46 veriyor ve aynı tohumla makro F1\'i 0.703 yerine 0.765 gösteriyordu (Ek-A #3, #7, Ek-B.2).</p>')}`,
    focus: 'wide',
    say: 'Sınav soruları, çalışılan sorulardan başka olmalı.',
    mood: 'curious',
    toggles: [{ id: 'strat', label: 'Tabakalı bölme', on: true }],
    enter(c) {
      c.clinic.clear();
      c.clinic.use(N);
      this.draw(c);
    },
    onToggle(c) {
      this.draw(c);
      c.sound.play('drip', { volume: 0.5 });
      if (!c.toggle.strat) c.say('Yüksek skor modelin değil, o bölünmenin özelliğiydi.', 5);
    },
    draw(c) {
      c.clinic.clear();
      const strat = c.toggle.strat !== false;
      const testAlive = strat ? 70 : 76;
      const testDead = strat ? 52 : 46;
      // eğitim solda, test sağda; renk gerçek sonucu gösterir
      const alive = range(0, ALIVE);
      const dead = range(ALIVE, N);
      c.clinic.grid(alive.slice(testAlive), -2.25, -1.05, 22, { gap: 0.135, color: SAFE, stagger: 0.0006 });
      c.clinic.grid(dead.slice(testDead), -2.25, 1.5, 22, { gap: 0.135, color: RISK, stagger: 0.0006 });
      c.clinic.grid(alive.slice(0, testAlive), 2.3, -1.15, 9, { gap: 0.24, color: SAFE, stagger: 0.003 });
      c.clinic.grid(dead.slice(0, testDead), 2.3, 1.5, 9, { gap: 0.24, color: RISK, stagger: 0.003 });
      c.clinic.zone(-2.25, 0.15, 3.4, 4.6, '#8d7a66', { opacity: 0.07 });
      c.clinic.zone(2.3, 0.15, 2.7, 4.6, RISK, { opacity: 0.07 });
      c.clinic.label('484 hasta · eğitim', c.clinic.p(-2.25, -2.7, 0.12), 'tag--big');
      c.clinic.label('122 hasta · sınav', c.clinic.p(2.3, -2.7, 0.12), 'tag--big');
      c.clinic.label(`${testAlive} sağkalım / ${testDead} vefat`, c.clinic.p(2.3, 2.75, 0.12), 'tag--measure');
      c.instant();
      c.readout(
        strat
          ? 'Tabakalı bölmede sınav setindeki <b>70 / 52</b> oranı, tüm veri setindeki orana benziyor. Sınav, gerçek hasta karışımını temsil ediyor.'
          : 'Tabakalamasız bölmede sınav setine <b>76 / 46</b> düşüyor: kolay grup fazladan temsil ediliyor. Aynı model, aynı tohum, tek fark bu — ve makro F1 <b>0,765</b> görünüyor. Tabakalı bölmede aynı kurulum <b>0,703</b> veriyor. Aradaki fark modelin değil, bölünmenin marifeti.'
      );
      c.stats([
        { label: 'Eğitim', value: '484' },
        { label: 'Sınav', value: '122' },
        { label: 'Makro F1', value: strat ? '0,703' : '0,765' },
      ]);
    },
  },

  // ---------------------------------------------------------------- 5
  {
    id: 'matris',
    label: 'Sonuç',
    title: 'Dört kutu: model neyi tutturdu?',
    body: `
      <p>Sınavdaki 122 hastayı model tahminine göre dört kutuya ayırıyoruz. Solda "düşük risk" dediği, sağda "yüksek risk" dediği hastalar var. Renk gerçeği gösteriyor: <span class="slate">mavi yaşayanlar</span>, <span class="salty">turuncu kaybedilenler</span>.</p>
      <p>İki kutu doğru, iki kutu hatalı. Ama bu iki hata aynı şey değil: <b>gözden kaçan</b> bir riskli hasta ile <b>gereksiz endişelenen</b> bir hasta klinik olarak aynı maliyette değildir.</p>
      ${teacher('<p>Karmaşıklık matrisi, eşik 0.50: 55 / 15 / 19 / 33. Duyarlılık %63.46 [%49.9–%75.2], özgüllük %78.57 [%67.6–%86.6], doğruluk %72.13 [%63.6–%79.3], MCC 0.426 (§3.3).</p>')}`,
    focus: 'top',
    say: 'Dört kutu. Sol alttaki en pahalı olan.',
    mood: 'curious',
    enter(c) {
      c.clinic.clear();
      c.clinic.use(TEST.n);
      const m = layoutMatrix(c, 15, 19);
      matrixFrame(c, m);
      c.stats([
        { label: 'Doğruluk', value: '%72,1' },
        { label: 'Duyarlılık', value: '%63,5' },
        { label: 'Özgüllük', value: '%78,6' },
      ]);
      c.readout(
        '<b>19 riskli hasta gözden kaçtı.</b> Yani gerçekten kaybedilen 52 hastanın yaklaşık üçte biri, model tarafından düşük riskli sayıldı. Buna karşılık 15 hastaya boşuna yüksek risk dendi. Klinikte kaçırmak, boşuna endişelendirmekten daha pahalıdır — bir sonraki bölümde bu dengeyi elimizle ayarlayacağız.'
      );
    },
  },

  // ---------------------------------------------------------------- 6
  {
    id: 'esik',
    label: 'Eşik',
    title: 'Kaçırmakla yanlış alarm arasındaki ayar',
    body: `
      <p>Model aslında bir etiket değil bir sayı üretiyor: "bu hastada risk %58". Onu "yüksek risk" saymak için bir <b>eşik</b> gerekiyor. Eşik bir model ayarı değil, bir <b>klinik tercih</b>.</p>
      <p>Kaydırıcıyı gezdir: eşik düştükçe kaçan hasta azalır, yanlış alarm artar. Bedava öğle yemeği yok.</p>
      ${teacher('<p>Tablo 3 (tek test seti) ve Tablo 4 (30 bağımsız bölünme ortalaması). Seçilen eşik 0.45: makro F1\'i maksimize eden eşik zaten bu (0.7344), ve 0.50\'ye kıyasla test seti başına ortalama 3.0 riskli hastayı daha fazla yakalıyor (§3.4, §3.4.1).</p>')}`,
    focus: 'top',
    say: 'Eşiği kim seçer? Model değil, hekim.',
    mood: 'curious',
    sliders: [{ id: 'th', label: 'Eşik', min: 0, max: 12, value: 6 }],
    secondary: '30 bölünmede tara',
    enter(c) {
      c.clinic.use(TEST.n);
      c.wide = false;
      this.onSlider(c, { th: 6 });
    },
    act2(c) {
      c.wide = !c.wide;
      this.onSlider(c, { th: c.lastTh ?? 6 });
      if (c.wide) c.say('Tek bölünmenin şansına göre karar verilmez. Otuz bölünmenin ortalamasına bakılır.', 6);
    },
    onSlider(c, v) {
      c.lastTh = v.th;
      c.clinic.clear();
      const row = TH[v.th];
      const m = layoutMatrix(c, row.fp, row.fn);
      matrixFrame(c, m, false);
      c.clinic.label(`gözden kaçan: ${row.fn}`, c.clinic.p(-1.85, 1.95, 0.12), 'tag--measure');
      c.clinic.label(`yanlış alarm: ${row.fp}`, c.clinic.p(1.85, -2.1, 0.12), 'tag--measure');
      const wide = c.wide;
      c.clinic.panel(
        0,
        2.95,
        6.4,
        1.45,
        (g, W, H) => {
          title(
            g,
            W,
            wide ? 'Otuz bağımsız bölünmenin ortalaması' : 'Bu tek sınav setinde',
            wide ? 'eşik seçimi buna göre yapıldı' : 'eşik değiştikçe duyarlılık ve özgüllük'
          );
          const src = wide ? TH30 : TH;
          const map = axes(g, W, H, {
            x0: wide ? 0.3 : 0.2,
            x1: wide ? 0.65 : 0.8,
            y0: 0,
            y1: 1,
            pad: 62,
            xTicks: wide ? 7 : 6,
            yTicks: 4,
            fmtX: (x) => x.toFixed(2).replace('.', ','),
            fmtY: (y) => (y * 100).toFixed(0),
          });
          plot(g, src.map((r) => [r.t, r.sens]), map, Ink.risk, { width: 5 });
          plot(g, src.map((r) => [r.t, r.spec]), map, Ink.safe, { width: 5 });
          const cur = wide ? TH30.find((r) => Math.abs(r.t - row.t) < 0.001) : row;
          if (cur) {
            dot(g, cur.t, cur.sens, map, Ink.risk, 11);
            dot(g, cur.t, cur.spec, map, Ink.safe, 11);
          }
          g.font = '600 28px "Instrument Sans", system-ui, sans-serif';
          g.textAlign = 'left';
          g.fillStyle = Ink.risk;
          g.fillText('riskliyi yakalama', W - 400, 52);
          g.fillStyle = Ink.safe;
          g.fillText('boşuna alarm vermeme', W - 400, 90);
        },
        { pixels: 1280 }
      );
      c.instant();
      c.stats([
        { label: 'Eşik', value: row.t.toFixed(2).replace('.', ',') },
        { label: 'Kaçan', value: String(row.fn) },
        { label: 'Yanlış alarm', value: String(row.fp) },
      ]);
      const chosen = Math.abs(row.t - 0.45) < 0.001;
      c.readout(
        `Eşik <b>${row.t.toFixed(2).replace('.', ',')}</b>: riskli hastaların ${pct(row.sens)}'ini yakalıyor, sağlıklı seyredenlerin ${pct(row.spec)}'ini rahat bırakıyor.` +
          (chosen
            ? ' <b>Projenin seçtiği eşik bu.</b> Tek başına bu sette 0,50\'den daha iyi görünmüyor — hatta 3 fazla yanlış alarm veriyor. Seçim 30 bağımsız bölünmenin ortalamasına dayanıyor: orada 0,45, test seti başına ortalama 3,0 riskli hastayı daha fazla yakalıyor.'
            : '')
      );
    },
  },

  // ---------------------------------------------------------------- 7
  {
    id: 'taban',
    label: 'Taban',
    title: 'Doğruluk tek başına yalan söyler',
    body: `
      <p>Hiçbir şey öğrenmeyen bir model düşün: her hastaya "yaşar" desin. Bu tembel model bu sınavda <b>%57,4 doğruluk</b> alır. Kulağa fena gelmiyor, değil mi?</p>
      <p>Ama riskli hastaların <b>hiçbirini</b> yakalayamaz. İşe yaramaz olduğunu doğruluk değil, riskli sınıftaki başarısı gösterir: orada puanı tam <b>sıfır</b>. Düğmeyle ikisini karşılaştır.</p>
      ${teacher('<p>Tablo 1: çoğunluk sınıfı modeli %57.38 doğruluk, vefat sınıfı F1 0.000. Yalnızca TNM evresini kullanan lojistik regresyon da aynı yerde kalıyor. Önerilen model %72.13 ve vefat F1 0.660 (§3.1).</p>')}`,
    focus: 'top',
    say: 'Bir modelin değeri, doğruluğunda değil; kimi yakaladığında.',
    mood: 'curious',
    action: 'Tembel modeli çalıştır',
    secondary: 'Bizim modeli çalıştır',
    enter(c) {
      c.clinic.use(TEST.n);
      this.show(c, false);
    },
    act(c) {
      this.show(c, true);
      c.sound.play('grab', { volume: 0.6 });
      c.bidik.react('surprised', 1.6);
    },
    act2(c) {
      this.show(c, false);
      c.sound.play('yum', { volume: 0.6 });
      c.bidik.react('joy', 1.4);
    },
    show(c, lazy) {
      c.clinic.clear();
      const m = lazy ? layoutMatrix(c, 0, TEST.dead) : layoutMatrix(c, 15, 19);
      matrixFrame(c, m, false);
      c.clinic.label(lazy ? '52 riskli hastanın hepsi burada: hepsi kaçtı' : '19 kaçan', c.clinic.p(-1.85, 1.95, 0.12), 'tag--measure');
      c.stats([
        { label: 'Doğruluk', value: lazy ? '%57,4' : '%72,1' },
        { label: 'Riskli F1', value: lazy ? '0,000' : '0,660' },
        { label: 'ROC-AUC', value: lazy ? '0,500' : '0,784' },
      ]);
      c.readout(
        lazy
          ? '<b>Tembel model:</b> herkese "yaşar" diyor. Sağ taraf bomboş; tek bir riskli hastayı bile işaretlemiyor. Doğruluğu %57,4 — çünkü zaten hastaların çoğunluğu yaşıyor. Bu yüzden dengesiz verilerde doğruluk yanıltıcıdır.'
          : '<b>Bizim model:</b> %72,1 doğruluk, riskli sınıfta 0,660. Tembel modeli 14,8 puan geçiyor; asıl önemlisi riskli hastaların üçte ikisini yakalıyor. Sadece TNM evresine bakan basit bir model de tembel modelin puanında kalıyor: %57,4.'
      );
    },
  },

  // ---------------------------------------------------------------- 8
  {
    id: 'ustunluk',
    label: 'Üstünlük',
    title: 'Peki üçlü takım gerçekten daha mı iyi?',
    body: `
      <p>Projenin ilk sürümü "topluluk modeli belirgin biçimde üstün" diyordu. Denetimde bu cümle sınandı ve <b>düzeltildi</b>.</p>
      <p>Topluluk, Naive Bayes'i, KNN'yi ve SVM'yi geçiyor. Ama tek başına Random Forest ile arasında anlamlı fark yok: 122 hastanın yalnızca <b>6</b>'sında farklı karar veriyorlar. Düğmeye bas, o altı hastayı göster.</p>
      ${teacher('<p>Tablo 2: topluluk vs Random Forest — yalnızca topluluk doğru 5, yalnızca RF doğru 1, McNemar p = 0.22, ROC-AUC farkı -0.003 [-0.023, +0.018]. Katkı performansta değil kararlılıkta (§3.2, §7.2).</p>')}`,
    focus: 'top',
    say: 'İki model neredeyse aynı şeyi söylüyor. Bunu saklamak yerine ölçtük.',
    mood: 'curious',
    action: 'Ayrıldıkları 6 hasta',
    enter(c) {
      c.clinic.clear();
      c.clinic.use(TEST.n);
      c.clinic.grid(range(0, TEST.n), 0, -1.55, 18, { gap: 0.28, color: MUTE, stagger: 0.003 });
      c.clinic.label('sınavdaki 122 hasta', c.clinic.p(0, -2.65, 0.12), 'tag--big');
      this.chart(c);
      c.stats([
        { label: 'McNemar p', value: '0,22' },
        { label: 'AUC farkı', value: '−0,003' },
        { label: 'ÇD sapması', value: '3,4 puan' },
      ]);
    },
    act(c) {
      const win = [7, 24, 61, 88, 103];
      const lose = [45];
      c.clinic.color(range(0, TEST.n), MUTE);
      c.clinic.color(win, GOOD);
      c.clinic.color(lose, RISK);
      c.clinic.hop(win.concat(lose), 0.6);
      c.clinic.label('topluluk bildi, RF şaşırdı: 5', c.clinic.p(-1.75, -0.35, 0.12), 'tag--measure');
      c.clinic.label('RF bildi, topluluk şaşırdı: 1', c.clinic.p(1.8, -0.15, 0.12), 'tag--measure');
      c.sound.play('pick', { volume: 0.6 });
      c.readout(
        'Fark bu kadar: <b>5 hastaya karşı 1</b>. Bu büyüklükteki bir fark istatistiksel olarak gürültüden ayrılamıyor (McNemar p = 0,22), ROC-AUC farkı ise −0,003 ile Random Forest\'ın lehine. ' +
          'Topluluk mimarisi değersiz değil: üç farklı bakışın ortalaması, veri başka türlü bölündüğünde daha az sarsılıyor. Ama bu, performans tablosunda değil <b>kararlılıkta</b> görünen bir kazanç ve rapor artık bunu böyle yazıyor.'
      );
      c.bidik.react('surprised', 1.5);
    },
    chart(c) {
      const rows = MODELS.slice().reverse();
      c.clinic.panel(
        0,
        1.35,
        6.9,
        2.6,
        (g, W, H) => {
          title(g, W, 'Aynı sınavda herkes', 'doğruluk ve riskli sınıftaki başarı');
          const x0 = 470;
          const bw = W - x0 - 330;
          rows.forEach((m, i) => {
            const y = 150 + i * 54;
            g.fillStyle = m.ours ? Ink.ink : Ink.soft;
            g.font = `${m.ours ? 600 : 500} 32px "Instrument Sans", system-ui, sans-serif`;
            g.textAlign = 'right';
            g.fillText(m.name, x0 - 22, y + 11);
            const w = (m.acc / 100) * bw;
            g.fillStyle = m.base ? 'rgba(43,33,27,0.16)' : m.ours ? Ink.risk : 'rgba(91,124,153,0.55)';
            g.beginPath();
            g.roundRect(x0, y - 17, w, 34, 10);
            g.fill();
            g.textAlign = 'left';
            g.fillStyle = Ink.soft;
            g.font = '500 29px "Instrument Sans", system-ui, sans-serif';
            g.fillText(`%${m.acc.toFixed(2).replace('.', ',')} · F1 ${m.f1d.toFixed(3).replace('.', ',')}`, x0 + w + 16, y + 10);
          });
        },
        { pixels: 1440 }
      );
      c.instant();
    },
  },

  // ---------------------------------------------------------------- 9
  {
    id: 'shap',
    label: 'SHAP',
    title: 'Kutuyu açalım: model neye bakıyor?',
    body: `
      <p>İşte projenin adındaki "açıklanabilir" kısmı. <b>SHAP</b> denen yöntem, her hasta için her bilgiyi sırayla saklayıp tahminin ne kadar değiştiğine bakıyor. Bir bilginin tahmini çok oynatması, modelin ona çok bakması demek.</p>
      <p>Çubuklar 13 bilginin ağırlığı. <span class="salty">Turuncu</span> olanlar arttıkça riski artırıyor, <span class="slate">mavi</span> olanlar azaltıyor.</p>
      ${teacher('<p>Model-bağımsız KernelExplainer; toplulukta SVM olduğu için TreeExplainer uygulanamaz (§4). Sıralama Tablo 14. İlk sürümdeki "TreeExplainer" ve "etkileşim değerleri" ifadeleri hatalıydı (Ek-A #13).</p>')}`,
    focus: 'desk',
    say: 'Model kararını gösteremiyorsa, hekimin ona güvenmesi için sebebi yok.',
    mood: 'proud',
    action: 'Tek hastaya bak',
    secondary: 'Genel sıralamaya dön',
    enter(c) {
      c.clinic.clear();
      c.clinic.use(0);
      this.global(c);
    },
    act(c) {
      this.local(c);
    },
    act2(c) {
      this.global(c);
    },
    global(c) {
      c.clinic.clear();
      c.clinic.use(0);
      const max = SHAP[0].v;
      SHAP.forEach((s, i) => {
        const x = -3.0 + i * 0.5;
        const h = 0.12 + (s.v / max) * 2.1;
        c.clinic.bar(x, 0.2, h, s.up ? RISK : SAFE, { w: 0.34, d: 0.9, delay: i * 0.04 });
        // sadece ilk altısını adlandır, üst üste binmesin diye şaşırtmalı yükseklikte
        // ilk üç adı sabit ve birbirinden ayrık yüksekliklere as: üst üste binmesinler
        if (i < 3) c.clinic.label(s.tr, c.clinic.p(x, 0.2, [3.35, 2.72, 2.09][i]), 'tag--measure');
      });
      c.clinic.label('sırayla: yaş, sigara, kemoterapi, alkol, T evresi, lenf nodu…', c.clinic.p(0, 1.5, 0.12), 'tag--axis');
      c.stats([
        { label: '1. sıra', value: 'Yaş' },
        { label: '2. sıra', value: 'Sigara' },
        { label: 'TNM evresi', value: '10. sıra' },
      ]);
      c.readout(
        'İlk sıralar onkoloji beklentisiyle uyumlu: <b>yaş, sigara yükü, tümör evresi, lenf nodu</b>. Ama iki sürpriz var — bir sonraki bölüm tam olarak bunlar hakkında.'
      );
    },
    local(c) {
      c.clinic.clear();
      c.clinic.use(0);
      // Şekil-8: en yüksek riskli hastanın gerekçesi (rapordaki sıra ile)
      const steps = [
        { n: 'Ortalama beklenti', v: 0, base: true },
        { n: 'Sigara yükü yüksek', v: +1 },
        { n: 'Kemoterapi almamış', v: +1 },
        { n: 'İleri yaş', v: +1 },
        { n: 'Alkol öyküsü var', v: +1 },
      ];
      steps.forEach((s, i) => {
        const x = -2.4 + i * 1.2;
        const h = 0.35 + i * 0.42;
        c.clinic.bar(x, 0.3, h, i === 0 ? MUTE : RISK, { w: 0.7, d: 0.9, delay: i * 0.12 });
        c.clinic.label(s.n, c.clinic.p(x, 0.3, h + 0.3), 'tag--measure');
      });
      c.clinic.label('bu hasta için: yüksek risk', c.clinic.p(0.4, 1.85, 0.12), 'tag--big');
      c.readout(
        'Tek bir hastanın gerekçesi, ortalama beklentiden başlayıp adım adım yükseliyor: sigara yükü, kemoterapi almamış olması, ileri yaş, alkol öyküsü. ' +
          'Hekim bu listeyi görünce modelin kararını <b>kabul ya da reddedebilecek</b> bilgiye sahip olur. Kara kutu probleminin aşılması tam olarak bu demek.'
      );
      c.sound.play('pick', { volume: 0.6 });
    },
  },

  // ---------------------------------------------------------------- 10
  {
    id: 'tuzak',
    label: 'Tuzak',
    title: 'İki sürpriz, iki tuzak',
    body: `
      <p><b>Birincisi:</b> kemoterapi listede üst sıralarda ve değeri arttıkça riski <i>azaltıyor</i>. "Demek ki kemoterapi hayat kurtarıyor" mu? Hayır. Kemoterapi genel durumu iyi olan hastalara verilir; model muhtemelen "kemoterapi alabilecek durumdaki hasta zaten daha iyi durumda" ilişkisini öğrendi. Buna <b>endikasyon yanlılığı</b> denir.</p>
      <p><b>İkincisi:</b> TNM evresi 13 bilgi arasında ancak <b>10. sırada</b>. Model evreyi önemsiz bulmuyor; evrenin taşıdığı bilgiyi zaten tümör boyutu ve lenf nodundan alıyor. Evre bu ikisinden türetilen bir bileşik çünkü.</p>
      ${teacher('<p>§4.1: endikasyon yanlılığı uyarısı ve arayüzde "ya olsaydı" simülasyonunun yasaklanması. Stage ort. |SHAP| = 0.0111, 10. sıra; eşdoğrusallık açıklaması ve KernelExplainer\'ın korelasyonlu değişkenlerdeki bilinen davranışı (Ek-A #10, §7.3).</p>')}`,
    focus: 'desk',
    say: 'Model ilişki bulur. İlişki, sebep demek değildir.',
    mood: 'worried',
    toggles: [{ id: 'whatif', label: 'Kemoterapiyi işaretle ve riski düşür' }],
    enter(c) {
      c.clinic.clear();
      c.clinic.use(0);
      this.draw(c, false);
    },
    onToggle(c) {
      const on = !!c.toggle.whatif;
      this.draw(c, on);
      if (on) {
        c.sound.play('grab', { volume: 0.6 });
        c.bidik.react('worried', 2);
        c.say('Bu düğme bilerek çalışmıyor. Sebebini okumanı istiyorum.', 6);
      }
    },
    draw(c, blocked) {
      c.clinic.clear();
      const items = [
        { n: 'Kemoterapi', v: 0.06187, up: false, hi: true },
        { n: 'T evresi', v: 0.06059, up: true },
        { n: 'Lenf nodu', v: 0.02833, up: true },
        { n: 'TNM evresi', v: 0.01111, up: true, hi: true },
      ];
      items.forEach((s, i) => {
        const x = -2.1 + i * 1.4;
        const h = 0.15 + (s.v / 0.08865) * 2.1;
        c.clinic.bar(x, 0.5, h, s.up ? RISK : SAFE, { w: s.hi ? 0.62 : 0.4, d: 0.9, delay: i * 0.06 });
        c.clinic.label(s.n, c.clinic.p(x, 0.5, h + 0.3), s.hi ? 'tag--big' : 'tag--measure');
        c.clinic.label(s.v.toFixed(4).replace('.', ','), c.clinic.p(x, -0.75, 0.12), 'tag--axis');
      });
      c.clinic.link(c.clinic.p(0.7, 1.5, 0.02), c.clinic.p(2.1, 1.5, 0.02), 'rgba(185,169,150,0.8)');
      c.clinic.label('evrenin bilgisi bu ikisinde zaten var', c.clinic.p(0.0, 1.95, 0.14), 'tag--measure');
      c.instant();
      c.readout(
        blocked
          ? '<b>Bu simülasyon bilerek kapalı.</b> Hekim kemoterapi kutusunu işaretleyip riskin düştüğünü görseydi, sistem veremeyeceği bir söz vermiş olurdu: "bu tedaviyi verirsen bu hasta daha iyi olur". ' +
              'Elimizdeki veri geriye dönük; tedaviyi kimin aldığını hastanın durumu belirlemiş. Bu sistem bir <b>prognoz</b> aracıdır, tedavi seçme aracı değil.'
          : 'Yukarıdaki iki tuzak da ancak SHAP sayesinde görülebildi. Açıklanabilirliğin değeri bu: modeli savunmak değil, <b>sınayabilir hâle getirmek</b>. Üstteki düğmeye basıp ne olduğuna bak.'
      );
    },
  },

  // ---------------------------------------------------------------- 11
  {
    id: 'disari',
    label: 'Dışarısı',
    title: 'Başka bir hastanede de çalışıyor mu?',
    body: `
      <p>Bir modelin kendi verisinde iyi olması kolay. Asıl sınav, <b>hiç görmediği</b> bir hastanede. Model, Kanada'daki Princess Margaret merkezinin RADCURE kohortunda sınandı: aynı bölgeden 1501 hasta, bizimkinin 2,5 katı.</p>
      <p>İki kohort şaşırtıcı derecede benziyor: yaş medyanı 59'a karşı 61, sigara yükü 20'ye 20, RT dozu 70'e 70 Gy, kemoterapi oranı %49,0'a %48,4. Yani karşılaştırma popülasyon farkını değil, modelin davranışını ölçüyor.</p>
      ${teacher('<p>Tablo 6, 7 ve 9. Bizde eğitilen model RADCURE\'de makro F1 0.7159 / ROC-AUC 0.785; kendi kohortundaki iç değerlendirmesi 0.6780. Ters yönde RADCURE\'de eğitilen model bizde 0.7741. Aktarım altı ortak öznitelikle yapıldı (§5.4).</p>')}`,
    focus: 'top',
    say: 'Dış doğrulamada düşmedi. Öğrendiği şey tek bir merkezin alışkanlığı değilmiş.',
    mood: 'proud',
    action: 'HPV\'nin katkısını ölç',
    enter(c) {
      c.clinic.clear();
      c.clinic.use(N + 967);
      c.clinic.grid(range(0, N), -2.2, 0.15, 24, { gap: 0.115, color: SAFE, stagger: 0.0004 });
      c.clinic.grid(range(N, N + 967), 2.05, 0.15, 30, { gap: 0.105, color: '#7d97ad', stagger: 0.0003 });
      c.clinic.label('bu çalışma · 606 hasta', c.clinic.p(-2.2, -1.85, 0.12), 'tag--big');
      c.clinic.label('RADCURE · 967 hasta', c.clinic.p(2.05, -2.05, 0.12), 'tag--big');
      c.clinic.label('makro F1 0,726 ± 0,035', c.clinic.p(-2.2, 1.85, 0.12), 'tag--measure');
      c.clinic.label('makro F1 0,707 ± 0,026', c.clinic.p(2.05, 2.05, 0.12), 'tag--measure');
      c.stats([
        { label: 'Bizde eğit', value: '0,716' },
        { label: 'Onlarda test', value: 'AUC 0,785' },
        { label: 'Düşüş', value: 'yok' },
      ]);
      c.readout(
        'Bizim kohortta eğitilen model, hiç görmediği RADCURE hastalarında makro F1 <b>0,716</b> alıyor; kendi evindeki puanı 0,678. Yani dışarıda <b>düşmüyor</b>. ' +
          'Bu, öğrenilen ilişkilerin tek bir merkezin kayıt alışkanlığına değil hastalığın kendisine dayandığının işareti. Sınırı da açık: bu aktarım iki veri setinde aynı şekilde kaydedilmiş altı bilgiyle yapıldı.'
      );
    },
    act(c) {
      c.clinic.clear();
      c.clinic.use(967);
      const neg = 268;
      const pos = 575;
      c.clinic.grid(range(0, neg), -2.2, 0.3, 17, { gap: 0.175, color: RISK, stagger: 0.001 });
      c.clinic.grid(range(neg, neg + pos), 2.0, 0.3, 25, { gap: 0.155, color: SAFE, stagger: 0.0008 });
      c.clinic.label('HPV negatif · 268 hasta', c.clinic.p(-2.2, -1.7, 0.12), 'tag--big');
      c.clinic.label('HPV pozitif · 575 hasta', c.clinic.p(2.0, -1.7, 0.12), 'tag--big');
      c.clinic.label('5 yılda ölüm %65,7', c.clinic.p(-2.2, 1.85, 0.12), 'tag--measure');
      c.clinic.label('5 yılda ölüm %28,3', c.clinic.p(2.0, 1.85, 0.12), 'tag--measure');
      c.stats([
        { label: 'HPV\'siz F1', value: '0,693' },
        { label: 'HPV\'li F1', value: '0,707' },
        { label: 'Fark', value: '+0,014' },
      ]);
      c.readout(
        'Burada güzel bir çelişki var. HPV, hasta düzeyinde <b>en güçlü tek belirteç</b>: beş yıllık ölüm oranı HPV negatiflerde %65,7, pozitiflerde %28,3 — yaklaşık 37 puan fark. ' +
          'Buna karşılık modele eklendiğinde makro F1 yalnızca <b>+0,014</b> artıyor (anlamlı ama küçük). Sebebi: HPV negatif hastalar zaten daha çok sigara içmiş ve daha ileri evrede oluyor; model bu bilgiyi dolaylı yoldan <b>zaten kullanıyordu</b>.'
      );
      c.bidik.react('surprised', 1.6);
      c.say('Bir değişkenin klinik önemi ile modele kattığı yeni bilgi aynı şey değil.', 6);
    },
  },

  // ---------------------------------------------------------------- 12
  {
    id: 'zaman',
    label: 'Zaman',
    title: 'Eksik olan boyut: ne zaman?',
    body: `
      <p>Buraya kadar model tek bir soruya cevap verdi: "kaybedilecek mi?" Ama hekimin sorusu genelde şudur: <b>ne zaman?</b> İlk yıl içinde kaybedilen 62 hasta ile beşinci yıldan sonra kaybedilen 56 hasta, ikili etikette aynı hastadır.</p>
      <p>Bu yüzden ayrıca bir <b>sağkalım modeli</b> kuruldu. Hastaları riske göre üç gruba ayırıyor ve her grubun zaman içinde nasıl ayrıştığını gösteriyor.</p>
      ${teacher('<p>§6: Cox ve Random Survival Forest, C-index 5×10 çapraz doğrulama. Kat-dışı risk gruplarının Kaplan-Meier tahminleri Tablo 12, log-rank p = 2.2e-39, kat-dışı C-index 0.7422. Sansürlemeyi modellemenin getirisi bu kohortta ölçülemez (+0.0028, p = 0.156), sansürlemenin ağır olduğu RADCURE\'de anlamlı (+0.0238, p &lt; 0.0001).</p>')}`,
    focus: 'desk',
    say: 'Yüksek risk grubunda medyan sağkalım 2,9 yıl. İzlem planı işte buna dayanır.',
    mood: 'curious',
    action: 'Grupları ayır',
    enter(c) {
      c.clinic.clear();
      c.clinic.use(606);
      c.clinic.grid(range(0, 606), 0, -1.75, 40, { gap: 0.115, color: MUTE, stagger: 0.0005 });
      this.chart(c);
    },
    act(c) {
      const g = c.clinic;
      g.grid(range(0, 202), -2.3, -1.75, 14, { gap: 0.145, color: SAFE, stagger: 0.001 });
      g.grid(range(202, 404), 0, -1.75, 14, { gap: 0.145, color: WARN, stagger: 0.001 });
      g.grid(range(404, 606), 2.3, -1.75, 14, { gap: 0.145, color: RISK, stagger: 0.001 });
      g.label('düşük risk · 202', g.p(-2.3, -2.9, 0.1), 'tag--measure');
      g.label('orta risk · 202', g.p(0, -2.9, 0.1), 'tag--measure');
      g.label('yüksek risk · 202', g.p(2.3, -2.9, 0.1), 'tag--measure');
      c.sound.play('drip', { volume: 0.6 });
      c.stats([
        { label: 'Düşük · 5 yıl', value: '%91,3' },
        { label: 'Orta · 5 yıl', value: '%67,3' },
        { label: 'Yüksek · 5 yıl', value: '%39,1' },
      ]);
      c.readout(
        'Üç grup zaman içinde belirgin biçimde ayrışıyor. Yüksek risk grubunda iki yıllık sağkalım <b>%62,4</b> ve medyan sağkalım <b>2,9 yıl</b>: bu hastaların yaklaşık üçte biri ilk iki yılda kaybediliyor, yoğun izlem gerekiyor. ' +
          'Düşük risk grubunda iki yıllık sağkalım <b>%97,0</b>; orada rutin takip yeterli. İkili model bu ayrımı kuramıyordu, çünkü çıktısı zamandan bağımsız bir etiketti.'
      );
    },
    chart(c) {
      c.clinic.panel(
        0,
        1.15,
        6.8,
        3.0,
        (g, W, H) => {
          title(g, W, 'Risk gruplarının zaman içinde ayrışması', 'şema: raporun 2 ve 5 yıllık değerlerinden çizilmiştir');
          const map = axes(g, W, H, {
            x0: 0,
            x1: 8,
            y0: 0,
            y1: 1,
            pad: 86,
            xTicks: 8,
            yTicks: 5,
            xLabel: 'yıl',
            yLabel: 'yaşayanların oranı',
            fmtX: (x) => x.toFixed(0),
            fmtY: (y) => `%${(y * 100).toFixed(0)}`,
          });
          for (const k of KM) {
            const pts = [[0, 1], [2, k.y2], [5, k.y5]];
            // beşinci yıldan sonrasını medyan bilgisiyle uzat
            const slope = (k.y2 - k.y5) / 3;
            pts.push([8, Math.max(0.05, k.y5 - slope * 3)]);
            plot(g, pts, map, k.color, { width: 6 });
            dot(g, 2, k.y2, map, k.color, 9);
            dot(g, 5, k.y5, map, k.color, 9);
          }
          g.textAlign = 'left';
          g.font = '600 30px "Instrument Sans", system-ui, sans-serif';
          KM.forEach((k, i) => {
            g.fillStyle = k.color;
            g.fillText(`${k.name} · 5 yıl %${(k.y5 * 100).toFixed(1).replace('.', ',')}`, W - 520, 175 + i * 46);
          });
        },
        { pixels: 1360 }
      );
      c.instant();
    },
  },

  // ---------------------------------------------------------------- 13
  {
    id: 'sinav',
    label: 'Sınav',
    title: 'Peki sen ne anladın?',
    body: `
      <p>Beş soru, her doğru bir puan. Cevap yanlış olursa da bir şey olmaz; asıl mesele nedenini okumak.</p>
      <div class="quiz" id="quiz"></div>
      <p class="note">Bu sayfa, XAI-OPC projesinin düzeltilmiş nihai raporundaki sayılarla hazırlanmıştır. Anlatılan sistem bir araştırma prototipidir: tıbbi cihaz olarak onaylanmamıştır ve hekimin yerine geçmez.</p>`,
    focus: 'desk',
    say: 'Sınav zamanı. Sayılar önemli değil, mantık önemli.',
    mood: 'proud',
    quiz: true,
    enter(c) {
      c.clinic.clear();
      c.clinic.use(TEST.n);
      const m = layoutMatrix(c, 15, 19);
      matrixFrame(c, m, false);
      c.startQuiz();
    },
  },
];

export const QUIZ = [
  {
    q: 'Her hastaya "yaşar" diyen tembel model bu sınavda %57,4 doğruluk alıyor. Bu ne anlama gelir?',
    options: ['Dengesiz veride doğruluk tek başına yanıltıcıdır', 'Model gerçekten işe yarıyordur', 'Doğruluk her zaman en iyi ölçüttür'],
    answer: 0,
    why: 'Evet. Çoğunluk zaten yaşadığı için tembel model bedavaya puan topluyor; riskli sınıftaki başarısı sıfır.',
    nope: 'Tembel model tek bir riskli hastayı bile yakalamıyor: riskli sınıf F1 skoru 0,000. Doğruluk bunu gizliyor.',
  },
  {
    q: 'Karar eşiğini 0,50\'den 0,35\'e düşürürsek ne olur?',
    options: ['Daha az riskli hasta kaçar, ama yanlış alarm artar', 'Hem kaçan hem yanlış alarm azalır', 'Model daha doğru öğrenmiş olur'],
    answer: 0,
    why: 'Doğru. Bu sette kaçan 19\'dan 6\'ya iner, yanlış alarm 15\'ten 26\'ya çıkar. Takas her zaman vardır.',
    nope: 'Eşik bir takastır: birini iyileştirirken diğerini bozar. Eşik modeli değiştirmez, sadece nerede çizgi çektiğimizi değiştirir.',
  },
  {
    q: 'Takip süresi (Date_Fu) sütunu neden modelden çıkarıldı?',
    options: ['Hedefe yapışık olduğu için sahte başarı üretiyordu', 'Çok fazla eksik değeri vardı', 'Hekimler bu bilgiyi sevmiyor'],
    answer: 0,
    why: 'Evet, buna veri sızıntısı denir. Üstelik yeni bir hastanın nihai takip süresi tahmin anında bilinemez.',
    nope: 'Sorun eksik veri değil: vefat edenlerde ortalama 1115, yaşayanlarda 2769 gün. Model hastalığı değil izlem düzenini öğreniyordu.',
  },
  {
    q: 'SHAP\'a göre kemoterapi riski azaltıyor. Bundan çıkan doğru sonuç nedir?',
    options: ['Bu bir ilişkidir, sebep sonuç değil', 'Kemoterapi vermek riski düşürür', 'Modele göre herkese kemoterapi verilmeli'],
    answer: 0,
    why: 'Doğru. Kemoterapi genel durumu iyi hastalara verilir; model muhtemelen bunu öğrendi. Buna endikasyon yanlılığı denir.',
    nope: 'Geriye dönük veride tedaviyi kimin aldığını hastanın durumu belirler. Bu yüzden sistem tedavi seçmek için kullanılamaz.',
  },
  {
    q: 'Topluluk modeli ile tek başına Random Forest arasında McNemar p = 0,22 çıktı. Bu ne demek?',
    options: ['Aradaki fark gürültüden ayırt edilemiyor', 'Topluluk kesin olarak daha iyidir', 'Random Forest kesin olarak daha iyidir'],
    answer: 0,
    why: 'Evet. 122 hastanın 6\'sında ayrışıyorlar. Rapor bu yüzden "belirgin üstünlük" ifadesini çıkardı.',
    nope: 'Yüksek p değeri "fark var" demeye yetmiyor. Topluluğun katkısı performansta değil, kararlılıkta aranmalı.',
  },
  {
    q: 'TNM evresi SHAP sıralamasında neden 10. sırada kaldı?',
    options: ['Bilgisi tümör boyutu ve lenf nodunda zaten var', 'Evre prognozda önemsizdir', 'Model evreyi hiç görmedi'],
    answer: 0,
    why: 'Doğru. Evre bu ikisinden türetilen bir bileşik; model bileşenlere doğrudan erişince evreye ek bilgi kalmıyor.',
    nope: 'Evre modele giriyor ve klinikte de önemli. Sorun, aynı bilginin başka sütunlarda zaten bulunması.',
  },
  {
    q: 'HPV bilgisi modele eklendiğinde makro F1 yalnızca +0,014 arttı. Buna rağmen HPV neden önemli?',
    options: ['Beş yıllık ölüm oranında yaklaşık 37 puan fark yaratıyor', 'Aslında önemsizdir, sayı bunu gösteriyor', 'Sadece hesaplamayı hızlandırdığı için'],
    answer: 0,
    why: 'Evet: HPV negatiflerde %65,7, pozitiflerde %28,3. Modele az katkı vermesinin sebebi bilginin diğer sütunlarda kısmen bulunması.',
    nope: 'Bir değişkenin klinik ayırt ediciliği ile modele kattığı yeni bilgi farklı şeylerdir. HPV klinik olarak çok güçlü bir belirteç.',
  },
  {
    q: 'Modelin dış kohortta (RADCURE) puan kaybetmemesi neyi gösterir?',
    options: ['Öğrendiği ilişkiler tek bir merkeze özgü değil', 'Model artık klinikte kullanılabilir', 'Dış doğrulamaya artık gerek yok'],
    answer: 0,
    why: 'Doğru. Yine de bu tek bir dış kohort ve altı ortak bilgiyle yapılmış bir aktarım; çok merkezli doğrulama hâlâ gerekiyor.',
    nope: 'Sonuç umut verici ama yeterli değil: tek dış kohort, altı öznitelik. Rapor da sistemin klinik kullanıma alınmaması gerektiğini yazıyor.',
  },
];
