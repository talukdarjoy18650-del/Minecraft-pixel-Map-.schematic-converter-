"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UploadCloud, Download, AlertCircle, Video, FileImage, Layers, RotateCw } from "lucide-react";
import { ULTIMATE_BLOCK_PALETTE_RGB, MINECRAFT_BLOCKS } from "@/lib/minecraft-colors";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { generateSpongeSchematic } from "@/lib/schematic-utils";


const MAX_WIDTH_BLOCKS = 600;
const DEFAULT_WIDTH_BLOCKS = 120;
const DEFAULT_BLOCK_PIXEL_SIZE = 12;
const ANIMATION_FPS = 30;

// --- Full Color Science Pipeline ---

function srgbToLinear(c: number): number {
    const v = c / 255.0;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function xyzToLab(xyz: [number, number, number]): [number, number, number] {
    const ref_x = 0.95047, ref_y = 1.00000, ref_z = 1.08883;
    let x = xyz[0] / ref_x, y = xyz[1] / ref_y, z = xyz[2] / ref_z;

    x = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + (16 / 116);
    y = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + (16 / 116);
    z = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + (16 / 116);

    const l = (116 * y) - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);
    return [l, a, b];
}

function linearToXyz(rgb: [number, number, number]): [number, number, number] {
    const r = rgb[0], g = rgb[1], b = rgb[2];
    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
    return [x, y, z];
}

function deltaE2000(lab1: [number, number, number], lab2: [number, number, number]): number {
    const [l1, a1, b1] = lab1;
    const [l2, a2, b2] = lab2;

    const c1 = Math.sqrt(a1 * a1 + b1 * b1);
    const c2 = Math.sqrt(a2 * a2 + b2 * b2);
    const c_bar = (c1 + c2) / 2;

    const g = 0.5 * (1 - Math.sqrt(Math.pow(c_bar, 7) / (Math.pow(c_bar, 7) + Math.pow(25, 7))));
    const a1_prime = (1 + g) * a1;
    const a2_prime = (1 + g) * a2;

    const c1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
    const c2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);
    
    let h1_prime = (Math.atan2(b1, a1_prime) * 180 / Math.PI);
    if (h1_prime < 0) h1_prime += 360;
    let h2_prime = (Math.atan2(b2, a2_prime) * 180 / Math.PI);
    if (h2_prime < 0) h2_prime += 360;

    const delta_l_prime = l2 - l1;
    const delta_c_prime = c2_prime - c1_prime;
    
    let delta_h_prime;
    const c1c2_prod = c1_prime * c2_prime;
    if (c1c2_prod === 0) {
        delta_h_prime = 0;
    } else {
        let h_diff = h2_prime - h1_prime;
        if (Math.abs(h_diff) <= 180) {
           delta_h_prime = h_diff;
        } else if (h_diff > 180) {
           delta_h_prime = h_diff - 360;
        } else {
           delta_h_prime = h_diff + 360;
        }
    }
    
    const delta_H_prime = 2 * Math.sqrt(c1c2_prod) * Math.sin((delta_h_prime * Math.PI / 180) / 2);

    const L_bar_prime = (l1 + l2) / 2;
    const C_bar_prime = (c1_prime + c2_prime) / 2;
    
    let H_bar_prime;
    if (c1c2_prod === 0) {
        H_bar_prime = (h1_prime + h2_prime);
    } else {
        if (Math.abs(h1_prime - h2_prime) <= 180) {
            H_bar_prime = (h1_prime + h2_prime) / 2;
        } else {
            const h_sum = h1_prime + h2_prime;
            H_bar_prime = (h_sum < 360) ? (h_sum + 360) / 2 : (h_sum - 360) / 2;
        }
    }

    const T = 1 - 0.17 * Math.cos((H_bar_prime - 30) * Math.PI / 180) + 0.24 * Math.cos((2 * H_bar_prime) * Math.PI / 180) + 0.32 * Math.cos((3 * H_bar_prime + 6) * Math.PI / 180) - 0.20 * Math.cos((4 * H_bar_prime - 63) * Math.PI / 180);

    const S_L = 1 + (0.015 * Math.pow(L_bar_prime - 50, 2)) / Math.sqrt(20 + Math.pow(L_bar_prime - 50, 2));
    const S_C = 1 + 0.045 * C_bar_prime;
    const S_H = 1 + 0.015 * C_bar_prime * T;

    const R_T = -2 * Math.sqrt(Math.pow(C_bar_prime, 7) / (Math.pow(C_bar_prime, 7) + Math.pow(25, 7))) * Math.sin((60 * Math.exp(-Math.pow((H_bar_prime - 275) / 25, 2))) * Math.PI / 180);
    
    const dE = Math.sqrt(
        Math.pow(delta_l_prime / (1 * S_L), 2) +
        Math.pow(delta_c_prime / (1 * S_C), 2) +
        Math.pow(delta_H_prime / (1 * S_H), 2) +
        R_T * (delta_c_prime / (1 * S_C)) * (delta_H_prime / (1 * S_H))
    );

    return dE;
}

