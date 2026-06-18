
export interface MinecraftBlock {
  rgb: [number, number, number];
  id: string;
}

export const MINECRAFT_BLOCKS: MinecraftBlock[] = [
  // --- Concrete (16) ---
  { rgb: [249, 255, 254], id: "minecraft:white_concrete" },
  { rgb: [249, 128, 29], id: "minecraft:orange_concrete" },
  { rgb: [199, 78, 189], id: "minecraft:magenta_concrete" },
  { rgb: [58, 179, 218], id: "minecraft:light_blue_concrete" },
  { rgb: [254, 216, 61], id: "minecraft:yellow_concrete" },
  { rgb: [128, 199, 31], id: "minecraft:lime_concrete" },
  { rgb: [243, 139, 170], id: "minecraft:pink_concrete" },
  { rgb: [71, 79, 82], id: "minecraft:gray_concrete" },
  { rgb: [157, 157, 151], id: "minecraft:light_gray_concrete" },
  { rgb: [22, 156, 156], id: "minecraft:cyan_concrete" },
  { rgb: [137, 50, 184], id: "minecraft:purple_concrete" },
  { rgb: [60, 68, 170], id: "minecraft:blue_concrete" },
  { rgb: [131, 84, 50], id: "minecraft:brown_concrete" },
  { rgb: [94, 124, 22], id: "minecraft:green_concrete" },
  { rgb: [176, 46, 38], id: "minecraft:red_concrete" },
  { rgb: [29, 29, 33], id: "minecraft:black_concrete" },

  // --- Concrete Powder (16) ---
  { rgb: [236, 238, 239], id: "minecraft:white_concrete_powder" },
  { rgb: [231, 134, 42], id: "minecraft:orange_concrete_powder" },
  { rgb: [210, 101, 186], id: "minecraft:magenta_concrete_powder" },
  { rgb: [98, 182, 214], id: "minecraft:light_blue_concrete_powder" },
  { rgb: [245, 217, 72], id: "minecraft:yellow_concrete_powder" },
  { rgb: [140, 195, 46], id: "minecraft:lime_concrete_powder" },
  { rgb: [236, 155, 180], id: "minecraft:pink_concrete_powder" },
  { rgb: [83, 90, 93], id: "minecraft:gray_concrete_powder" },
  { rgb: [168, 171, 172], id: "minecraft:light_gray_concrete_powder" },
  { rgb: [39, 159, 157], id: "minecraft:cyan_concrete_powder" },
  { rgb: [152, 69, 199], id: "minecraft:purple_concrete_powder" },
  { rgb: [75, 83, 180], id: "minecraft:blue_concrete_powder" },
  { rgb: [142, 98, 62], id: "minecraft:brown_concrete_powder" },
  { rgb: [106, 132, 38], id: "minecraft:green_concrete_powder" },
  { rgb: [193, 62, 53], id: "minecraft:red_concrete_powder" },
  { rgb: [35, 36, 40], id: "minecraft:black_concrete_powder" },

  // --- Terracotta (16) ---
  { rgb: [209, 177, 161], id: "minecraft:white_terracotta" },
  { rgb: [160, 96, 40], id: "minecraft:orange_terracotta" },
  { rgb: [160, 77, 104], id: "minecraft:magenta_terracotta" },
  { rgb: [119, 105, 119], id: "minecraft:light_blue_terracotta" },
  { rgb: [179, 141, 46], id: "minecraft:yellow_terracotta" },
  { rgb: [102, 127, 51], id: "minecraft:lime_terracotta" },
  { rgb: [178, 107, 107], id: "minecraft:pink_terracotta" },
  { rgb: [57, 42, 35], id: "minecraft:gray_terracotta" },
  { rgb: [135, 107, 98], id: "minecraft:light_gray_terracotta" },
  { rgb: [87, 92, 92], id: "minecraft:cyan_terracotta" },
  { rgb: [122, 73, 88], id: "minecraft:purple_terracotta" },
  { rgb: [76, 62, 92], id: "minecraft:blue_terracotta" },
  { rgb: [75, 50, 26], id: "minecraft:brown_terracotta" },
  { rgb: [76, 83, 42], id: "minecraft:green_terracotta" },
  { rgb: [142, 60, 46], id: "minecraft:red_terracotta" },
  { rgb: [37, 22, 16], id: "minecraft:black_terracotta" },
    
  // --- Wool (16) ---
  { rgb: [234, 236, 237], id: "minecraft:white_wool" },
  { rgb: [241, 118, 20], id: "minecraft:orange_wool" },
  { rgb: [189, 68, 179], id: "minecraft:magenta_wool" },
  { rgb: [58, 175, 217], id: "minecraft:light_blue_wool" },
  { rgb: [249, 198, 40], id: "minecraft:yellow_wool" },
  { rgb: [112, 185, 25], id: "minecraft:lime_wool" },
  { rgb: [237, 141, 172], id: "minecraft:pink_wool" },
  { rgb: [62, 68, 71], id: "minecraft:gray_wool" },
  { rgb: [142, 142, 134], id: "minecraft:light_gray_wool" },
  { rgb: [21, 137, 145], id: "minecraft:cyan_wool" },
  { rgb: [121, 42, 172], id: "minecraft:purple_wool" },
  { rgb: [53, 57, 157], id: "minecraft:blue_wool" },
  { rgb: [114, 72, 41], id: "minecraft:brown_wool" },
  { rgb: [85, 110, 27], id: "minecraft:green_wool" },
  { rgb: [161, 39, 34], id: "minecraft:red_wool" },
  { rgb: [25, 23, 23], id: "minecraft:black_wool" },

  // --- Metals, Minerals & Ores ---
  { rgb: [249, 236, 78], id: "minecraft:gold_block" },
  { rgb: [219, 219, 219], id: "minecraft:iron_block" },
  { rgb: [97, 219, 213], id: "minecraft:diamond_block" },
  { rgb: [81, 217, 117], id: "minecraft:emerald_block" },
  { rgb: [181, 28, 28], id: "minecraft:redstone_block" },
  { rgb: [38, 67, 137], id: "minecraft:lapis_block" },
  { rgb: [16, 17, 19], id: "minecraft:coal_block" },
  { rgb: [134, 96, 193], id: "minecraft:amethyst_block" },
  { rgb: [22, 130, 123], id: "minecraft:warped_wart_block" },

  // --- Copper Variants ---
  { rgb: [198, 114, 72], id: "minecraft:copper_block" },
  { rgb: [168, 118, 92], id: "minecraft:exposed_copper" },
  { rgb: [113, 146, 132], id: "minecraft:weathered_copper" },
  { rgb: [85, 164, 131], id: "minecraft:oxidized_copper" },
  { rgb: [182, 120, 89], id: "minecraft:cut_copper" },
  
  // --- Stone & Earth Tones ---
  { rgb: [112, 112, 112], id: "minecraft:stone" },
  { rgb: [156, 96, 77], id: "minecraft:granite" },
  { rgb: [130, 131, 130], id: "minecraft:andesite" },
  { rgb: [188, 188, 188], id: "minecraft:diorite" },
  { rgb: [227, 224, 216], id: "minecraft:calcite" },
  { rgb: [91, 88, 90], id: "minecraft:tuff" },
  { rgb: [70, 70, 79], id: "minecraft:deepslate" },
  { rgb: [113, 89, 73], id: "minecraft:dirt" },
  { rgb: [129, 85, 50], id: "minecraft:coarse_dirt" },
  { rgb: [88, 110, 49], id: "minecraft:moss_block" },
  { rgb: [216, 203, 156], id: "minecraft:sandstone" },
  { rgb: [229, 219, 170], id: "minecraft:smooth_sandstone" },
  { rgb: [166, 7, 7], id: "minecraft:netherrack" },
  { rgb: [45, 22, 26], id: "minecraft:nether_bricks" },
  { rgb: [226, 226, 160], id: "minecraft:end_stone" },
  { rgb: [15, 10, 24], id: "minecraft:obsidian" },

  // --- Wood & Plant Tones ---
  { rgb: [158, 128, 79], id: "minecraft:oak_planks" },
  { rgb: [110, 82, 49], id: "minecraft:spruce_planks" },
  { rgb: [197, 174, 120], id: "minecraft:birch_planks" },
  { rgb: [177, 111, 74], id: "minecraft:jungle_planks" },
  { rgb: [159, 93, 58], id: "minecraft:acacia_planks" },
  { rgb: [82, 59, 36], id: "minecraft:dark_oak_planks" },
  { rgb: [106, 28, 30], id: "minecraft:crimson_planks" },
  { rgb: [44, 91, 88], id: "minecraft:warped_planks" },
  { rgb: [167, 131, 78], id: "minecraft:glowstone" },
  { rgb: [219, 135, 59], id: "minecraft:pumpkin" },
  { rgb: [193, 173, 20], id: "minecraft:hay_bale" },

  // --- Vibrant & Decorative ---
  { rgb: [99, 172, 160], id: "minecraft:prismarine" },
  { rgb: [48, 86, 80], id: "minecraft:dark_prismarine" },
  { rgb: [181, 209, 206], id: "minecraft:sea_lantern" },
  { rgb: [165, 42, 42], id: "minecraft:shroomlight" }
];

export const ULTIMATE_BLOCK_PALETTE_RGB: [number, number, number][] = MINECRAFT_BLOCKS.map(b => b.rgb);
