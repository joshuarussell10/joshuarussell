import * as THREE from "three";
import { lanyardConfig } from "@/lib/hero-webgl/lanyard-config";

/**
 * Position-based dynamics for the badge.
 *
 * The lanyard is one continuous verlet rope pinned at both shoulders; the card
 * is four corner particles held rigid by six distance constraints. Coupling the
 * two through the crimp means the swing, sag and twist all fall out of the
 * solver rather than being animated.
 */

type Vec = THREE.Vector3;

const TOP_LEFT = 0;
const TOP_RIGHT = 1;
const BOTTOM_LEFT = 2;
const BOTTOM_RIGHT = 3;

const delta = new THREE.Vector3();
const topMid = new THREE.Vector3();
const bottomMid = new THREE.Vector3();
const axisRight = new THREE.Vector3();
const axisUp = new THREE.Vector3();
const axisForward = new THREE.Vector3();
const basis = new THREE.Matrix4();

export type PointerState = { x: number; y: number; active: boolean };

export class LanyardSimulation {
  readonly rope: Vec[] = [];
  readonly leftStrand: Vec[];
  readonly rightStrand: Vec[];
  readonly cardCorners: Vec[] = [];
  readonly crimp: Vec;

  readonly cardPosition = new THREE.Vector3();
  readonly cardQuaternion = new THREE.Quaternion();

  private readonly ropePrevious: Vec[] = [];
  private readonly cardPrevious: Vec[] = [];
  private readonly anchorLeft = new THREE.Vector3();
  private readonly anchorRight = new THREE.Vector3();
  private readonly midIndex: number;
  private readonly segmentLength: number;
  private readonly cardEdgeX: number;
  private readonly cardEdgeY: number;
  private readonly cardDiagonal: number;
  private readonly pointer = { x: 0, y: 0 };
  private accumulator = 0;
  private elapsed = 0;
  private yaw = 0;
  private yawRate = 0;

  constructor() {
    const { webbing, card, hardware } = lanyardConfig;
    const segments = webbing.segments;
    this.midIndex = segments / 2;

    this.anchorLeft.set(-webbing.anchorSpread, webbing.anchorY, webbing.anchorZ);
    this.anchorRight.set(webbing.anchorSpread, webbing.anchorY, webbing.anchorZ);

    const restCrimp = new THREE.Vector3(0, webbing.crimpRestY, 0);
    const ropeLength =
      2 * this.anchorLeft.distanceTo(restCrimp) * webbing.slack;
    this.segmentLength = ropeLength / segments;

    for (let i = 0; i <= segments; i += 1) {
      const point = new THREE.Vector3();
      if (i <= this.midIndex) {
        point.lerpVectors(this.anchorLeft, restCrimp, i / this.midIndex);
      } else {
        point.lerpVectors(
          restCrimp,
          this.anchorRight,
          (i - this.midIndex) / this.midIndex
        );
      }
      this.rope.push(point);
      this.ropePrevious.push(point.clone());
    }

    this.crimp = this.rope[this.midIndex];

    // Both strands are read top-down so the printed webbing runs the same way.
    this.leftStrand = this.rope.slice(0, this.midIndex + 1);
    this.rightStrand = this.rope.slice(this.midIndex).reverse();

    const halfWidth = card.width / 2;
    const topY = restCrimp.y - hardware.drop;
    const bottomY = topY - card.height;

    const corners: Array<[number, number]> = [
      [-halfWidth, topY],
      [halfWidth, topY],
      [-halfWidth, bottomY],
      [halfWidth, bottomY],
    ];
    for (const [x, y] of corners) {
      const point = new THREE.Vector3(x, y, 0);
      this.cardCorners.push(point);
      this.cardPrevious.push(point.clone());
    }

    this.cardEdgeX = card.width;
    this.cardEdgeY = card.height;
    this.cardDiagonal = Math.hypot(card.width, card.height);

    this.updateCardTransform();
  }

  /** Runs the solver forward without rendering so the first frame is settled. */
  warmup(steps = lanyardConfig.physics.warmupSteps) {
    for (let i = 0; i < steps; i += 1) {
      this.integrate(lanyardConfig.physics.substep, false);
      this.solve();
    }
    this.updateCardTransform();
  }

