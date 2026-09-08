/**
 * Lesson 03 — Açılar ve çokgenler (5th grade), continuing on Bıdık's board.
 */
const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;
const KIND_HTML = { dar: '<span class="kind-dar">dar açı</span>', dik: '<span class="kind-dik">dik açı</span>', genis: '<span class="kind-genis">geniş açı</span>', dogru: '<b>doğru açı</b>', tam: '<b>tam açı</b>' };

function angleAt(v, a, b) {
  const da = a.clone().sub(v);
  const db = b.clone().sub(v);
  const cos = da.dot(db) / (da.length() * db.length());
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
function degOf(v, p) {
  const d = p.clone().sub(v);
  return ((Math.atan2(-d.z, d.x) * 180) / Math.PI + 360) % 360;
}

export const STEPS = [
  {
    id: 'derece',
    label: 'Derece',
    title: 'Açıyı nasıl ölçeriz? Derece!',
    body: `
      <p>Dolabın kapağı ne kadar açık? Makasın kolları ne kadar? "Biraz", "çok" demek yetmez; bir birim lazım. Eski bir uygarlık tam dönüşü <b>360</b> eş dilime bölmüş. Her dilim <b>1 derece</b>, yani 1°.</p>
      <p>Tahtadaki açıölçere bak. Kaydırıcıyla OM ışınını döndür: 90° <span class="kind-dik">dik açı</span>, 180° <b>doğru açı</b>, 360° <b>tam açı</b>. Bıdık'ın istediği açıları yapabilir misin?</p>
      ${teacher('<p>Bir tam açı 360 eş açıya bölündüğünde her birinin ölçüsü 1 derecedir (°). Açıölçer standart birimlerle ölçer: açının köşesi merkeze, bir kolu 0°\'ye konur; diğer kolun gösterdiği değer açının ölçüsüdür. Dik açı 90°, doğru açı 180°, tam açı 360°. Kollar uzatılsa da ölçü değişmez. (Açıları Ölçme, Örnek 1–3)</p>')}`,
    focus: 'angle',
    say: 'Bir tam dönüş 360 dilim. Her dilim bir derece!',
    mood: 'curious',
    sliders: [{ id: 'angle', label: 'Açı', min: 0, max: 360, value: 60 }],
    targets: [45, 90, 135, 180, 360],
    enter(c) {
      c.geo.clear();
      c.O = c.geo.p(-0.3, 0.25);
      c.targetIndex = 0;
      c.setTarget(this.targets[0]);
      this.onSlider(c, { angle: 60 });
    },
    onSlider(c, v) {
      c.geo.clear();
      const deg = v.angle;
      c.geo.protractor(c.O, true, 1.5);
      c.geo.addPoint(c.O.x, c.O.z, 'O');
      c.geo.rayAt(c.O, 0).bar.userData.grow = undefined;
      const k = c.O.clone().addScaledVector(c.geo.dirDeg(0), 2.2);
      c.geo.addPoint(k.x, k.z, 'K', { size: 0.8 });
      const m = c.O.clone().addScaledVector(c.geo.dirDeg(deg), 2.2);
      c.geo.addPoint(m.x, m.z, 'M', { size: 0.8 });
      const r = c.geo.rayAt(c.O, deg);
      r.bar.userData.grow = undefined;
      const kind = c.angleKind(deg);
      if (deg > 0) c.geo.arcSweep(c.O, 0, deg, 0.62, c.geo.kindMat(kind), 0.024);
      if (kind === 'dik') c.geo.rightAngleMark(c.O, k, m);
      c.geo.drawing.traverse((o) => {
        if (o.userData.grow) {
          o.scale.y = o.userData.grow.len;
          o.position.copy(o.userData.grow.a).lerp(o.userData.grow.b, 0.5);
          o.userData.grow = undefined;
        }
        if (o.userData.target !== undefined) o.scale.setScalar(o.userData.target);
      });
      c.notation(`m(KOM) = ${deg}° · ${c.KIND_LABEL[kind]}`, c.O.clone().add(c.vec(2.6, 0.5, 1.25)));
      // targets
      const t = this.targets[c.targetIndex];
      if (t !== undefined && Math.abs(deg - t) <= 2) {
        c.sound.play('yum', { volume: 0.6 });
        c.bidik.react('joy', 1.5);
        c.bidik.doHop(0.6);
        c.targetIndex++;
        const next = this.targets[c.targetIndex];
        if (next !== undefined) {
          c.say(`${t}° oldu! Şimdi ${next}° yap.`, 3.5);
          c.setTarget(next);
        } else {
          c.say('Hepsini yaptın! Dik, doğru ve tam açıyı artık tanıyorsun.', 5);
          c.setTarget(null);
        }
      }
    },
  },
  {
    id: 'es',
    label: 'Eş açılar',
    title: 'Aynı ölçü, eş açı',
    body: `
      <p>Soldaki açı Bıdık'ın. Sağdaki senin. Kaydırıcıyla kendi açını Bıdık'ınkiyle aynı ölçüye getir. Ölçüleri eşit olan açılara <b>eş açılar</b> denir.</p>
      <p>Küçük bir sır: açının kolları uzasa da kısalsa da ölçüsü değişmez. Ölçü, kolların arasındaki açıklıktır; kolların boyu değil.</p>
      ${teacher('<p>Ölçüleri birbirine eşit olan açılara <b>eş açılar</b> denir. Verilen bir açıya eş açı oluşturma: açıölçerle ölç, aynı ölçüde çiz. Kolların uzunluğu ölçüyü etkilemez. (Açıları Ölçme, Örnek 4)</p>')}`,
    focus: 'board',
    say: 'Benim açımla aynı ölçüde bir açı yapabilir misin?',
    mood: 'curious',
    sliders: [{ id: 'mine', label: 'Senin açın', min: 10, max: 170, value: 40 }],
    action: 'Yeni açı ver',
    enter(c) {
      c.target = 70;
      c.left = c.geo.p(-2.0, 0.6);
      c.right = c.geo.p(1.1, 0.6);
      this.onSlider(c, { mine: 40 });
    },
    act(c) {
      c.target = 20 + Math.round(Math.random() * 14) * 10;
      c.matched = false;
      this.onSlider(c, { mine: c.lastMine || 40 });
      c.say(`Yeni açım ${c.target}°. Eşini yap!`, 3);
    },
    onSlider(c, v) {
      c.lastMine = v.mine;
      c.geo.clear();
      const draw = (o, deg, names, kind) => {
        c.geo.addPoint(o.x, o.z, names[0]);
        const a = o.clone().addScaledVector(c.geo.dirDeg(0), 1.5);
        const b = o.clone().addScaledVector(c.geo.dirDeg(deg), 1.5);
        c.geo.addPoint(a.x, a.z, names[1], { size: 0.7 });
        c.geo.addPoint(b.x, b.z, names[2], { size: 0.7 });
        c.geo.bar(o, a).userData.grow = undefined;
        c.geo.bar(o, b).userData.grow = undefined;
        c.geo.arcSweep(o, 0, deg, 0.5, c.geo.kindMat(kind), 0.022);
      };
      draw(c.left, c.target, ['B', 'A', 'C'], c.angleKind(c.target));
      draw(c.right, v.mine, ['L', 'K', 'M'], c.angleKind(v.mine));
      c.geo.drawing.traverse((o) => {
        if (o.userData.grow) {
          o.scale.y = o.userData.grow.len;
          o.position.copy(o.userData.grow.a).lerp(o.userData.grow.b, 0.5);
          o.userData.grow = undefined;
        }
        if (o.userData.target !== undefined) o.scale.setScalar(o.userData.target);
      });
      c.notation(`m(ABC) = ${c.target}°`, c.left.clone().add(c.vec(0.7, 0.45, -1.1)), 'measure');
      c.notation(`m(KLM) = ${v.mine}°`, c.right.clone().add(c.vec(0.7, 0.45, -1.1), 'measure'), 'measure');
      if (Math.abs(v.mine - c.target) <= 2) {
        c.notation('eş açılar!', c.geo.p(-0.4, -0.9).add(c.vec(0, 0.5, 0)));
        if (!c.matched) {
          c.matched = true;
          c.sound.play('yum', { volume: 0.6 });
          c.bidik.react('joy', 1.5);
          c.bidik.doHop(0.6);
          c.say('İkisi de aynı ölçüde: eş açılar!', 3.5);
        }
      } else c.matched = false;
    },
  },
  {
    id: 'kesisen',
    label: 'Kesişen',
    title: 'İki doğru kesişince dört açı',
    body: `
      <p>AB doğrusu duruyor, CD doğrusunu sen döndür. Kesiştikleri noktada <b>dört açı</b> oluşuyor. Karşı karşıya bakanlar <b>ters açı</b>: ölçüleri hep eşit. Yan yana olanlar <b>komşu açı</b>: toplamları hep 180°.</p>
      <p>Tam 90°'ye getir: dört açı da dik olur, doğrular <b>dik doğrular</b>dır. Yazılışı: AB ⊥ CD.</p>
      ${teacher('<p>Düzlemde yalnız bir ortak noktası bulunan doğrulara <b>kesişen doğrular</b> denir; kesişimde iki dar ve iki geniş açı ya da dört dik açı oluşur. Zıt yönlere bakan açılar <b>ters açılar</b>dır ve ölçüleri eşittir; köşeleri ve birer kolları ortak olan açılar <b>komşu açılar</b>dır, kesişimde toplamları 180°\'dir. Açıları 90° olan doğrular <b>dik doğrular</b>: AB ⊥ CD. (Doğruların Yolculuğu, Etkinlik 1–3)</p>')}`,
    focus: 'board',
    say: 'Karşılıklı açılar hep eşit. Yan yana olanlar 180!',
    mood: 'curious',
    sliders: [{ id: 'rot', label: 'CD açısı', min: 10, max: 170, value: 55 }],
    choices: [
      { label: 'Ters açıların ölçüleri eşittir', ok: true, why: 'Evet! Karşı karşıya bakan açılar hep aynı ölçüde.' },
      { label: 'Ters açıların toplamı 180°\'dir', ok: false, why: 'Toplamı 180° olanlar komşu açılar. Ters açılar eşittir.' },
      { label: 'Ters açılardan biri hep diktir', ok: false, why: 'Sadece doğrular dik kesişirse. Ters açılar sadece eşittir.' },
    ],
    enter(c) {
      c.O = c.geo.p(-0.2, 0.1);
      this.onSlider(c, { rot: 55 });
    },
    onSlider(c, v) {
      c.geo.clear();
      const O = c.O;
      const t = v.rot;
      c.geo.addPoint(O.x, O.z, 'O', { size: 0.8 });
      const ends = [[0, 'B'], [180, 'A'], [t, 'D'], [t + 180, 'C']];
      for (const [deg, n] of ends) {
        const p = O.clone().addScaledVector(c.geo.dirDeg(deg), 2.1);
        c.geo.addPoint(p.x, p.z, n, { size: 0.7 });
      }
      c.geo.lineAt(O, 0);
      c.geo.lineAt(O, t);
      const angles = [[0, t], [t, 180 - t], [180, t], [180 + t, 180 - t]];
      angles.forEach(([start, sweep], i) => {
        const kind = c.angleKind(sweep);
        c.geo.arcSweep(O, start, sweep, 0.45 + (i % 2) * 0.12, c.geo.kindMat(kind), 0.022);
        const mid = O.clone().addScaledVector(c.geo.dirDeg(start + sweep / 2), 0.95);
        c.notation(`${sweep}°`, mid.clone().add(c.vec(0, 0.35, 0)), 'measure');
        if (kind === 'dik') c.geo.rightAngleMark(O, O.clone().addScaledVector(c.geo.dirDeg(start), 1), O.clone().addScaledVector(c.geo.dirDeg(start + sweep), 1), 0.22);
      });
      c.instant();
      const dik = Math.abs(t - 90) < 1.5;
      c.notation(dik ? 'AB ⊥ CD · dik doğrular' : 'AB ve CD kesişen doğrular', O.clone().add(c.vec(0.3, 0.5, -1.7)));
      c.notation(dik ? '4 dik açı' : `2 ${c.KIND_LABEL.dar}, 2 ${c.KIND_LABEL.genis} · ters açılar eşit`, O.clone().add(c.vec(0.3, 0.45, 1.75)), 'measure');
      if (dik && !c.saidDik) {
        c.saidDik = true;
        c.sound.play('yum', { volume: 0.6 });
        c.bidik.react('joy', 1.5);
        c.say('Dört dik açı! AB ⊥ CD, dik doğrular.', 3.5);
      } else if (!dik) c.saidDik = false;
    },
  },
  {
    id: 'paralel',
    label: 'Paralel',
    title: 'Kesişen mi, paralel mi, çakışık mı?',
    body: `
      <p>Elektrik telleri birbirine hiç değmez. Kaldırım taşlarının çizgileriyse belli yerlerde buluşur. Doğrular da böyle: ya bir noktada <b>kesişir</b>, ya hiç kesişmez (<b>paralel</b>, AB // CD), ya da üst üste biner (<b>çakışık</b>).</p>
      <p>Alttaki iki kaydırıcıyla dene: CD doğrusunu eğ ya da AB'den uzaklaştır. Bıdık hangi durumda olduğunu söyleyecek.</p>
      ${teacher('<p>Bir doğruya eşit uzaklıkta ve aynı doğrultudaki noktalar bir doğru oluşturur; aralarındaki uzaklık değişmeyen doğrulara <b>paralel doğrular</b> denir, "//" ile gösterilir (AB // KL, "AB doğrusu KL doğrusuna paraleldir"). Paralel doğrular kesişmez, açı oluşturmaz. Tüm noktaları ortak olan doğrular <b>çakışık</b>tır. (Örnek 2, Düzlemde Açı Oluşturmayan Doğrular, İki Doğrunun Çakışması)</p>')}`,
    focus: 'board',
    say: 'Eğ, uzaklaştır, üst üste koy. Bakalım ne oluyor?',
    mood: 'curious',
    sliders: [
      { id: 'tilt', label: 'Eğim', min: -30, max: 30, value: 0 },
      { id: 'dist', label: 'Uzaklık', min: 0, max: 14, value: 9 },
    ],
    enter(c) {
      this.onSlider(c, { tilt: 0, dist: 9 });
    },
    onSlider(c, v) {
      c.geo.clear();
      const yAB = 0.7;
      const a = c.geo.p(-2.4, yAB);
      const b = c.geo.p(2.4, yAB);
      c.geo.addPoint(a.x, a.z, 'A', { size: 0.7 });
      c.geo.addPoint(b.x, b.z, 'B', { size: 0.7 });
      c.geo.line(a, b);
      const mid = c.geo.p(0, yAB - v.dist / 10);
      const dir = c.geo.dirDeg(v.tilt);
      const cpt = mid.clone().addScaledVector(dir, -2.2);
      const dpt = mid.clone().addScaledVector(dir, 2.2);
      c.geo.addPoint(cpt.x, cpt.z, 'C', { size: 0.7 });
      c.geo.addPoint(dpt.x, dpt.z, 'D', { size: 0.7 });
      c.geo.line(cpt, dpt, v.dist === 0 && v.tilt === 0 ? c.geo.accentMat : c.geo.lineMat);
      c.instant();
      let state;
      if (v.tilt !== 0) {
        state = 'kesişen doğrular';
        // intersection with AB
        const tt = (yAB - mid.z) / -dir.z;
        const x = mid.x + dir.x * tt;
        if (Math.abs(x) < 2.6) {
          c.geo.addPoint(x, yAB, null, { color: '#5b7c99', size: 0.9 });
          const kind = c.angleKind(Math.abs(v.tilt));
          c.notation(`kesişim noktası · ${Math.abs(v.tilt)}° ${c.KIND_LABEL[kind]}`, c.geo.p(x, yAB).add(c.vec(0.2, 0.45, -0.55)), 'measure');
        } else c.notation('kesişim tahtanın dışında, ama var!', c.geo.p(0, yAB).add(c.vec(0, 0.45, -0.55)), 'measure');
      } else if (v.dist === 0) state = 'çakışık doğrular';
      else state = 'paralel doğrular · AB // CD';
      c.notation(state, c.geo.p(0, yAB - v.dist / 10).add(c.vec(0, 0.5, 0.75)));
      if (state !== c.lastState) {
        c.lastState = state;
        c.bidik.react(state.startsWith('paralel') ? 'joy' : 'surprised', 1.4);
        c.say(state.startsWith('kesiş') ? 'Bir noktada buluştular: kesişen doğrular.' : state.startsWith('çakışık') ? 'Üst üste bindiler, her noktaları ortak: çakışık!' : 'Hiç kesişmiyorlar: paralel. AB // CD.', 3.5);
      }
    },
  },
  {
    id: 'tumler',
    label: 'Tümler',
    title: 'Toplamı 90 mı, 180 mi?',
    body: `
      <p>Soldaki dik açıyı bir ışınla ikiye böldük. İki parçanın toplamı hep 90°: bunlara <b>tümler açılar</b> denir. Sağdaki doğru açıyı böldük: toplamı hep 180°, bunlar <b>bütünler açılar</b>.</p>
      <p>Kaydırıcıyı oynat, Bıdık toplamları hesaplasın. Sonra alttaki soruyu çöz: 38°'nin tümleri kaç derece?</p>
      ${teacher('<p>Ölçüleri toplamı 90° olan iki açıya <b>tümler açılar</b>, komşu olanlarına komşu tümler; toplamı 180° olan iki açıya <b>bütünler açılar</b>, komşu olanlarına komşu bütünler açılar denir. (Örnek 4–7)</p>')}`,
    focus: 'board',
    say: 'Tümler doksan, bütünler yüz seksen. Ezber değil, gör!',
    mood: 'happy',
    sliders: [{ id: 'x', label: 'Açı', min: 10, max: 80, value: 35 }],
    choices: [
      { label: '52°', ok: true, why: 'Doğru! 38 + 52 = 90. Tümler açılar 90 eder.' },
      { label: '142°', ok: false, why: '38 + 142 = 180. Bu bütünleri olurdu. Tümler için 90 lazım.' },
      { label: '62°', ok: false, why: '38 + 62 = 100. 90 olmalı; cevap 52°.' },
    ],
    enter(c) {
      this.onSlider(c, { x: 35 });
    },
    onSlider(c, v) {
      c.geo.clear();
      const x = v.x;
      const L = c.geo.p(-2.1, 0.7);
      const R = c.geo.p(0.7, 0.7);
      // left: right angle split
      c.geo.addPoint(L.x, L.z, 'O', { size: 0.8 });
      c.geo.rayAt(L, 0);
      c.geo.rayAt(L, 90);
      c.geo.rayAt(L, x, c.geo.accentMat);
      c.geo.rightAngleMark(L, L.clone().addScaledVector(c.geo.dirDeg(0), 1), L.clone().addScaledVector(c.geo.dirDeg(90), 1), 0.2);
      c.geo.arcSweep(L, 0, x, 0.55, c.geo.kindMat('dar'), 0.022);
      c.geo.arcSweep(L, x, 90 - x, 0.7, c.geo.kindMat('genis'), 0.022);
      c.notation(`${x}° + ${90 - x}° = 90° · tümler`, L.clone().add(c.vec(0.9, 0.5, -1.6)));
      // right: straight angle split
      c.geo.addPoint(R.x, R.z, 'P', { size: 0.8 });
      c.geo.rayAt(R, 0);
      c.geo.rayAt(R, 180);
      c.geo.rayAt(R, x + 40, c.geo.accentMat);
      c.geo.arcSweep(R, 0, x + 40, 0.55, c.geo.kindMat(c.angleKind(x + 40)), 0.022);
      c.geo.arcSweep(R, x + 40, 140 - x, 0.7, c.geo.kindMat(c.angleKind(140 - x)), 0.022);
      c.notation(`${x + 40}° + ${140 - x}° = 180° · bütünler`, R.clone().add(c.vec(0.9, 0.5, -1.6)));
      c.instant();
    },
  },
  {
    id: 'kesen',
    label: 'Kesen',
    title: 'İki paralel, bir kesen: sekiz açı',
    body: `
      <p>Demir yolu köprülerindeki çelik çubuklara bak: iki paralel doğruyu bir üçüncüsü kesiyor. Bu üçüncü doğruya <b>kesen</b> denir. Kesişimlerde tam <b>sekiz açı</b> oluşur.</p>
      <p>Keseni döndür ve say: kaç dar, kaç geniş? Tam dik kesince ne oluyor? Bir de "Üç doğru bir noktada" düğmesine bas; kavşak gibi!</p>
      ${teacher('<p>İki doğruyu farklı noktalarda kesen üçüncü doğruya <b>kesen</b> denir. İki paralel doğru ve bir kesende dört dar ve dört geniş açı ya da sekiz dik açı oluşur; eş, ters ve komşu açı çiftleri belirlenir. Üç doğrunun bir noktada kesişmesinde iki geniş ve dört dar, iki dik ve dört dar ya da altı dar açı oluşur. (Etkinlik 4–5, Örnek 8)</p>')}`,
    focus: 'board',
    say: 'Sekiz açı! Say bakalım kaçı dar, kaçı geniş.',
    mood: 'curious',
    sliders: [{ id: 'rot', label: 'Kesen açısı', min: 20, max: 160, value: 60 }],
    action: 'Üç doğru bir noktada',
    secondary: 'İki paralel ve kesen',
    enter(c) {
      c.mode = 'kesen';
      this.onSlider(c, { rot: 60 });
    },
    act(c) {
      c.mode = 'uc';
      this.onSlider(c, { rot: c.lastRot || 60 });
      c.say('Üç doğru tek noktada: altı açı. Kavşak gibi!', 3.5);
    },
    act2(c) {
      c.mode = 'kesen';
      this.onSlider(c, { rot: c.lastRot || 60 });
    },
    onSlider(c, v) {
      c.lastRot = v.rot;
      c.geo.clear();
      const t = v.rot;
      const kinds = { dar: 0, dik: 0, genis: 0 };
      const drawX = (O, degs, radius) => {
        // degs: sorted directions of rays around O
        for (let i = 0; i < degs.length; i++) {
          const start = degs[i];
          const sweep = ((degs[(i + 1) % degs.length] - start + 360) % 360) || 360;
          const kind = c.angleKind(sweep);
          kinds[kind] = (kinds[kind] || 0) + 1;
          c.geo.arcSweep(O, start, sweep, radius + (i % 2) * 0.1, c.geo.kindMat(kind), 0.02);
        }
      };
      if (c.mode === 'kesen') {
        const O1 = c.geo.p(-0.9, -0.6);
        const O2 = c.geo.p(0.9, 0.7);
        const dir = c.geo.dirDeg(t);
        // parallel lines through O1 and O2 (horizontal); transversal through their midpoint
        c.geo.lineAt(O1, 0);
        c.geo.lineAt(O2, 0);
        const mid = O1.clone().add(O2).multiplyScalar(0.5);
        c.geo.lineAt(mid, t, c.geo.accentMat);
        // intersections with the two horizontals
        for (const O of [O1, O2]) {
          const s = (O.z - mid.z) / dir.z;
          const X = mid.clone().addScaledVector(dir, s);
          c.geo.addPoint(X.x, X.z, null, { size: 0.7 });
          drawX(X, [0, t, 180, t + 180].map((d) => d % 360).sort((a, b) => a - b), 0.36);
        }
        c.notation('AB // CD · EF kesen', c.geo.p(2.0, 0.7).add(c.vec(0.3, 0.45, -0.5)));
      } else {
        const O = c.geo.p(0, 0.1);
        const degs = [0, t, Math.min(170, t + 60)];
        degs.forEach((d) => c.geo.lineAt(O, d, d === 0 ? c.geo.lineMat : c.geo.accentMat));
        c.geo.addPoint(O.x, O.z, 'B', { size: 0.8 });
        drawX(O, degs.concat(degs.map((d) => d + 180)).map((d) => d % 360).sort((a, b) => a - b), 0.5);
        c.notation('Üç doğru B noktasında kesişiyor', c.geo.p(0, 0.1).add(c.vec(0.3, 0.5, -1.9)));
      }
      c.instant();
      const parts = [];
      if (kinds.dar) parts.push(`${kinds.dar} dar`);
      if (kinds.dik) parts.push(`${kinds.dik} dik`);
      if (kinds.genis) parts.push(`${kinds.genis} geniş`);
      c.notation(parts.join(' · ') + ' açı', c.geo.p(0, 0).add(c.vec(0, 0.45, 1.85)), 'measure');
    },
  },
  {
    id: 'cokgen',
    label: 'Çokgen',
    title: 'Doğrulardan çokgenlere',
    body: `
      <p>Halı desenlerindeki üçgenler, kareler… Hepsi doğruların kesişmesinden doğar. "Doğru ekle" düğmesine bas: doğrular birbirini kessin, sonuncusu ilkini kesince ortada <b>kapalı bir şekil</b> kalsın. İşte bir <b>çokgen</b>!</p>
      <p>Kaç doğru kullandıysan çokgenin o kadar kenarı var: üç doğru <b>üçgen</b>, dört doğru <b>dörtgen</b>, beş doğru <b>beşgen</b>… Adı köşe harfleriyle sırayla okunur: ABC üçgeni.</p>
      ${teacher('<p>En az üç doğrunun (ilk doğrunun son doğruyla kesişmesi koşuluyla) ardışık kesişimiyle oluşan kapalı şekle <b>çokgen</b> denir; kenar sayısına göre isimlendirilir (üçgen, dörtgen, beşgen…). Köşeler ardışık okunarak adlandırılır: BCDEFA altıgeni. (Doğrulardan Çokgenlere, Örnek 1–2)</p>')}`,
    focus: 'board',
    say: 'Doğru ekle, kapalı şekil çıksın. Kaç kenar, kaç doğru?',
    mood: 'curious',
    action: 'Doğru ekle',
    secondary: 'Baştan',
    enter(c) {
      c.n = 3;
      c.added = 0;
      this.render(c);
    },
    act(c) {
      if (c.added >= c.n) {
        c.n = c.n >= 6 ? 3 : c.n + 1;
        c.added = 0;
      }
      c.added++;
      this.render(c);
      c.sound.play('drip', { volume: 0.6 });
      if (c.added === c.n) {
        const names = { 3: 'üçgen', 4: 'dörtgen', 5: 'beşgen', 6: 'altıgen' };
        c.sound.play('yum', { volume: 0.6 });
        c.bidik.react('joy', 1.5);
        c.bidik.doHop(0.6);
        c.say(`${c.n} doğru, ${c.n} kenar: ${names[c.n]}! Bir daha bas, daha çok kenar.`, 4);
      }
    },
    act2(c) {
      c.n = 3;
      c.added = 0;
      this.render(c);
    },
    render(c) {
      c.geo.clear();
      const n = c.n;
      const R = 1.25;
      const center = c.geo.p(-0.2, 0.1);
      const verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 360 + 90 + (n % 2 ? 0 : 180 / n);
        verts.push(center.clone().addScaledVector(c.geo.dirDeg(a), R));
      }
      const letters = 'ABCDEF';
      for (let i = 0; i < Math.min(c.added, n); i++) {
        const a = verts[i];
        const b = verts[(i + 1) % n];
        c.geo.line(a, b, c.added === n ? c.geo.lineMat : c.geo.softMat);
      }
      if (c.added >= n) {
        c.geo.polygonFill(verts, '#f6d6c0');
        verts.forEach((v, i) => c.geo.addPoint(v.x, v.z, letters[i]));
        for (let i = 0; i < n; i++) c.geo.bar(verts[i], verts[(i + 1) % n], c.geo.lineMat, 0.03);
        const names = { 3: 'üçgeni', 4: 'dörtgeni', 5: 'beşgeni', 6: 'altıgeni' };
        c.notation(`${letters.slice(0, n)} ${names[n]}`, center.clone().add(c.vec(0, 0.5, 0)));
      } else if (c.added > 0) c.notation(`${c.added} doğru · henüz kapalı değil`, center.clone().add(c.vec(0, 0.5, 0)), 'measure');
      c.instant();
    },
  },
  {
    id: 'elemanlar',
    label: 'Elemanlar',
    title: 'Köşe, kenar, iç açı, dış açı, köşegen',
    body: `
      <p>Bir dörtgenin parçalarını tanıyalım. Alttaki düğmelere basıp aç-kapa yap: <b>köşeler</b> doğruların kesiştiği noktalar, <b>kenarlar</b> aralarındaki doğru parçaları, <b>iç açılar</b> içerideki açılar, <b>dış açı</b> bir kenarı uzatınca dışarıda kalan komşu açı.</p>
      <p>Bir de <b>köşegen</b>: yan yana olmayan iki köşeyi birleştiren çizgi. Dörtgende kaç tane var? Üçgende neden hiç yok?</p>
      ${teacher('<p>Çokgenlerde temel elemanlar: <b>köşe</b> (doğruların kesişim noktaları), <b>kenar</b> (köşeler arası doğru parçaları), <b>iç açı</b> (kenarların iç bölgede oluşturduğu açılar), <b>dış açı</b> (iç açının komşu bütünler açısı). Ardışık olmayan iki köşeyi birleştiren doğru parçası <b>köşegen</b>dir; üçgende köşegen yoktur, dörtgende 2 tanedir. (Çokgenlerin Temel Elemanları, Etkinlik 4, Örnek 5)</p>')}`,
    focus: 'board',
    say: 'Düğmelere bas, dörtgenin parçalarını göster!',
    mood: 'happy',
    toggles: [
      { id: 'kose', label: 'Köşeler', on: true },
      { id: 'kenar', label: 'Kenarlar', on: true },
      { id: 'ic', label: 'İç açılar', on: false },
      { id: 'dis', label: 'Dış açı', on: false },
      { id: 'kosegen', label: 'Köşegenler', on: false },
    ],
    enter(c) {
      c.V = [c.geo.p(-1.6, 0.9), c.geo.p(1.3, 1.1), c.geo.p(1.7, -0.9), c.geo.p(-1.1, -0.7)];
      this.render(c);
    },
    onToggle(c) {
      this.render(c);
      c.sound.play('click');
    },
    render(c) {
      c.geo.clear();
      const V = c.V;
      const L = 'ABCD';
      const on = c.toggle;
      c.geo.polygonFill(V, '#f6e5d6');
      for (let i = 0; i < 4; i++) {
        const a = V[i];
        const b = V[(i + 1) % 4];
        if (on.kenar) {
          c.geo.bar(a, b, c.geo.lineMat, 0.03);
          c.notation(`[${L[i]}${L[(i + 1) % 4]}]`, a.clone().lerp(b, 0.5).add(c.vec(0, 0.4, 0)), 'measure');
        } else c.geo.bar(a, b, c.geo.softMat, 0.02);
        if (on.kose) c.geo.addPoint(a.x, a.z, L[i]);
        if (on.ic) {
          const prev = V[(i + 3) % 4];
          const s = degOf(a, b);
          const e = degOf(a, prev);
          const sweep = (e - s + 360) % 360;
          const inner = sweep <= 180 ? [s, sweep] : [e, 360 - sweep];
          const m = Math.round(angleAt(a, b, prev));
          c.geo.arcSweep(a, inner[0], inner[1], 0.42, c.geo.kindMat(c.angleKind(m)), 0.02);
          const mid = a.clone().addScaledVector(c.geo.dirDeg(inner[0] + inner[1] / 2), 0.75);
          c.notation(`${m}°`, mid.clone().add(c.vec(0, 0.35, 0)), 'measure');
        }
      }
      if (on.dis) {
        // exterior angle at C: extend BC beyond C
        const B = V[1];
        const C = V[2];
        const D = V[3];
        const ext = C.clone().addScaledVector(C.clone().sub(B).normalize(), 1.4);
        c.geo.bar(C, ext, c.geo.accentMat, 0.018);
        const s = degOf(C, ext);
        const e = degOf(C, D);
        const sweep = (e - s + 360) % 360;
        const arc = sweep <= 180 ? [s, sweep] : [e, 360 - sweep];
        const m = Math.round(angleAt(C, ext, D));
        c.geo.arcSweep(C, arc[0], arc[1], 0.5, c.geo.kindMat(c.angleKind(m)), 0.022);
        c.notation(`dış açı ${m}°`, C.clone().addScaledVector(c.geo.dirDeg(arc[0] + arc[1] / 2), 0.9).add(c.vec(0, 0.35, 0)), 'measure');
      }
      if (on.kosegen) {
        c.geo.dashed(V[0], V[2]);
        c.geo.dashed(V[1], V[3]);
        c.notation('[AC] ve [BD] köşegen', V[0].clone().lerp(V[2], 0.5).add(c.vec(0.4, 0.45, 0.3)));
      }
      c.notation('ABCD dörtgeni', c.geo.p(0, 0.1).add(c.vec(0, 0.5, 1.75)));
      c.instant();
    },
  },
  {
    id: 'duzgun',
    label: 'Düzgün',
    title: 'Hepsi eşit: düzgün çokgen',
    body: `
      <p>Bütün kenarları aynı uzunlukta ve bütün iç açıları aynı ölçüde olan çokgene <b>düzgün çokgen</b> denir. Eşkenar üçgen, kare, düzgün beşgen, düzgün altıgen… Petekler neden altıgen? Çünkü düzgün altıgenler boşluk bırakmadan yan yana dizilir!</p>
      <p>Kaydırıcıyla kenar sayısını değiştir. Kenar sayısı arttıkça iç açı büyüyor, şekil çembere yaklaşıyor. Fark ettin mi?</p>
      ${teacher('<p>Bütün kenar uzunlukları ve iç açı ölçüleri eşit olan çokgene <b>düzgün çokgen</b> denir; kenar sayısına göre okunur ("ABCDE düzgün beşgeni"). Düzgün n-genin iç açısı 180·(n−2)/n. Kare düzgündür; dikdörtgen kenarları eşit olmadığından düzgün değildir. (Örnek 3–4, Etkinlik 2–3)</p>')}`,
    focus: 'board',
    say: 'Kenarlar eşit, açılar eşit: düzgün çokgen!',
    mood: 'proud',
    sliders: [{ id: 'n', label: 'Kenar', min: 3, max: 8, value: 5 }],
    enter(c) {
      this.onSlider(c, { n: 5 });
    },
    onSlider(c, v) {
      c.geo.clear();
      const n = v.n;
      const names = { 3: 'eşkenar üçgen', 4: 'kare', 5: 'düzgün beşgen', 6: 'düzgün altıgen', 7: 'düzgün yedigen', 8: 'düzgün sekizgen' };
      const center = c.geo.p(-0.2, 0.1);
      const R = 1.35;
      const verts = [];
      for (let i = 0; i < n; i++) verts.push(center.clone().addScaledVector(c.geo.dirDeg((i / n) * 360 + 90), R));
      c.geo.polygonFill(verts, '#f4dcd0');
      const letters = 'ABCDEFGH';
      const side = verts[0].distanceTo(verts[1]) * 2;
      const inner = (180 * (n - 2)) / n;
      verts.forEach((p, i) => {
        c.geo.addPoint(p.x, p.z, letters[i], { size: 0.8 });
        const q = verts[(i + 1) % n];
        c.geo.bar(p, q, c.geo.lineMat, 0.03);
        const prev = verts[(i + n - 1) % n];
        const s = degOf(p, q);
        const e = degOf(p, prev);
        const sweep = (e - s + 360) % 360;
        const arc = sweep <= 180 ? [s, sweep] : [e, 360 - sweep];
        c.geo.arcSweep(p, arc[0], arc[1], 0.3, c.geo.kindMat(c.angleKind(inner)), 0.016);
        // equal-side tick
        const mid = p.clone().lerp(q, 0.5);
        const dir = q.clone().sub(p).normalize();
        const nrm = c.vec(-dir.z, 0, dir.x).multiplyScalar(0.08);
        c.geo._thin(mid.clone().add(nrm), mid.clone().sub(nrm));
        c.geo.drawing.add(c.geo._thin(mid.clone().add(nrm), mid.clone().sub(nrm)));
      });
      c.notation(`${letters.slice(0, n)} ${names[n]}`, center.clone().add(c.vec(0, 0.5, 0)));
      c.notation(`her kenar ${side.toFixed(1)} cm · her iç açı ${Math.round(inner)}°`, center.clone().add(c.vec(0, 0.45, 1.85)), 'measure');
      c.instant();
    },
  },
  {
    id: 'ucgen',
    label: 'Üçgenler',
    title: 'Açılarına göre üçgenler',
    body: `
      <p>Bir üçgende üç iç açı vardır. C köşesini kaydır ve açılara bak. Bir açı 90° ise <span class="kind-dik">dik açılı</span>, hepsi 90°'den küçükse <span class="kind-dar">dar açılı</span>, biri 90°'den büyükse <span class="kind-genis">geniş açılı</span> üçgen.</p>
      <p>Bir bilmece: iki dik açılı üçgen çizilebilir mi? Kaydırıcıyla dene; göreceksin ki üç açının toplamı hep 180°, ikisi birden 90 olamaz!</p>
      ${teacher('<p>Bir iç açısı 90° olan üçgene <b>dik açılı</b>, tüm iç açıları 90°\'den küçük olana <b>dar açılı</b>, bir iç açısı 90°\'den büyük olana <b>geniş açılı</b> üçgen denir. İki dik ya da iki geniş açı olamaz: iç açılar toplamı 180°\'dir. (Üçgen, Etkinlik 1, Örnek 1)</p>')}`,
    focus: 'board',
    say: 'C köşesini kaydır. Üçgen ne zaman dik oluyor?',
    mood: 'curious',
    sliders: [{ id: 'cx', label: 'C köşesi', min: -22, max: 22, value: -4 }],
    enter(c) {
      this.onSlider(c, { cx: -4 });
    },
    onSlider(c, v) {
      c.geo.clear();
      const A = c.geo.p(-1.6, 1.0);
      const B = c.geo.p(1.2, 1.0);
      const C = c.geo.p(v.cx / 10, -0.9);
      const V = [A, B, C];
      const L = 'ABC';
      c.geo.polygonFill(V, '#f6e5d6');
      const ms = [];
      for (let i = 0; i < 3; i++) {
        const p = V[i];
        const q = V[(i + 1) % 3];
        const prev = V[(i + 2) % 3];
        c.geo.bar(p, q, c.geo.lineMat, 0.03);
        c.geo.addPoint(p.x, p.z, L[i]);
        const m = Math.round(angleAt(p, q, prev));
        ms.push(m);
        const s = degOf(p, q);
        const e = degOf(p, prev);
        const sweep = (e - s + 360) % 360;
        const arc = sweep <= 180 ? [s, sweep] : [e, 360 - sweep];
        const kind = c.angleKind(m);
        c.geo.arcSweep(p, arc[0], arc[1], 0.38, c.geo.kindMat(kind), 0.02);
        if (kind === 'dik') c.geo.rightAngleMark(p, q, prev, 0.22);
        c.notation(`${m}°`, p.clone().addScaledVector(c.geo.dirDeg(arc[0] + arc[1] / 2), 0.7).add(c.vec(0, 0.35, 0)), 'measure');
      }
      const kinds = ms.map((m) => c.angleKind(m));
      const type = kinds.includes('dik') ? 'dik açılı üçgen' : kinds.includes('genis') ? 'geniş açılı üçgen' : 'dar açılı üçgen';
      c.notation(`ABC ${type}`, c.geo.p(-0.2, 1.0).add(c.vec(0, 0.5, 0.65)));
      c.notation(`${ms[0]} + ${ms[1]} + ${ms[2]} = ${ms[0] + ms[1] + ms[2]}°`, c.geo.p(v.cx / 10, -0.9).add(c.vec(0.9, 0.45, -0.45)), 'measure');
      c.instant();
      if (type !== c.lastType) {
        c.lastType = type;
        c.bidik.react(type.startsWith('dik') ? 'joy' : 'happy', 1.3);
        if (type.startsWith('dik')) c.say('Tam 90! Dik açılı üçgen.', 3);
      }
    },
  },
  {
    id: 'sinav',
    label: 'Sınav',
    title: 'Sen de öğrendin mi?',
    body: `
      <p>Bıdık soruyor, sen cevaplıyorsun. Beş kısa soru, her doğru bir puan.</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Değerlendirme: derece, açı çeşitleri, ters ve komşu açılar, tümler ve bütünler açılar, paralel ve dik doğrular, çokgen isimlendirme, düzgün çokgen, köşegen, açılarına göre üçgenler.</p>')}`,
    focus: 'board',
    say: 'Sınav zamanı! Korkma, oyun gibi.',
    mood: 'proud',
    quiz: true,
    enter(c) {
      c.geo.clear();
      c.geo.protractor(c.geo.p(-0.2, 0.1), true, 1.4);
      c.geo.rayAt(c.geo.p(-0.2, 0.1), 0);
      c.geo.rayAt(c.geo.p(-0.2, 0.1), 120);
      c.geo.arcSweep(c.geo.p(-0.2, 0.1), 0, 120, 0.6, c.geo.kindMat('genis'), 0.024);
      c.instant();
      c.startQuiz();
    },
  },
];

