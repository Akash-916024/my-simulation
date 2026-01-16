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
  TableProperties
} from 'lucide-react';

/**
 * MATH HELPER FUNCTIONS
 */
const toRad = (deg) => (deg * Math.PI) / 180;

// Matrix multiplication: A (3x3) * B (3x3)
const multiplyMatrices = (a, b) => {
  const c = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        c[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return c;
};

// Apply matrix to point {x, y}
const applyMatrix = (matrix, point) => {
  const x = point.x;
  const y = point.y;
  // Homogeneous coordinate [x, y, 1]
  const nx = matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * 1;
  const ny = matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * 1;
  return { x: nx, y: ny };
};

// Generate Identity Matrix
const createIdentity = () => [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];

// Generate Translation Matrix
const createTranslation = (dx, dy) => [
  [1, 0, dx],
  [0, 1, dy],
  [0, 0, 1]
];

// Generate Scaling Matrix
const createScaling = (sx, sy) => [
  [sx, 0, 0],
  [0, sy, 0],
  [0, 0, 1]
];

// Generate Rotation Matrix
const createRotation = (deg) => {
  const rad = toRad(deg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    [cos, -sin, 0],
    [sin, cos, 0],
    [0, 0, 1]
  ];
};

// Generate Shear Matrix
const createShear = (shx, shy) => [
  [1, shx, 0],
  [shy, 1, 0],
  [0, 0, 1]
];

// Generate Reflection Matrix
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

// Define Component OUTSIDE to prevent re-render/focus loss bugs
const ControlInput = ({ label, value, onChange, type="number", step="0.1", min }) => (
  <div className="flex flex-col">
    <label className="text-[10px] text-slate-500 font-bold mb-1 uppercase">{label}</label>
    <input 
      type={type} 
      step={step}
      min={min}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
    />
  </div>
);

/**
 * MAIN COMPONENT
 */
export default function TransformationSimulator() {
  // --- STATE ---
  
  // Shape Definition
  const [shapeType, setShapeType] = useState('triangle'); // line, triangle, square, circle, custom
  const [circleParams, setCircleParams] = useState({ cx: 2, cy: 2, r: 1.5 });

  const [points, setPoints] = useState([
    { x: 1, y: 1 },
    { x: 4, y: 1 },
    { x: 2.5, y: 4 }
  ]);

  // Transformations Queue
  const [transforms, setTransforms] = useState([]);
  
  // UI State
  const [viewStep, setViewStep] = useState(0); 
  const [showGrid, setShowGrid] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [activeTab, setActiveTab] = useState('shape'); // 'add' or 'shape'

  // --- LOGIC ---

  const loadPreset = (type) => {
    setShapeType(type);
    let newPoints = [];
    switch (type) {
      case 'line':
        newPoints = [{x: 1, y: 1}, {x: 4, y: 3}];
        break;
      case 'triangle':
        newPoints = [{x: 1, y: 1}, {x: 4, y: 1}, {x: 2.5, y: 4}];
        break;
      case 'square':
        newPoints = [{x: 1, y: 1}, {x: 4, y: 1}, {x: 4, y: 4}, {x: 1, y: 4}];
        break;
      case 'circle':
        newPoints = generateCirclePoints(circleParams.cx, circleParams.cy, circleParams.r);
        break;
      case 'custom':
        newPoints = [{x: 0, y: 0}, {x: 2, y: 0}, {x: 2, y: 2}, {x: 0, y: 2}, {x: -1, y: 1}];
        break;
      default:
        newPoints = [{x: 0, y: 0}];
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

  // --- CALCULATION ENGINE ---

  const stepsData = useMemo(() => {
    const cleanPoints = points.map(p => ({ x: parseFloat(p.x)||0, y: parseFloat(p.y)||0 }));
    
    const history = [{
      name: 'Original',
      points: cleanPoints,
      matrix: createIdentity()
    }];

    let currentPoints = cleanPoints;
    let accumulatedMatrix = createIdentity();

    transforms.forEach((t, idx) => {
      let stepMatrix = createIdentity();
      let stepName = t.type.toUpperCase();

      if (t.type === 'translate') {
        const { dx, dy } = t.params;
        stepMatrix = createTranslation(parseFloat(dx)||0, parseFloat(dy)||0);
        stepName = `Trans(${dx}, ${dy})`;
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
           stepName = `Scale(${sX},${sY}) @(${cX},${cY})`;
        } else {
           stepMatrix = createScaling(sX, sY);
           stepName = `Scale(${sX},${sY})`;
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
          stepName = `Rot(${deg}°) @(${cX},${cY})`;
        } else {
          stepMatrix = createRotation(deg);
          stepName = `Rot(${deg}°)`;
        }
      } 
      else if (t.type === 'shear') {
        const { shx, shy } = t.params;
        stepMatrix = createShear(parseFloat(shx)||0, parseFloat(shy)||0);
        stepName = `Shear(${shx}, ${shy})`;
      } 
      else if (t.type === 'reflect') {
        stepMatrix = createReflection(t.params.axis);
        stepName = `Reflect ${t.params.axis}`;
      }

      currentPoints = currentPoints.map(p => applyMatrix(stepMatrix, p));
      accumulatedMatrix = multiplyMatrices(stepMatrix, accumulatedMatrix);

      history.push({
        name: `Step ${idx + 1}: ${stepName}`,
        points: currentPoints,
        matrix: stepMatrix
      });
    });

    return history;
  }, [points, transforms]);

  // --- VISUALIZATION HELPERS ---
  
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

    // Padding
    const padding = Math.max(Math.abs(maxX - minX), Math.abs(maxY - minY)) * 0.2 + 2;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

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
    <div className="flex flex-col lg:flex-row h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      
      {/* LEFT PANEL */}
      <div className="w-full lg:w-96 flex flex-col bg-white border-r border-slate-200 h-[35vh] lg:h-full shadow-xl z-20 flex-none">
        <div className="p-3 bg-slate-900 text-white flex justify-between items-center shadow-md">
          <h1 className="font-bold text-base flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
            TransForm
          </h1>
          <div className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-200 font-mono">v2.3</div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('shape')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'shape' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Shape
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'add' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Transform
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
          
          {/* SHAPE TAB */}
          {activeTab === 'shape' && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              {/* Presets */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Shape</label>
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
                      className={`h-9 rounded flex items-center justify-center border transition-all ${shapeType === item.id ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-500'}`}
                      title={item.id}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Circle Specific Input */}
              {shapeType === 'circle' && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase mb-1">
                    <CircleIcon className="w-3 h-3" /> Circle Parameters
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <ControlInput label="Center X" value={circleParams.cx} onChange={v => updateCircleParam('cx', v)} />
                    <ControlInput label="Center Y" value={circleParams.cy} onChange={v => updateCircleParam('cy', v)} />
                  </div>
                  <ControlInput label="Radius" value={circleParams.r} onChange={v => updateCircleParam('r', v)} min="0.1" />
                  <p className="text-[10px] text-emerald-600 leading-tight mt-1">
                    * Represented as a 36-sided polygon to allow shearing and non-uniform scaling.
                  </p>
                </div>
              )}

              {/* Point Editor */}
              {shapeType !== 'circle' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vertices (x, y)</label>
                    <button onClick={addPoint} className="text-[10px] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 font-bold transition-colors">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {points.map((p, idx) => (
                      <div key={idx} className="flex gap-2 items-center group animate-in fade-in duration-300">
                        <span className="w-4 text-[10px] text-slate-400 font-mono text-center pt-1">{String.fromCharCode(65 + idx)}</span>
                        <input 
                          type="number" value={p.x} 
                          onChange={(e) => updatePoint(idx, 'x', e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                          placeholder="X"
                        />
                        <input 
                          type="number" value={p.y} 
                          onChange={(e) => updatePoint(idx, 'y', e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                          placeholder="Y"
                        />
                        <button 
                          onClick={() => removePoint(idx)}
                          disabled={points.length <= 1}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded disabled:opacity-0 transition-colors"
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

          {/* TRANSFORMATIONS TAB */}
          {activeTab === 'add' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add Operation</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => addTransform('translate')} className="flex flex-col items-center justify-center p-2 border border-slate-200 rounded bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all group shadow-sm">
                    <Move className="w-4 h-4 mb-1 text-slate-400 group-hover:text-blue-500" />
                    <span className="text-[10px] font-bold">Translate</span>
                  </button>
                  <button onClick={() => addTransform('rotate')} className="flex flex-col items-center justify-center p-2 border border-slate-200 rounded bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all group shadow-sm">
                    <RotateCw className="w-4 h-4 mb-1 text-slate-400 group-hover:text-blue-500" />
                    <span className="text-[10px] font-bold">Rotate</span>
                  </button>
                  <button onClick={() => addTransform('scale')} className="flex flex-col items-center justify-center p-2 border border-slate-200 rounded bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all group shadow-sm">
                    <Maximize className="w-4 h-4 mb-1 text-slate-400 group-hover:text-blue-500" />
                    <span className="text-[10px] font-bold">Scale</span>
                  </button>
                  <button onClick={() => addTransform('reflect')} className="flex flex-col items-center justify-center p-2 border border-slate-200 rounded bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all group shadow-sm">
                    <FlipHorizontal className="w-4 h-4 mb-1 text-slate-400 group-hover:text-blue-500" />
                    <span className="text-[10px] font-bold">Reflect</span>
                  </button>
                  <button onClick={() => addTransform('shear')} className="flex flex-col items-center justify-center p-2 border border-slate-200 rounded bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all group shadow-sm">
                    <Scissors className="w-4 h-4 mb-1 text-slate-400 group-hover:text-blue-500" />
                    <span className="text-[10px] font-bold">Shear</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Stack</span>
                  <span className="bg-slate-200 text-slate-600 px-1.5 rounded text-[9px] py-0.5 font-mono">{transforms.length} OPS</span>
                </label>
                
                {transforms.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 text-slate-400">
                    <div className="text-sm font-medium">Empty Queue</div>
                    <div className="text-xs mt-1 opacity-70">Add operations above</div>
                  </div>
                )}

                <div className="space-y-3">
                  {transforms.map((t, idx) => (
                    <div key={t.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden group transition-all hover:shadow-md hover:border-blue-200">
                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px]">{idx + 1}</span>
                          {t.type}
                        </span>
                        <button onClick={() => removeTransform(t.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      
                      <div className="p-3 grid gap-3">
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
                              <div className="flex flex-col">
                                <label className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Direction</label>
                                <div className="flex bg-slate-100 p-0.5 rounded">
                                   <button 
                                      onClick={() => updateTransform(t.id, 'direction', 'CCW')}
                                      className={`flex-1 flex justify-center py-1 rounded text-[10px] font-bold ${t.params.direction === 'CCW' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                                      title="Counter Clockwise"
                                   >
                                     <RotateCcw className="w-3 h-3" />
                                   </button>
                                   <button 
                                      onClick={() => updateTransform(t.id, 'direction', 'CW')}
                                      className={`flex-1 flex justify-center py-1 rounded text-[10px] font-bold ${t.params.direction === 'CW' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                                      title="Clockwise"
                                   >
                                     <RotateCw className="w-3 h-3" />
                                   </button>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Pivot Point</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={t.params.anchor}
                                    onChange={(e) => updateTransform(t.id, 'anchor', e.target.value)}
                                >
                                    <option value="origin">Origin (0,0)</option>
                                    <option value="point">Custom Point (Px, Py)</option>
                                </select>
                            </div>
                            
                            {t.params.anchor === 'point' && (
                              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-2 rounded border border-blue-100 animate-in fade-in">
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
                                  <label className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Scale Center</label>
                                  <select 
                                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      value={t.params.anchor}
                                      onChange={(e) => updateTransform(t.id, 'anchor', e.target.value)}
                                  >
                                      <option value="origin">Origin (0,0)</option>
                                      <option value="point">Custom Point</option>
                                  </select>
                              </div>
                             {t.params.anchor === 'point' && (
                              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-2 rounded border border-blue-100 animate-in fade-in">
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
                              <label className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Reflection Axis</label>
                              <select 
                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* RIGHT PANEL - Graph takes priority */}
      <div className="flex-1 flex flex-col h-[65vh] lg:h-full overflow-hidden bg-slate-50 relative">
        
        {/* Floating Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
          <div className="bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg p-1.5 pointer-events-auto flex gap-1">
            <button 
                onClick={() => setShowGrid(!showGrid)} 
                className={`p-2 rounded-md transition-colors ${showGrid ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                title="Toggle Grid"
            >
                <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setShowCoordinates(!showCoordinates)} 
                className={`p-2 rounded-md transition-colors ${showCoordinates ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                title="Toggle Labels"
            >
                {showCoordinates ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <div className="w-px bg-slate-200 mx-1 my-1"></div>
            <button 
                onClick={() => { setTransforms([]); setViewStep(0); }} 
                className="p-2 rounded-md transition-colors text-slate-400 hover:bg-red-50 hover:text-red-500"
                title="Reset All"
            >
                <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg px-3 py-1.5 pointer-events-auto max-w-xs text-right">
             <div className="text-[10px] font-bold text-slate-400 uppercase">Current Step</div>
             <div className="font-semibold text-slate-700 text-sm whitespace-nowrap">{stepsData[viewStep].name}</div>
          </div>
        </div>

        {/* The Graph - FLEX GROW to fill space */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 select-none cursor-crosshair bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] min-h-0">
          <svg className="w-full h-full bg-white rounded-xl shadow-2xl border border-slate-200" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {/* Grid */}
            {showGrid && gridLines.map((line, i) => (
              <g key={i}>
                <line 
                  x1={line.x1} y1={line.y1} 
                  x2={line.x2} y2={line.y2} 
                  stroke={line.val === 0 ? "#64748b" : "#f1f5f9"} 
                  strokeWidth={line.val === 0 ? "0.6" : "0.3"}
                />
                {line.val !== 0 && (
                    line.type === 'v' 
                    ? <text x={line.x1} y={mapY(0) + 3} fontSize="2" fill="#94a3b8" textAnchor="middle" fontWeight="500">{parseFloat(line.val.toFixed(1))}</text>
                    : <text x={mapX(0) - 1.5} y={line.y2 + 0.8} fontSize="2" fill="#94a3b8" textAnchor="end" fontWeight="500">{parseFloat(line.val.toFixed(1))}</text>
                )}
              </g>
            ))}
            
            {/* Origin */}
            <circle cx={mapX(0)} cy={mapY(0)} r="0.8" fill="#475569" />

            {/* Previous Ghost */}
            {viewStep > 0 && (
              <g opacity="0.3">
                <polygon 
                  points={stepsData[viewStep - 1].points.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(' ')} 
                  fill="none" 
                  stroke="#94a3b8" 
                  strokeWidth="0.5" 
                  strokeDasharray="2"
                />
              </g>
            )}

            {/* Current Shape */}
            <g>
              <polygon 
                points={currentStepData.points.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(' ')} 
                fill={viewStep === 0 ? "rgba(37, 99, 235, 0.1)" : "rgba(16, 185, 129, 0.1)"} 
                stroke={viewStep === 0 ? "#2563eb" : "#10b981"} 
                strokeWidth="0.6" 
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-500 ease-in-out"
              />
              
              {/* Vertices */}
              {currentStepData.points.length < 20 && currentStepData.points.map((p, i) => (
                <g key={i}>
                  <circle cx={mapX(p.x)} cy={mapY(p.y)} r="0.8" fill="white" stroke={viewStep === 0 ? "#2563eb" : "#10b981"} strokeWidth="0.3" />
                  {showCoordinates && (
                     <text x={mapX(p.x)} y={mapY(p.y) - 2} fontSize="2.2" textAnchor="middle" fill="#334155" fontWeight="700" style={{textShadow: '0 1px 2px white'}}>
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
                    r="0.5" fill={viewStep === 0 ? "#2563eb" : "#10b981"} 
                 />
              )}
            </g>

            {/* Pivot Point Indicator */}
            {transforms[viewStep - 1]?.params.anchor === 'point' && (
                <g>
                   <line x1={mapX(transforms[viewStep - 1].params.cx)-2} y1={mapY(transforms[viewStep - 1].params.cy)} x2={mapX(transforms[viewStep - 1].params.cx)+2} y2={mapY(transforms[viewStep - 1].params.cy)} stroke="#ef4444" strokeWidth="0.2" />
                   <line x1={mapX(transforms[viewStep - 1].params.cx)} y1={mapY(transforms[viewStep - 1].params.cy)-2} x2={mapX(transforms[viewStep - 1].params.cx)} y2={mapY(transforms[viewStep - 1].params.cy)+2} stroke="#ef4444" strokeWidth="0.2" />
                   <text 
                    x={mapX(transforms[viewStep - 1].params.cx)} 
                    y={mapY(transforms[viewStep - 1].params.cy) - 2} 
                    fontSize="2" 
                    fill="#ef4444" 
                    textAnchor="middle"
                    fontWeight="bold"
                   >
                       PIVOT
                   </text>
                </g>
            )}
          </svg>
        </div>

        {/* BOTTOM PANEL - COMPACT, NO MATRIX */}
        <div className="bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex flex-col flex-none">
            {/* Playback Controls */}
            <div className="px-6 py-2 border-b border-slate-100 flex items-center gap-4 bg-slate-50 flex-none">
                <button 
                  onClick={() => setViewStep(Math.max(0, viewStep - 1))}
                  disabled={viewStep === 0}
                  className="p-1.5 rounded-full hover:bg-white hover:shadow text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                
                <div className="flex-1 relative h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-blue-500 transition-all duration-300"
                    style={{ width: `${(viewStep / Math.max(1, stepsData.length - 1)) * 100}%` }}
                  ></div>
                </div>
                
                <button 
                  onClick={() => setViewStep(Math.min(stepsData.length - 1, viewStep + 1))}
                  disabled={viewStep === stepsData.length - 1}
                  className="p-1.5 rounded-full hover:bg-white hover:shadow text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Coordinates - Horizontal Scroll Stripe */}
            <div className="bg-white flex items-center border-t border-slate-100">
               <div className="px-4 py-3 bg-slate-50 border-r border-slate-100 text-[10px] font-bold text-slate-400 uppercase flex-none flex items-center gap-2">
                 <TableProperties className="w-3 h-3" />
                 Coordinates
               </div>
               
               <div className="flex-1 overflow-x-auto whitespace-nowrap p-3 scrollbar-thin scrollbar-thumb-slate-200 flex gap-4 items-center">
                  {currentStepData.points.length > 20 ? (
                      <div className="text-xs text-slate-400 italic px-2">
                          Shape is approximated by {currentStepData.points.length} vertices (Circle). Coordinates hidden.
                      </div>
                  ) : (
                      currentStepData.points.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 text-xs shadow-sm">
                            <span className="font-bold text-blue-500 w-4">{String.fromCharCode(65+i)}</span>
                            <span className="w-px h-3 bg-slate-300"></span>
                            <span className="font-mono text-slate-700 font-medium">
                                {(p?.x || 0).toFixed(2)}, {(p?.y || 0).toFixed(2)}
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
