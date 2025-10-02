'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type GraphData as ApiGraphData } from '@/lib/api';

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  mass: number;
  radius: number;
  connections: number;
}

interface Edge {
  source: string;
  target: string;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

// Physics Parameters (Obsidian-Style)
const PHYSICS = {
  repulsion: 8000,           // k für Abstoßung (F = k/d²)
  springLength: 120,         // L0 - gewünschte Kantenlänge
  springStrength: 0.08,      // k_spring für Anziehung
  damping: 0.88,             // Dämpfung (0-1)
  gravity: 0.015,            // Zentrierung zum Mittelpunkt
  timeStep: 0.6,             // Simulationsgeschwindigkeit
  minDistance: 5,            // Minimaler Abstand zwischen Nodes
  maxForce: 80,              // Maximale Kraft pro Frame
  stopThreshold: 0.05,       // Stop wenn Energie < threshold
  centerX: 0,                // Canvas center
  centerY: 0,                // Canvas center
};

interface GraphViewProps {
  onNodeClick: (noteName: string) => void;
}

export default function GraphView({ onNodeClick }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Map<string, Node>>(new Map());
  const edgesRef = useRef<Edge[]>([]);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<Node | null>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const forceRenderRef = useRef(0);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, energy: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Initialize
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    resizeCanvas();
    initializeStars();
    loadGraph();
    startSimulation();

    const handleResize = () => {
      resizeCanvas();
      initializeStars();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Resize canvas to fit container
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    PHYSICS.centerX = 0;
    PHYSICS.centerY = 0;
  };

  // Load graph data from API
  const loadGraph = async () => {
    try {
      const data = await api.getGraph();
      const nodes = new Map<string, Node>();
      const edges: Edge[] = [];

      // Count connections per node
      const connectionCount = new Map<string, number>();
      (data.edges || []).forEach((link: any) => {
        connectionCount.set(link.source, (connectionCount.get(link.source) || 0) + 1);
        connectionCount.set(link.target, (connectionCount.get(link.target) || 0) + 1);
      });

      // Create nodes with random initial positions (centered at 0,0)
      data.nodes.forEach((node, index) => {
        const angle = (index / data.nodes.length) * Math.PI * 2;
        const radius = 150 + Math.random() * 100;
        const connections = connectionCount.get(node.id) || 0;
        
        nodes.set(node.id, {
          id: node.id,
          label: node.label,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          fx: 0,
          fy: 0,
          mass: 1 + connections * 0.2,
          radius: 8 + connections * 2,
          connections,
        });
      });

      // Create edges
      (data.edges || []).forEach((link: any) => {
        if (nodes.has(link.source) && nodes.has(link.target)) {
          edges.push({
            source: link.source,
            target: link.target,
          });
        }
      });

      nodesRef.current = nodes;
      edgesRef.current = edges;
      setStats({ nodes: nodes.size, edges: edges.length, energy: 0 });
    } catch (error) {
      console.error('Failed to load graph:', error);
    }
  };

  // Initialize starfield background
  const initializeStars = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stars: Star[] = [];
    const starCount = 200;

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    starsRef.current = stars;
  };

