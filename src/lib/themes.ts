export interface Theme {
  id: string;
  name: string;
  prompt: string;
}

export const themes: Theme[] = [
  {
    id: "studioGhibli",
    name: "Studio Ghibli",
    prompt: `Reimagine the provided image in the iconic Studio Ghibli style.`,
  },
  {
    id: "higherBuddy",
    name: "Higher Buddy",
    prompt: `come up with an animal or creature (not too obscure) that is representative of the character or vibe of the image.

then generate a profile picture of the animal. include as many defining characteristics as possible. if the character is wearing clothes, try to match it as closely as possible - otherwise give the character a minimalist outfit.

image characteristics: high grain effect, 90s disposable camera style with chromatic aberration, slight yellow tint, and hyper-realistic photography with detailed elements, captured in harsh flash photography style, vintage paparazzi feel. preserve the prominent colors in the original image`,
  },
  {
    id: "cinematicFantasy",
    name: "Cinematic Fantasy",
    prompt: `Transform the provided profile picture into a mythical or fantasy version.

Key elements for the transformation:
1. Subject Adaptation: Reimagine the animal/creature in the image as a mythical or fantasy version.
2. Attire/Features: Adorn the subject with fantasy-themed attire or features (e.g., mystical armor, glowing runes, ethereal wings) suitable for its form.
3. Atmosphere: Create a dramatic and cinematic atmosphere with dynamic lighting (e.g., god rays, magical glows, contrasting shadows) and a rich, detailed background suggesting an epic fantasy world.
4. Artistic Style: The final image should look like a piece of high-detail digital fantasy art, emphasizing realism within the fantasy context.

Ensure the result is a captivating, profile picture-worthy artwork.`,
  },
];

export { themes as default };
