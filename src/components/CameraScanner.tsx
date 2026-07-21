'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onCapture, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera permission denied or camera unavailable.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopCamera();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Camera className="w-5 h-5 text-indigo-400" />
            <span>Mobile Camera Card Scanner</span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {cameraError ? (
          <div className="p-6 text-center text-xs text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-500/20">
            <p className="mb-3">{cameraError}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 cursor-pointer"
            >
              Retry Camera
            </button>
          </div>
        ) : (
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Target Bounding Frame Overlay */}
                <div className="absolute inset-8 border-2 border-indigo-500/70 border-dashed rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-300 bg-slate-950/80 px-2 py-1 rounded">
                    Align Visiting Card Here
                  </span>
                </div>
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured Visiting Card"
                className="w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Controls */}
        {!cameraError && (
          <div className="mt-4 flex items-center justify-center gap-3">
            {!capturedImage ? (
              <button
                onClick={handleSnap}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 border-4 border-slate-900 shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white hover:scale-105 transition-transform cursor-pointer"
              >
                <Camera className="w-6 h-6" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setCapturedImage(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retake</span>
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Use This Photo</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
