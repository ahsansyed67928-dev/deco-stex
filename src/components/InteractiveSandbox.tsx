import { useState } from 'react';
import { Binary, Cpu, Gauge } from 'lucide-react';

type LabTab = 'numbers' | 'gates' | 'pipeline';

function to8BitBinary(val: number): string {
  return (val & 0xff).toString(2).padStart(8, '0');
}

function binaryToGray(bin: string): string {
  let out = bin[0];
  for (let i = 1; i < bin.length; i++) {
    out += bin[i - 1] === bin[i] ? '0' : '1';
  }
  return out;
}

export function InteractiveSandbox() {
  const [tab, setTab] = useState<LabTab>('numbers');

  // Tab 1: Number & Complement Lab
  const [decimalInput, setDecimalInput] = useState<number>(-15);

  // Tab 2: Logic Gate & Full Adder Lab
  const [bitA, setBitA] = useState<0 | 1>(1);
  const [bitB, setBitB] = useState<0 | 1>(1);
  const [bitCin, setBitCin] = useState<0 | 1>(0);

  // Tab 3: Pipeline & Cache Calculator
  const [stagesK, setStagesK] = useState<number>(4);
  const [instrN, setInstrN] = useState<number>(100);
  const [hitRatio, setHitRatio] = useState<number>(0.95);
  const [cacheNs, setCacheNs] = useState<number>(10);
  const [mainNs, setMainNs] = useState<number>(100);

  const clampedInt = Math.max(-128, Math.min(127, Math.round(decimalInput || 0)));
  const absVal = Math.abs(clampedInt);
  const absBin = to8BitBinary(Math.min(127, absVal));
  const signMag =
    clampedInt >= 0 ? absBin : '1' + to8BitBinary(Math.min(127, absVal)).slice(1);
  const onesComp =
    clampedInt >= 0
      ? absBin
      : absBin
          .split('')
          .map((b) => (b === '0' ? '1' : '0'))
          .join('');
  const twosComp = to8BitBinary(clampedInt);
  const hexVal = (clampedInt & 0xff).toString(16).toUpperCase().padStart(2, '0');
  const grayAbs = binaryToGray(absBin);

  // Logic gate calculations
  const andOut = bitA & bitB;
  const orOut = bitA | bitB;
  const nandOut = andOut ^ 1;
  const norOut = orOut ^ 1;
  const xorOut = bitA ^ bitB;
  const xnorOut = xorOut ^ 1;
  const faSum = bitA ^ bitB ^ bitCin;
  const faCarry = (bitA & bitB) | (bitCin & (bitA ^ bitB));

  // Pipeline & Cache calculations
  const nonPipelinedCycles = stagesK * instrN;
  const pipelinedCycles = stagesK + instrN - 1;
  const speedup = nonPipelinedCycles / pipelinedCycles;
  const effectiveAccessTime = hitRatio * cacheNs + (1 - hitRatio) * mainNs;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Interactive DECO Concept Sandbox
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Verify number representations, logic gates, adders, pipeline speedup, and cache timing live.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sandbox modules">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'numbers'}
            onClick={() => setTab('numbers')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              tab === 'numbers'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>8-Bit &amp; Complements</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'gates'}
            onClick={() => setTab('gates')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              tab === 'gates'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Gates &amp; Full Adder</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pipeline'}
            onClick={() => setTab('pipeline')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              tab === 'pipeline'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Pipeline &amp; Cache</span>
          </button>
        </div>
      </div>

      {tab === 'numbers' && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label
                htmlFor="deco-int-slider"
                className="flex items-center justify-between text-sm font-medium text-slate-800 mb-2"
              >
                <span>Signed 8-bit Decimal Input</span>
                <span className="font-mono tabular-nums text-sky-700 font-semibold">
                  {clampedInt}₁₀
                </span>
              </label>
              <input
                id="deco-int-slider"
                type="range"
                min={-128}
                max={127}
                value={clampedInt}
                onChange={(e) => setDecimalInput(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 font-mono tabular-nums mt-1">
                <span>−128</span>
                <span>0</span>
                <span>+127</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[-18, -15, -9, 12, 45].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDecimalInput(preset)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono tabular-nums text-slate-700 cursor-pointer"
                >
                  {preset > 0 ? `+${preset}` : preset}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Exam check: Quiz 01 &amp; Unit I test −15 (11110001₂), −18 (11101110₂), and 45 (00101101₂). Note that −128 has no signed-magnitude or 1’s complement representation in 8 bits (only valid in 2’s complement: 10000000).
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
              <div className="text-xs font-medium text-slate-500">2’s Complement (8-bit)</div>
              <div className="font-mono tabular-nums text-lg font-semibold text-slate-900 mt-1">
                {twosComp}₂
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
              <div className="text-xs font-medium text-slate-500">1’s Complement (8-bit)</div>
              <div className="font-mono tabular-nums text-lg font-semibold text-slate-900 mt-1">
                {clampedInt === -128 ? 'Out of range' : `${onesComp}₂`}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
              <div className="text-xs font-medium text-slate-500">Sign-Magnitude (8-bit)</div>
              <div className="font-mono tabular-nums text-lg font-semibold text-slate-900 mt-1">
                {clampedInt === -128 ? 'Out of range' : `${signMag}₂`}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
              <div className="text-xs font-medium text-slate-500">Hex &amp; |Magnitude| Gray Code</div>
              <div className="font-mono tabular-nums text-base font-semibold text-slate-900 mt-1">
                0x{hexVal} · Gray {grayAbs}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'gates' && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-sm font-medium text-slate-800">Toggle Binary Inputs</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Input A', val: bitA, toggle: () => setBitA(bitA === 1 ? 0 : 1) },
                { label: 'Input B', val: bitB, toggle: () => setBitB(bitB === 1 ? 0 : 1) },
                { label: 'Carry Cᵢₙ', val: bitCin, toggle: () => setBitCin(bitCin === 1 ? 0 : 1) },
              ].map((inp) => (
                <button
                  key={inp.label}
                  type="button"
                  onClick={inp.toggle}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    inp.val === 1
                      ? 'border-sky-600 bg-sky-50 text-sky-950'
                      : 'border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="text-xs text-slate-600">{inp.label}</div>
                  <div className="font-mono tabular-nums text-xl font-semibold mt-0.5">
                    {inp.val} ({inp.val === 1 ? 'HIGH' : 'LOW'})
                  </div>
                </button>
              ))}
            </div>

            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
              <div className="text-xs font-medium text-slate-600 mb-2">
                Full Adder (A + B + Cᵢₙ) Live Output
              </div>
              <div className="flex items-center gap-6 font-mono tabular-nums text-sm">
                <div>
                  <span className="text-slate-500">Sum (A⊕B⊕Cᵢₙ) = </span>
                  <span className="font-semibold text-sky-700 text-base">{faSum}</span>
                </div>
                <div>
                  <span className="text-slate-500">Cₒᵤₜ = </span>
                  <span className="font-semibold text-emerald-700 text-base">{faCarry}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: 'AND', expr: 'A · B', out: andOut },
              { name: 'OR', expr: 'A + B', out: orOut },
              { name: 'NAND', expr: '(A · B)’', out: nandOut },
              { name: 'NOR', expr: '(A + B)’', out: norOut },
              { name: 'XOR', expr: 'A ⊕ B', out: xorOut },
              { name: 'XNOR', expr: '(A ⊕ B)’', out: xnorOut },
            ].map((g) => (
              <div
                key={g.name}
                className={`border rounded-lg p-3 transition-colors ${
                  g.out === 1
                    ? 'border-emerald-300 bg-emerald-50/70'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{g.name}</span>
                  <span
                    className={`font-mono text-xs font-semibold ${
                      g.out === 1 ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    OUT = {g.out}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-600 mt-1">{g.expr}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'pipeline' && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-4">
            <div className="text-sm font-semibold text-slate-900">
              Unit V · Pipeline Speedup Explorer
            </div>
            <div>
              <label
                htmlFor="pipe-k"
                className="flex justify-between text-xs font-medium text-slate-700 mb-1"
              >
                <span>Pipeline Stages (k)</span>
                <span className="font-mono tabular-nums font-semibold">{stagesK} stages</span>
              </label>
              <input
                id="pipe-k"
                type="range"
                min={2}
                max={8}
                value={stagesK}
                onChange={(e) => setStagesK(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>
            <div>
              <label
                htmlFor="pipe-n"
                className="flex justify-between text-xs font-medium text-slate-700 mb-1"
              >
                <span>Instructions Executed (n)</span>
                <span className="font-mono tabular-nums font-semibold">{instrN} instr</span>
              </label>
              <input
                id="pipe-n"
                type="range"
                min={4}
                max={200}
                step={2}
                value={instrN}
                onChange={(e) => setInstrN(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 font-mono tabular-nums text-xs">
              <div>
                <div className="text-slate-500">Non-Pipelined</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  {nonPipelinedCycles} cyc
                </div>
              </div>
              <div>
                <div className="text-slate-500">Pipelined (k+n−1)</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  {pipelinedCycles} cyc
                </div>
              </div>
              <div>
                <div className="text-slate-500">Speedup S</div>
                <div className="text-sm font-semibold text-sky-700 mt-0.5">
                  {speedup.toFixed(2)}×
                </div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-4">
            <div className="text-sm font-semibold text-slate-900">
              Unit IV · Effective Memory Access Time
            </div>
            <div>
              <label
                htmlFor="cache-h"
                className="flex justify-between text-xs font-medium text-slate-700 mb-1"
              >
                <span>Cache Hit Ratio (h)</span>
                <span className="font-mono tabular-nums font-semibold">
                  {(hitRatio * 100).toFixed(0)}% (h = {hitRatio.toFixed(2)})
                </span>
              </label>
              <input
                id="cache-h"
                type="range"
                min={0.5}
                max={0.99}
                step={0.01}
                value={hitRatio}
                onChange={(e) => setHitRatio(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="cache-tc"
                  className="flex justify-between text-xs font-medium text-slate-700 mb-1"
                >
                  <span>Cache Access (t_c)</span>
                  <span className="font-mono tabular-nums">{cacheNs} ns</span>
                </label>
                <input
                  id="cache-tc"
                  type="range"
                  min={2}
                  max={25}
                  value={cacheNs}
                  onChange={(e) => setCacheNs(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
              <div>
                <label
                  htmlFor="cache-tm"
                  className="flex justify-between text-xs font-medium text-slate-700 mb-1"
                >
                  <span>Main Mem (t_m)</span>
                  <span className="font-mono tabular-nums">{mainNs} ns</span>
                </label>
                <input
                  id="cache-tm"
                  type="range"
                  min={40}
                  max={200}
                  step={5}
                  value={mainNs}
                  onChange={(e) => setMainNs(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-slate-600">T_avg = h·t_c + (1−h)·t_m</span>
              <span className="text-base font-semibold text-sky-700">
                {effectiveAccessTime.toFixed(2)} ns
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
