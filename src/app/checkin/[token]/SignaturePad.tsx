"use client";

import { useRef, useEffect, useState, useCallback } from "react";

export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";

    setContext(ctx);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!context || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const handlePointerUp = () => {
    if (!context || !canvasRef.current) return;

    setIsDrawing(false);
    context.closePath();

    const dataUrl = canvasRef.current.toDataURL("image/png");
    setHasSignature(true);
    onChange(dataUrl);
  };

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  }, [context, onChange]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        Signature <span className="text-red-600">*</span>
      </label>
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted/20">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full cursor-crosshair bg-white"
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Clear signature
      </button>
      {hasSignature && (
        <p className="text-xs text-green-600">✓ Signature captured</p>
      )}
    </div>
  );
}
