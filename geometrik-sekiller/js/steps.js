/**
 * Chapters of "Temel geometrik şekiller" for 5th grade, told by Bıdık on
 * his dough board. Board units: 1 unit = 2 cm on the ruler.
 */
const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;
const CM = 2; // cm per board unit

export const STEPS = [
  {
    id: 'nokta',
    label: 'Nokta',
    title: 'Her şey bir noktayla başlar',
    body: `
      <p>Bıdık hamur tahtasına un serpmiş. Parmağının ucunu una bir kez değdirip kaldırıyor. Kalan minik iz bir <b>nokta</b>. Sen de dene: tahtaya tıkla, susam taneleri gibi noktalar koy!</p>
      <p>Noktanın eni de boyu da yok; sadece "burası" der. Her noktaya <b>büyük harf</b>le isim veririz: A noktası, B noktası…</p>
      ${teacher('<p>Nokta, kalemin kâğıda bir kez dokunmasıyla oluşan izin modelidir; eni, boyu ve derinliği yoktur. Noktalar büyük harfle isimlendirilir ("A noktası"). Ders kitabı: Temel Geometrik Şekiller ve Özellikleri, Etkinlik 1.</p>')}`,
    focus: 'board',
    say: 'Parmağımı una değdirdim: nokta! Sen de koy bakalım.',
    mood: 'curious',
    action: 'Noktaları sil',
    click: true,
    enter(c) {
      c.geo.clear();
      c.geo.showKids(false);
      c.names = 0;
      // Bıdık's own first point, so the board is not empty
      c.later(0.9, () => {
        if (c.geo.points.length === 0) c.geo.addPoint(-0.6, 0.3, 'A');
      });
    },
    onClick(c, x, z) {
      if (c.geo.points.length >= 8) return;
      const name = 'ABCDEFGH'[c.geo.points.length];
      c.geo.addPoint(x, z, name);
      c.sound.play('drip', { volume: 0.6 });
      c.bidik.react('happy', 1);
      if (c.geo.points.length === 1) c.say('İşte A noktası! Bir tane daha koy.', 3);
      if (c.geo.points.length === 3) c.say('A, B, C… Hepsi büyük harf, gördün mü?', 3);
    },
    act(c) {
      c.geo.clear();
      c.sound.play('click');
    },
  },
  {
    id: 'dogru-parcasi',
    label: 'Doğru parçası',
    title: 'İki noktanın arasını doldur',
    body: `
      <p>Tahtada A ve B noktaları var. Aralarını hiç boşluk kalmadan, dümdüz noktalarla doldurmaya çalış: A ile B arasına tıkla tıkla susam koy. Zor, değil mi? Aynı hizada tutmak kolay değil.</p>
      <p>Bunun kolay yolu var: <b>çizgeç</b>, yani üzerinde sayı olmayan düz cetvel. İki nokta arasındaki dümdüz noktalar bir <b>doğru parçası</b> oluşturur. Adı: <b>[AB]</b>. Uzunluğunu ölçmek istersen cetveli çağır: <b>|AB|</b>.</p>
      ${teacher('<p>İki nokta arasında düz biçimde hizalanmış noktaların oluşturduğu şekle <b>doğru parçası</b> denir; [AB] veya [BA] ile gösterilir, uzunluğu |AB| ile yazılır (|AB| = 5 cm). Üzerinde birim olmayan cetvele <b>çizgeç</b> (ölçüsüz cetvel) denir. Etkinlik 1, Örnek 4.</p>')}`,
    focus: 'board',
    say: 'A ile B\'nin arasını doldur. Ama dümdüz olsun!',
    mood: 'curious',
    action: 'Çizgeçle çiz',
    secondary: 'Cetvelle ölç',
    click: true,
    enter(c) {
      c.geo.clear();
      c.geo.showKids(false);
      c.A = c.geo.addPoint(-1.2, 0.45, 'A').pos;
      c.B = c.geo.addPoint(1.2, -0.25, 'B').pos;
      c.filled = 0;
      c.drawn = false;
    },
    onClick(c, x, z) {
      if (c.drawn) return;
      // snap to the segment when close enough
      const ab = c.B.clone().sub(c.A);
      const t = c.A.clone().negate().add(c.geo.p(x, z)).dot(ab) / ab.lengthSq();
      const foot = c.A.clone().addScaledVector(ab, Math.max(0, Math.min(1, t)));
      const off = foot.distanceTo(c.geo.p(x, z));
      if (off < 0.32 && t > 0.02 && t < 0.98) {
        c.geo.addPoint(foot.x, foot.z, null, { size: 0.55 });
        c.sound.play('drip', { volume: 0.5 });
        c.filled++;
        if (c.filled === 4) c.say('Aynı hizada tutmak zor, değil mi? Çizgeç işte bunun için var.', 4);
      } else {
        c.geo.addPoint(x, z, null, { color: '#b9a48f', size: 0.5 });
        c.sound.play('grab', { volume: 0.4 });
        c.say('Hmm, bu nokta hizadan çıktı. Tam A ile B arasına koy.', 3);
      }
    },
    act(c) {
      if (c.drawn) return;
      c.drawn = true;
      c.geo.placeStraightedge(c.A, c.B);
      c.later(0.4, () => {
        c.geo.segment(c.A, c.B);
        c.notation('[AB]', c.A.clone().lerp(c.B, 0.5).add(c.vec(0.1, 0.45, 0.35)));
        c.sound.play('lift', { volume: 0.6 });
        c.bidik.react('joy', 1.5);
        c.bidik.doHop(0.7);
        c.say('Dümdüz! Bu bir doğru parçası: [AB].', 4);
      });
      c.later(1.6, () => (c.geo.straightedge.visible = false));
    },
    act2(c) {
      if (!c.drawn) this.act(c);
      c.later(c.drawn ? 0 : 1.7, () => {
        c.geo.placeStraightedge(c.A, c.B, c.geo.ruler);
        const cm = (c.A.distanceTo(c.B) * CM).toFixed(0);
        c.notation(`|AB| = ${cm} cm`, c.A.clone().lerp(c.B, 0.5).add(c.vec(0.1, 0.45, -0.55)), 'measure');
        c.sound.play('pick');
        c.say(`Uzunluğu ${cm} santimetre. Kısaca: |AB| = ${cm} cm.`, 4);
      });
    },
  },
  {
    id: 'isin',
    label: 'Işın',
    title: 'Bir ucundan sonsuza',
    body: `
      <p>Doğru parçamız [AB] duruyor. Şimdi B\'den sonra da noktalar koymaya devam edelim: aynı hizada, hiç durmadan. Tahtanın kenarı gelince bile durmayacak; hayalimizde sonsuza kadar gidecek.</p>
      <p>Bir noktadan başlayıp sonsuza giden bu şekle <b>ışın</b> denir. Başladığı yer A, gittiği yön B: adı <b>[AB</b>, okunuşu "AB ışını". Ok ucu "devam ediyor" demek.</p>
      ${teacher('<p>Bir noktadan başlayarak aynı hizada sonsuza kadar giden noktaların oluşturduğu şekle <b>ışın</b> denir. [BC biçiminde gösterilir, "BC ışını" okunur. Başlangıç noktası vardır, uzunluğu ölçülemez. Etkinlik 2.</p>')}`,
    focus: 'board',
    say: 'B\'den sonra durmayalım. Sonsuza kadar!',
    mood: 'happy',
    action: 'Işına dönüştür',
    enter(c) {
      c.geo.clear();
      c.geo.showKids(false);
      c.A = c.geo.addPoint(-1.2, 0.45, 'A').pos;
      c.B = c.geo.addPoint(1.2, -0.25, 'B').pos;
      c.geo.segment(c.A, c.B);
      c.notation('[AB]', c.A.clone().lerp(c.B, 0.5).add(c.vec(0.1, 0.45, 0.35)));
      c.rayDone = false;
    },
    act(c) {
      if (c.rayDone) return;
      c.rayDone = true;
      const end = c.geo.edgePoint(c.A, c.B);
      c.geo.dots(c.B, end, 12);
      c.later(0.6, () => {
        c.geo.ray(c.A, c.B);
        c.clearNotation();
        c.notation('[AB', c.A.clone().lerp(c.B, 0.5).add(c.vec(0.1, 0.45, 0.35)));
        c.sound.play('lift');
        c.bidik.react('surprised', 1.5);
        c.say('Bu bir ışın: [AB. Ok ucu "durmuyorum" demek!', 4);
      });
    },
  },
  {
    id: 'dogru',
    label: 'Doğru',
    title: 'İki yöne de sonsuza: doğru',
    body: `
      <p>Işın tek yöne gidiyordu. Peki A\'nın öbür tarafına da noktalar koyup iki yöne birden sonsuza gidersek? O zaman elimizde bir <b>doğru</b> olur: "AB doğrusu". Ne başı var ne sonu.</p>
      <p>Küçük bir soru: doğru parçası, ışın ve doğru… Hangisinin uzunluğunu cetvelle ölçebiliriz? Aşağıdan seç.</p>
      ${teacher('<p>Işının tersi yönde de sonsuza kadar devam eden noktalar bir <b>doğru</b> oluşturur; "AB doğrusu" okunur. Yalnızca doğru parçasının uzunluğu ölçülebilir; ışın ve doğrunun uzunluğu yoktur. Bir noktadan sonsuz doğru, iki noktadan yalnız bir doğru geçer. Etkinlik 3, Etkinlik 4.</p>')}`,
    focus: 'board',
    say: 'Şimdi de iki yöne birden. Başı yok, sonu yok!',
    mood: 'happy',
    action: 'Doğruya dönüştür',
    choices: [
      { label: 'Doğru parçası', ok: true, why: 'Evet! İki ucu var, cetveli koyarsın, ölçersin.' },
      { label: 'Işın', ok: false, why: 'Işının bir ucu sonsuza gidiyor; cetvel yetmez!' },
      { label: 'Doğru', ok: false, why: 'Doğrunun iki ucu da sonsuzda. Ölçülemez.' },
    ],
    enter(c) {
      c.geo.clear();
      c.geo.showKids(false);
      c.A = c.geo.addPoint(-1.2, 0.45, 'A').pos;
      c.B = c.geo.addPoint(1.2, -0.25, 'B').pos;
      c.geo.ray(c.A, c.B);
      c.notation('[AB', c.A.clone().lerp(c.B, 0.5).add(c.vec(0.1, 0.45, 0.35)));
      c.lineDone = false;
    },
    act(c) {
      if (c.lineDone) return;
      c.lineDone = true;
      const end = c.geo.edgePoint(c.B, c.A);
      c.geo.dots(c.A, end, 10);
      c.later(0.6, () => {
        c.geo.line(c.A, c.B);
        c.clearNotation();
        c.notation('AB doğrusu', c.A.clone().lerp(c.B, 0.5).add(c.vec(0.1, 0.45, 0.35)));
        c.sound.play('lift');
        c.bidik.react('joy', 1.5);
        c.bidik.doHop(0.6);
        c.say('AB doğrusu! Sonsuz uzun, o yüzden ölçemeyiz.', 4);
      });
    },
  },
  {
    id: 'aci',
    label: 'Açı',
    title: 'İki ışın buluşunca: açı',
    body: `
      <p>Aynı noktadan çıkan iki ışın bir <b>açı</b> yapar. Buluştukları nokta köşedir: burada L. Açının adı köşe ortada olacak şekilde yazılır: <b>KLM açısı</b>.</p>
      <p>Kaydırıcıyla LM ışınını döndür. Açı kitabın köşesinden darsa <b>dar açı</b>, tam köşe kadarsa <b>dik açı</b>, daha genişse <b>geniş açı</b>. Dik açıyı yakalayınca küçük bir kare belirir!</p>
      ${teacher('<p>Başlangıç noktaları ortak iki ışın bir <b>açı</b> oluşturur; köşe ortada olacak biçimde "KLM açısı" okunur. Dik açı için referans, yüzeyi dikdörtgen olan bir kitabın ya da kapının köşesidir: 90°\'den küçük dar, 90° dik, büyük geniş. Etkinlik 5.</p>')}`,
    focus: 'angle',
    say: 'İki ışın, bir köşe: açı! Döndür bakalım.',
    mood: 'curious',
    sliders: [{ id: 'angle', label: 'Açı', min: 5, max: 175, value: 50 }],
    enter(c) {
      c.geo.clear();
      c.geo.showKids(false);
      c.L = c.geo.addPoint(-0.4, 0.3, 'L').pos;
      c.K = c.geo.addPoint(1.9, 0.3, 'K').pos;
      c.geo.ray(c.L, c.K);
      c.M = c.geo.addPoint(0, 0, 'M').pos;
      this.onSlider(c, { angle: 50 });
    },
    onSlider(c, v) {
      const a = (v.angle * Math.PI) / 180;
      // remove previous moving parts
      for (const o of c.moving || []) c.geo.drawing.remove(o);
      c.moving = [];
      const dir = new c.THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
      const mPos = c.L.clone().addScaledVector(dir, 2.0);
      c.geo.points[2].mesh.position.copy(mPos);
      c.M.copy(mPos);
      const r = c.geo.ray(c.L, mPos);
      r.bar.userData.grow = undefined;
      r.bar.scale.y = r.bar.userData.len || c.L.distanceTo(r.end);
      r.bar.position.copy(c.L).lerp(r.end, 0.5);
      r.head.visible = true;
      const arc = c.geo.arc(c.L, c.K, mPos, 0.55);
      c.moving.push(r.bar, r.head, arc);
      let kind = 'dar açı';
      if (Math.abs(v.angle - 90) < 2) {
        kind = 'dik açı';
        c.moving.push(c.geo.rightAngleMark(c.L, c.K, mPos));
        if (!c.saidRight) {
          c.saidRight = true;
          c.sound.play('yum', { volume: 0.6 });
          c.bidik.react('joy', 1.5);
          c.say('Dik açı! Tam kitabın köşesi gibi.', 3);
        }
      } else if (v.angle > 90) kind = 'geniş açı';
      else c.saidRight = false;
      c.clearNotation();
      c.notation(`KLM açısı · ${v.angle}° · ${kind}`, c.L.clone().add(c.vec(1.1, 0.45, 0.65)));
    },
  },
  {
    id: 'cember',
    label: 'Çember',
    title: 'İpi ger, çember olsun!',
    body: `
      <p>Bıdık öğretmen sınıfı pikniğe götürdü. Elinde bir ip var. "Herkes benden 3 metre uzakta dursun ve el ele tutuşsun!" dedi. Mantılar ne şekil oluşturdu dersin? İpi ger, gör!</p>
      <p>Bir noktaya (merkez) <b>eşit uzaklıktaki</b> noktaların oluşturduğu şekil <b>çember</b>dir. Merkezden çembere giden ip <b>yarıçap (r)</b>, çemberin bir ucundan öbür ucuna merkezden geçen ip <b>çap (R)</b>. Çemberin içini de doldurursan <b>daire</b> olur: hulahop çember, bozuk para daire!</p>
      ${teacher('<p>Düz bir yüzeyde merkeze eşit uzaklıktaki noktaların oluşturduğu şekle <b>çember</b>, çember ile iç bölgesindeki tüm noktalara <b>daire</b> denir. Yarıçap r, çap R ile gösterilir; çap yarıçapın iki katıdır. Pergelle çizerken sivri uç merkeze konur, açıklık yarıçaptır. Etkinlik 7.</p>')}`,
    focus: 'circle',
    say: 'Herkes benden 3 metre uzakta dursun! Hadi, ipi gerin.',
    mood: 'proud',
    action: 'İpi ger!',
    secondary: 'Daireyi göster',
    sliders: [{ id: 'radius', label: 'Yarıçap', min: 10, max: 19, value: 15 }],
    enter(c) {
      c.geo.clear();
      c.geo.showKids(true);
      c.geo.scatterKids();
      c.center = new c.THREE.Vector3(0.3, c.geo.surfaceY + 0.075, 0.1);
      c.r = 1.5;
      c.ringDone = false;
    },
    onSlider(c, v) {
      c.r = v.radius / 10;
      if (c.ringDone) this.draw(c);
    },
    draw(c) {
      c.geo.clear();
      c.geo.showKids(true);
      c.geo.arrangeKidsCircle(c.center, c.r);
      c.geo.rope.visible = true;
      c.geo.addPoint(c.center.x, c.center.z, 'M');
      c.geo.circle(c.center.clone().setY(c.geo.surfaceY + 0.06), c.r);
      const edge = c.center.clone().add(c.vec(c.r, 0, 0));
      c.geo.bar(c.center, edge, c.geo.accentMat, 0.02);
      c.notation(`yarıçap r = ${(c.r * CM).toFixed(0)} cm`, c.center.clone().add(c.vec(c.r / 2, 0.42, 0.25)), 'measure');
      const l = c.center.clone().add(c.vec(-c.r * Math.cos(0.9), 0, -c.r * Math.sin(0.9)));
      const rr = c.center.clone().add(c.vec(c.r * Math.cos(0.9), 0, c.r * Math.sin(0.9)));
      c.geo.bar(l, rr, c.geo.accentMat, 0.02);
      c.notation(`çap R = ${(c.r * 2 * CM).toFixed(0)} cm`, rr.clone().add(c.vec(0.3, 0.42, 0.2)), 'measure');
      if (c.diskOn) c.geo.disk(c.center, c.r * 0.985);
    },
    act(c) {
      c.ringDone = true;
      c.diskOn = false;
      this.draw(c);
      c.sound.play('refill', { volume: 0.6 });
      c.bidik.react('joy', 2);
      c.bidik.doHop(0.8);
      c.say('Bir çember oldu! Ben merkezdeyim, ip de yarıçap.', 4);
    },
    exit(c) {
      c.geo.rope.visible = false;
    },
    act2(c) {
      if (!c.ringDone) this.act(c);
      c.diskOn = !c.diskOn;
      this.draw(c);
      c.sound.play('pick');
      c.say(c.diskOn ? 'İçi dolunca daire oldu. Bozuk para gibi!' : 'İçi boşaldı, yine çember. Hulahop gibi!', 4);
    },
  },
  {
    id: 'dikme',
    label: 'Dikme',
    title: 'En kısa yol hangisi?',
    body: `
      <p>Mühendis Zeynep, çatıdaki suyu (P noktası) aşağıdaki boruya (d doğrusu) en kısa yoldan indirmek istiyor. Dört boru çizdik. Sence hangisi en kısa? Bir tanesine tıkla.</p>
      <p>En kısa yol, doğruya <b>dik</b> inen yoldur; buna <b>dikme</b> denir. Dik inip inmediğini <b>gönye</b>yle anlarız. Ve bir sır: bir noktadan doğruya yalnızca <b>bir tane</b> dikme çizilebilir.</p>
      ${teacher('<p>Bir doğruya dışındaki bir noktadan yalnız bir dikme çizilebilir; dikme, noktadan doğruya en kısa uzaklıktır. Gönye ile çizilir. Ayrıca: bir noktadan sonsuz doğru, iki noktadan yalnız bir doğru geçer. Örnek 7–8, Etkinlik 11.</p>')}`,
    focus: 'board',
    say: 'Hangi boru en kısa? Tıkla, bakalım.',
    mood: 'thinking',
    click: true,
    enter(c) {
      c.geo.clear();
      c.geo.showKids(false);
      const zLine = 1.0;
      c.P = c.geo.addPoint(0.2, -1.2, 'P').pos;
      c.geo.line(c.geo.p(-2.5, zLine), c.geo.p(2.5, zLine));
      c.notation('d doğrusu', c.geo.p(2.2, zLine).add(c.vec(0.2, 0.4, 0.35)));
      c.feet = [-1.7, -0.7, 0.2, 1.3].map((x) => c.geo.p(x, zLine));
      c.candidates = c.feet.map((f, i) => {
        const b = c.geo.bar(c.P, f, c.geo.softMat, 0.028);
        b.userData.grow.dur = 0.4 + i * 0.1;
        return b;
      });
      c.picked = false;
    },
    onClick(c, x, z) {
      if (c.picked) return;
      const pt = c.geo.p(x, z);
      let best = -1;
      let bestD = 0.45;
      c.feet.forEach((f, i) => {
        // distance from click to the candidate segment
        const ab = f.clone().sub(c.P);
        const t = Math.max(0, Math.min(1, pt.clone().sub(c.P).dot(ab) / ab.lengthSq()));
        const d = c.P.clone().addScaledVector(ab, t).distanceTo(pt);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best < 0) return;
      const ok = best === 2;
      c.candidates[best].material = ok ? c.geo.goodMat : c.geo.accentMat;
      if (ok) {
        c.picked = true;
        c.geo.rightAngleMark(c.feet[2], c.P, c.geo.p(2, 1.0));
        c.geo.setSquare.visible = true;
        c.geo.setSquare.position.copy(c.feet[2]).setY(c.geo.surfaceY + 0.02).add(c.vec(0.05, 0, 0.02));
        c.geo.setSquare.rotation.set(-Math.PI / 2, 0, Math.PI);
        c.notation('dikme', c.P.clone().lerp(c.feet[2], 0.5).add(c.vec(0.35, 0.45, 0)));
        c.sound.play('yum');
        c.bidik.react('joy', 2);
        c.bidik.doHop(0.8);
        c.say('Bildin! Dik inen boru en kısası. Gönye de öyle diyor.', 4);
      } else {
        c.sound.play('grab', { volume: 0.5 });
        c.bidik.react('worried', 1.5);
        c.say('Hmm, bu eğri gidiyor, daha uzun. Bir daha dene!', 3);
      }
    },
  },
  {
    id: 'paralel',
    label: 'Paralel',
    title: 'Hep aynı uzaklıkta: paralel',
    body: `
      <p>Bir doğrumuz var. Gönyeyle ondan hep <b>aynı uzaklıkta</b> noktalar koyalım, sonra bu noktaları çizgeçle birleştirelim. Ne oluyor? Yepyeni bir doğru! Ve iki doğru hiç kesişmiyor: tren rayları gibi.</p>
      <p>Bu arada, çizim yaptığımız tahta bir <b>düzlem</b> modeli. Gerçek düzlemin kenarı ve kalınlığı yok, her yöne sonsuza kadar uzanıyor. Bıdık'ın tahtası sadece küçük bir parçası.</p>
      ${teacher('<p>Bir doğruya eşit uzaklıktaki noktalar yeni bir doğru oluşturur; iki doğru <b>paralel</b>dir. Gönye ve ölçüsüz cetvelle çizilir. <b>Düzlem</b>, kenarları ve kalınlığı olmayan, her yönden sonsuza uzanan düz yüzeyin modelidir. Etkinlik 3 (Özellikler), Etkinlik 12.</p>')}`,
    focus: 'board',
    say: 'Hep aynı uzaklıkta noktalar koyacağız. Sonra birleştir!',
    mood: 'curious',
    action: 'Noktaları koy',
    secondary: 'Çizgeçle birleştir',
    sliders: [{ id: 'gap', label: 'Uzaklık', min: 6, max: 14, value: 10 }],
    enter(c) {
      c.geo.clear();
      c.geo.showKids(false);
      c.zLine = 0.9;
      c.gap = 1.0;
      c.geo.line(c.geo.p(-2.5, c.zLine), c.geo.p(2.5, c.zLine));
      c.notation('AD doğrusu', c.geo.p(2.2, c.zLine).add(c.vec(0.2, 0.4, 0.35)));
      c.placed = false;
      c.joined = false;
    },
    onSlider(c, v) {
      c.gap = v.gap / 10;
      if (c.placed) {
        c.placed = false;
        c.joined = false;
        this.enter(c);
        this.act(c);
      }
    },
    act(c) {
      if (c.placed) return;
      c.placed = true;
      c.geo.setSquare.visible = true;
      [-1.8, -0.9, 0, 0.9, 1.8].forEach((x, i) => {
        c.later(0.25 * i, () => {
          c.geo.setSquare.position.copy(c.geo.p(x, c.zLine)).setY(c.geo.surfaceY + 0.02).add(c.vec(0.04, 0, 0.02));
          c.geo.setSquare.rotation.set(-Math.PI / 2, 0, Math.PI);
          c.geo.addPoint(x, c.zLine - c.gap, i === 0 ? 'B' : i === 4 ? 'C' : null, { size: i === 0 || i === 4 ? 1 : 0.6 });
          c.sound.play('drip', { volume: 0.5 });
        });
      });
      c.later(1.5, () => {
        c.geo.setSquare.visible = false;
        c.notation(`hepsi ${(c.gap * CM).toFixed(0)} cm uzakta`, c.geo.p(0, c.zLine - c.gap / 2).add(c.vec(0.9, 0.4, 0)), 'measure');
        c.say('Hepsi aynı uzaklıkta. Şimdi birleştir!', 3);
      });
    },
    act2(c) {
      if (!c.placed) this.act(c);
      if (c.joined) return;
      c.joined = true;
      c.later(c.placed ? 0 : 1.8, () => {
        const a = c.geo.p(-2.5, c.zLine - c.gap);
        const b = c.geo.p(2.5, c.zLine - c.gap);
        c.geo.placeStraightedge(a, b);
        c.later(0.4, () => {
          c.geo.line(a, b);
          c.notation('BC doğrusu · paralel', c.geo.p(2.2, c.zLine - c.gap).add(c.vec(0.2, 0.4, -0.3)));
          c.sound.play('lift');
          c.bidik.react('joy', 2);
          c.bidik.doHop(0.7);
          c.say('İki doğru hiç kesişmiyor. Tren rayları gibi: paralel!', 4);
        });
        c.later(1.6, () => (c.geo.straightedge.visible = false));
      });
    },
  },
  {
    id: 'geombala',
    label: 'Geombala',
    title: 'Geombala: hangi gösterim?',
    body: `
      <p>Kitaptaki Geombala oyununu Bıdık'la oynayalım! Tahtada bir çizim var. Aşağıdaki gösterimlerden hangisi ona ait? Beş tur, her doğru bir puan.</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Geombala (Etkinlik 6): temel geometrik kavramların çizimleri ile sembolle gösterimlerini eşleştirme oyunu. Gösterimler: A noktası, [AB] doğru parçası, |AB| uzunluk, [AB ışını, AB doğrusu, ABC açısı.</p>')}`,
    focus: 'board',
    say: 'Geombala zamanı! Çizime bak, gösterimini seç.',
    mood: 'proud',
    game: true,
    enter(c) {
      c.geo.clear();
      c.geo.showKids(false);
      c.startGame();
    },
  },
];

/** Geombala rounds: each draws something and asks for its notation. */
export const GAME = [
  { key: 'point', answer: 'A noktası', draw: (c) => c.geo.addPoint(0.2, 0.1, 'A') },
  {
    key: 'segment',
    answer: '[AB]',
    draw: (c) => {
      const a = c.geo.addPoint(-1.1, 0.4, 'A').pos;
      const b = c.geo.addPoint(1.1, -0.3, 'B').pos;
      c.geo.segment(a, b);
    },
  },
  {
    key: 'ray',
    answer: '[AB',
    draw: (c) => {
      const a = c.geo.addPoint(-1.1, 0.4, 'A').pos;
      const b = c.geo.addPoint(0.6, -0.1, 'B').pos;
      c.geo.ray(a, b);
    },
  },
  {
    key: 'line',
    answer: 'AB doğrusu',
    draw: (c) => {
      const a = c.geo.addPoint(-0.9, 0.3, 'A').pos;
      const b = c.geo.addPoint(0.9, -0.2, 'B').pos;
      c.geo.line(a, b);
    },
  },
  {
    key: 'angle',
    answer: 'ABC açısı',
    draw: (c) => {
      const b = c.geo.addPoint(-0.6, 0.5, 'B').pos;
      const a = c.geo.addPoint(1.6, 0.5, 'A').pos;
      const cc = c.geo.addPoint(0.6, -1.0, 'C').pos;
      c.geo.ray(b, a);
      c.geo.ray(b, cc);
      c.geo.arc(b, a, cc, 0.5);
    },
  },
  {
    key: 'length',
    answer: '|AB| = 5 cm',
    draw: (c) => {
      const a = c.geo.addPoint(-1.2, 0.45, 'A').pos;
      const b = c.geo.addPoint(1.2, -0.25, 'B').pos;
      c.geo.segment(a, b);
      c.geo.placeStraightedge(a, b, c.geo.ruler);
    },
  },
];
export const NOTATIONS = ['A noktası', '[AB]', '[AB', 'AB doğrusu', 'ABC açısı', '|AB| = 5 cm'];
