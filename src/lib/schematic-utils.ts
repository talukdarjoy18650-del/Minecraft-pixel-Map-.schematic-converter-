import pako from 'pako';

/**
 * Basic NBT Writer for Minecraft Sponge Schematic V2
 * Supports Compound, Int, Short, Byte, String, Byte Array, Int Array
 */
class NBTWriter {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number;

  constructor(size: number = 1024 * 1024) {
    this.buffer = new ArrayBuffer(size);
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }

  private ensureCapacity(additional: number) {
    if (this.offset + additional > this.buffer.byteLength) {
      const newBuffer = new ArrayBuffer(this.buffer.byteLength * 2 + additional);
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
      this.buffer = newBuffer;
      this.view = new DataView(this.buffer);
    }
  }

  writeByte(val: number) {
    this.ensureCapacity(1);
    this.view.setInt8(this.offset++, val);
  }

  writeShort(val: number) {
    this.ensureCapacity(2);
    this.view.setInt16(this.offset, val);
    this.offset += 2;
  }

  writeInt(val: number) {
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, val);
    this.offset += 4;
  }

  writeString(val: string) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(val);
    this.writeShort(bytes.length);
    this.ensureCapacity(bytes.length);
    new Uint8Array(this.buffer).set(bytes, this.offset);
    this.offset += bytes.length;
  }

  writeByteArray(arr: Uint8Array) {
    this.writeInt(arr.length);
    this.ensureCapacity(arr.length);
    new Uint8Array(this.buffer).set(arr, this.offset);
    this.offset += arr.length;
  }

  writeIntArray(arr: Int32Array) {
    this.writeInt(arr.length);
    this.ensureCapacity(arr.length * 4);
    for (let i = 0; i < arr.length; i++) {
      this.view.setInt32(this.offset, arr[i]);
      this.offset += 4;
    }
  }

  writeTag(type: number, name: string | null) {
    this.writeByte(type);
    if (name !== null) {
      this.writeString(name);
    }
  }

  getBuffer() {
    return this.buffer.slice(0, this.offset);
  }
}

export function generateSpongeSchematic(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  palette: string[],
  orientation: 'vertical' | 'horizontal' = 'vertical',
  rotation: number = 0
): Blob {
  const writer = new NBTWriter();

  // Root Compound
  writer.writeTag(10, "Schematic");

  // Version
  writer.writeTag(3, "Version");
  writer.writeInt(2);

  // DataVersion
  writer.writeTag(3, "DataVersion");
  writer.writeInt(2586); // 1.16.5 compatible

  // Calculate Rotated Dimensions
  const rotatedWidth = (rotation === 90 || rotation === 270) ? height : width;
  const rotatedHeight = (rotation === 90 || rotation === 270) ? width : height;

  if (orientation === 'vertical') {
    writer.writeTag(2, "Width");
    writer.writeShort(rotatedWidth);
    writer.writeTag(2, "Height");
    writer.writeShort(rotatedHeight);
    writer.writeTag(2, "Length");
    writer.writeShort(1);
  } else {
    writer.writeTag(2, "Width");
    writer.writeShort(rotatedWidth);
    writer.writeTag(2, "Height");
    writer.writeShort(1);
    writer.writeTag(2, "Length");
    writer.writeShort(rotatedHeight);
  }

  // Offset
  writer.writeTag(11, "Offset");
  writer.writeIntArray(new Int32Array([0, 0, 0]));

  // Palette
  writer.writeTag(10, "Palette");
  const uniqueBlocks = Array.from(new Set(palette));
  const paletteMap = new Map<string, number>();
  uniqueBlocks.forEach((block, index) => {
    writer.writeTag(3, block);
    writer.writeInt(index);
    paletteMap.set(block, index);
  });
  writer.writeByte(0); // End Palette Compound

  // PaletteMax
  writer.writeTag(3, "PaletteMax");
  writer.writeInt(uniqueBlocks.length);

  // BlockData
  const blockDataStream: number[] = [];
  
  // Iterate through rotated coordinates
  // Minecraft schematic array order is (y * length + z) * width + x
  // For 2D planes with Length=1, this simplifies to y * width + x
  // We fill from y=0 (bottom) upwards to ensure correct vertical orientation.
  for (let ry = 0; ry < rotatedHeight; ry++) {
    for (let rx = 0; rx < rotatedWidth; rx++) {
      let ox, oy;
      
      // Map rotated coordinates back to original pixel indices
      // Original data (ox, oy) where (0,0) is bottom-left and (W-1, H-1) is top-right.
      if (rotation === 90) {
        // Clockwise 90
        ox = ry;
        oy = height - 1 - rx;
      } else if (rotation === 180) {
        // Clockwise 180
        ox = width - 1 - rx;
        oy = height - 1 - ry;
      } else if (rotation === 270) {
        // Clockwise 270
        ox = width - 1 - ry;
        oy = rx;
      } else { // 0 or 360
        ox = rx;
        oy = ry;
      }

      const idx = (oy * width + ox);
      const blockId = palette[idx];
      const paletteIndex = paletteMap.get(blockId) || 0;
      
      // VarInt Encode
      let v = paletteIndex;
      while (v >= 0x80) {
        blockDataStream.push((v & 0x7F) | 0x80);
        v >>= 7;
      }
      blockDataStream.push(v);
    }
  }

  writer.writeTag(7, "BlockData");
  writer.writeByteArray(new Uint8Array(blockDataStream));

  // End Root Compound
  writer.writeByte(0);

  const compressed = pako.gzip(new Uint8Array(writer.getBuffer()));
  return new Blob([compressed], { type: 'application/octet-stream' });
}
