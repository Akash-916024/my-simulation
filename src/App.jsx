import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCw, 
  RotateCcw,
  Move, 
  Maximize, 
  FlipHorizontal, 
  Scissors, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Settings, 
  LayoutGrid,
  RefreshCw,
  Eye,
  EyeOff,
  Circle as CircleIcon,
  Triangle,
  Square,
  Minus,
  TableProperties,
  Layers
} from 'lucide-react';

/**
 * MATH HELPER FUNCTIONS
 * (Logic Unchanged)
 */
const toRad = (deg) => (deg * Math.PI) / 180;

const multiplyMatrices = (a, b) => {
  const c = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        c[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return c;
};

const applyMatrix = (matrix, point) => {
  const x = point.x;
  const y = point.y;
  const nx = matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * 1;
  const ny = matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * 1;
  return { x: nx, y: ny };
};

const createIdentity = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const createTranslation = (dx, dy) => [[1, 0, dx], [0, 1, dy], [0, 0, 1]];
const createScaling = (sx, sy) => [[sx, 0, 0], [0, sy, 0], [0, 0, 1]];
const createRotation = (deg) => {
  const rad = toRad(deg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [[cos, -sin, 0], [sin, cos, 0], [0, 0, 1]];
};
const createShear = (shx, shy) => [[1, shx, 0], [shy, 1, 0], [0, 0, 1]];
const createReflection = (type) => {
  switch (type) {
    case 'x-axis': return [[1, 0, 0], [0, -1, 0], [0, 0, 1]];
    case 'y-axis': return [[-1, 0, 0], [0, 1, 0], [0, 0, 1]];
    case 'origin': return [[-1, 0, 0], [0, -1, 0], [0, 0, 1]];
    case 'y=x': return [[0, 1, 0], [1, 0, 0], [0, 0, 1]];
    case 'y=-x': return [[0, -1, 0], [-1, 0, 0], [0, 0, 1]];
    default: return createIdentity();
  }
};

const generateCirclePoints = (cx, cy, r, segments = 36) => {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    pts.push({
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta)
    });
  }
  return pts;
};

// Updated Dark Mode Input Component
const ControlInput = ({ label, value, onChange, type="number", step="0.1", min }) => (
  <div className="flex flex-col group">
    <label className="text-[10px] text-zinc-500 group-focus-within:text-blue-400 font-bold mb-1.5 uppercase tracking-wider">{label}</label>
    <input 
      type={type} 
      step={step}
      min={min}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition-all"
    />
  </div>
);

/**
 * MAIN COMPONENT
 */
