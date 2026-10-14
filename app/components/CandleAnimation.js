"use client";

export function CandleAnimation({
  scale = 1.05,
  top = "62%",
  left = "50%",
  className = "",
}) {
  return (
    <div className={`candle-scene-container ${className}`}>
      <div
        className="candle-wrapper"
        style={{
          "--candle-scale": scale,
          "--candle-top": top,
          "--candle-left": left,
        }}
      >
        <div className="candles">
          <div className="light__wave"></div>
          <div className="candle1">
            <div className="candle1__body">
              <div className="candle1__eyes">
                <span className="candle1__eyes-one"></span>
                <span className="candle1__eyes-two"></span>
              </div>
              <div className="candle1__mouth"></div>
            </div>
            <div className="candle1__stick"></div>
          </div>
          <div className="candle2">
            <div className="candle2__body">
              <div className="candle2__eyes">
                <div className="candle2__eyes-one"></div>
                <div className="candle2__eyes-two"></div>
              </div>
            </div>
            <div className="candle2__stick"></div>
          </div>
          <div className="candle2__fire">
            <div className="candle2__fire-halo"></div>
            <div className="candle2__fire-outer"></div>
            <div className="candle2__fire-inner"></div>
            <div className="candle2__fire-core"></div>
            <div className="candle2__fire-base"></div>
          </div>
          <div className="sparkles-one"></div>
          <div className="sparkles-two"></div>
          <div className="candle__smoke-one"></div>
          <div className="candle__smoke-two"></div>
        </div>
        <div className="floor"></div>
      </div>

      <style>{`
        :root {
          --candle-line: #382c24;
          --candle-wax: #faf7f2;
          --candle-wax-shadow: rgba(217, 167, 99, 0.24);
          --candle-panic: #c45e32;
          --candle-floor: #3d3028;
        }

        .candle-scene-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          user-select: none;
        }

        .candle-wrapper {
          position: absolute;
          left: var(--candle-left, 50%);
          top: var(--candle-top, 62%);
          width: 350px;
          height: 220px;
          transform: translate(-50%, -50%) scale(var(--candle-scale, 1.05));
          transform-origin: center center;
        }

        .floor {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 340px;
          height: 5px;
          background: linear-gradient(
            90deg,
            rgba(217, 167, 99, 0.08) 0%,
            #382c24 12%,
            #4a3a30 50%,
            #382c24 88%,
            rgba(217, 167, 99, 0.08) 100%
          );
          border-top: 1px solid rgba(247, 244, 239, 0.16);
          border-radius: 3px;
          transform: translate(-50%, -50%);
          box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.55),
                      0px 1px 8px rgba(217, 167, 99, 0.08);
          z-index: 2;
        }

        .candles {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 250px;
          height: 150px;
          transform: translate(-50%, -100%);
          z-index: 1;
        }

        .candle1 {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 35px;
          height: 100px;
          background: var(--candle-wax, #faf7f2);
          border: 3px solid var(--candle-line, #382c24);
          border-bottom: 0px;
          border-radius: 4px 4px 0 0;
          transform-origin: center right;
          transform: translate(60%, -25%);
          box-shadow: -3px 0px 0px var(--candle-wax-shadow, rgba(217, 167, 99, 0.24)) inset,
                      0 0 16px rgba(217, 167, 99, 0.04);
          animation: expand-body 3s infinite linear;
        }

        .candle1__stick,
        .candle2__stick {
          position: absolute;
          left: 50%;
          top: 0%;
          width: 3px;
          height: 15px;
          background: var(--candle-line, #382c24);
          border-radius: 8px;
          transform: translate(-50%, -100%);
        }

        .candle2__stick {
          height: 13px;
          transform-origin: bottom center;
          animation: stick-animation 3s infinite linear;
        }

        /* Glowing ember on candle 2 wick tip */
        .candle2__stick::before {
          content: "";
          position: absolute;
          top: -2px;
          left: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ff5722;
          transform: translateX(-50%);
          box-shadow: 0 0 4px #ff9800, 0 0 8px rgba(255, 87, 34, 0.6);
        }

        .candle1__eyes,
        .candle2__eyes {
          position: absolute;
          left: 50%;
          top: 0%;
          width: 35px;
          height: 30px;
          transform: translate(-50%, 0%);
        }

        .candle1__eyes-one {
          position: absolute;
          left: 30%;
          top: 20%;
          width: 5px;
          height: 5px;
          border-radius: 100%;
          background: var(--candle-line, #382c24);
          transform: translate(-70%, 0%);
          animation: blink-eyes 3s infinite linear;
        }

        .candle1__eyes-two {
          position: absolute;
          left: 70%;
          top: 20%;
          width: 5px;
          height: 5px;
          border-radius: 100%;
          background: var(--candle-line, #382c24);
          transform: translate(-70%, 0%);
          animation: blink-eyes 3s infinite linear;
        }

        .candle1__mouth {
          position: absolute;
          left: 40%;
          top: 20%;
          width: 0px;
          height: 0px;
          border-radius: 20px;
          background: var(--candle-line, #382c24);
          transform: translate(-50%, -50%);
          animation: uff 3s infinite linear;
        }

        /* Realistic, delicate wisps of smoke */
        .candle__smoke-one {
          position: absolute;
          left: 30%;
          top: 50%;
          width: 32px;
          height: 6px;
          background: radial-gradient(ellipse at center, rgba(215, 200, 185, 0.45) 0%, rgba(185, 170, 155, 0) 70%);
          border-radius: 50%;
          filter: blur(1.5px);
          transform: translate(-50%, -50%);
          animation: move-left 3s infinite ease-out;
        }

        .candle__smoke-two {
          position: absolute;
          left: 30%;
          top: 40%;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(225, 210, 195, 0.45) 0%, rgba(195, 180, 165, 0) 70%);
          filter: blur(2px);
          transform: translate(-50%, -50%);
          animation: move-top 3s infinite ease-out;
        }

        .candle2 {
          position: absolute;
          left: 20%;
          top: 65%;
          width: 42px;
          height: 60px;
          background: var(--candle-wax, #faf7f2);
          border: 3px solid var(--candle-line, #382c24);
          border-bottom: 0px;
          border-radius: 4px 4px 0 0;
          transform: translate(60%, -15%);
          transform-origin: center right;
          box-shadow: -3px 0px 0px var(--candle-wax-shadow, rgba(217, 167, 99, 0.24)) inset,
                      0 0 16px rgba(217, 167, 99, 0.05);
          animation: shake-left 3s infinite linear;
        }

        .candle2__eyes-one {
          position: absolute;
          left: 30%;
          top: 50%;
          width: 5px;
          height: 5px;
          display: inline-block;
          border: 0px solid var(--candle-line, #382c24);
          border-radius: 100%;
          float: left;
          background: var(--candle-line, #382c24);
          transform: translate(-80%, 0%);
          animation: changeto-lower 3s infinite linear;
        }

        .candle2__eyes-two {
          position: absolute;
          left: 70%;
          top: 50%;
          width: 5px;
          height: 5px;
          display: inline-block;
          border: 0px solid var(--candle-line, #382c24);
          border-radius: 100%;
          float: left;
          background: var(--candle-line, #382c24);
          transform: translate(-80%, 0%);
          animation: changeto-greater 3s infinite linear;
        }

        /* Ambient warm candlelight glow aura (replaces the harsh wire ring) */
        .light__wave {
          position: absolute;
          top: 36%;
          left: 38%;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          z-index: 0;
          transform: translate(-50%, -50%) scale(1.6);
          background: radial-gradient(
            circle,
            rgba(255, 195, 85, 0.28) 0%,
            rgba(255, 145, 45, 0.12) 38%,
            rgba(255, 115, 25, 0.03) 62%,
            transparent 75%
          );
          filter: blur(8px);
          animation: expand-light 3s infinite linear;
          pointer-events: none;
        }

        /* Realistic, multi-layered glowing flame */
        .candle2__fire {
          position: absolute;
          top: 48%;
          left: 40.8%;
          display: block;
          width: 18px;
          height: 28px;
          transform: translate(-50%, -50%);
          animation: dance-fire 3s infinite linear;
          pointer-events: none;
          z-index: 3;
        }

        .candle2__fire-halo {
          position: absolute;
          inset: -14px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 175, 45, 0.5) 0%,
            rgba(255, 125, 25, 0.18) 45%,
            transparent 70%
          );
          filter: blur(5px);
        }

        .candle2__fire-outer {
          position: absolute;
          inset: 0;
          border-radius: 50% 50% 36% 36% / 65% 65% 35% 35%;
          background: linear-gradient(
            180deg,
            #fff9e6 0%,
            #ffca28 20%,
            #ff9100 58%,
            #f4511e 88%,
            #d84315 100%
          );
          box-shadow: 0 0 10px rgba(255, 179, 0, 0.95),
                      0 0 22px rgba(255, 111, 0, 0.65),
                      0 0 35px rgba(255, 87, 34, 0.35);
          filter: drop-shadow(0 -1px 3px rgba(255, 245, 170, 0.7));
        }

        .candle2__fire-inner {
          position: absolute;
          top: 6px;
          left: 50%;
          width: 9px;
          height: 17px;
          transform: translateX(-50%);
          border-radius: 50% 50% 36% 36% / 62% 62% 38% 38%;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #fffde7 32%,
            #ffe082 72%,
            #ffb74d 100%
          );
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.9);
        }

        .candle2__fire-core {
          position: absolute;
          top: 9px;
          left: 50%;
          width: 5px;
          height: 10px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: #ffffff;
          filter: blur(0.4px);
          box-shadow: 0 0 4px #ffffff;
        }

        .candle2__fire-base {
          position: absolute;
          bottom: 0px;
          left: 50%;
          width: 12px;
          height: 6px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: radial-gradient(
            ellipse at center,
            rgba(66, 133, 244, 0.75) 0%,
            rgba(100, 120, 220, 0.3) 55%,
            transparent 80%
          );
        }

        /* Sparkles on reignite */
        .sparkles-one,
        .sparkles-two {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ffc107;
          box-shadow: 0 0 6px #ff9800;
          opacity: 0;
          pointer-events: none;
        }
        .sparkles-one {
          top: 38%;
          left: 36%;
          animation: sparkle-one 3s infinite linear;
        }
        .sparkles-two {
          top: 36%;
          left: 46%;
          animation: sparkle-two 3s infinite linear;
        }

        @keyframes sparkle-one {
          0%, 89%, 100% { opacity: 0; transform: translate(0, 0) scale(0); }
          90% { opacity: 1; transform: translate(0, 0) scale(1); }
          94% { opacity: 0.8; transform: translate(-14px, -18px) scale(1.2); }
          98% { opacity: 0; transform: translate(-22px, -26px) scale(0.2); }
        }

        @keyframes sparkle-two {
          0%, 89%, 100% { opacity: 0; transform: translate(0, 0) scale(0); }
          91% { opacity: 1; transform: translate(0, 0) scale(1); }
          95% { opacity: 0.8; transform: translate(16px, -16px) scale(1.1); }
          99% { opacity: 0; transform: translate(24px, -24px) scale(0.2); }
        }

        @keyframes blink-eyes {
          0%,
          35% {
            opacity: 1;
            transform: translate(-70%, 0%);
          }
          36%,
          39% {
            opacity: 0;
            transform: translate(-70%, 0%);
          }
          40% {
            opacity: 1;
            transform: translate(-70%, 0%);
          }
          50%,
          65% {
            transform: translate(-140%, 0%);
          }
          66% {
            transform: translate(-70%, 0%);
          }
        }

        @keyframes expand-body {
          0%,
          40% {
            transform: scale(1, 1) translate(60%, -25%);
          }
          45%,
          55% {
            transform: scale(1.1, 1.1) translate(60%, -28%);
          }
          60% {
            transform: scale(0.89, 0.89) translate(60%, -25%);
          }
          65% {
            transform: scale(1, 1) translate(60%, -25%);
          }
          70% {
            transform: scale(0.95, 0.95) translate(60%, -25%);
          }
          75% {
            transform: scale(1, 1) translate(60%, -25%);
          }
        }

        @keyframes uff {
          0%,
          40% {
            width: 0px;
            height: 0px;
          }
          50%,
          54% {
            width: 15px;
            height: 15px;
            left: 30%;
          }
          59% {
            width: 5px;
            height: 5px;
            left: 20%;
          }
          62% {
            width: 2px;
            height: 2px;
            left: 20%;
          }
          67% {
            width: 0px;
            height: 0px;
            left: 30%;
          }
        }

        @keyframes move-left {
          0%,
          59%,
          100% {
            width: 0px;
            left: 40%;
            opacity: 0;
          }
          60% {
            width: 32px;
            left: 32%;
            opacity: 0.9;
          }
          68% {
            width: 10px;
            left: 20%;
            opacity: 0;
          }
        }

        @keyframes move-top {
          0%,
          64%,
          100% {
            width: 0px;
            height: 0px;
            top: 0%;
            opacity: 0;
          }
          65% {
            width: 14px;
            height: 14px;
            top: 40%;
            left: 40%;
            opacity: 0.85;
          }
          82% {
            width: 22px;
            height: 22px;
            top: 15%;
            left: 38%;
            opacity: 0;
          }
        }

        @keyframes shake-left {
          0%,
          40% {
            left: 20%;
            transform: translate(60%, -15%);
          }
          50%,
          54% {
            left: 20%;
            transform: translate(60%, -15%);
          }
          59% {
            left: 20%;
            transform: translate(60%, -15%);
          }
          62% {
            left: 18%;
            transform: translate(60%, -15%);
          }
          65% {
            left: 21%;
            transform: translate(60%, -15%);
          }
          67% {
            left: 20%;
            transform: translate(60%, -15%);
          }
          75% {
            left: 20%;
            transform: scale(1.15, 0.85) translate(60%, -15%);
            background: var(--candle-wax, #faf7f2);
            border-color: var(--candle-line, #382c24);
          }
          91% {
            left: 20%;
            transform: scale(1.18, 0.82) translate(60%, -10%);
            background: var(--candle-panic, #c45e32);
            border-color: var(--candle-panic, #c45e32);
            box-shadow: -2px 0px 0px var(--candle-panic, #c45e32) inset;
          }
          92% {
            left: 20%;
            transform: scale(0.85, 1.15) translate(60%, -15%);
          }
          95% {
            left: 20%;
            transform: scale(1.05, 0.95) translate(60%, -15%);
          }
          97% {
            left: 20%;
            transform: scale(1, 1) translate(60%, -15%);
            background: var(--candle-wax, #faf7f2);
            border-color: var(--candle-line, #382c24);
          }
        }

        @keyframes stick-animation {
          0%,
          40% {
            left: 50%;
            top: 0%;
            transform: translate(-50%, -100%);
          }
          50%,
          54% {
            left: 50%;
            top: 0%;
            transform: translate(-50%, -100%);
          }
          59% {
            left: 50%;
            top: 0%;
            transform: translate(-50%, -100%);
          }
          62% {
            left: 50%;
            top: 0%;
            transform: rotateZ(-15deg) translate(-50%, -100%);
          }
          65% {
            left: 50%;
            top: 0%;
            transform: rotateZ(15deg) translate(-50%, -100%);
          }
          70% {
            left: 50%;
            top: 0%;
            transform: rotateZ(-5deg) translate(-50%, -100%);
          }
          72% {
            left: 50%;
            top: 0%;
            transform: rotateZ(5deg) translate(-50%, -100%);
          }
          74%,
          84% {
            left: 50%;
            top: 0%;
            transform: rotateZ(0deg) translate(-50%, -100%);
          }
          85% {
            transform: rotateZ(180deg) translate(0%, 120%);
          }
          92% {
            left: 50%;
            top: 0%;
            transform: translate(-50%, -100%);
          }
        }

        @keyframes expand-light {
          0%,
          28%,
          58%,
          100% {
            transform: translate(-50%, -50%) scale(1.6);
            opacity: 0.85;
          }
          10%,
          29%,
          89% {
            transform: translate(-50%, -50%) scale(0.6);
            opacity: 0.2;
          }
          20%,
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.75;
          }
          26%,
          27%,
          56%,
          57% {
            transform: translate(-50%, -50%) scale(1.55);
            opacity: 0.9;
          }
          59%,
          88% {
            transform: translate(-50%, -50%) scale(0.1);
            opacity: 0;
          }
          90%,
          95% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 0.95;
          }
        }

        @keyframes dance-fire {
          0%,
          7%,
          15%,
          23%,
          31%,
          39%,
          47%,
          55% {
            left: 40.8%;
            transform: translate(-50%, -50%) scale(1, 1) rotate(-1.5deg);
            opacity: 1;
          }
          3%,
          11%,
          19%,
          27%,
          35%,
          43%,
          51% {
            left: 41.2%;
            transform: translate(-50%, -50%) scale(0.96, 1.05) rotate(2deg);
            opacity: 1;
          }
          57% {
            left: 41%;
            transform: translate(-55%, -50%) scale(0.85, 1.15) rotate(12deg);
            opacity: 0.95;
          }
          59% {
            left: 39%;
            transform: translate(-70%, -45%) scale(0.5, 1.3) rotate(28deg);
            opacity: 0.6;
          }
          61% {
            left: 36%;
            transform: translate(-80%, -40%) scale(0.1, 0.1) rotate(45deg);
            opacity: 0;
          }
          62%,
          89% {
            left: 40%;
            transform: translate(-50%, -50%) scale(0, 0);
            opacity: 0;
          }
          90% {
            left: 40.5%;
            transform: translate(-50%, -50%) scale(1.3, 1.3) rotate(0deg);
            opacity: 1;
          }
          93% {
            left: 40.8%;
            transform: translate(-50%, -50%) scale(0.92, 1.08) rotate(-2deg);
            opacity: 1;
          }
          96% {
            left: 41%;
            transform: translate(-50%, -50%) scale(1.05, 0.95) rotate(1deg);
            opacity: 1;
          }
          100% {
            left: 40.8%;
            transform: translate(-50%, -50%) scale(1, 1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes changeto-lower {
          0%,
          70%,
          90% {
            padding: 0px;
            display: inline-block;
            border-radius: 100%;
            background: var(--candle-line, #382c24);
            border-width: 0 0 0 0;
            border: 0px solid var(--candle-line, #382c24);
            transform: translate(-90%, 0%);
          }
          71%,
          89% {
            background: none;
            border: solid var(--candle-line, #382c24);
            border-radius: 0px;
            border-width: 0 2px 2px 0;
            display: inline-block;
            padding: 1px;
            float: left;
            transform-origin: bottom left;
            transform: rotate(-45deg) translate(-50%, -65%);
          }
        }

        @keyframes changeto-greater {
          0%,
          70%,
          90% {
            top: 50%;
            padding: 0px;
            display: inline-block;
            border-radius: 100%;
            background: var(--candle-line, #382c24);
            border-width: 0 0 0 0;
            border: 0px solid var(--candle-line, #382c24);
            transform: translate(-80%, 0%);
          }
          71%,
          89% {
            top: 30%;
            background: none;
            border: solid var(--candle-line, #382c24);
            border-radius: 0px;
            border-width: 0 2px 2px 0;
            display: inline-block;
            padding: 1px;
            float: left;
            transform-origin: bottom left;
            transform: rotate(135deg) translate(-80%, 20%);
          }
        }
      `}</style>
    </div>
  );
}

export default CandleAnimation;
export { CandleAnimation as CandleCanvas };
