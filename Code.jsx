import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Globe, 
  Aperture, 
  Cpu, 
  Wifi, 
  Activity, 
  Crosshair, 
  Zap, 
  Server,
  Database
} from 'lucide-react';

// --- CONFIGURATION ---
const TARGETS = {
  MOON: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tycho_crater_on_the_Moon_-_LRO_WAC.jpg/600px-Tycho_crater_on_the_Moon_-_LRO_WAC.jpg",
    ra: "05h 12m 14s", dec: "+18° 12' 09\"", dist: "384,400 km"
  },
  JUPITER: {
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg",
    ra: "01h 45m 22s", dec: "+10° 20' 44\"", dist: "714,000,000 km"
  },
  SATURN: {
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg",
    ra: "22h 30m 11s", dec: "-15° 45' 10\"", dist: "1,400,000,000 km"
  },
  MARS: {
    url: "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg",
    ra: "14h 22m 10s", dec: "-12° 10' 05\"", dist: "225,000,000 km"
  }
};

export default function QuantumTelescope() {
  // --- STATE ---
  const [target, setTarget] = useState('MOON');
  const [quantumMode, setQuantumMode] = useState(false); // The "- -" Trigger
  const [ibmStatus, setIbmStatus] = useState('DISCONNECTED'); // DISCONNECTED, CONNECTING, QUEUED, ACTIVE
  const [logs, setLogs] = useState(['>> SYSTEM INITIALIZED', '>> TELESCOPE LINK ESTABLISHED']);
  const [ephemeris, setEphemeris] = useState(TARGETS.MOON);
  
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const phaseRef = useRef(0);
  const imageRef = useRef(null);

  // --- LOGGING ---
  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  // --- 1. IBM QUANTUM CONNECTION HANDLER ---
  const connectToIBM = async () => {
    if (ibmStatus === 'ACTIVE') {
      setIbmStatus('DISCONNECTED');
      addLog("IBM QUANTUM SESSION TERMINATED.");
      return;
    }

    setIbmStatus('CONNECTING');
    addLog(">> HANDSHAKE: IBM QUANTUM CLOUD...");
    
    // SIMULATED API CALL
    // In a real app, this fetch would hit your Python/Flask backend
    /*
    const response = await fetch('http://localhost:5000/api/connect-qiskit', {
        method: 'POST',
        body: JSON.stringify({ token: 'YOUR_IBM_TOKEN' })
    });
    */

    setTimeout(() => {
      setIbmStatus('QUEUED');
      addLog(">> AUTHENTICATED. JOB QUEUED: ibmq_manila (5 Qubits)");
      
      setTimeout(() => {
        setIbmStatus('ACTIVE');
        addLog(">> QPU ALLOCATED. QUANTUM KERNEL RUNNING.");
        setQuantumMode(true); // Auto-enable quantum mode on connection
      }, 2000);
    }, 1500);
  };

  // --- 2. IMAGE LOADER ---
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = TARGETS[target].url;
    
    addLog(`SLEWING TELESCOPE TO ${target}...`);
    
    img.onload = () => {
      imageRef.current = img;
      setEphemeris(TARGETS[target]);
      addLog(`TRACKING LOCK: ${target}`);
    };
  }, [target]);

  // --- 3. THE "- -" PIXEL ALGORITHM (CANVAS LOOP) ---
  const processFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    // Draw base image
    // Center the image covering the canvas
    const img = imageRef.current;
    const scale = Math.max(w / img.width, h / img.height);
    const x = (w / 2) - (img.width / 2) * scale;
    const y = (h / 2) - (img.height / 2) * scale;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    // Get Pixel Data
    const frame = ctx.getImageData(0, 0, w, h);
    const data = frame.data;
    
    // ANIMATE PHASE
    phaseRef.current += 0.15;
    const phase = phaseRef.current;

    // === PIXEL SHADER LOGIC ===
    for (let i = 0; i < data.length; i += 4) {
      // Current Pixel Brightness
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      // Simulate "Wave B" (Noise/Atmosphere)
      // We use a sine wave based on position to simulate interference
      const noise = Math.sin((i * 0.01) + phase) * 20;

      if (quantumMode) {
        // ALGORITHM: |00> - - |11> (Constructive Interference)
        // We subtract the negative noise (adding it), creating clarity
        // And boost the "Cyan" channels for visualization
        
        data[i]   = Math.min(255, r + 10);     // Red (Slight boost)
        data[i+1] = Math.min(255, g + 40 - noise); // Green (Cancel noise)
        data[i+2] = Math.min(255, b + 50 - noise); // Blue (Cancel noise + Boost)
      } else {
        // STANDARD MODE: |00> + |11> (Destructive/Normal Interference)
        // The noise is just added normally, degrading the image
        data[i]   = Math.max(0, r + noise);
        data[i+1] = Math.max(0, g + noise);
        data[i+2] = Math.max(0, b + noise);
      }
    }

    ctx.putImageData(frame, 0, 0);
    
    // HUD OVERLAY ON CANVAS
    ctx.strokeStyle = quantumMode ? '#00ffff' : 'rgba(0, 255, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w/2, h/2, 50, 0, Math.PI * 2);
    ctx.moveTo(w/2 - 20, h/2); ctx.lineTo(w/2 + 20, h/2);
    ctx.moveTo(w/2, h/2 - 20); ctx.lineTo(w/2, h/2 + 20);
    ctx.stroke();

    requestRef.current = requestAnimationFrame(processFrame);
  }, [quantumMode]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [processFrame]);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#05050a] text-white font-mono p-4 flex flex-col overflow-hidden">
      <style>{`
        .scan-grid {
          background-image: 
            linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .ibm-glow {
          box-shadow: 0 0 15px #00ffff;
        }
      `}</style>
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2 bg-[#0a0a10]">
        <div className="flex items-center gap-4">
          <Aperture className={`w-8 h-8 ${quantumMode ? 'text-cyan-400 animate-spin-slow' : 'text-green-500'}`} />
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-white">
              3I/ATLAS <span className="text-gray-500 text-sm font-normal">TELESCOPE LINK</span>
            </h1>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${ibmStatus === 'ACTIVE' ? 'bg-cyan-400' : 'bg-red-500'} animate-pulse`}></span>
              IBM QUANTUM: {ibmStatus}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={connectToIBM}
            className={`flex items-center gap-2 px-4 py-2 rounded border ${
              ibmStatus === 'ACTIVE' 
                ? 'border-cyan-500 text-cyan-400 bg-cyan-900/20 ibm-glow' 
                : 'border-gray-600 text-gray-400 hover:bg-gray-800'
            } transition-all`}
          >
            <Cpu className="w-4 h-4" />
            {ibmStatus === 'ACTIVE' ? 'QPU CONNECTED' : 'CONNECT IBM Q'}
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 grid grid-cols-12 gap-4">
        
        {/* LEFT: VIEWPORT (8 Cols) */}
        <div className="col-span-8 relative border border-gray-800 bg-black rounded-lg overflow-hidden group scan-grid">
          
          {/* Overlay Stats */}
          <div className="absolute top-4 left-4 z-10 space-y-2">
            <div className="bg-black/80 border border-green-500/30 px-3 py-1 text-xs text-green-400 rounded">
              TARGET: {target}
            </div>
            <div className={`bg-black/80 border px-3 py-1 text-xs rounded flex items-center gap-2 ${quantumMode ? 'border-cyan-500 text-cyan-400' : 'border-gray-700 text-gray-500'}`}>
              <Zap className="w-3 h-3" />
              ALGORITHM: |φ⟩ = 1/√2 (|00⟩ {quantumMode ? '- -' : '+'} |11⟩)
            </div>
          </div>

          <canvas 
            ref={canvasRef} 
            width={900} 
            height={600} 
            className="w-full h-full object-cover opacity-90"
          />

          {/* Bottom Toolbar */}
          <div className="absolute bottom-0 left-0 w-full bg-black/80 border-t border-gray-800 p-4 flex justify-center gap-4">
            {Object.keys(TARGETS).map(t => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`px-4 py-1 text-xs border rounded hover:bg-white/10 transition-colors ${target === t ? 'border-green-500 text-green-400' : 'border-gray-700 text-gray-500'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: DATA (4 Cols) */}
        <div className="col-span-4 flex flex-col gap-4">
          
          {/* Ephemeris Data */}
          <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
            <h2 className="text-sm font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" /> REAL-TIME DATA
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span className="text-gray-500">RIGHT ASCENSION</span>
                <span className="text-green-400 font-bold">{ephemeris.ra}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span className="text-gray-500">DECLINATION</span>
                <span className="text-green-400 font-bold">{ephemeris.dec}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span className="text-gray-500">DISTANCE</span>
                <span className="text-cyan-400 font-bold">{ephemeris.dist}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500">LIGHT LAG</span>
                <span className="text-red-400">1.28 s</span>
              </div>
            </div>
          </div>

          {/* Quantum Controls */}
          <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg flex-1 flex flex-col">
            <h2 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> QUANTUM FILTER
            </h2>
            
            <button
              onClick={() => setQuantumMode(!quantumMode)}
              className={`w-full py-4 rounded border text-sm font-bold mb-4 transition-all ${
                quantumMode 
                  ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400 ibm-glow' 
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {quantumMode ? 'DEACTIVATE - -' : 'ACTIVATE - - (SUPER RADIANCE)'}
            </button>

            <div className="flex-1 bg-black border border-gray-800 rounded p-2 overflow-y-auto font-mono text-[10px] space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-400 border-b border-gray-900 pb-1 last:border-0">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