  // Physics Simulation
  const applyForces = () => {
    const nodes = Array.from(nodesRef.current.values());
    
    // Reset forces
    nodes.forEach(node => {
      node.fx = 0;
      node.fy = 0;
    });

    // 1. REPULSION: Alle Nodes stoßen sich ab (F = k/d²)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        if (dist < PHYSICS.minDistance) continue;
        
        // Coulomb's law: F = k / d²
        const force = PHYSICS.repulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        nodeA.fx -= fx;
        nodeA.fy -= fy;
        nodeB.fx += fx;
        nodeB.fy += fy;
      }
    }

    // 2. ATTRACTION: Edges ziehen Nodes zusammen (Hooke's Law)
    edgesRef.current.forEach(edge => {
      const source = nodesRef.current.get(edge.source);
      const target = nodesRef.current.get(edge.target);
      
      if (!source || !target) return;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist === 0) return;
      
      // Hooke's Law: F = k * (d - L0)
      const force = PHYSICS.springStrength * (dist - PHYSICS.springLength);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      source.fx += fx;
      source.fy += fy;
      target.fx -= fx;
      target.fy -= fy;
    });

    // 3. GRAVITY: Ziehe alles leicht zum Zentrum
    nodes.forEach(node => {
      const dx = PHYSICS.centerX - node.x;
      const dy = PHYSICS.centerY - node.y;
      
      node.fx += dx * PHYSICS.gravity;
      node.fy += dy * PHYSICS.gravity;
    });

    // 4. Update positions (Velocity Verlet Integration)
    let totalEnergy = 0;
    
    nodes.forEach(node => {
      // Limit force
      const forceMag = Math.sqrt(node.fx * node.fx + node.fy * node.fy);
      if (forceMag > PHYSICS.maxForce) {
        node.fx = (node.fx / forceMag) * PHYSICS.maxForce;
        node.fy = (node.fy / forceMag) * PHYSICS.maxForce;
      }
      
      // Update velocity
      node.vx = (node.vx + node.fx * PHYSICS.timeStep) * PHYSICS.damping;
      node.vy = (node.vy + node.fy * PHYSICS.timeStep) * PHYSICS.damping;
      
      // Update position
      node.x += node.vx * PHYSICS.timeStep;
      node.y += node.vy * PHYSICS.timeStep;
      
      // Calculate kinetic energy
      totalEnergy += node.vx * node.vx + node.vy * node.vy;
    });

    return totalEnergy;
  };

  // Rendering
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with space gradient
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    if (isDark) {
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(0.5, '#1e1b4b');
      gradient.addColorStop(1, '#0c0a1f');
    } else {
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(0.5, '#e0e7ff');
      gradient.addColorStop(1, '#dbeafe');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars with twinkling
    const time = Date.now() * 0.001;
    starsRef.current.forEach(star => {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const opacity = star.opacity + twinkle * 0.2;
      
      ctx.fillStyle = isDark 
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(100, 100, 150, ${opacity * 0.3})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.save();
    ctx.translate(panRef.current.x, panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Draw edges (synapses)
    edgesRef.current.forEach(edge => {
      const source = nodesRef.current.get(edge.source);
      const target = nodesRef.current.get(edge.target);
      
      if (!source || !target) return;

      const isConnected = selectedNode === source.id || selectedNode === target.id;
      
      // Gradient along edge
      const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
      
      if (isDark) {
        gradient.addColorStop(0, isConnected ? '#818cf8' : 'rgba(100, 116, 139, 0.3)');
        gradient.addColorStop(0.5, isConnected ? '#a78bfa' : 'rgba(100, 116, 139, 0.2)');
        gradient.addColorStop(1, isConnected ? '#c084fc' : 'rgba(100, 116, 139, 0.3)');
      } else {
        gradient.addColorStop(0, isConnected ? '#6366f1' : 'rgba(148, 163, 184, 0.4)');
        gradient.addColorStop(0.5, isConnected ? '#8b5cf6' : 'rgba(148, 163, 184, 0.3)');
        gradient.addColorStop(1, isConnected ? '#a855f7' : 'rgba(148, 163, 184, 0.4)');
      }

      ctx.strokeStyle = gradient;
      ctx.lineWidth = isConnected ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      // Pulse effect on connected edges
      if (isConnected) {
        const pulse = Math.sin(time * 3) * 0.5 + 0.5;
        ctx.strokeStyle = isDark 
          ? `rgba(167, 139, 250, ${pulse * 0.3})`
          : `rgba(139, 92, 246, ${pulse * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Draw nodes (neurons)
    const nodes = Array.from(nodesRef.current.values());
    nodes.forEach(node => {
      const isSelected = selectedNode === node.id;
      const isDimmed = selectedNode && !isConnectedTo(node.id, selectedNode);

      // Glow effect
      if (isSelected) {
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius * 3
        );
        glowGradient.addColorStop(0, isDark ? 'rgba(167, 139, 250, 0.4)' : 'rgba(139, 92, 246, 0.4)');
        glowGradient.addColorStop(1, 'rgba(167, 139, 250, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node body with gradient
      const nodeGradient = ctx.createRadialGradient(
        node.x - node.radius * 0.3, node.y - node.radius * 0.3, 0,
        node.x, node.y, node.radius
      );
      
      if (isDark) {
        if (isDimmed) {
          nodeGradient.addColorStop(0, 'rgba(71, 85, 105, 0.3)');
          nodeGradient.addColorStop(1, 'rgba(51, 65, 85, 0.3)');
        } else {
          nodeGradient.addColorStop(0, '#6366f1');
          nodeGradient.addColorStop(0.5, '#4f46e5');
          nodeGradient.addColorStop(1, '#4338ca');
        }
      } else {
        if (isDimmed) {
          nodeGradient.addColorStop(0, 'rgba(203, 213, 225, 0.5)');
          nodeGradient.addColorStop(1, 'rgba(148, 163, 184, 0.5)');
        } else {
          nodeGradient.addColorStop(0, '#818cf8');
          nodeGradient.addColorStop(0.5, '#6366f1');
          nodeGradient.addColorStop(1, '#4f46e5');
        }
      }

      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isDark 
        ? (isSelected ? '#a78bfa' : 'rgba(148, 163, 184, 0.5)')
        : (isSelected ? '#8b5cf6' : 'rgba(100, 116, 139, 0.5)');
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();

      // Label
      if (zoomRef.current > 0.5 && !isDimmed) {
        ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
        ctx.font = `${Math.max(10, 12 * zoomRef.current)}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y + node.radius + 12);
      }
    });

    ctx.restore();
  };

  // Check if two nodes are connected
  const isConnectedTo = (nodeId: string, targetId: string): boolean => {
    return edgesRef.current.some(
      edge => 
        (edge.source === nodeId && edge.target === targetId) ||
        (edge.source === targetId && edge.target === nodeId)
    );
  };

  // Animation loop
  const startSimulation = () => {
    const animate = () => {
      // Only apply physics when not dragging
      if (isSimulating && !isDraggingRef.current) {
        const energy = applyForces();
        
        // Auto-stop when stable
        if (energy < PHYSICS.stopThreshold) {
          setIsSimulating(false);
        }
        
        setStats(prev => ({ ...prev, energy: Math.round(energy * 100) / 100 }));
      }
      
      // Always render, even during drag (for live edge updates)
      render();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  // Mouse interaction
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Store last mouse position
    lastMousePosRef.current = { x: mouseX, y: mouseY };
    
    // Transform to graph coordinates
    const x = (mouseX - canvas.width / 2 - panRef.current.x) / zoomRef.current;
    const y = (mouseY - canvas.height / 2 - panRef.current.y) / zoomRef.current;

    // Find clicked node (check radius in graph space)
    let clickedNode: Node | null = null;
    const nodesArray = Array.from(nodesRef.current.values());
    for (const node of nodesArray) {
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      // Hit detection with zoom-adjusted radius
      if (dist < node.radius * 1.2) {  // 20% larger hit area for easier clicking
        clickedNode = node;
        break;
      }
    }

    if (clickedNode !== null) {
      e.preventDefault();
      isDraggingRef.current = true;
      dragNodeRef.current = clickedNode;
      setSelectedNode(clickedNode.id);
      onNodeClick(clickedNode.label);
      
      // Force immediate render
      forceRenderRef.current++;
    } else {
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Handle dragging FIRST (highest priority)
    if (isDraggingRef.current && dragNodeRef.current) {
      e.preventDefault();
      
      // Transform to graph coordinates with current zoom and pan
      const x = (mouseX - canvas.width / 2 - panRef.current.x) / zoomRef.current;
      const y = (mouseY - canvas.height / 2 - panRef.current.y) / zoomRef.current;

      // Update node position immediately
      dragNodeRef.current.x = x;
      dragNodeRef.current.y = y;
      dragNodeRef.current.vx = 0;
      dragNodeRef.current.vy = 0;
      
      // Store current mouse position
      lastMousePosRef.current = { x: mouseX, y: mouseY };
      
      // Force immediate render to show edge movement
      render();
      
      canvas.style.cursor = 'grabbing';
      return;
    }

    // Update cursor style when not dragging
    const x = (mouseX - canvas.width / 2 - panRef.current.x) / zoomRef.current;
    const y = (mouseY - canvas.height / 2 - panRef.current.y) / zoomRef.current;
    
    let hovering = false;
    nodesRef.current.forEach(node => {
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      if (dist < node.radius * 1.2) {
        hovering = true;
      }
    });
    
    canvas.style.cursor = hovering ? 'grab' : 'default';
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragNodeRef.current = null;
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate mouse position in graph coordinates before zoom
    const beforeZoom = zoomRef.current;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, beforeZoom * delta));
    
    // Zoom toward mouse position (compensate pan)
    const zoomChange = newZoom / beforeZoom;
    const offsetX = (mouseX - canvas.width / 2 - panRef.current.x);
    const offsetY = (mouseY - canvas.height / 2 - panRef.current.y);
    
    panRef.current.x -= offsetX * (zoomChange - 1);
    panRef.current.y -= offsetY * (zoomChange - 1);
    
    zoomRef.current = newZoom;
    
    // Force immediate render
    render();
  };

  // Controls
  const handleReset = () => {
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
  };

  const handleRestart = () => {
    // Reset velocities
    nodesRef.current.forEach(node => {
      node.vx = (Math.random() - 0.5) * 2;
      node.vy = (Math.random() - 0.5) * 2;
    });
    setIsSimulating(true);
  };

  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg space-y-1 text-sm font-mono border border-indigo-500/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          <span>{stats.nodes} Nodes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full" />
          <span>{stats.edges} Edges</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
          <span>Energy: {stats.energy}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={toggleSimulation}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg border border-indigo-400/30"
        >
          {isSimulating ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={handleRestart}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg border border-purple-400/30"
        >
          🔄 Restart
        </button>
        <button
          onClick={handleReset}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg border border-slate-500/30"
        >
          🎯 Center
        </button>
      </div>

      {/* Hints */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm border border-indigo-500/30">
        <span className="opacity-70">
          🖱️ Click & Drag nodes • 🔍 Scroll to zoom • ⏸️ Pause for details
        </span>
      </div>
    </div>
  );
}
