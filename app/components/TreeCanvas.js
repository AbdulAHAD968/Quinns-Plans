"use client";

import { useEffect, useRef } from "react";

export function TreeCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const C = canvasRef.current;
    if (!C) return;

    class Utils {
      static get dateValue() {
        return +new Date();
      }
      static endPointX(angleInDeg, distance) {
        return Math.sin((angleInDeg * Math.PI) / 180) * distance;
      }
      static endPointY(angleInDeg, distance) {
        return Math.cos((angleInDeg * Math.PI) / 180) * distance;
      }
      static randomInt(min, max) {
        return min + Math.round(Math.random() * (max - min));
      }
    }

    class Tree {
      constructor(canvas) {
        this.C = canvas;
        this.c = this.C?.getContext("2d");
        this.S = window.devicePixelRatio || 1;
        this.W = 800;
        this.H = 800;
        this.branches = [];
        this.darkTheme = true;
        this.debug = false;
        this.decaying = false;
        this.floorY = 685;
        this.fruit = [];
        this.gravity = 0.098;
        this.loopDelay = 500;
        this.loopEnd = Utils.dateValue;
        this.maxGenerations = 10;
        this.animationFrameId = null;
        this.mqListener = null;
        this.mq = null;

        if (this.C) this.init();
      }
      get allBranchesComplete() {
        const { branches, maxGenerations } = this;
        return branches.filter((b) => {
          const isLastGen = b.generation === maxGenerations;
          return b.progress >= 1 && isLastGen;
        }).length > 0;
      }
      get allFruitComplete() {
        return !!this.fruit.length && this.fruit.every((f) => f.progress === 1);
      }
      get allFruitFalling() {
        return !!this.fruit.length && this.fruit.every((f) => f.timeUntilFall <= 0);
      }
      get lastGeneration() {
        const genIntegers = this.branches.map((b) => b.generation);
        return [...new Set(genIntegers)].pop();
      }
      get trunk() {
        return {
          angle: 0,
          angleInc: 20,
          decaySpeed: 0.0625,
          diameter: 10,
          distance: 120,
          distanceFade: 0.2,
          generation: 1,
          growthSpeed: 0.04,
          hadBranches: false,
          progress: 0,
          x1: 400,
          y1: 680,
          x2: 400,
          y2: 560,
        };
      }
      draw() {
        const { c, W, H, branches, fruit } = this;

        c.clearRect(0, 0, W, H);

        branches.forEach((b) => {
          c.strokeStyle = this.darkTheme ? "#d9a763" : "#8b5a2b";
          c.lineWidth = b.diameter;
          c.beginPath();
          c.moveTo(b.x1, b.y1);
          c.lineTo(
            b.x1 + (b.x2 - b.x1) * b.progress,
            b.y1 + (b.y2 - b.y1) * b.progress
          );
          c.stroke();
          c.closePath();
        });

        fruit.forEach((f) => {
          c.fillStyle = "#b5693f";
          c.globalAlpha = f.decayTime < f.decayFrames ? f.decayTime / f.decayFrames : 1;
          c.beginPath();
          c.arc(f.x, f.y, f.r * f.progress, 0, 2 * Math.PI);
          c.fill();
          c.closePath();
          c.globalAlpha = 1;
        });
      }
      grow() {
        if (!this.branches.length && Utils.dateValue - this.loopEnd > this.loopDelay) {
          this.branches.push(this.trunk);
        }

        if (!this.allBranchesComplete) {
          this.branches.forEach((b) => {
            if (b.progress < 1) {
              b.progress += b.growthSpeed;

              if (b.progress > 1) {
                b.progress = 1;

                if (b.generation === this.maxGenerations) {
                  this.fruit.push({
                    decayFrames: 18,
                    decayTime: 150,
                    progress: 0,
                    speed: 0.04,
                    timeUntilFall: Utils.randomInt(0, 300),
                    x: b.x2,
                    y: b.y2,
                    r: Utils.randomInt(4, 6),
                    restitution: 0.2 * (1 - b.y2 / this.floorY),
                    yVelocity: 0,
                  });
                }
              }
            } else if (!b.hadBranches && b.generation < this.maxGenerations) {
              b.hadBranches = true;
              const lean = 5;
              const angleLeft = b.angle - (b.angleInc + Utils.randomInt(-lean, lean));
              const angleRight = b.angle + (b.angleInc + Utils.randomInt(-lean, lean));
              const distance = b.distance * (1 - b.distanceFade);
              const generation = b.generation + 1;

              const leftBranch = {
                angle: angleLeft,
                angleInc: b.angleInc,
                decaySpeed: b.decaySpeed,
                diameter: Math.floor(b.diameter * 0.9),
                distance,
                distanceFade: b.distanceFade,
                generation,
                growthSpeed: b.growthSpeed,
                hadBranches: false,
                progress: 0,
                x1: b.x2,
                y1: b.y2,
                x2: b.x2 + Utils.endPointX(angleLeft, distance),
                y2: b.y2 - Utils.endPointY(angleLeft, distance),
              };

              const rightBranch = { ...leftBranch };
              rightBranch.angle = angleRight;
              rightBranch.x2 = b.x2 + Utils.endPointX(angleRight, distance);
              rightBranch.y2 = b.y2 - Utils.endPointY(angleRight, distance);

              this.branches.push(leftBranch, rightBranch);
            }
          });
        }
        if (!this.allFruitComplete) {
          this.fruit.forEach((f) => {
            if (f.progress < 1) {
              f.progress += f.speed;
              if (f.progress > 1) f.progress = 1;
            }
          });
        }

        if (this.allBranchesComplete && this.allFruitComplete) this.decaying = true;
      }
      decay() {
        if (this.fruit.length) {
          this.fruit = this.fruit.filter((f) => f.decayTime > 0);

          this.fruit.forEach((f) => {
            if (f.timeUntilFall <= 0) {
              f.y += f.yVelocity;
              f.yVelocity += this.gravity;

              const bottom = this.floorY - f.r;

              if (f.y >= bottom) {
                f.y = bottom;
                f.yVelocity *= -f.restitution;
              }

              --f.decayTime;
            } else if (!f.decaying) {
              --f.timeUntilFall;
            }
          });
        }
        if (this.allFruitFalling || !this.fruit.length) {
          this.branches = this.branches.filter((b) => b.progress > 0);

          this.branches.forEach((b) => {
            if (b.generation === this.lastGeneration) b.progress -= b.decaySpeed;
          });
        }
        if (!this.branches.length && !this.fruit.length) {
          this.decaying = false;
          this.loopEnd = Utils.dateValue;
        }
      }
      init() {
        this.setupCanvas();
        this.run();
      }
      run() {
        this.draw();

        if (this.decaying) this.decay();
        else this.grow();

        this.animationFrameId = requestAnimationFrame(this.run.bind(this));
      }
      setupCanvas() {
        const { C, c, W, H, S } = this;
        C.width = W * S;
        C.height = H * S;
        c.scale(S, S);
        c.font = "16px sans-serif";
        c.lineCap = "round";
        c.lineJoin = "round";
      }
      destroy() {
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }
      }
    }

    const t = new Tree(C);

    return () => {
      t.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        margin: "auto",
        objectFit: "contain",
        width: "100%",
        maxHeight: "600px",
      }}
      aria-label="A tree growing and bearing fruit, representing personal growth"
      role="img"
    />
  );
}
