/**
 * Lesson chapters for ages 8–14. Bıdık, the apprentice robot chef, learns
 * to tell sweet dumplings from salty ones. Every chapter: one idea, one
 * thing to do, and a teacher note with the real terms.
 */
const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;

export const STEPS = [
  {
    id: 'veri',
    label: 'Mantılar',
    title: 'Bıdık\'a kural değil, örnek veriyoruz',
    body: `
      <p>Bıdık'a "şekeri çoksa tatlıdır" gibi bir kural söylemeyeceğiz. Onun yerine masaya bir sürü mantı koyuyoruz.</p>
      <p>Her mantının içinde biraz <b>şeker</b>, biraz <b>tuz</b> var. <span class="sweet">Pembe mantılar tatlı</span>, <span class="salty">sarı mantılar tuzlu</span>. Bıdık hepsine bakıp kendi kendine öğrenecek.</p>
      ${teacher('<p>Bu masa <b>eğitim verisi</b>. Her mantı bir örnek: iki özellik (şeker, tuz; 0–1 arası) ve bir etiket (tatlı = 1, tuzlu = 0). <span data-count="dishes">64</span> örnek var. Masanın gizli bir kuralı var ama model onu görmüyor; yalnızca örnekleri görüyor.</p>')}`,
    focus: 'board',
    say: 'Vay, ne çok mantı! Hepsini tek tek inceleyeceğim.',
    mood: 'curious',
    enter(c) {
      c.board.tintTarget = 0;
      c.network.setWeightsVisible(false);
      c.tokens.visible = false;
      c.board.hideAll();
      c.board.dishes.forEach((_, i) => c.later(0.15 + i * 0.045, () => c.board.revealDish(i)));
      c.later(0.4, () => c.sound.play('refill', { volume: 0.5 }));
    },
  },
  {
    id: 'model',
    label: 'Kafası',
    title: 'Bıdık\'ın kafasında küçük yardımcılar var',
    body: `
      <p>Bıdık'ın kafasının içi böyle görünüyor. Şeker ve tuz miktarı soldan giriyor. Ortadaki altı <b>yardımcı</b> bunları dinleyip birbirine fısıldıyor. En sağdaki yardımcı karar veriyor: <i>tatlı mı?</i></p>
      <p>Yardımcıları bağlayan <b>ipler</b> var. İp ne kadar kalınsa fısıltı o kadar güçlü. <span class="salty2">Kiremit ip</span> "evet" diyor, <span class="slate">mavi ip</span> "hayır" diyor. Şu an ipler karmakarışık: Bıdık henüz hiçbir şey bilmiyor.</p>
      ${teacher('<p>Bu bir <b>yapay sinir ağı</b>: 2 giriş, 6 düğümlü bir gizli katman, 1 çıkış. İpler <b>ağırlık</b> (18 tane) ve her düğümde bir sapma değeri var; toplam 25 <b>parametre</b>. Kalınlık büyüklüğü, renk işareti gösterir. Başlangıçta hepsi rastgeledir.</p>')}`,
    focus: 'network',
    say: 'İpler dolaşık. Kafam karışık, ne yapayım?',
    mood: 'worried',
    action: 'İpleri karıştır',
    enter(c) {
      c.board.revealAll();
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.later(0.5, () => c.sound.play('pick'));
    },
    act(c) {
      c.shuffleWeights();
    },
  },
  {
    id: 'ileri',
    label: 'Tahmin',
    title: 'Önce sen tahmin et, sonra Bıdık',
    body: `
      <p>Masadan bir mantı seçtik. Yanındaki sayılara bak: içinde ne kadar şeker, ne kadar tuz var? Sence tatlı mı, tuzlu mu?</p>
      <p>Sen söyledikten sonra Bıdık deneyecek. Sayılar iplerden geçip yardımcılara ulaşıyor; parlayanlar heyecanlananlar. En sondaki yardımcı bir yüzde söylüyor: %50'den büyükse "tatlı".</p>
      ${teacher('<p><b>İleri geçiş</b>: her düğüm girdileri ağırlıklarla çarpıp toplar, sonra bir <b>aktivasyon</b> fonksiyonundan (tanh) geçirir. Çıkış düğümü sigmoid ile 0–1 arası bir olasılık üretir. Eğitilmemiş model çoğunlukla yanılır.</p>')}`,
    focus: 'network',
    say: 'Bir mantı seçelim. Önce sen tahmin et!',
    mood: 'curious',
    guess: true,
    action: 'Başka mantı',
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.later(0.5, () => c.newGuessRound());
    },
    act(c) {
      c.newGuessRound();
    },
  },
  {
    id: 'hata',
    label: 'Düzeltme',
    title: 'Yanılınca ipleri azıcık düzeltiyor',
    body: `
      <p>Bıdık yanıldığında üzülmüyor, öğreniyor. Önce yanlışın ne kadar büyük olduğuna bakıyor. Sonra ipleri <i>azıcık</i> oynatıyor: yanlışa götüren ipleri inceltiyor, doğruya götürenleri kalınlaştırıyor.</p>
      <p>Mavi ışıklar geriye doğru gidiyor; bu, "hangi ip suçlu?" sorusunun cevabı. Sonra iplerin kalınlığı değişiyor. İşte öğrenmek tam olarak bu.</p>
      ${teacher('<p>Tahmin ile etiket arasındaki fark <b>hata</b>; tüm örnekler için ortalaması <b>kayıp</b>. <b>Geri yayılım</b> her ağırlığın kaybı ne yöne değiştirdiğini (türevini) hesaplar; <b>gradyan inişi</b> ağırlıkları o yönün tersine küçük bir adım oynatır.</p>')}`,
    focus: 'network',
    say: 'Yanlış yaptım ama sorun değil. Hangi ip suçlu bakalım!',
    mood: 'thinking',
    action: 'Bir kez düzelt',
    stats: true,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.updateStats();
    },
    act(c) {
      c.learnStep();
    },
  },
  {
    id: 'egitim',
    label: 'Antrenman',
    title: 'Tekrar, tekrar, tekrar',
    body: `
      <p>Bir düzeltme yetmez. Bıdık aynı mantılara yüzlerce kez bakıp her seferinde ipleri azıcık düzeltiyor. Tıpkı bisiklete binmeyi öğrenmek gibi: düşe kalka.</p>
      <p>Masa örtüsüne bak. <span class="sweet">Pembe</span> yerler Bıdık'ın "burası tatlı" dediği, <span class="salty">sarı</span> yerler "burası tuzlu" dediği bölgeler. Kimse ona kuralı söylemedi; kendi buldu!</p>
      ${teacher('<p><b>Eğitim</b>: tam yığın gradyan inişi, öğrenme hızı 0,6, yaklaşık 360 adım. Kayıp düşerken doğruluk yükselir; örtüdeki renk, modelin her (şeker, tuz) noktası için tahminidir. Ortaya çıkan eğri <b>karar sınırı</b>dır.</p>')}`,
    focus: 'overview',
    say: 'Hadi antrenman! Düşe kalka öğrenirim.',
    mood: 'happy',
    action: 'Antrenmanı başlat',
    secondary: 'Baştan al',
    stats: true,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.board.tintTarget = c.net.steps > 0 ? 1 : 0;
      c.board.paint((s, t) => c.net.predict([s, t]));
      c.updateStats();
    },
    act(c) {
      c.toggleTraining();
    },
    act2(c) {
      c.resetNet();
    },
    exit(c) {
      c.stopTraining();
    },
  },
  {
    id: 'test',
    label: 'Sınav',
    title: 'Bıdık sınavda: yeni mantı!',
    body: `
      <p>Şimdi Bıdık'ı sınayalım. Masaya hiç görmediği yeni bir mantı koy: örtüye tıkla ya da kaydırıcıları oynat. Önce sen tahmin et, sonra Bıdık.</p>
      <p>Sınıra yakın mantılarda Bıdık kararsız kalabilir: "%55 tatlı" gibi. Bu çok normal; biz de bazen emin olamayız.</p>
      ${teacher('<p>Görülmemiş örneklerde doğru tahmin yapabilmeye <b>genelleme</b> denir. Karşılaştırma için masanın gizli kuralı da gösteriliyor. Model az eğitildiyse bir önceki bölümde antrenmanı çalıştırın.</p>')}`,
    focus: 'board',
    say: 'Yeni mantı mı? Bakalım bilebilecek miyim!',
    mood: 'curious',
    sliders: true,
    guess: true,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.board.tintTarget = c.net.steps > 0 ? 1 : 0;
      c.board.paint((s, t) => c.net.predict([s, t]));
      c.setProbe(0.62, 0.45, true);
    },
    exit(c) {
      c.board.probe.visible = false;
    },
  },
  {
    id: 'llm',
    label: 'Sohbet',
    title: 'Sohbet robotları da böyle öğrendi',
    body: `
      <p>ChatGPT gibi sohbet robotları da Bıdık gibi çalışıyor. Ama oyunları başka: tatlı-tuzlu yerine <b>"sıradaki kelime ne?"</b> oyunu.</p>
      <p>Milyonlarca kitap ve yazı okumuşlar. Her seferinde sıradaki kelimeyi tahmin edip yanılınca iplerini düzeltmişler. Sen de oyna: en olası kelimeyi seç, cümle uzasın!</p>
      ${teacher('<p><b>Büyük dil modelleri</b> metni <b>token</b>lara böler ve bir sonraki token için olasılık dağılımı üretir; aynı tahmin et → kaybı ölç → ağırlıkları düzelt döngüsüyle eğitilir, yalnızca yüz milyarlarca parametre ve çok daha büyük veriyle. Burada hep en olası kelime seçiliyor; gerçek modeller örnekleme (sıcaklık) kullanır.</p>')}`,
    focus: 'tokens',
    say: 'Bu oyunu ben de biliyorum: sıradaki kelime ne?',
    mood: 'happy',
    action: 'Sıradaki kelimeyi seç',
    enter(c) {
      c.board.tintTarget = 0;
      c.board.hideAll();
      c.network.setWeightsVisible(false);
      c.network.visible = false;
      c.tokens.visible = true;
      c.tokens.build(0, true);
      c.updateTokenReadout();
    },
    act(c) {
      c.tokens.next();
      c.sound.play('pick');
      c.updateTokenReadout();
    },
    exit(c) {
      c.tokens.visible = false;
      c.network.visible = true;
      c.board.revealAll();
      c.network.setWeightsVisible(true);
    },
  },
  {
    id: 'ozet',
    label: 'Bitti!',
    title: 'Sen de öğrendin mi?',
    body: `
      <p>Bıdık öğrendi, sıra sende. Üç kısa soru:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Özet: (1) Model kural ezberlemez, örneklerden öğrenir. (2) Model, ağırlıklarla dolu bir tahmin makinesidir. (3) Eğitim: tahmin et, kaybı ölç, ağırlıkları azıcık düzelt; çok kez. (4) Genelleme: görülmemiş örneklerde de tahmin. Dil modelleri aynı döngüyü "sıradaki token" görevinde uygular.</p>')}`,
    focus: 'overview',
    say: 'Artık tatlıyı tuzludan ayırabiliyorum! Sen de bilir misin?',
    mood: 'proud',
    quiz: true,
    enter(c) {
      c.board.revealAll();
      c.board.tintTarget = c.net.steps > 0 ? 1 : 0;
      c.board.paint((s, t) => c.net.predict([s, t]));
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.startAmbientPulses();
      c.buildQuiz();
    },
    exit(c) {
      c.stopAmbientPulses();
    },
  },
];

export const QUIZ = [
  {
    q: 'Bıdık tatlıyı tuzludan ayırmayı nasıl öğrendi?',
    options: ['Ona kuralı söyledik', 'Bir sürü örneğe baktı'],
    answer: 1,
    why: 'Doğru! Kural yoktu; Bıdık örneklere bakarak kendi buldu.',
    nope: 'Hayır, ona kural söylemedik. Sadece mantıları gösterdik.',
  },
  {
    q: 'Bıdık yanlış tahmin edince ne yaptı?',
    options: ['İpleri azıcık düzeltti', 'Pes etti'],
    answer: 0,
    why: 'Evet! Her yanlış, ipleri biraz daha iyi ayarlamak için bir fırsat.',
    nope: 'Bıdık pes etmez. Yanlış yapınca ipleri azıcık düzeltir.',
  },
  {
    q: 'Sohbet robotları hangi oyunu oynar?',
    options: ['Hava durumunu tahmin etme', 'Sıradaki kelimeyi tahmin etme'],
    answer: 1,
    why: 'Doğru! Cümlenin sıradaki kelimesini tahmin ede ede öğrendiler.',
    nope: 'Onların oyunu "sıradaki kelime ne?" oyunu.',
  },
];
