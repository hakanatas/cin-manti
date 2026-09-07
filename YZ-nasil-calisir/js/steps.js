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
      <p>Bıdık'a "şekeri çoksa tatlıdır" demek çok kolay olurdu, değil mi? Ama biz öyle yapmayacağız. Masaya bir sürü mantı dizeceğiz ve Bıdık kendi kendine çözecek.</p>
      <p>Her mantının içinde biraz <b>şeker</b>, biraz <b>tuz</b> var. <span class="sweet">Pembeler tatlı</span>, <span class="salty">sarılar tuzlu</span>. Bıdık hepsini tek tek inceleyecek. Biraz uzun sürecek ama böylesi daha eğlenceli!</p>
      ${teacher('<p>Bu masa <b>eğitim verisi</b>. Her mantı bir örnek: iki özellik (şeker, tuz; 0–1 arası) ve bir etiket (tatlı = 1, tuzlu = 0). <span data-count="dishes">64</span> örnek var. Masanın gizli bir kuralı var ama model onu görmüyor; yalnızca örnekleri görüyor.</p>')}`,
    focus: 'board',
    say: 'Ooo, bu kadar mantı mı? Tamam, hepsini inceleyeceğim!',
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
    title: 'Bıdık\'ın kafasının içine bakalım',
    body: `
      <p>Hazır mısın? Bıdık'ın kafasının içi işte böyle. Şeker ve tuz soldan giriyor. Ortadaki altı <b>yardımcı</b> onları dinleyip birbirine fısıldıyor. En sağdaki yardımcı da son sözü söylüyor: <i>tatlı mı?</i></p>
      <p>Yardımcıları bağlayan <b>ipleri</b> gördün mü? Kalın ip, güçlü fısıltı demek. <span class="salty2">Kiremit ip</span> "evet, tatlı!" diyor, <span class="slate">mavi ip</span> "yok, hiç sanmıyorum" diyor. Şu anda hepsi karmakarışık; Bıdık daha hiçbir şey bilmiyor. Ama merak etme, az sonra öğrenecek.</p>
      ${teacher('<p>Bu bir <b>yapay sinir ağı</b>: 2 giriş, 6 düğümlü bir gizli katman, 1 çıkış. İpler <b>ağırlık</b> (18 tane) ve her düğümde bir sapma değeri var; toplam 25 <b>parametre</b>. Kalınlık büyüklüğü, renk işareti gösterir. Başlangıçta hepsi rastgeledir.</p>')}`,
    focus: 'network',
    say: 'İplerim dolaşmış! Kafam karıştı, ne yapacağım şimdi?',
    mood: 'worried',
    action: 'İpleri karıştır!',
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
    label: 'Oyun',
    title: 'Hadi bir oyun: önce sen, sonra Bıdık',
    body: `
      <p>Masadan bir mantı seçtim. Sayılara bir bak: içinde ne kadar şeker, ne kadar tuz var? Sence tatlı mı, tuzlu mu? Korkma, yanlış cevap yok; sadece tahmin!</p>
      <p>Sen söyleyince sıra Bıdık'a geçiyor. Sayılar iplerden akıp yardımcılara ulaşıyor; parlayanlar heyecanlananlar. En sondaki yardımcı bir yüzde söylüyor. %50'yi geçerse "tatlı!" diyoruz.</p>
      ${teacher('<p><b>İleri geçiş</b>: her düğüm girdileri ağırlıklarla çarpıp toplar, sonra bir <b>aktivasyon</b> fonksiyonundan (tanh) geçirir. Çıkış düğümü sigmoid ile 0–1 arası bir olasılık üretir. Eğitilmemiş model çoğunlukla yanılır.</p>')}`,
    focus: 'network',
    say: 'Bir mantı seçtim. Önce sen söyle, sonra ben deneyeyim!',
    mood: 'curious',
    guess: true,
    action: 'Başka bir mantı seç',
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
    label: 'Düzelt',
    title: 'Yanılmak sorun değil, düzeltmek önemli',
    body: `
      <p>Bıdık yanılınca ne oluyor biliyor musun? Üzülmüyor, öğreniyor! Önce "ne kadar yanıldım?" diye bakıyor. Sonra ipleri <i>azıcık</i> oynatıyor: yanlışa götürenleri inceltiyor, doğruya götürenleri kalınlaştırıyor.</p>
      <p>Mavi ışıkları izle: geriye doğru gidiyorlar. Bu, "hangi ip suçlu?" sorusunun cevabı. Ardından ipler biraz değişiyor. İşte öğrenmek dediğimiz şey tam olarak bu. Düğmeye bas, kendin gör!</p>
      ${teacher('<p>Tahmin ile etiket arasındaki fark <b>hata</b>; tüm örnekler için ortalaması <b>kayıp</b>. <b>Geri yayılım</b> her ağırlığın kaybı ne yöne değiştirdiğini (türevini) hesaplar; <b>gradyan inişi</b> ağırlıkları o yönün tersine küçük bir adım oynatır.</p>')}`,
    focus: 'network',
    say: 'Yanıldım galiba. Olsun! Bakalım hangi ip suçlu?',
    mood: 'thinking',
    action: 'Hadi düzelt!',
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
    title: 'Tekrar, tekrar, tekrar!',
    body: `
      <p>Bir düzeltme yetmez tabii. Bıdık aynı mantılara yüzlerce kez bakıp her seferinde ipleri azıcık düzeltiyor. Bisiklete binmeyi öğrenmek gibi: düşe kalka ama sonunda oluyor.</p>
      <p>Antrenman sırasında masa örtüsüne bak. <span class="sweet">Pembe</span> yerler Bıdık'ın "burası tatlı" dediği, <span class="salty">sarı</span> yerler "burası tuzlu" dediği bölgeler. Kimse ona kuralı söylemedi. Kendi buldu. Süper, değil mi?</p>
      ${teacher('<p><b>Eğitim</b>: tam yığın gradyan inişi, öğrenme hızı 0,6, yaklaşık 360 adım. Kayıp düşerken doğruluk yükselir; örtüdeki renk, modelin her (şeker, tuz) noktası için tahminidir. Ortaya çıkan eğri <b>karar sınırı</b>dır.</p>')}`,
    focus: 'overview',
    say: 'Hadi antrenman! Düşe kalka öğrenirim, göreceksin.',
    mood: 'happy',
    action: 'Antrenman başlasın!',
    secondary: 'Her şeyi unut',
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
    title: 'Sınav zamanı: yepyeni bir mantı!',
    body: `
      <p>Bıdık çalıştı, şimdi sınav! Masaya hiç görmediği bir mantı koy: örtüye tıkla ya da kaydırıcıları oynat. Sonra yine önce sen tahmin et, ardından Bıdık.</p>
      <p>Sınıra yakın mantılarda Bıdık biraz kararsız kalabilir: "%55 tatlı" gibi. Hiç dert değil; biz de bazen "hmm, emin değilim" demez miyiz?</p>
      ${teacher('<p>Görülmemiş örneklerde doğru tahmin yapabilmeye <b>genelleme</b> denir. Karşılaştırma için masanın gizli kuralı da gösteriliyor. Model az eğitildiyse bir önceki bölümde antrenmanı çalıştırın.</p>')}`,
    focus: 'board',
    say: 'Yeni mantı mı? Heyecanlandım! Bakalım bilebilecek miyim.',
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
    title: 'Sohbet robotları da tıpkı Bıdık gibi',
    body: `
      <p>ChatGPT gibi sohbet robotlarını duydun mu? Onlar da aynı Bıdık gibi öğrendi! Sadece oyunları farklı: tatlı-tuzlu yerine <b>"sıradaki kelime ne?"</b> oyunu oynuyorlar.</p>
      <p>Milyonlarca kitap ve yazı okudular. Her seferinde sıradaki kelimeyi tahmin ettiler, yanılınca iplerini düzelttiler. Şimdi sen de oyna: en olası kelimeyi seç, cümle büyüsün!</p>
      ${teacher('<p><b>Büyük dil modelleri</b> metni <b>token</b>lara böler ve bir sonraki token için olasılık dağılımı üretir; aynı tahmin et → kaybı ölç → ağırlıkları düzelt döngüsüyle eğitilir, yalnızca yüz milyarlarca parametre ve çok daha büyük veriyle. Burada hep en olası kelime seçiliyor; gerçek modeller örnekleme (sıcaklık) kullanır.</p>')}`,
    focus: 'tokens',
    say: 'Bu oyunu ben de biliyorum: sıradaki kelime ne?',
    mood: 'happy',
    action: 'Sıradaki kelimeyi seç!',
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
    label: 'Sıra sende',
    title: 'Şimdi sıra sende!',
    body: `
      <p>Bıdık öğrendi, peki ya sen? Üç kısa soru soruyorum, hadi bakalım:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Özet: (1) Model kural ezberlemez, örneklerden öğrenir. (2) Model, ağırlıklarla dolu bir tahmin makinesidir. (3) Eğitim: tahmin et, kaybı ölç, ağırlıkları azıcık düzelt; çok kez. (4) Genelleme: görülmemiş örneklerde de tahmin. Dil modelleri aynı döngüyü "sıradaki token" görevinde uygular.</p>')}`,
    focus: 'overview',
    say: 'Artık tatlıyı tuzludan ayırabiliyorum! Peki ya sen?',
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
    why: 'Aynen öyle! Kural falan yoktu; Bıdık mantılara baka baka kendi buldu.',
    nope: 'Hmm, hayır. Ona hiç kural söylemedik, sadece mantıları gösterdik.',
  },
  {
    q: 'Bıdık yanlış tahmin edince ne yaptı?',
    options: ['İpleri azıcık düzeltti', 'Pes etti'],
    answer: 0,
    why: 'Evet! Her yanlış, ipleri biraz daha iyi ayarlamak için bir fırsat. Bıdık bunu çok iyi biliyor.',
    nope: 'Bıdık asla pes etmez! Yanlış yapınca ipleri azıcık düzeltir, o kadar.',
  },
  {
    q: 'Sohbet robotları hangi oyunu oynar?',
    options: ['Hava durumunu tahmin etme', 'Sıradaki kelimeyi tahmin etme'],
    answer: 1,
    why: 'Bildin! Cümlenin sıradaki kelimesini tahmin ede ede öğrendiler.',
    nope: 'Hava durumu değil. Onların oyunu "sıradaki kelime ne?" oyunu.',
  },
];