export const QUIZ = [
  { q: 'Dik açı kaç derecedir?', options: ['90°', '180°', '360°'], answer: 0, why: 'Evet, kitabın köşesi: 90°.', nope: 'Dik açı 90°. 180° doğru açı, 360° tam açıdır.' },
  { q: 'Ters açılar için hangisi doğru?', options: ['Ölçüleri eşittir', 'Toplamı 90°\'dir', 'Toplamı 180°\'dir'], answer: 0, why: 'Doğru! Karşı karşıya bakan açılar eş.', nope: 'Ters açılar eşittir; toplamı 180° olanlar komşu açılardır.' },
  { q: 'Toplamı 180° olan iki açıya ne denir?', options: ['Bütünler açılar', 'Tümler açılar', 'Eş açılar'], answer: 0, why: 'Bütünler! Tümler için 90 gerekirdi.', nope: 'Toplamı 180° olanlar bütünler; 90° olanlar tümler açılardır.' },
  { q: '"AB // CD" ne demek?', options: ['AB, CD\'ye paraleldir', 'AB, CD\'ye diktir', 'AB ile CD çakışıktır'], answer: 0, why: 'Doğru! Çift çizgi paralel demek.', nope: '// paralel demek; dik için ⊥ kullanılır.' },
  { q: 'Altı doğrunun ardışık kesişmesiyle oluşan çokgen?', options: ['Altıgen', 'Beşgen', 'Sekizgen'], answer: 0, why: 'Altı doğru, altı kenar: altıgen.', nope: 'Doğru sayısı kadar kenar: altı doğru → altıgen.' },
  { q: 'Üçgenin kaç köşegeni vardır?', options: ['Hiç', 'Bir', 'Üç'], answer: 0, why: 'Doğru! Her köşe diğer ikisiyle zaten komşu.', nope: 'Üçgende köşegen yoktur: her köşe diğerleriyle komşudur.' },
  { q: 'Bir iç açısı 120° olan üçgen…', options: ['Geniş açılıdır', 'Dik açılıdır', 'Dar açılıdır'], answer: 0, why: '120° geniş açı; üçgen de geniş açılı.', nope: '120° geniş bir açı; bu üçgen geniş açılıdır.' },
  { q: 'Hangisi düzgün çokgendir?', options: ['Kare', 'Dikdörtgen', 'Herhangi bir üçgen'], answer: 0, why: 'Kare: dört eş kenar, dört dik açı.', nope: 'Kenarları ve açıları eşit olan: kare. Dikdörtgenin kenarları eşit değildir.' },
];
