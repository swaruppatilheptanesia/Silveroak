import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crop, Move, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type StageFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

type Interaction =
  | {
      mode: 'move';
      startClientX: number;
      startClientY: number;
      startRect: CropRect;
      frame: StageFrame;
    }
  | {
      mode: 'resize';
      handle: ResizeHandle;
      startClientX: number;
      startClientY: number;
      startRect: CropRect;
      frame: StageFrame;
    };

interface ProfilePhotoCropperProps {
  file: File;
  imageUrl: string;
  onApplyCrop: (croppedFile: File) => void | Promise<void>;
}

const MIN_CROP_SIZE = 96;
const DEFAULT_CROP_RECT: CropRect = {
  x: 0.08,
  y: 0.12,
  width: 0.84,
  height: 0.72,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getContainedFrame(stageWidth: number, stageHeight: number, naturalWidth: number, naturalHeight: number): StageFrame | null {
  if (stageWidth <= 0 || stageHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }

  const scale = Math.min(stageWidth / naturalWidth, stageHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;

  return {
    x: (stageWidth - width) / 2,
    y: (stageHeight - height) / 2,
    width,
    height,
    scale,
  };
}

function clampCropRect(rect: CropRect, frame: StageFrame): CropRect {
  const minWidth = Math.min(0.95, MIN_CROP_SIZE / frame.width);
  const minHeight = Math.min(0.95, MIN_CROP_SIZE / frame.height);
  const width = clamp(rect.width, minWidth, 1);
  const height = clamp(rect.height, minHeight, 1);
  const x = clamp(rect.x, 0, 1 - width);
  const y = clamp(rect.y, 0, 1 - height);

  return { x, y, width, height };
}

function createDefaultCropRect(frame: StageFrame): CropRect {
  return clampCropRect(DEFAULT_CROP_RECT, frame);
}

function relativeRectToAbsolute(rect: CropRect, frame: StageFrame) {
  return {
    x: frame.x + rect.x * frame.width,
    y: frame.y + rect.y * frame.height,
    width: rect.width * frame.width,
    height: rect.height * frame.height,
  };
}

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('gif')) return 'gif';
  return 'png';
}