  update(deltaTime: number, pointer: PointerState) {
    const { substep, maxSubsteps, pointerLerp } = lanyardConfig.physics;

    // Ease toward the raw pointer so a fast flick reads as a push, not a jump.
    const follow = 1 - Math.exp(-pointerLerp * Math.min(deltaTime, 0.1));
    const targetX = pointer.active ? pointer.x : 0;
    const targetY = pointer.active ? pointer.y : 0;
    this.pointer.x += (targetX - this.pointer.x) * follow;
    this.pointer.y += (targetY - this.pointer.y) * follow;

    this.accumulator += Math.min(deltaTime, substep * maxSubsteps);

    let steps = 0;
    while (this.accumulator >= substep && steps < maxSubsteps) {
      this.elapsed += substep;
      this.integrate(substep, true);
      this.solve();
      this.accumulator -= substep;
      steps += 1;
    }

    this.updateCardTransform();
  }

  private integrate(dt: number, withForces: boolean) {
    const physics = lanyardConfig.physics;
    const ropeDamp = Math.pow(physics.ropeRetention, dt);
    const cardDamp = Math.pow(physics.cardRetention, dt);
    const dt2 = dt * dt;

    let windX = 0;
    let windZ = 0;
    let twist = 0;

    if (withForces) {
      const breeze = physics.breeze;
      // Two detuned oscillators read as air movement rather than a loop.
      windX =
        Math.sin(this.elapsed * 0.61) * breeze +
        Math.sin(this.elapsed * 1.53 + 1.1) * breeze * 0.35;
      windZ = Math.sin(this.elapsed * 0.43 + 2.2) * breeze * 0.6;

      windX += this.pointer.x * physics.pointerForce;
      windZ += -this.pointer.y * physics.pointerDepthForce;

      const previousYaw = this.yaw;
      this.yaw = this.measureYaw();
      this.yawRate = (this.yaw - previousYaw) / dt;
      const targetYaw = this.pointer.x * physics.maxYaw;
      twist =
        (targetYaw - this.yaw) * physics.yawGain - this.yawRate * physics.yawDamping;
    }

    for (let i = 0; i < this.rope.length; i += 1) {
      const current = this.rope[i];
      const previous = this.ropePrevious[i];
      const vx = (current.x - previous.x) * ropeDamp;
      const vy = (current.y - previous.y) * ropeDamp;
      const vz = (current.z - previous.z) * ropeDamp;
      previous.copy(current);
      // The webbing catches noticeably less air than the card face.
      current.x += vx + windX * 0.28 * dt2;
      current.y += vy + physics.gravity * dt2;
      current.z += vz + windZ * 0.28 * dt2;
    }

    for (let i = 0; i < this.cardCorners.length; i += 1) {
      const current = this.cardCorners[i];
      const previous = this.cardPrevious[i];
      const vx = (current.x - previous.x) * cardDamp;
      const vy = (current.y - previous.y) * cardDamp;
      const vz = (current.z - previous.z) * cardDamp;
      previous.copy(current);
      // Left-hand corners get the opposite depth push, yawing the card.
      const side = i === TOP_LEFT || i === BOTTOM_LEFT ? 1 : -1;
      current.x += vx + windX * dt2;
      current.y += vy + physics.gravity * dt2;
      current.z += vz + (windZ + twist * side) * dt2;
    }
  }

  private solve() {
    const { iterations } = lanyardConfig.physics;
    for (let i = 0; i < iterations; i += 1) {
      this.solveRope();
      this.solveCard();
      this.solveCoupling();
      this.pin();
    }
  }

  private solveRope() {
    const invMass = lanyardConfig.physics.ropeInvMass;
    for (let i = 0; i < this.rope.length - 1; i += 1) {
      constrain(this.rope[i], this.rope[i + 1], this.segmentLength, invMass, invMass, 1);
    }
  }

  private solveCard() {
    const invMass = lanyardConfig.physics.cardInvMass;
    const corners = this.cardCorners;

    constrain(corners[TOP_LEFT], corners[TOP_RIGHT], this.cardEdgeX, invMass, invMass, 1);
    constrain(corners[BOTTOM_LEFT], corners[BOTTOM_RIGHT], this.cardEdgeX, invMass, invMass, 1);
    constrain(corners[TOP_LEFT], corners[BOTTOM_LEFT], this.cardEdgeY, invMass, invMass, 1);
    constrain(corners[TOP_RIGHT], corners[BOTTOM_RIGHT], this.cardEdgeY, invMass, invMass, 1);
    constrain(corners[TOP_LEFT], corners[BOTTOM_RIGHT], this.cardDiagonal, invMass, invMass, 1);
    constrain(corners[TOP_RIGHT], corners[BOTTOM_LEFT], this.cardDiagonal, invMass, invMass, 1);
  }