function srgbToLab(rgb: [number, number, number]): [number, number, number] {
    const linear = [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])] as [number, number, number];
    const xyz = linearToXyz(linear);
    return xyzToLab(xyz);
}

const resolutionOptions = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];

function getClampedDimensions(width: number, height: number): { width: number, height: number } {
    const maxWidth = 1920;
    const maxHeight = 1080;
    const ratio = Math.min(maxWidth / width, maxHeight / height);

    if (ratio >= 1) {
        const evenWidth = Math.floor(width / 2) * 2;
        const evenHeight = Math.floor(height / 2) * 2;
        return { width: evenWidth, height: evenHeight };
    }
    
    const newWidth = Math.floor(width * ratio / 2) * 2;
    const newHeight = Math.floor(height * ratio / 2) * 2;

    return { width: newWidth, height: newHeight };
}

export function Blockify() {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [widthBlocks, setWidthBlocks] = useState<number>(DEFAULT_WIDTH_BLOCKS);
  const [blockPixelSize, setBlockPixelSize] = useState<number>(DEFAULT_BLOCK_PIXEL_SIZE);
  const [useDithering, setUseDithering] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [outputImageUrl, setOutputImageUrl] = useState<string | null>(null);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);
  const [schematicUrl, setSchematicUrl] = useState<string | null>(null);
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>("#000000");
  const [animationDuration, setAnimationDuration] = useState<number>(4);
  const [imageScale, setImageScale] = useState<number>(60);
  const [schematicOrientation, setSchematicOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [schematicRotation, setSchematicRotation] = useState<number>(0);

  const lastBlobUrl = useRef<string | null>(null);
  const lastVideoBlobUrl = useRef<string | null>(null);
  const lastFrameBlobUrl = useRef<string | null>(null);
  const lastSchematicBlobUrl = useRef<string | null>(null);
  
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const blockArtData = useRef<{
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
    blockIds: string[];
  } | null>(null);
  
  const currentPalette = MINECRAFT_BLOCKS;

  const paletteLab = useMemo(() => currentPalette.map(b => srgbToLab(b.rgb)), [currentPalette]);
  const nearestColorCache = useRef<{ [key: string]: typeof MINECRAFT_BLOCKS[0] }>({});


  const findNearestColor = useCallback((lab: [number, number, number]): typeof MINECRAFT_BLOCKS[0] => {
      const key = `${lab[0].toFixed(2)},${lab[1].toFixed(2)},${lab[2].toFixed(2)}`;
      if (key in nearestColorCache.current) return nearestColorCache.current[key];

      let minDistance = Infinity;
      let nearestBlock = currentPalette[0];

      for (let i = 0; i < paletteLab.length; i++) {
          const distance = deltaE2000(lab, paletteLab[i]);
          if (distance < minDistance) {
              minDistance = distance;
              nearestBlock = currentPalette[i];
          }
      }
      nearestColorCache.current[key] = nearestBlock;
      return nearestBlock;
  }, [paletteLab, currentPalette]);


  const revokeUrls = () => {
    if (lastBlobUrl.current) URL.revokeObjectURL(lastBlobUrl.current);
    if (lastVideoBlobUrl.current) URL.revokeObjectURL(lastVideoBlobUrl.current);
    if (lastFrameBlobUrl.current) URL.revokeObjectURL(lastFrameBlobUrl.current);
    if (lastSchematicBlobUrl.current) URL.revokeObjectURL(lastSchematicBlobUrl.current);
    lastBlobUrl.current = null;
    lastVideoBlobUrl.current = null;
    lastFrameBlobUrl.current = null;
    lastSchematicBlobUrl.current = null;
    setOutputImageUrl(null);
    setOutputVideoUrl(null);
    setSchematicUrl(null);
    setLastFrameUrl(null);
    bgImgRef.current = null;
    blockArtData.current = null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file (PNG, JPG, etc.).');
        return;
      }
      setImageFile(file);
      setError(null);
      revokeUrls();
    }
  };

  const handleBackgroundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid background image file.');
        return;
      }
      setBackgroundImageFile(file);
      setError(null);
      revokeUrls();
    }
  };

  const processImage = useCallback((imageData: ImageData): { pixels: Uint8ClampedArray, blockIds: string[] } => {
    const { data, width, height } = imageData;
    const pixels = new Uint8ClampedArray(data.length);
    const blockIds: string[] = new Array(width * height);
    
    if (useDithering) {
      const srgbPixelsFloat = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        srgbPixelsFloat[i] = data[i];
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;

          if (srgbPixelsFloat[i + 3] < 128) {
            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
            pixels[i + 3] = 0;
            blockIds[y * width + x] = "minecraft:air";
            continue;
          }

          const oldR = srgbPixelsFloat[i];
          const oldG = srgbPixelsFloat[i + 1];
          const oldB = srgbPixelsFloat[i + 2];

          const lab = srgbToLab([oldR, oldG, oldB]);
          const nearest = findNearestColor(lab);
          
          pixels[i] = nearest.rgb[0];
          pixels[i + 1] = nearest.rgb[1];
          pixels[i + 2] = nearest.rgb[2];
          pixels[i + 3] = 255;
          blockIds[y * width + x] = nearest.id;

          const errR = oldR - nearest.rgb[0];
          const errG = oldG - nearest.rgb[1];
          const errB = oldB - nearest.rgb[2];

          const distributeError = (dx: number, dy: number, factor: number) => {
            const newX = x + dx;
            const newY = y + dy;
            if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
              const i2 = (newY * width + newX) * 4;
              if (srgbPixelsFloat[i2+3] > 128) {
                srgbPixelsFloat[i2] = Math.max(0, Math.min(255, srgbPixelsFloat[i2] + errR * factor));
                srgbPixelsFloat[i2 + 1] = Math.max(0, Math.min(255, srgbPixelsFloat[i2 + 1] + errG * factor));
                srgbPixelsFloat[i2 + 2] = Math.max(0, Math.min(255, srgbPixelsFloat[i2 + 2] + errB * factor));
              }
            }
          };

          distributeError(1, 0, 7 / 16);
          distributeError(-1, 1, 3 / 16);
          distributeError(0, 1, 5 / 16);
          distributeError(1, 1, 1 / 16);
        }
      }

      return { pixels, blockIds };

    } else {
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        if (data[i + 3] < 128) {
          pixels[i] = 0;
          pixels[i + 1] = 0;
          pixels[i + 2] = 0;
          pixels[i + 3] = 0;
          blockIds[y * width + x] = "minecraft:air";
          continue;
        }
        const lab = srgbToLab([data[i], data[i+1], data[i+2]]);
        const nearest = findNearestColor(lab);
        pixels[i] = nearest.rgb[0];
        pixels[i + 1] = nearest.rgb[1];
        pixels[i + 2] = nearest.rgb[2];
        pixels[i + 3] = 255;
        blockIds[y * width + x] = nearest.id;
      }
    }
    
    return { pixels, blockIds };
  }, [findNearestColor, useDithering]);

  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const generateAndSetUrl = (canvas: HTMLCanvasElement): Promise<string> => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        resolve(url);
      } else {
        reject(new Error("Failed to create image blob."));
      }
    }, 'image/png');
  });

  const createFinalCanvas = useCallback((
    blockArtCanvas: HTMLCanvasElement,
    bgImg?: HTMLImageElement | null
  ): HTMLCanvasElement => {
    const finalCanvas = document.createElement('canvas');
    const targetWidth = bgImg ? bgImg.naturalWidth : blockArtCanvas.width;
    const targetHeight = bgImg ? bgImg.naturalHeight : blockArtCanvas.height;
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error("Could not get final canvas context.");

    if (bgImg) {
      finalCtx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);
    } else {
      finalCtx.fillStyle = backgroundColor;
      finalCtx.fillRect(0, 0, targetWidth, targetHeight);
    }

    const maxDrawWidth = targetWidth * (imageScale / 100);
    const maxDrawHeight = targetHeight * (imageScale / 100);
    const ratio = Math.min(maxDrawWidth / blockArtCanvas.width, maxDrawHeight / blockArtCanvas.height);
    const drawWidth = blockArtCanvas.width * ratio;
    const drawHeight = blockArtCanvas.height * ratio;
    const x = (targetWidth - drawWidth) / 2;
    const y = (targetHeight - drawHeight) / 2;
    finalCtx.imageSmoothingEnabled = false;
    finalCtx.drawImage(blockArtCanvas, x, y, drawWidth, drawHeight);

    return finalCanvas;
  }, [backgroundColor, imageScale]);

  const convertImageToCanvas = (pixelData: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement => {
    const processedImageData = new ImageData(pixelData, width, height);
    const clampedBlockPixelSize = Math.max(1, Math.min(blockPixelSize, 128));
    const outputWidth = width * clampedBlockPixelSize;
    const outputHeight = height * clampedBlockPixelSize;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;
    const outputCtx = outputCanvas.getContext("2d");
    if (!outputCtx) throw new Error("Could not get 2D context for output canvas.");
    outputCtx.imageSmoothingEnabled = false;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) throw new Error("Could not get temp 2D context.");
    tempCtx.putImageData(processedImageData, 0, 0);
    outputCtx.drawImage(tempCanvas, 0, 0, outputWidth, outputHeight);
    return outputCanvas;
  };

  const handleConvert = useCallback(async () => {
    if (!imageFile) {
      setError("Please select an image file first.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    revokeUrls();
    nearestColorCache.current = {};


    try {
      const img = document.createElement("img");
      const bgImg = backgroundImageFile ? document.createElement("img") : undefined;
      
      const imgPromise = new Promise<void>((res, rej) => { 
        img.onload = () => res(); 
        img.onerror = rej; 
      });
      img.src = await fileToDataUrl(imageFile);
      await imgPromise;

      if (bgImg && backgroundImageFile) {
        const bgPromise = new Promise<void>((res, rej) => {
            bgImg.onload = () => res();
            bgImg.onerror = rej;
        });
        bgImg.src = await fileToDataUrl(backgroundImageFile);
        await bgPromise;
      }
      
      const clampedWidth = Math.max(1, Math.min(widthBlocks, MAX_WIDTH_BLOCKS));
      const aspectRatio = img.height / img.width;
      const clampedHeight = Math.round(clampedWidth * aspectRatio);
      
      if (clampedWidth !== widthBlocks) setWidthBlocks(clampedWidth);
      
      const smallCanvas = document.createElement("canvas");
      smallCanvas.width = clampedWidth;
      smallCanvas.height = clampedHeight;
      const smallCtx = smallCanvas.getContext("2d", { willReadFrequently: true });
      if (!smallCtx) throw new Error("Could not get 2D context for canvas.");
      smallCtx.drawImage(img, 0, 0, clampedWidth, clampedHeight);
      const imageData = smallCtx.getImageData(0, 0, clampedWidth, clampedHeight);

      const { pixels: finalSrgbPixels, blockIds } = processImage(imageData);
      
      blockArtData.current = { pixels: finalSrgbPixels, width: clampedWidth, height: clampedHeight, blockIds };
      bgImgRef.current = bgImg || null;

      const convertedCanvas = convertImageToCanvas(finalSrgbPixels, clampedWidth, clampedHeight);
      
      const finalCanvas = createFinalCanvas(convertedCanvas, bgImg);
      const url = await generateAndSetUrl(finalCanvas);
      
      setOutputImageUrl(url);
      lastBlobUrl.current = url;

      // Generate Schematic
      const schemBlob = generateSpongeSchematic(finalSrgbPixels, clampedWidth, clampedHeight, blockIds, schematicOrientation, schematicRotation);
      const schemUrl = URL.createObjectURL(schemBlob);
      setSchematicUrl(schemUrl);
      lastSchematicBlobUrl.current = schemUrl;

      toast({ title: "Image Generated!", description: "Your Minecraft block art is ready." });
    } catch (e: any) {
      setError(e.message || "An unknown error occurred during conversion.");
      toast({ variant: "destructive", title: "Image Generation Failed", description: e.message || "An unknown error occurred." });
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, backgroundImageFile, widthBlocks, processImage, createFinalCanvas, blockPixelSize, toast, schematicOrientation, schematicRotation]);

  
  const handleAnimate = useCallback(async () => {
    if (!blockArtData.current) {
        setError("Please generate an image first before animating.");
        return;
    }
    setIsAnimating(true);
    setError(null);
    setOutputVideoUrl(null);
    setLastFrameUrl(null);
    if(lastVideoBlobUrl.current) URL.revokeObjectURL(lastVideoBlobUrl.current);
    if(lastFrameBlobUrl.current) URL.revokeObjectURL(lastFrameBlobUrl.current);
    
    try {
        const { pixels, width: blockWidth, height: blockHeight } = blockArtData.current;
        const sourceBg = bgImgRef.current;

        const artTotalWidth = blockWidth * blockPixelSize;
        const artTotalHeight = blockHeight * blockPixelSize;

        const finalCanvasForSizing = document.createElement('canvas');
        finalCanvasForSizing.width = sourceBg ? sourceBg.naturalWidth : artTotalWidth;
        finalCanvasForSizing.height = sourceBg ? sourceBg.naturalHeight : artTotalHeight;
        
        const clamped = getClampedDimensions(finalCanvasForSizing.width, finalCanvasForSizing.height);
        
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = clamped.width;
        frameCanvas.height = clamped.height;
        const frameCtx = frameCanvas.getContext('2d', { alpha: false });
        if (!frameCtx) throw new Error("Could not create frame context.");
        
        let allPixels: {x: number, y: number}[] = [];
        for (let y = blockHeight - 1; y >= 0; y--) {
            const layerPixels: {x: number, y: number}[] = [];
            for (let x = 0; x < blockWidth; x++) {
                const pixelIndex = (y * blockWidth + x) * 4;
                if (pixels[pixelIndex + 3] > 0) {
                    layerPixels.push({ x, y });
                }
            }
            if ((blockHeight - 1 - y) % 2 === 0) {
                layerPixels.reverse();
            }
            allPixels = allPixels.concat(layerPixels);
        }
        
        const totalFrames = Math.round(animationDuration * ANIMATION_FPS);
        const totalPixelsToDraw = allPixels.length;

        let muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
                codec: 'avc',
                width: frameCanvas.width,
                height: frameCanvas.height,
                frameRate: ANIMATION_FPS,
            },
        });
        
        const videoConfig: VideoEncoderConfig = {
            codec: 'avc1.42002A',
            width: frameCanvas.width,
            height: frameCanvas.height,
            bitrate: 5_000_000,
            framerate: ANIMATION_FPS,
        };

        const support = await VideoEncoder.isConfigSupported(videoConfig);
        if (!support.supported) {
          setError("Video encoding configuration not supported by this browser.");
          setIsAnimating(false);
          return;
        }

        let videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => setError(`Video encoding error: ${e.message}`)
        });
        videoEncoder.configure(videoConfig);
        
        const animationArtCanvas = document.createElement('canvas');
        animationArtCanvas.width = artTotalWidth;
        animationArtCanvas.height = artTotalHeight;
        const animArtCtx = animationArtCanvas.getContext('2d');
        if (!animArtCtx) throw new Error("Could not get animation art context.");
        animArtCtx.imageSmoothingEnabled = false;

        let pixelsPlaced = 0;

        for (let frameCount = 0; frameCount < totalFrames; frameCount++) {
            frameCtx.imageSmoothingEnabled = false;
            if (sourceBg) {
                frameCtx.drawImage(sourceBg, 0, 0, frameCanvas.width, frameCanvas.height);
            } else {
                frameCtx.fillStyle = backgroundColor;
                frameCtx.fillRect(0, 0, frameCanvas.width, frameCanvas.height);
            }

            const animationProgress = (frameCount + 1) / totalFrames;
            const endPixel = Math.min(Math.round(animationProgress * totalPixelsToDraw), totalPixelsToDraw);
            
            for (; pixelsPlaced < endPixel; pixelsPlaced++) {
                if (!allPixels[pixelsPlaced]) continue;
                const { x, y } = allPixels[pixelsPlaced];
                const sourcePixelIndex = (y * blockWidth + x) * 4;
                const r = pixels[sourcePixelIndex];
                const g = pixels[sourcePixelIndex + 1];
                const b = pixels[sourcePixelIndex + 2];
                animArtCtx.fillStyle = `rgb(${r},${g},${b})`;
                animArtCtx.fillRect(x * blockPixelSize, y * blockPixelSize, blockPixelSize, blockPixelSize);
            }
          
            const maxDrawWidth = frameCanvas.width * (imageScale / 100);
            const maxDrawHeight = frameCanvas.height * (imageScale / 100);
            const ratio = Math.min(maxDrawWidth / artTotalWidth, maxDrawHeight / artTotalHeight);
            const drawWidth = artTotalWidth * ratio;
            const drawHeight = artTotalHeight * ratio;
            const drawX = (frameCanvas.width - drawWidth) / 2;
            const drawY = (frameCanvas.height - drawHeight) / 2;

            frameCtx.drawImage(animationArtCanvas, drawX, drawY, drawWidth, drawHeight);

            const videoFrame = new VideoFrame(frameCanvas, { timestamp: (frameCount * 1000 * 1000) / ANIMATION_FPS });
            videoEncoder.encode(videoFrame);
            videoFrame.close();
        }
        
        await videoEncoder.flush();
        muxer.finalize();

        const { buffer } = muxer.target;
        const blob = new Blob([buffer], { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(blob);

        const lastFrameUrl = await generateAndSetUrl(frameCanvas);
        setLastFrameUrl(lastFrameUrl);
        lastFrameBlobUrl.current = lastFrameUrl;

        setOutputVideoUrl(videoUrl);
        lastVideoBlobUrl.current = videoUrl;
        toast({ title: "Animation Generated!", description: "Your animation is ready." });

    } catch (e: any) {
        setError(e.message || "An unknown error occurred during animation.");
    } finally {
        setIsAnimating(false);
    }
  }, [animationDuration, toast, backgroundColor, blockPixelSize, imageScale]);

