/**
 * Lesson chapters. Each step has copy (Turkish), an optional action button,
 * and enter/exit hooks that receive the shared lesson context.
 */
export const STEPS = [
  {
    id: 'veri',
    label: 'Veri',
    title: 'Her şey örneklerle başlar',
    body: `
      <p>Yapay zeka kural ezberlemez; <b>örneklere</b> bakar. Mutfağımızda her tabak iki sayıyla anlatılıyor: içindeki <b>şeker</b> ve <b>tuz</b> miktarı. Tabaktaki bilye ise doğru cevabı söylüyor: <span class="sweet">pembe = tatlı</span>, <span class="salty">kiremit = tuzlu</span>.</p>
      <p>Bu masaya <b>eğitim verisi</b> denir. Model ne kadar çok ve çeşitli örnek görürse o kadar iyi öğrenir. Bizim masamızda 64 tabak var.</p>`,
    focus: 'board',
    enter(c) {
      c.board.tintTarget = 0;
      c.board.probe.visible = false;
      c.network.setWeightsVisible(false);
      c.tokens.visible = false;
      c.board.hideAll();
      c.board.dishes.forEach((_, i) => c.later(0.15 + i * 0.045, () => c.board.revealDish(i)));
      c.later(0.4, () => c.sound.play('refill', { volume: 0.5 }));
    },
  },
  {
    id: 'model',
    label: 'Model',
    title: 'Bir tahmin makinesi: sinir ağı',
    body: `
      <p>Sayılar soldan giriyor (şeker, tuz), ortadaki düğümlerden geçiyor, sağdan tek bir tahmin çıkıyor: <i>tatlı olma olasılığı</i>.</p>
      <p>Düğümleri bağlayan çubuklar birer <b>ağırlık</b>: o bağlantının ne kadar söz sahibi olduğu. Kalın çubuk = güçlü etki; <span class="salty">kiremit</span> artı yönde, <span class="slate">mavi</span> eksi yönde çekiyor. Başlangıçta hepsi rastgele: model henüz hiçbir şey bilmiyor.</p>
      <p class="note">Bu minik ağda yalnızca 25 ağırlık var. Büyük dil modellerinde yüz milyarlarca.</p>`,
    focus: 'network',
    enter(c) {
      c.board.revealAll();
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.network.clearGlow();
      c.later(0.5, () => c.sound.play('pick'));
    },
  },
  {
    id: 'ileri',
    label: 'Sinyal',
    title: 'Sinyal akışı',
    body: `
      <p>Bir tabak seçelim. Şeker ve tuz sayıları ağırlıklarla çarpılıp toplanıyor; her düğüm bu toplamı bir eşikten geçirip (<b>aktivasyon</b>) bir sonrakine yolluyor.</p>
      <p>En sonda 0 ile 1 arasında bir sayı çıkıyor: modelin <b>tahmini</b>. Henüz eğitilmediği için çoğu zaman yanılıyor; buna şaşırma.</p>`,
    focus: 'network',
    action: 'Başka bir tabak dene',
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.later(0.6, () => c.showForward(c.randomExample()));
    },
    act(c) {
      c.showForward(c.randomExample());
    },
  },
  {
    id: 'hata',
    label: 'Hata',
    title: 'Hata ve düzeltme',
    body: `
      <p>Tahmin ile gerçek arasındaki farka <b>hata</b> (kayıp) deniyor. Öğrenmek demek, hatayı azaltacak yönde her ağırlığı <i>azıcık</i> oynatmak demek.</p>
      <p>Hangi çubuğu hangi yöne? Bunu, hatayı çıkıştan girişe doğru geri yayarak hesaplıyor: <b>geri yayılım</b>. Matematiği türev; fikri ise "hangi vidayı hangi yöne çevirmeli".</p>`,
    focus: 'network',
    action: 'Bir adım öğren',
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
    label: 'Eğitim',
    title: 'Tekrar, tekrar, tekrar',
    body: `
      <p>Tek adım küçük bir düzeltme. Bunu yüzlerce kez yapınca ağırlıklar yerine oturuyor. Masa örtüsünün renklenmesini izle: model, tabağı görmeden hangi bölgenin tatlı, hangisinin tuzlu olduğunu öğreniyor.</p>
      <p>Buna <b>eğitim</b> denir. Kayıp düşerken doğruluk yükseliyor; sınır eğrisi kendiliğinden ortaya çıkıyor.</p>`,
    focus: 'overview',
    action: 'Eğit',
    secondary: 'Sıfırla',
    stats: true,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.board.tintTarget = 1;
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
    label: 'Dene',
    title: 'Şimdi sen dene',
    body: `
      <p>Masaya yeni bir tabak koy: örtüye tıkla ya da kaydırıcıları oynat. Model bu tabağı daha önce hiç görmedi ama tahmin edebiliyor. Buna <b>genelleme</b> denir.</p>
      <p>Sınıra yakın tabaklarda kararsız kalması normal; biz de öyleyiz. Model yeterince eğitilmediyse geri dönüp <i>Eğit</i>'e bas.</p>`,
    focus: 'board',
    sliders: true,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.board.tintTarget = 1;
      c.board.paint((s, t) => c.net.predict([s, t]));
      c.setProbe(0.62, 0.45);
    },
    exit(c) {
      c.board.probe.visible = false;
    },
  },
  {
    id: 'llm',
    label: 'Dil modeli',
    title: 'Peki ChatGPT gibi modeller?',
    body: `
      <p>Aynı fikir, devasa ölçek. Girdi: kelime parçaları (<b>token</b>). Çıktı: bir sonraki kelimenin olasılıkları. Model, internet kadar metin üzerinde tek bir şeyi öğrendi: <i>"sıradaki kelime ne?"</i></p>
      <p>Bir kelime seçiyor, cümleye ekliyor ve baştan soruyor. Sohbet, çeviri, kod: hepsi bu döngü. Her zaman en olası kelime seçilmez; biraz rastgelelik cevapları doğallaştırır.</p>`,
    focus: 'tokens',
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
    label: 'Özet',
    title: 'Dört cümlede yapay zeka',
    body: `
      <ol class="summary">
        <li><b>Veri:</b> Model kural ezberlemez, örneklerden öğrenir.</li>
        <li><b>Model:</b> Ağırlıklarla dolu bir tahmin makinesidir.</li>
        <li><b>Eğitim:</b> Tahmin et, hatayı ölç, ağırlıkları azıcık düzelt; milyonlarca kez.</li>
        <li><b>Genelleme:</b> Hiç görmediği örnekler için de tahmin yapabilir.</li>
      </ol>
      <dl class="glossary">
        <dt>Parametre / ağırlık</dt><dd>Modelin öğrenirken ayarladığı sayılar.</dd>
        <dt>Kayıp</dt><dd>Tahminin gerçekten ne kadar uzak olduğunu ölçen sayı.</dd>
        <dt>Geri yayılım</dt><dd>Hatanın her ağırlığa nasıl dağıldığını hesaplayan yöntem.</dd>
        <dt>Token</dt><dd>Dil modelinin okuduğu kelime parçası.</dd>
      </dl>`,
    focus: 'overview',
    enter(c) {
      c.board.revealAll();
      c.board.tintTarget = 1;
      c.board.paint((s, t) => c.net.predict([s, t]));
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.startAmbientPulses();
    },
    exit(c) {
      c.stopAmbientPulses();
    },
  },
];