export function ProfilePhotoCropper({ file, imageUrl, onApplyCrop }: ProfilePhotoCropperProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [activeMode, setActiveMode] = useState<'move' | ResizeHandle | null>(null);

  const frame = useMemo(
    () => getContainedFrame(stageSize.width, stageSize.height, imageSize.width, imageSize.height),
    [imageSize.height, imageSize.width, stageSize.height, stageSize.width],
  );

  const absoluteCropRect = useMemo(
    () => (frame && cropRect ? relativeRectToAbsolute(cropRect, frame) : null),
    [cropRect, frame],
  );

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;

    const updateSize = () => {
      setStageSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setImageSize({ width: 0, height: 0 });
    setCropRect(null);
    interactionRef.current = null;
    setActiveMode(null);
    setIsApplying(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!frame) return;
    setCropRect((current) => clampCropRect(current ?? createDefaultCropRect(frame), frame));
  }, [frame]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const interaction = interactionRef.current;
      if (!interaction) return;

      const currentFrame = interaction.frame;
      const startRect = interaction.startRect;
      const deltaX = event.clientX - interaction.startClientX;
      const deltaY = event.clientY - interaction.startClientY;
      const deltaXRatio = deltaX / currentFrame.width;
      const deltaYRatio = deltaY / currentFrame.height;
      const minWidth = Math.min(0.95, MIN_CROP_SIZE / currentFrame.width);
      const minHeight = Math.min(0.95, MIN_CROP_SIZE / currentFrame.height);

      let nextRect: CropRect = startRect;

      if (interaction.mode === 'move') {
        nextRect = {
          ...startRect,
          x: clamp(startRect.x + deltaXRatio, 0, 1 - startRect.width),
          y: clamp(startRect.y + deltaYRatio, 0, 1 - startRect.height),
        };
      } else {
        const maxX = startRect.x + startRect.width;
        const maxY = startRect.y + startRect.height;

        switch (interaction.handle) {
          case 'nw': {
            const nextX = clamp(startRect.x + deltaXRatio, 0, maxX - minWidth);
            const nextY = clamp(startRect.y + deltaYRatio, 0, maxY - minHeight);
            nextRect = {
              x: nextX,
              y: nextY,
              width: maxX - nextX,
              height: maxY - nextY,
            };
            break;
          }
          case 'ne': {
            const nextY = clamp(startRect.y + deltaYRatio, 0, maxY - minHeight);
            const nextWidth = clamp(startRect.width + deltaXRatio, minWidth, 1 - startRect.x);
            nextRect = {
              x: startRect.x,
              y: nextY,
              width: nextWidth,
              height: maxY - nextY,
            };
            break;
          }
          case 'sw': {
            const nextX = clamp(startRect.x + deltaXRatio, 0, maxX - minWidth);
            const nextHeight = clamp(startRect.height + deltaYRatio, minHeight, 1 - startRect.y);
            nextRect = {
              x: nextX,
              y: startRect.y,
              width: maxX - nextX,
              height: nextHeight,
            };
            break;
          }
          case 'se': {
            nextRect = {
              x: startRect.x,
              y: startRect.y,
              width: clamp(startRect.width + deltaXRatio, minWidth, 1 - startRect.x),
              height: clamp(startRect.height + deltaYRatio, minHeight, 1 - startRect.y),
            };
            break;
          }
        }
      }

      setCropRect(clampCropRect(nextRect, currentFrame));
    }

    function handlePointerEnd() {
      interactionRef.current = null;
      setActiveMode(null);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, []);

  function handleImageLoad() {
    const image = imageRef.current;
    if (!image) return;

    setImageSize({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  }

  function beginMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!frame || !cropRect) return;
    event.preventDefault();
    interactionRef.current = {
      mode: 'move',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: cropRect,
      frame,
    };
    setActiveMode('move');
  }

  function beginResize(handle: ResizeHandle, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!frame || !cropRect) return;
    event.preventDefault();
    event.stopPropagation();
    interactionRef.current = {
      mode: 'resize',
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: cropRect,
      frame,
    };
    setActiveMode(handle);
  }

  function handleResetCrop() {
    if (!frame) return;
    setCropRect(createDefaultCropRect(frame));
  }

  async function handleApplyCrop() {
    const currentFrame = frame;
    const currentCrop = cropRect;
    const image = imageRef.current;

    if (!currentFrame || !currentCrop || !image) {
      return;
    }

    setIsApplying(true);

    try {
      const absoluteRect = relativeRectToAbsolute(currentCrop, currentFrame);
      const sourceX = (absoluteRect.x - currentFrame.x) / currentFrame.scale;
      const sourceY = (absoluteRect.y - currentFrame.y) / currentFrame.scale;
      const sourceWidth = absoluteRect.width / currentFrame.scale;
      const sourceHeight = absoluteRect.height / currentFrame.scale;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceWidth));
      canvas.height = Math.max(1, Math.round(sourceHeight));

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Unable to crop the selected image.');
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, file.type || 'image/png');
      });

      if (!blob) {
        throw new Error('Unable to crop the selected image.');
      }

      const extension = getExtensionFromMimeType(blob.type || file.type);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const croppedFile = new File([blob], `${baseName}-cropped.${extension}`, {
        type: blob.type || file.type || 'image/png',
      });

      await onApplyCrop(croppedFile);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Crop className="h-4 w-4" />
          Freeform crop with grid guides
        </span>
        <span className="inline-flex items-center gap-2">
          <Move className="h-4 w-4" />
          Drag inside the box or use the corners to resize
        </span>
      </div>

      <div
        ref={stageRef}
        className="relative h-[min(60vh,32rem)] overflow-hidden rounded-xl border border-border bg-muted/40"
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Selected profile photo preview"
          onLoad={handleImageLoad}
          draggable={false}
          className={cn(
            'absolute select-none transition-opacity duration-150',
            frame ? 'opacity-100' : 'opacity-0',
          )}
          style={
            frame
              ? {
                  left: frame.x,
                  top: frame.y,
                  width: frame.width,
                  height: frame.height,
                }
              : {
                  left: 0,
                  top: 0,
                  width: 0,
                  height: 0,
                }
          }
        />

        {!frame ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Loading image preview...
          </div>
        ) : null}

        {frame && absoluteCropRect ? (
          <>
            <div
              className="pointer-events-none absolute bg-background/45"
              style={{ left: 0, top: 0, width: '100%', height: absoluteCropRect.y }}
            />
            <div
              className="pointer-events-none absolute bg-background/45"
              style={{
                left: 0,
                top: absoluteCropRect.y,
                width: absoluteCropRect.x,
                height: absoluteCropRect.height,
              }}
            />
            <div
              className="pointer-events-none absolute bg-background/45"
              style={{
                right: 0,
                top: absoluteCropRect.y,
                width: stageSize.width - (absoluteCropRect.x + absoluteCropRect.width),
                height: absoluteCropRect.height,
              }}
            />
            <div
              className="pointer-events-none absolute bg-background/45"
              style={{
                left: 0,
                bottom: 0,
                width: '100%',
                height: stageSize.height - (absoluteCropRect.y + absoluteCropRect.height),
              }}
            />

            <div
              className={cn(
                'absolute rounded-xl border-2 border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(255,255,255,0.55)_inset]',
                activeMode === 'move' ? 'cursor-grabbing' : 'cursor-move',
              )}
              style={{
                left: absoluteCropRect.x,
                top: absoluteCropRect.y,
                width: absoluteCropRect.width,
                height: absoluteCropRect.height,
              }}
              onPointerDown={beginMove}
            >
              <div className="pointer-events-none absolute inset-0 rounded-[11px]">
                <span className="absolute left-1/3 top-0 h-full w-px bg-white/70" />
                <span className="absolute left-2/3 top-0 h-full w-px bg-white/70" />
                <span className="absolute top-1/3 left-0 h-px w-full bg-white/70" />
                <span className="absolute top-2/3 left-0 h-px w-full bg-white/70" />
              </div>

              <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm">
                Freeform crop
              </div>

              <button
                type="button"
                className={cn(
                  'absolute left-0 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow',
                  'cursor-nwse-resize touch-none',
                )}
                aria-label="Resize crop from top left"
                onPointerDown={(event) => beginResize('nw', event)}
              />
              <button
                type="button"
                className={cn(
                  'absolute right-0 top-0 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow',
                  'cursor-nesw-resize touch-none',
                )}
                aria-label="Resize crop from top right"
                onPointerDown={(event) => beginResize('ne', event)}
              />
              <button
                type="button"
                className={cn(
                  'absolute bottom-0 left-0 h-4 w-4 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-primary bg-background shadow',
                  'cursor-nesw-resize touch-none',
                )}
                aria-label="Resize crop from bottom left"
                onPointerDown={(event) => beginResize('sw', event)}
              />
              <button
                type="button"
                className={cn(
                  'absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 rounded-full border-2 border-primary bg-background shadow',
                  'cursor-nwse-resize touch-none',
                )}
                aria-label="Resize crop from bottom right"
                onPointerDown={(event) => beginResize('se', event)}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/25 px-4 py-3 text-sm">
        <div className="space-y-1">
          <p className="font-medium text-foreground">Crop before upload</p>
          <p className="text-muted-foreground">
            Adjust the crop box however you want. The grid helps keep the framing clean.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleResetCrop} disabled={!frame || isApplying}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Crop
          </Button>
          <Button type="button" onClick={handleApplyCrop} disabled={!frame || !cropRect || isApplying}>
            {isApplying ? (
              <span className="mr-2 inline-flex h-4 w-4 animate-pulse rounded-full bg-current/70" />
            ) : null}
            Apply Crop
          </Button>
        </div>
      </div>
    </div>
  );
}
