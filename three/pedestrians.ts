import * as THREE from 'three';

export interface PedestriansHandle {
  update(dt: number): void;
  dispose(): void;
}

// Geometrías y materiales compartidos (estilo minimalista de bloques).
const LEG_GEO = new THREE.BoxGeometry(0.18, 0.5, 0.2);
const BODY_GEO = new THREE.BoxGeometry(0.48, 0.55, 0.3);
const HEAD_GEO = new THREE.BoxGeometry(0.32, 0.32, 0.32);
const ARM_GEO = new THREE.BoxGeometry(0.14, 0.45, 0.15);
const BALL_GEO = new THREE.SphereGeometry(0.22, 10, 8);

const SKIN_MAT = new THREE.MeshStandardMaterial({ color: 0xe0b78a, roughness: 0.8 });
const PANTS_MAT = new THREE.MeshStandardMaterial({ color: 0x34415a, roughness: 0.8 });
const BALL_MAT = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });
const CLOTHES = [
  new THREE.MeshStandardMaterial({ color: 0x4a6fb5, roughness: 0.8 }),
  new THREE.MeshStandardMaterial({ color: 0xb5504a, roughness: 0.8 }),
  new THREE.MeshStandardMaterial({ color: 0x5a8f4a, roughness: 0.8 }),
  new THREE.MeshStandardMaterial({ color: 0x8f6f4a, roughness: 0.8 }),
];

function makeDialogTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[IntersectIA] canvas 2d unavailable');
  ctx.clearRect(0, 0, 128, 72);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(64, 30, 46, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(54, 52);
  ctx.lineTo(64, 70);
  ctx.lineTo(74, 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('…', 64, 35);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeThoughtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 112;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[IntersectIA] canvas 2d unavailable');
  ctx.clearRect(0, 0, 112, 64);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(40, 34, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(57, 32, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(70, 36, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('…', 58, 40);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBubble(texture: THREE.CanvasTexture): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.scale.set(1.15, 0.68, 1);
  sprite.position.y = 1.9;
  sprite.visible = false;
  return sprite;
}

interface Seat {
  pos: [number, number];
  rot: number;
  occupied: Person | null;
}

interface Bench {
  pos: [number, number];
  seats: Seat[];
  dialogTimer: number;
}

interface Person {
  group: THREE.Group;
  mode: 'walk' | 'sit' | 'play';
  target: THREE.Vector2;
  pendingSeat: { bench: Bench; seat: Seat } | null;
  benchRef: Bench | null;
  seatRef: Seat | null;
  sitTimer: number;
  speed: number;
  animSpeed: number;
  gestureSpeed: number;
  baseRot: number;
  bobPhase: number;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  bubble?: THREE.Sprite;
  bubbleTimer: number;
  sittable: boolean;
}

function buildPerson(clothesMat: THREE.MeshStandardMaterial): Person {
  const g = new THREE.Group();

  const makeLeg = (sx: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 0.5, 0);
    const leg = new THREE.Mesh(LEG_GEO, PANTS_MAT);
    leg.position.y = -0.25;
    pivot.add(leg);
    g.add(pivot);
    return pivot;
  };
  const makeArm = (sx: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 1.0, 0);
    const arm = new THREE.Mesh(ARM_GEO, clothesMat);
    arm.position.y = -0.2;
    pivot.add(arm);
    g.add(pivot);
    return pivot;
  };

  const body = new THREE.Mesh(BODY_GEO, clothesMat);
  body.position.y = 0.78;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(HEAD_GEO, SKIN_MAT);
  head.position.y = 1.22;
  head.castShadow = true;
  g.add(head);

  return {
    group: g,
    mode: 'walk',
    target: new THREE.Vector2(20, 20),
    pendingSeat: null,
    benchRef: null,
    seatRef: null,
    sitTimer: 0,
    speed: 0.6 + Math.random() * 0.4,
    animSpeed: 0.85 + Math.random() * 0.35,
    gestureSpeed: 0.8 + Math.random() * 0.5,
    baseRot: 0,
    bobPhase: Math.random() * Math.PI * 2,
    armL: makeArm(-0.34),
    armR: makeArm(0.34),
    legL: makeLeg(-0.11),
    legR: makeLeg(0.11),
    bubbleTimer: 2 + Math.random() * 2,
    sittable: false,
  };
}

// Asientos lado a lado a lo largo del largo de la banca, mirando hacia el frente.
function seatPair(benchPos: [number, number]): { pos: [number, number]; rot: number }[] {
  const [bx, bz] = benchPos;
  const benchRot = Math.atan2(bx, bz) + Math.PI / 2;
  const dx = Math.cos(benchRot); // local +X (largo) en mundo = (cos θ, -sin θ)
  const dz = -Math.sin(benchRot);
  return [
    { pos: [bx + 0.7 * dx, bz + 0.7 * dz], rot: benchRot },
    { pos: [bx - 0.7 * dx, bz - 0.7 * dz], rot: benchRot },
  ];
}

function randomGrassPoint(signX: number, signZ: number): { x: number; z: number } {
  return { x: signX * (5 + Math.random() * 38), z: signZ * (5 + Math.random() * 38) };
}

const BENCH_POSITIONS: [number, number][] = [
  [14, 14],
  [-14, 14],
  [14, -14],
  [-14, -14],
];

// Pareja de fútbol en veredas opuestas de la calle E-W (visible en primera persona).
const SOCCER_A: [number, number] = [-18, 8];
const SOCCER_B: [number, number] = [-18, -8];

export function buildPedestrians(scene: THREE.Scene): PedestriansHandle {
  const group = new THREE.Group();
  scene.add(group);
  const people: Person[] = [];
  let clothesIndex = 0;

  const benches: Bench[] = BENCH_POSITIONS.map((pos) => ({
    pos,
    seats: seatPair(pos).map((s) => ({ ...s, occupied: null })),
    dialogTimer: 0,
  }));

  const dialogTex = makeDialogTexture();
  const thoughtTex = makeThoughtTexture();
  const ball = new THREE.Mesh(BALL_GEO, BALL_MAT);
  group.add(ball);

  const nextClothes = (): THREE.MeshStandardMaterial => {
    const m = CLOTHES[clothesIndex % CLOTHES.length];
    clothesIndex += 1;
    return m;
  };

  const sitPerson = (p: Person, bench: Bench, seat: Seat): void => {
    p.mode = 'sit';
    p.pendingSeat = null;
    p.benchRef = bench;
    p.seatRef = seat;
    seat.occupied = p;
    p.legL.rotation.x = -Math.PI / 2;
    p.legR.rotation.x = -Math.PI / 2;
    p.group.position.set(seat.pos[0], 0.105, seat.pos[1]);
    p.group.rotation.y = seat.rot;
    p.baseRot = seat.rot;
    p.sitTimer = 18 + Math.random() * 22; // luego de un tiempo se levanta
    if (!p.bubble) {
      p.bubble = makeBubble(dialogTex);
      p.group.add(p.bubble);
    }
  };

  const standUp = (p: Person): void => {
    if (p.mode !== 'sit' || !p.seatRef) return;
    p.seatRef.occupied = null;
    p.seatRef = null;
    p.benchRef = null;
    p.mode = 'walk';
    p.legL.rotation.x = 0;
    p.legR.rotation.x = 0;
    if (p.bubble) p.bubble.visible = false;
    const np = randomGrassPoint(
      Math.sign(p.group.position.x) || 1,
      Math.sign(p.group.position.z) || 1,
    );
    p.target.set(np.x, np.z);
  };

  // Dos parejas iniciales sentadas en las bancas 0 y 2.
  for (const bi of [0, 2]) {
    for (const seat of benches[bi].seats) {
      const p = buildPerson(nextClothes());
      p.bubble = makeBubble(dialogTex);
      p.group.add(p.bubble);
      sitPerson(p, benches[bi], seat);
      group.add(p.group);
      people.push(p);
    }
  }

  // 12 peatones caminando, distribuidos 3 por cuadrante.
  const QUADRANTS: [number, number][] = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
  for (let i = 0; i < 12; i += 1) {
    const p = buildPerson(nextClothes());
    const [sx, sz] = QUADRANTS[Math.floor(i / 3)];
    const pos = randomGrassPoint(sx, sz);
    p.group.position.set(pos.x, 0, pos.z);
    p.target.set(pos.x, pos.z);
    if (i < 4) {
      p.sittable = true; // pueden sentarse en bancas
    } else if (i < 8) {
      p.bubble = makeBubble(thoughtTex);
      p.group.add(p.bubble);
    }
    group.add(p.group);
    people.push(p);
  }

  // Pareja de fútbol: jugadores en veredas opuestas pasándose el balón.
  const sa = people[8];
  const sb = people[9];
  sa.mode = 'play';
  sb.mode = 'play';
  sa.group.position.set(SOCCER_A[0], 0, SOCCER_A[1]);
  sa.group.rotation.y = Math.PI; // mira hacia -z (sur)
  sb.group.position.set(SOCCER_B[0], 0, SOCCER_B[1]);
  sb.group.rotation.y = 0; // mira hacia +z (norte)
  let ballTimer = 0;

  let elapsed = 0;

  const update = (dt: number): void => {
    elapsed += dt;

    // Caminar.
    for (const p of people) {
      if (p.mode === 'walk') {
        const dx = p.target.x - p.group.position.x;
        const dz = p.target.y - p.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.5) {
          p.group.rotation.y = Math.atan2(dx, dz);
          const step = Math.min(p.speed * dt, dist);
          p.group.position.x += (dx / dist) * step;
          p.group.position.z += (dz / dist) * step;
          p.group.position.y = Math.abs(Math.sin(p.bobPhase + elapsed * 7 * p.animSpeed)) * 0.04;
          const swing = Math.sin(p.bobPhase + elapsed * 7 * p.animSpeed) * 0.22;
          p.armL.rotation.z = -swing;
          p.armR.rotation.z = swing;
        } else if (p.pendingSeat) {
          // Llegó al asiento: solo se sienta si sigue libre (evita dobles ocupaciones).
          if (!p.pendingSeat.seat.occupied) {
            sitPerson(p, p.pendingSeat.bench, p.pendingSeat.seat);
          } else {
            p.pendingSeat = null;
            const np = randomGrassPoint(
              Math.sign(p.group.position.x) || 1,
              Math.sign(p.group.position.z) || 1,
            );
            p.target.set(np.x, np.z);
          }
        } else if (p.sittable) {
          // Busca una banca con plaza libre cerca.
          let found: { bench: Bench; seat: Seat } | null = null;
          for (const bench of benches) {
            for (const seat of bench.seats) {
              if (seat.occupied) continue;
              const d = Math.hypot(seat.pos[0] - p.group.position.x, seat.pos[1] - p.group.position.z);
              if (d < 18) {
                found = { bench, seat };
                break;
              }
            }
            if (found) break;
          }
          if (found) {
            p.pendingSeat = found;
            p.target.set(found.seat.pos[0], found.seat.pos[1]);
          } else {
            const np = randomGrassPoint(
              Math.sign(p.group.position.x) || 1,
              Math.sign(p.group.position.z) || 1,
            );
            p.target.set(np.x, np.z);
          }
        } else {
          const np = randomGrassPoint(
            Math.sign(p.group.position.x) || 1,
            Math.sign(p.group.position.z) || 1,
          );
          p.target.set(np.x, np.z);
        }

        // Globo de pensamiento (aparece/desaparece).
        if (p.bubble) {
          p.bubbleTimer -= dt;
          if (p.bubbleTimer <= 0) {
            p.bubble.visible = !p.bubble.visible;
            p.bubbleTimer = 1.5 + Math.random() * 2;
          }
        }
      } else if (p.mode === 'sit') {
        p.group.rotation.y = p.baseRot + Math.sin(elapsed * 2 * p.animSpeed + p.bobPhase) * 0.05;
        p.group.position.y = 0.105 + Math.sin(elapsed * 2 * p.animSpeed + p.bobPhase) * 0.02;
        p.armR.rotation.z = Math.sin(elapsed * 3 * p.gestureSpeed + p.bobPhase) * 0.3;
        p.armL.rotation.z = Math.sin(elapsed * 2.4 * p.gestureSpeed + p.bobPhase + Math.PI) * 0.2;
        p.sitTimer -= dt;
        if (p.sitTimer <= 0) standUp(p);
      } else if (p.mode === 'play') {
        const swing = Math.sin(p.bobPhase + elapsed * 2 * p.animSpeed) * 0.12;
        p.armL.rotation.z = -swing;
        p.armR.rotation.z = swing;
        p.group.position.y = Math.abs(Math.sin(p.bobPhase + elapsed * 4 * p.animSpeed)) * 0.03;
      }
    }

    // Burbujas de diálogo: solo cuando hay 2 en la misma banca.
    for (const bench of benches) {
      const occ = bench.seats.filter((s) => s.occupied);
      if (occ.length >= 2) {
        bench.dialogTimer += dt;
        const show = Math.floor(bench.dialogTimer / 3) % 2 === 0;
        for (const s of occ) {
          if (s.occupied?.bubble) s.occupied.bubble.visible = show;
        }
      } else {
        for (const s of occ) {
          if (s.occupied?.bubble) s.occupied.bubble.visible = false;
        }
      }
    }

    // Balón: pase de ida y vuelta entre los dos jugadores con arco y patada.
    {
      const dur = 1.0;
      const pause = 1.6;
      const cycle = 2 * (dur + pause);
      const phase = ballTimer % cycle;
      sa.legR.rotation.x = 0;
      sb.legR.rotation.x = 0;
      if (phase < dur) {
        // A → B
        const f = phase / dur;
        ball.position.x = SOCCER_A[0];
        ball.position.z = SOCCER_A[1] + (SOCCER_B[1] - SOCCER_A[1]) * f;
        ball.position.y = Math.sin(f * Math.PI) * 1.8;
        sa.legR.rotation.x = -Math.sin(f * Math.PI) * 1.0;
      } else if (phase < dur + pause) {
        ball.position.set(SOCCER_B[0], 0, SOCCER_B[1]);
      } else if (phase < 2 * dur + pause) {
        // B → A
        const f = (phase - dur - pause) / dur;
        ball.position.x = SOCCER_B[0];
        ball.position.z = SOCCER_B[1] + (SOCCER_A[1] - SOCCER_B[1]) * f;
        ball.position.y = Math.sin(f * Math.PI) * 1.8;
        sb.legR.rotation.x = -Math.sin(f * Math.PI) * 1.0;
      } else {
        ball.position.set(SOCCER_A[0], 0, SOCCER_A[1]);
      }
      ballTimer += dt;
    }
  };

  const dispose = (): void => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      } else if (obj instanceof THREE.Sprite) {
        obj.material.dispose();
      }
    });
    dialogTex.dispose();
    thoughtTex.dispose();
    scene.remove(group);
  };

  return { update, dispose };
}