export default function TransformationSimulator() {
  // --- STATE (Unchanged) ---
  const [shapeType, setShapeType] = useState('triangle');
  const [circleParams, setCircleParams] = useState({ cx: 2, cy: 2, r: 1.5 });
  const [points, setPoints] = useState([{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 2.5, y: 4 }]);
  const [transforms, setTransforms] = useState([]);
  const [viewStep, setViewStep] = useState(0); 
  const [showGrid, setShowGrid] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [activeTab, setActiveTab] = useState('shape');

  // --- LOGIC (Unchanged) ---
  const loadPreset = (type) => {
    setShapeType(type);
    let newPoints = [];
    switch (type) {
      case 'line': newPoints = [{x: 1, y: 1}, {x: 4, y: 3}]; break;
      case 'triangle': newPoints = [{x: 1, y: 1}, {x: 4, y: 1}, {x: 2.5, y: 4}]; break;
      case 'square': newPoints = [{x: 1, y: 1}, {x: 4, y: 1}, {x: 4, y: 4}, {x: 1, y: 4}]; break;
      case 'circle': newPoints = generateCirclePoints(circleParams.cx, circleParams.cy, circleParams.r); break;
      case 'custom': newPoints = [{x: 0, y: 0}, {x: 2, y: 0}, {x: 2, y: 2}, {x: 0, y: 2}, {x: -1, y: 1}]; break;
      default: newPoints = [{x: 0, y: 0}];
    }
    setPoints(newPoints);
    setTransforms([]); 
    setViewStep(0);
  };

  const updateCircleParam = (key, value) => {
    const newParams = { ...circleParams, [key]: value };
    setCircleParams(newParams);
    const val = parseFloat(value);
    if (!isNaN(val)) {
        const cleanParams = {
            cx: key === 'cx' ? val : parseFloat(circleParams.cx)||0,
            cy: key === 'cy' ? val : parseFloat(circleParams.cy)||0,
            r: key === 'r' ? val : parseFloat(circleParams.r)||1
        };
        setPoints(generateCirclePoints(cleanParams.cx, cleanParams.cy, cleanParams.r));
    }
  };

  const updatePoint = (index, field, value) => {
    const newPoints = [...points];
    newPoints[index][field] = value; 
    setPoints(newPoints);
  };

  const addPoint = () => setPoints([...points, {x: 0, y: 0}]);
  const removePoint = (idx) => {
    if (points.length > 1) {
      const newPoints = points.filter((_, i) => i !== idx);
      setPoints(newPoints);
    }
  };

  const addTransform = (type) => {
    let newTrans = { id: Date.now(), type, params: {} };
    switch(type) {
      case 'translate': newTrans.params = { dx: 2, dy: 2 }; break;
      case 'scale': newTrans.params = { sx: 2, sy: 2, anchor: 'origin', cx: 0, cy: 0 }; break;
      case 'rotate': newTrans.params = { angle: 90, direction: 'CCW', anchor: 'origin', cx: 0, cy: 0 }; break;
      case 'reflect': newTrans.params = { axis: 'x-axis' }; break;
      case 'shear': newTrans.params = { shx: 1, shy: 0 }; break;
    }
    setTransforms([...transforms, newTrans]);
    setViewStep(transforms.length + 1);
  };

  const updateTransform = (id, field, value) => {
    setTransforms(prev => prev.map(t => 
      t.id === id ? { ...t, params: { ...t.params, [field]: value } } : t
    ));
  };

  const removeTransform = (id) => {
    const newTransforms = transforms.filter(t => t.id !== id);
    setTransforms(newTransforms);
    if (viewStep > newTransforms.length) setViewStep(Math.max(0, newTransforms.length));
  };

  // --- CALCULATION (Unchanged) ---
  const stepsData = useMemo(() => {
    const cleanPoints = points.map(p => ({ x: parseFloat(p.x)||0, y: parseFloat(p.y)||0 }));
    const history = [{ name: 'ORIGINAL STATE', points: cleanPoints, matrix: createIdentity() }];
    let currentPoints = cleanPoints;
    let accumulatedMatrix = createIdentity();

    transforms.forEach((t, idx) => {
      let stepMatrix = createIdentity();
      let stepName = t.type.toUpperCase();

      if (t.type === 'translate') {
        const { dx, dy } = t.params;
        stepMatrix = createTranslation(parseFloat(dx)||0, parseFloat(dy)||0);
        stepName = `TRANS(${dx}, ${dy})`;
      } 
      else if (t.type === 'scale') {
        const { sx, sy, anchor, cx, cy } = t.params;
        const sX = parseFloat(sx)||1;
        const sY = parseFloat(sy)||1;
        if (anchor === 'point') {
           const cX = parseFloat(cx)||0;
           const cY = parseFloat(cy)||0;
           const T1 = createTranslation(-cX, -cY);
           const S = createScaling(sX, sY);
           const T2 = createTranslation(cX, cY);
           stepMatrix = multiplyMatrices(T2, multiplyMatrices(S, T1));
           stepName = `SCALE(${sX},${sY}) @(${cX},${cY})`;
        } else {
           stepMatrix = createScaling(sX, sY);
           stepName = `SCALE(${sX},${sY})`;
        }
      } 
      else if (t.type === 'rotate') {
        const { angle, direction, anchor, cx, cy } = t.params;
        let deg = parseFloat(angle)||0;
        if (direction === 'CW') deg = -deg; 
        if (anchor === 'point') {
          const cX = parseFloat(cx)||0;
          const cY = parseFloat(cy)||0;
          const T1 = createTranslation(-cX, -cY);
          const R = createRotation(deg);
          const T2 = createTranslation(cX, cY);
          stepMatrix = multiplyMatrices(T2, multiplyMatrices(R, T1));
          stepName = `ROT(${deg}°) @(${cX},${cY})`;
        } else {
          stepMatrix = createRotation(deg);
          stepName = `ROT(${deg}°)`;
        }
      } 
      else if (t.type === 'shear') {
        const { shx, shy } = t.params;
        stepMatrix = createShear(parseFloat(shx)||0, parseFloat(shy)||0);
        stepName = `SHEAR(${shx}, ${shy})`;
      } 
      else if (t.type === 'reflect') {
        stepMatrix = createReflection(t.params.axis);
        stepName = `REFLECT ${t.params.axis}`;
      }
      currentPoints = currentPoints.map(p => applyMatrix(stepMatrix, p));
      accumulatedMatrix = multiplyMatrices(stepMatrix, accumulatedMatrix);
      history.push({ name: `OP ${idx + 1}: ${stepName}`, points: currentPoints, matrix: stepMatrix });
    });
    return history;
  }, [points, transforms]);

  // --- VISUALIZATION HELPERS (Updated Logic for Dark Mode rendering) ---
  const viewBox = useMemo(() => {
    let allPoints = [];
    stepsData.forEach(s => allPoints.push(...s.points));
    allPoints.push({x:0, y:0}); 
    if(allPoints.length === 0) return { minX:-5, maxX:5, minY:-5, maxY:5, width:10, height:10 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allPoints.forEach(p => {
        if(p.x < minX) minX = p.x;
        if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.y > maxY) maxY = p.y;
    });
    const padding = Math.max(Math.abs(maxX - minX), Math.abs(maxY - minY)) * 0.2 + 2;
    minX -= padding; maxX += padding; minY -= padding; maxY += padding;
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }, [stepsData]);

  const mapX = (x) => ((x - viewBox.minX) / viewBox.width) * 100;
  const mapY = (y) => (1 - (y - viewBox.minY) / viewBox.height) * 100;

  const gridLines = useMemo(() => {
    const lines = [];
    const stepSize = Math.max(1, Math.ceil(Math.max(viewBox.width, viewBox.height) / 10));
    const startX = Math.floor(viewBox.minX / stepSize) * stepSize;
    for (let x = startX; x <= viewBox.maxX; x += stepSize) {
      lines.push({ x1: mapX(x), y1: 0, x2: mapX(x), y2: 100, val: x, type: 'v' });
    }
    const startY = Math.floor(viewBox.minY / stepSize) * stepSize;
    for (let y = startY; y <= viewBox.maxY; y += stepSize) {
      lines.push({ x1: 0, y1: mapY(y), x2: 100, y2: mapY(y), val: y, type: 'h' });
    }
    return lines;
  }, [viewBox, mapX, mapY]);

  const currentStepData = stepsData[viewStep] || stepsData[0];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-zinc-950 text-zinc-300 font-sans overflow-hidden selection:bg-blue-900 selection:text-white">
      
      {/* LEFT PANEL - DARK SIDEBAR */}
      <div className="w-full lg:w-96 flex flex-col bg-zinc-900 border-r border-zinc-800 h-[40vh] lg:h-full shadow-2xl z-20 flex-none">
        
        {/* Header */}
        <div className="h-12 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center px-4 shrink-0">
          <h1 className="font-bold text-sm tracking-widest flex items-center gap-2 text-zinc-100 uppercase">
            <LayoutGrid className="w-4 h-4 text-blue-500" />
            V-CAD <span className="text-[9px] text-zinc-600 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800">SIMULATOR</span>
          </h1>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50">
          <button 
            onClick={() => setActiveTab('shape')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'shape' ? 'text-blue-400 border-b-2 border-blue-500 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
          >
            Geometry
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'add' ? 'text-blue-400 border-b-2 border-blue-500 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
          >
            Operations
          </button>
        </div>

        {/* Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700">
          
          {/* GEOMETRY TAB */}
          {activeTab === 'shape' && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
              
              {/* Shape Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                   <Layers className="w-3 h-3" /> Primitives
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'line', icon: <Minus className="w-4 h-4 -rotate-45" /> },
                    { id: 'triangle', icon: <Triangle className="w-4 h-4" /> },
                    { id: 'square', icon: <Square className="w-4 h-4" /> },
                    { id: 'circle', icon: <CircleIcon className="w-4 h-4" /> },
                    { id: 'custom', icon: <Settings className="w-4 h-4" /> },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => loadPreset(item.id)}
                      className={`h-10 rounded-sm flex items-center justify-center border transition-all ${shapeType === item.id ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'}`}
                      title={item.id}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Circle Params */}
              {shapeType === 'circle' && (
                <div className="p-4 bg-zinc-800/30 rounded border border-zinc-700 space-y-4">
                  <div className="flex items-center gap-2 text-zinc-300 text-[10px] font-bold uppercase tracking-wider pb-2 border-b border-zinc-700/50">
                    <CircleIcon className="w-3 h-3 text-blue-500" /> Circle Properties
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <ControlInput label="Center X" value={circleParams.cx} onChange={v => updateCircleParam('cx', v)} />
                    <ControlInput label="Center Y" value={circleParams.cy} onChange={v => updateCircleParam('cy', v)} />
                  </div>
                  <ControlInput label="Radius" value={circleParams.r} onChange={v => updateCircleParam('r', v)} min="0.1" />
                </div>
              )}

              {/* Vertex Editor */}
              {shapeType !== 'circle' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vertices</label>
                    <button onClick={addPoint} className="text-[10px] flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 px-2 py-1 rounded-sm text-zinc-300 font-bold transition-all">
                      <Plus className="w-3 h-3" /> ADD
                    </button>
                  </div>
                  <div className="space-y-2">
                    {points.map((p, idx) => (
                      <div key={idx} className="flex gap-2 items-center group animate-in fade-in duration-300">
                        <span className="w-6 text-[10px] text-zinc-600 font-mono text-center pt-1 font-bold">{String.fromCharCode(65 + idx)}</span>
                        <input 
                          type="number" value={p.x} 
                          onChange={(e) => updatePoint(idx, 'x', e.target.value)}
                          className="w-full p-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-sm text-xs text-zinc-300 focus:border-blue-500 focus:outline-none font-mono transition-colors text-right" 
                          placeholder="X"
                        />
                        <input 
                          type="number" value={p.y} 
                          onChange={(e) => updatePoint(idx, 'y', e.target.value)}
                          className="w-full p-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-sm text-xs text-zinc-300 focus:border-blue-500 focus:outline-none font-mono transition-colors text-right" 
                          placeholder="Y"
                        />
                        <button 
                          onClick={() => removePoint(idx)}
                          disabled={points.length <= 1}
                          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded disabled:opacity-0 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OPERATIONS TAB */}
          {activeTab === 'add' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tools</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => addTransform('translate')} className="flex flex-col items-center justify-center p-3 border border-zinc-700 rounded-sm bg-zinc-800 hover:bg-zinc-700 hover:border-blue-500/50 hover:text-blue-400 text-zinc-400 transition-all group">
                    <Move className="w-4 h-4 mb-2 opacity-70 group-hover:opacity-100" />
                    <span className="text-[9px] font-bold uppercase">Move</span>
                  </button>
                  <button onClick={() => addTransform('rotate')} className="flex flex-col items-center justify-center p-3 border border-zinc-700 rounded-sm bg-zinc-800 hover:bg-zinc-700 hover:border-blue-500/50 hover:text-blue-400 text-zinc-400 transition-all group">
                    <RotateCw className="w-4 h-4 mb-2 opacity-70 group-hover:opacity-100" />
                    <span className="text-[9px] font-bold uppercase">Rotate</span>
                  </button>
                  <button onClick={() => addTransform('scale')} className="flex flex-col items-center justify-center p-3 border border-zinc-700 rounded-sm bg-zinc-800 hover:bg-zinc-700 hover:border-blue-500/50 hover:text-blue-400 text-zinc-400 transition-all group">
                    <Maximize className="w-4 h-4 mb-2 opacity-70 group-hover:opacity-100" />
                    <span className="text-[9px] font-bold uppercase">Scale</span>
                  </button>
                  <button onClick={() => addTransform('reflect')} className="flex flex-col items-center justify-center p-3 border border-zinc-700 rounded-sm bg-zinc-800 hover:bg-zinc-700 hover:border-blue-500/50 hover:text-blue-400 text-zinc-400 transition-all group">
                    <FlipHorizontal className="w-4 h-4 mb-2 opacity-70 group-hover:opacity-100" />
                    <span className="text-[9px] font-bold uppercase">Reflect</span>
                  </button>
                  <button onClick={() => addTransform('shear')} className="flex flex-col items-center justify-center p-3 border border-zinc-700 rounded-sm bg-zinc-800 hover:bg-zinc-700 hover:border-blue-500/50 hover:text-blue-400 text-zinc-400 transition-all group">
                    <Scissors className="w-4 h-4 mb-2 opacity-70 group-hover:opacity-100" />
                    <span className="text-[9px] font-bold uppercase">Shear</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Modifier Stack</label>
                   <span className="bg-blue-900/30 text-blue-300 border border-blue-900/50 px-1.5 rounded text-[9px] py-0.5 font-mono">{transforms.length}</span>
                </div>
                
                {transforms.length === 0 && (
                  <div className="text-center py-12 bg-zinc-900/50 rounded border-2 border-dashed border-zinc-800 text-zinc-600">
                    <div className="text-xs font-mono">STACK EMPTY</div>
                  </div>
                )}

                <div className="space-y-3">
                  {transforms.map((t, idx) => (
                    <div key={t.id} className="bg-zinc-800 border border-zinc-700 rounded-sm shadow-sm overflow-hidden group">
                      <div className="bg-zinc-900/80 px-3 py-2 border-b border-zinc-700 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
                          <span className="w-4 h-4 rounded bg-zinc-800 text-zinc-500 flex items-center justify-center text-[9px] font-mono border border-zinc-700">{idx + 1}</span>
                          {t.type}
                        </span>
                        <button onClick={() => removeTransform(t.id)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      
                      <div className="p-3 grid gap-4">
                        {/* TRANSLATE */}
                        {t.type === 'translate' && (
                          <div className="grid grid-cols-2 gap-3">
                            <ControlInput label="Dx" value={t.params.dx} onChange={v => updateTransform(t.id, 'dx', v)} />
                            <ControlInput label="Dy" value={t.params.dy} onChange={v => updateTransform(t.id, 'dy', v)} />
                          </div>
                        )}

                        {/* ROTATE */}
                        {t.type === 'rotate' && (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <ControlInput label="Angle (°)" value={t.params.angle} onChange={v => updateTransform(t.id, 'angle', v)} />
                              <div className="flex flex-col group">
                                <label className="text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Direction</label>
                                <div className="flex bg-zinc-900 border border-zinc-700 p-0.5 rounded-sm">
                                   <button 
                                      onClick={() => updateTransform(t.id, 'direction', 'CCW')}
                                      className={`flex-1 flex justify-center py-1 rounded-sm text-[10px] font-bold transition-all ${t.params.direction === 'CCW' ? 'bg-zinc-700 text-blue-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                                      title="Counter Clockwise"
                                   >
                                     <RotateCcw className="w-3 h-3" />
                                   </button>
                                   <button 
                                      onClick={() => updateTransform(t.id, 'direction', 'CW')}
                                      className={`flex-1 flex justify-center py-1 rounded-sm text-[10px] font-bold transition-all ${t.params.direction === 'CW' ? 'bg-zinc-700 text-blue-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                                      title="Clockwise"
                                   >
                                     <RotateCw className="w-3 h-3" />
                                   </button>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col">
                                <label className="text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Pivot Point</label>
                                <select 
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
                                    value={t.params.anchor}
                                    onChange={(e) => updateTransform(t.id, 'anchor', e.target.value)}
                                >
                                    <option value="origin">Origin (0,0)</option>
                                    <option value="point">Custom Point (Px, Py)</option>
                                </select>
                            </div>
                            
                            {t.params.anchor === 'point' && (
                              <div className="grid grid-cols-2 gap-3 bg-zinc-900/50 p-2 rounded-sm border border-zinc-700 animate-in fade-in">
                                  <ControlInput label="Pivot X" value={t.params.cx} onChange={v => updateTransform(t.id, 'cx', v)} />
                                  <ControlInput label="Pivot Y" value={t.params.cy} onChange={v => updateTransform(t.id, 'cy', v)} />
                              </div>
                            )}
                          </>
                        )}

                        {/* SCALE */}
                        {t.type === 'scale' && (
                          <>
                             <div className="grid grid-cols-2 gap-3">
                              <ControlInput label="Factor X" value={t.params.sx} onChange={v => updateTransform(t.id, 'sx', v)} />
                              <ControlInput label="Factor Y" value={t.params.sy} onChange={v => updateTransform(t.id, 'sy', v)} />
                            </div>
                             <div className="flex flex-col">
                                  <label className="text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Scale Center</label>
                                  <select 
                                      className="w-full bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
                                      value={t.params.anchor}
                                      onChange={(e) => updateTransform(t.id, 'anchor', e.target.value)}
                                  >
                                      <option value="origin">Origin (0,0)</option>
                                      <option value="point">Custom Point</option>
                                  </select>
                              </div>
                             {t.params.anchor === 'point' && (
                              <div className="grid grid-cols-2 gap-3 bg-zinc-900/50 p-2 rounded-sm border border-zinc-700 animate-in fade-in">
                                  <ControlInput label="Center X" value={t.params.cx} onChange={v => updateTransform(t.id, 'cx', v)} />
                                  <ControlInput label="Center Y" value={t.params.cy} onChange={v => updateTransform(t.id, 'cy', v)} />
                              </div>
                            )}
                          </>
                        )}

                        {/* SHEAR */}
                        {t.type === 'shear' && (
                          <div className="grid grid-cols-2 gap-3">
                            <ControlInput label="Shear X" value={t.params.shx} onChange={v => updateTransform(t.id, 'shx', v)} />
                            <ControlInput label="Shear Y" value={t.params.shy} onChange={v => updateTransform(t.id, 'shy', v)} />
                          </div>
                        )}

                        {/* REFLECT */}
                        {t.type === 'reflect' && (
                          <div className="flex flex-col">
                              <label className="text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Reflection Axis</label>
                              <select 
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
                                  value={t.params.axis}
                                  onChange={(e) => updateTransform(t.id, 'axis', e.target.value)}
                              >
                                  <option value="x-axis">X-Axis</option>
                                  <option value="y-axis">Y-Axis</option>
                                  <option value="origin">Origin</option>
                                  <option value="y=x">Line y = x</option>
                                  <option value="y=-x">Line y = -x</option>
                              </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - DARK CANVAS */}
      <div className="flex-1 flex flex-col h-[60vh] lg:h-full overflow-hidden bg-black relative">
        
        {/* Floating Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
          <div className="bg-zinc-900/90 backdrop-blur shadow-xl border border-zinc-700 rounded p-1 pointer-events-auto flex gap-1">
            <button 
                onClick={() => setShowGrid(!showGrid)} 
                className={`p-2 rounded transition-colors ${showGrid ? 'bg-zinc-800 text-blue-400' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                title="Toggle Grid"
            >
                <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setShowCoordinates(!showCoordinates)} 
                className={`p-2 rounded transition-colors ${showCoordinates ? 'bg-zinc-800 text-blue-400' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                title="Toggle Labels"
            >
                {showCoordinates ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <div className="w-px bg-zinc-700 mx-1 my-1"></div>
            <button 
                onClick={() => { setTransforms([]); setViewStep(0); }} 
                className="p-2 rounded transition-colors text-zinc-500 hover:bg-red-900/30 hover:text-red-400"
                title="Reset All"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-zinc-900/90 backdrop-blur shadow-xl border border-zinc-700 rounded px-4 py-2 pointer-events-auto max-w-xs text-right">
             <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Active State</div>
             <div className="font-mono text-zinc-200 text-xs mt-1 border-l-2 border-blue-500 pl-2">{stepsData[viewStep].name}</div>
          </div>
        </div>

        {/* The Graph */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-0 select-none cursor-crosshair bg-[#09090b]">
          {/* Radial Gradient for depth */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,30,40,0.5)_0%,rgba(0,0,0,0)_100%)]"></div>
          
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {/* Dark Mode Grid */}
            {showGrid && gridLines.map((line, i) => (
              <g key={i}>
                <line 
                  x1={line.x1} y1={line.y1} 
                  x2={line.x2} y2={line.y2} 
                  stroke={line.val === 0 ? "#52525b" : "#27272a"} 
                  strokeWidth={line.val === 0 ? "0.4" : "0.15"}
                />
                {line.val !== 0 && (
                    line.type === 'v' 
                    ? <text x={line.x1} y={mapY(0) + 3} fontSize="1.8" fill="#52525b" textAnchor="middle" fontWeight="400" className="font-mono">{parseFloat(line.val.toFixed(1))}</text>
                    : <text x={mapX(0) - 1.5} y={line.y2 + 0.6} fontSize="1.8" fill="#52525b" textAnchor="end" fontWeight="400" className="font-mono">{parseFloat(line.val.toFixed(1))}</text>
                )}
              </g>
            ))}
            
            {/* Origin */}
            <circle cx={mapX(0)} cy={mapY(0)} r="0.6" fill="#71717a" />

            {/* Previous Ghost */}
            {viewStep > 0 && (
              <g opacity="0.4">
                <polygon 
                  points={stepsData[viewStep - 1].points.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(' ')} 
                  fill="none" 
                  stroke="#52525b" 
                  strokeWidth="0.4" 
                  strokeDasharray="1.5"
                />
              </g>
            )}

            {/* Current Shape - Cyan / Electric Blue theme */}
            <g>
              <polygon 
                points={currentStepData.points.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(' ')} 
                fill={viewStep === 0 ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)"} 
                stroke={viewStep === 0 ? "#3b82f6" : "#10b981"} 
                strokeWidth="0.5" 
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-500 ease-in-out"
              />
              
              {/* Vertices */}
              {currentStepData.points.length < 20 && currentStepData.points.map((p, i) => (
                <g key={i}>
                  <circle cx={mapX(p.x)} cy={mapY(p.y)} r="0.8" fill="#18181b" stroke={viewStep === 0 ? "#60a5fa" : "#34d399"} strokeWidth="0.3" />
                  {showCoordinates && (
                     <text x={mapX(p.x)} y={mapY(p.y) - 2.5} fontSize="2" textAnchor="middle" fill="#e4e4e7" fontWeight="bold" className="font-sans">
                       {String.fromCharCode(65+i)}
                     </text>
                  )}
                </g>
              ))}
              
              {/* Center point for circles */}
              {currentStepData.points.length >= 20 && (
                 <circle 
                    cx={mapX(currentStepData.points.reduce((sum, p) => sum + p.x, 0) / currentStepData.points.length)} 
                    cy={mapY(currentStepData.points.reduce((sum, p) => sum + p.y, 0) / currentStepData.points.length)} 
                    r="0.5" fill={viewStep === 0 ? "#3b82f6" : "#10b981"} 
                 />
              )}
            </g>

            {/* Pivot Point Indicator - Bright Red */}
            {transforms[viewStep - 1]?.params.anchor === 'point' && (
                <g>
                   <line x1={mapX(transforms[viewStep - 1].params.cx)-2} y1={mapY(transforms[viewStep - 1].params.cy)} x2={mapX(transforms[viewStep - 1].params.cx)+2} y2={mapY(transforms[viewStep - 1].params.cy)} stroke="#f43f5e" strokeWidth="0.2" />
                   <line x1={mapX(transforms[viewStep - 1].params.cx)} y1={mapY(transforms[viewStep - 1].params.cy)-2} x2={mapX(transforms[viewStep - 1].params.cx)} y2={mapY(transforms[viewStep - 1].params.cy)+2} stroke="#f43f5e" strokeWidth="0.2" />
                   <text x={mapX(transforms[viewStep - 1].params.cx)} y={mapY(transforms[viewStep - 1].params.cy) - 2.5} fontSize="1.8" fill="#f43f5e" textAnchor="middle" fontWeight="bold" className="font-mono">PIVOT</text>
                </g>
            )}
          </svg>
        </div>

        {/* BOTTOM PANEL - FOOTER */}
        <div className="bg-zinc-900 border-t border-zinc-800 z-20 flex flex-col flex-none">
            {/* Playback Controls */}
            <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900 flex-none">
                <button 
                  onClick={() => setViewStep(Math.max(0, viewStep - 1))}
                  disabled={viewStep === 0}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                
                <div className="flex-1 relative h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-blue-600 transition-all duration-300 shadow-[0_0_10px_#2563eb]"
                    style={{ width: `${(viewStep / Math.max(1, stepsData.length - 1)) * 100}%` }}
                  ></div>
                </div>
                
                <button 
                  onClick={() => setViewStep(Math.min(stepsData.length - 1, viewStep + 1))}
                  disabled={viewStep === stepsData.length - 1}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Coordinates Display */}
            <div className="bg-zinc-950 flex items-center text-xs h-10">
               <div className="px-4 h-full bg-zinc-900 border-r border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase flex-none flex items-center gap-2">
                 <TableProperties className="w-3 h-3" />
                 Coordinates
               </div>
               
               <div className="flex-1 overflow-x-auto whitespace-nowrap px-4 scrollbar-hide flex gap-6 items-center h-full">
                  {currentStepData.points.length > 20 ? (
                      <div className="text-[10px] text-zinc-600 font-mono tracking-tight">
                          CIRCLE APPROXIMATION ({currentStepData.points.length} VERTICES)
                      </div>
                  ) : (
                      currentStepData.points.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="font-bold text-blue-500 font-sans text-[10px]">{String.fromCharCode(65+i)}</span>
                            <span className="font-mono text-zinc-400 font-medium tracking-tight">
                                <span className="text-zinc-600">x:</span>{p?.x.toFixed(2)} <span className="text-zinc-600 ml-1">y:</span>{p?.y.toFixed(2)}
                            </span>
                        </div>
                      ))
                  )}
               </div>
            </div>
        </div>
      </div>
   </div>
 );
}