return (
  <Card className="w-full max-w-4xl shadow-2xl animate-in fade-in-50 duration-500">
    <CardHeader className="text-center">
      <CardTitle className="text-3xl font-headline tracking-tight">Minecraft Pixel Art Generator</CardTitle>
      <CardDescription>Ultimate Edition: Convert images into block art and Sponge Schematics.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="image-upload" className="font-semibold">1. Upload Main Image</Label>
          <div className="flex items-center justify-center w-full">
            <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-accent/50 transition-transform duration-200 ease-in-out hover:scale-[1.02]">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="mb-1 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{imageFile ? imageFile.name : "PNG, JPG, or GIF"}</p>
              </div>
              <Input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bg-color" className="font-semibold">2. Choose Background</Label>
           <div className="flex items-center gap-2">
              <Input id="bg-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-14 h-10 p-1" />
              <Label htmlFor="bg-color">Color</Label>
           </div>
           <div className="relative flex items-center justify-center w-full text-sm text-muted-foreground">
              <span className="px-2 bg-card z-10">or</span>
              <div className="absolute top-1/2 left-0 w-full h-px bg-border"></div>
           </div>
          <div className="flex items-center justify-center w-full">
              <label htmlFor="bgimage-upload" className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-accent/50 transition-transform duration-200 ease-in-out hover:scale-[1.02]">
                  <p className="text-xs text-muted-foreground truncate max-w-xs">{backgroundImageFile ? backgroundImageFile.name : "Upload background image"}</p>
                  <Input id="bgimage-upload" type="file" className="hidden" accept="image/*" onChange={handleBackgroundFileChange} />
              </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
           <div className="space-y-2">
                <Label htmlFor="resolution-tier">Resolution</Label>
                <Select
                    value={String(widthBlocks)}
                    onValueChange={(value) => setWidthBlocks(Number(value))}
                >
                    <SelectTrigger id="resolution-tier">
                        <SelectValue placeholder="Select resolution" />
                    </SelectTrigger>
                    <SelectContent>
                        {resolutionOptions.map(res => (
                            <SelectItem key={res} value={String(res)}>
                                {res} x Auto
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          <div className="space-y-2">
            <Label htmlFor="width-blocks">Width in Blocks (Custom)</Label>
            <Input id="width-blocks" type="number" value={widthBlocks} onChange={(e) => setWidthBlocks(Number(e.target.value))} min={1} max={MAX_WIDTH_BLOCKS} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="block-pixel-size">Preview Pixel Size</Label>
            <Input id="block-pixel-size" type="number" value={blockPixelSize} onChange={(e) => setBlockPixelSize(Number(e.target.value))} min={4} max={128} className="w-full"/>
          </div>
          <div className="space-y-2">
              <Label htmlFor="animation-duration">Animation Duration (s)</Label>
              <Input id="animation-duration" type="number" value={animationDuration} onChange={(e) => setAnimationDuration(Number(e.target.value))} min={1} max={30} className="w-full" />
          </div>
          <div className="space-y-2">
              <Label htmlFor="schematic-layout">Schematic Layout</Label>
              <Select
                  value={schematicOrientation}
                  onValueChange={(value: 'vertical' | 'horizontal') => setSchematicOrientation(value)}
              >
                  <SelectTrigger id="schematic-layout">
                      <SelectValue placeholder="Select orientation" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="vertical">Vertical (Wall)</SelectItem>
                      <SelectItem value="horizontal">Horizontal (Floor)</SelectItem>
                  </SelectContent>
              </Select>
          </div>
          <div className="space-y-2">
              <Label htmlFor="schematic-rotation">Schematic Rotation</Label>
              <Select
                  value={String(schematicRotation)}
                  onValueChange={(value) => setSchematicRotation(Number(value))}
              >
                  <SelectTrigger id="schematic-rotation">
                      <SelectValue placeholder="Select rotation" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="0">0°</SelectItem>
                      <SelectItem value="90">90°</SelectItem>
                      <SelectItem value="180">180°</SelectItem>
                      <SelectItem value="270">270°</SelectItem>
                  </SelectContent>
              </Select>
          </div>
          <div className="space-y-2 col-span-1 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="image-scale">Image Scale ({imageScale}%)</Label>
              <Slider
                id="image-scale"
                min={0}
                max={100}
                step={1}
                value={[imageScale]}
                onValueChange={(value) => setImageScale(value[0])}
              />
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
          <Switch id="dithering-switch" checked={useDithering} onCheckedChange={setUseDithering} />
          <Label htmlFor="dithering-switch">Enable Dithering (smoother gradients)</Label>
      </div>
    </CardContent>
    <CardFooter className="flex flex-col sm:flex-row items-center gap-4">
      <Button onClick={handleConvert} disabled={isProcessing || isAnimating} className="w-full text-lg py-6 transition-transform hover:scale-105">
        {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</> : "Generate Art"}
      </Button>
      <Button onClick={handleAnimate} disabled={isAnimating || isProcessing || !outputImageUrl} className="w-full text-lg py-6 transition-transform hover:scale-105" variant="secondary">
        {isAnimating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Video...</> : <><Video className="mr-2 h-5 w-5" /> Generate Video</>}
      </Button>
    </CardFooter>

    {(outputImageUrl || outputVideoUrl) && (
      <Card className="mt-6 mx-4 sm:mx-6 mb-6 bg-secondary/30 animate-in fade-in-50 duration-500">
        <CardHeader>
          <CardTitle>{outputVideoUrl ? "Video Preview" : "Image Preview"}</CardTitle>
        </CardHeader>
        <CardContent className="relative flex justify-center p-2 sm:p-6 bg-background rounded-lg overflow-hidden">
          {outputVideoUrl ? (
            <video src={outputVideoUrl} controls autoPlay loop className="rounded-lg shadow-md max-w-full h-auto max-h-[60vh] object-contain" />
          ) : outputImageUrl && (
            <Image
              src={outputImageUrl}
              alt="Minecraft block art preview"
              width={800}
              height={450}
              className="rounded-lg shadow-md object-contain max-w-full h-auto"
              style={{ imageRendering: 'pixelated' }}
              unoptimized
            />
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-4 pt-6">
          {outputVideoUrl ? (
            <>
              <Button asChild className="transition-transform hover:scale-105">
                <a href={outputVideoUrl} download="block-build-animation.mp4">
                  <Download className="mr-2 h-4 w-4" /> Download MP4
                </a>
              </Button>
              {lastFrameUrl && (
                <Button asChild className="transition-transform hover:scale-105" variant="outline">
                  <a href={lastFrameUrl} download="block-art-final-frame.png">
                    <FileImage className="mr-2 h-4 w-4" /> Download Last Frame
                  </a>
                </Button>
              )}
            </>
          ) : outputImageUrl && (
            <>
              <Button asChild className="transition-transform hover:scale-105">
                <a href={outputImageUrl} download="blockified-art.png">
                  <Download className="mr-2 h-4 w-4" /> Download PNG
                </a>
              </Button>
              {schematicUrl && (
                <Button asChild className="transition-transform hover:scale-105" variant="outline">
                  <a href={schematicUrl} download="blockified-art.schem">
                    <Layers className="mr-2 h-4 w-4" /> Download .schem
                  </a>
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    )}
  </Card>
);
}