  /** Hangs the card's slot off the crimp and keeps it from rolling over. */
  private solveCoupling() {
    const { hardware, physics } = lanyardConfig;
    const corners = this.cardCorners;
    const crimp = this.crimp;

    topMid
      .copy(corners[TOP_LEFT])
      .add(corners[TOP_RIGHT])
      .multiplyScalar(0.5);

    delta.copy(topMid).sub(crimp);
    const distance = delta.length() || 1e-6;
    const error = (distance - hardware.drop) / distance;

    // The top edge behaves as one particle of twice the card's corner mass.
    const cardShare = physics.cardInvMass * 0.5;
    const total = cardShare + physics.ropeInvMass;
    const cardScale = (cardShare / total) * error;
    const ropeScale = (physics.ropeInvMass / total) * error;

    corners[TOP_LEFT].addScaledVector(delta, -cardScale);
    corners[TOP_RIGHT].addScaledVector(delta, -cardScale);
    crimp.addScaledVector(delta, ropeScale);

    // Equalising both top corners' distance to the crimp resists roll while
    // leaving pitch and yaw free, matching a slot riding on a hook.
    const left = corners[TOP_LEFT].distanceTo(crimp) || 1e-6;
    const right = corners[TOP_RIGHT].distanceTo(crimp) || 1e-6;
    const target = (left + right) * 0.5;

    delta.copy(corners[TOP_LEFT]).sub(crimp);
    corners[TOP_LEFT].addScaledVector(
      delta,
      (physics.rollStiffness * (target - left)) / left
    );
    delta.copy(corners[TOP_RIGHT]).sub(crimp);
    corners[TOP_RIGHT].addScaledVector(
      delta,
      (physics.rollStiffness * (target - right)) / right
    );
  }

  /** Rotation of the card's top edge about the vertical axis. */
  private measureYaw() {
    const rightX = this.cardCorners[TOP_RIGHT].x - this.cardCorners[TOP_LEFT].x;
    const rightZ = this.cardCorners[TOP_RIGHT].z - this.cardCorners[TOP_LEFT].z;
    return Math.atan2(-rightZ, rightX);
  }

  private pin() {
    this.rope[0].copy(this.anchorLeft);
    this.rope[this.rope.length - 1].copy(this.anchorRight);
  }

  private updateCardTransform() {
    const corners = this.cardCorners;

    topMid.copy(corners[TOP_LEFT]).add(corners[TOP_RIGHT]).multiplyScalar(0.5);
    bottomMid
      .copy(corners[BOTTOM_LEFT])
      .add(corners[BOTTOM_RIGHT])
      .multiplyScalar(0.5);

    axisRight.copy(corners[TOP_RIGHT]).sub(corners[TOP_LEFT]).normalize();
    axisUp.copy(topMid).sub(bottomMid).normalize();
    axisForward.crossVectors(axisRight, axisUp).normalize();
    axisRight.crossVectors(axisUp, axisForward).normalize();

    basis.makeBasis(axisRight, axisUp, axisForward);
    this.cardQuaternion.setFromRotationMatrix(basis);

    this.cardPosition
      .copy(corners[TOP_LEFT])
      .add(corners[TOP_RIGHT])
      .add(corners[BOTTOM_LEFT])
      .add(corners[BOTTOM_RIGHT])
      .multiplyScalar(0.25);
  }
}

function constrain(
  a: Vec,
  b: Vec,
  restLength: number,
  invMassA: number,
  invMassB: number,
  stiffness: number
) {
  delta.copy(b).sub(a);
  const distance = delta.length();
  if (distance < 1e-9) return;

  const total = invMassA + invMassB;
  if (total === 0) return;

  const correction = ((distance - restLength) / distance) * stiffness;
  a.addScaledVector(delta, (invMassA / total) * correction);
  b.addScaledVector(delta, -(invMassB / total) * correction);
}
