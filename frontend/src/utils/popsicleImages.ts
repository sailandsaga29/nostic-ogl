import avocadoImg from '../assets/Popscicles/Avocado.jpg';
import blueberryImg from '../assets/Popscicles/Blueberry.jpeg';
import chocolateImg from '../assets/Popscicles/Choclate.jpeg';
import cithapalImg from '../assets/Popscicles/cithapal.jpeg';
import coconutImg from '../assets/Popscicles/coconut.jpeg';
import dragonfruitImg from '../assets/Popscicles/Dragonfruit.jpg';
import grapesImg from '../assets/Popscicles/Grapes.jpeg';
import guavaImg from '../assets/Popscicles/Guava.jpeg';
import honeyDatesImg from '../assets/Popscicles/HoneyDates.jpeg';
import jackfruitImg from '../assets/Popscicles/jackfruit.jpeg';
import kitkatImg from '../assets/Popscicles/Kitkat.jpeg';
import lotusImg from '../assets/Popscicles/LotusBiscof.jpeg';
import mangoImg from '../assets/Popscicles/Mango.jpeg';
import oreoImg from '../assets/Popscicles/oreo.jpeg';
import snickersImg from '../assets/Popscicles/snickers.jpeg';
import strawberryImg from '../assets/Popscicles/strawberry.jpeg';
import watermelonImg from '../assets/Popscicles/watermelon.jpeg';
import sipUpsChocolateImg from '../assets/sipups/Choclate.jpeg';
import sipUpsJackfruitImg from '../assets/sipups/Jackfruit.jpeg';
import sipUpsLimeImg from '../assets/sipups/WhatsApp Image 2026-06-21 at 4.15.33 PM.jpeg';
import sipUpsGrapesImg from '../assets/sipups/WhatsApp Image 2026-06-21 at 4.15.33 PM (2).jpeg';
import sipUpsWatermelonImg from '../assets/sipups/WhatsApp Image 2026-06-21 at 4.15.33 PM (3).jpeg';
import sipUpsMangoImg from '../assets/sipups/WhatsApp Image 2026-06-21 at 4.15.34 PM (1).jpeg';
import sipUpsOrangeImg from '../assets/sipups/Orange.jpeg';
import sipUpsPineappleImg from '../assets/sipups/Pineapple.jpeg';
import sipUpsStrawberryImg from '../assets/sipups/Strawberry.jpeg';

const CHIKOO_IMAGE =
  'https://d2ti80at6h9h0r.cloudfront.net/products/8eb8060a-11f8-47f9-8a6a-e099a837467b.jpg';

/** One image per flavor name only — scoped by category below. */
const EXACT_POPSICLE_IMAGES: Record<string, string> = {
  'honey dates': honeyDatesImg,
  'jack fruit': jackfruitImg,
  'blue berry': blueberryImg,
  'avacado': avocadoImg,
  'avocado': avocadoImg,
  'chicko': CHIKOO_IMAGE,
  'chikoo': CHIKOO_IMAGE,
  'watermelon': watermelonImg,
  'snickers': snickersImg,
  'mango': mangoImg,
  'kitkat': kitkatImg,
  'strawberry': strawberryImg,
  'tinder coco': coconutImg,
  'lotus': lotusImg,
  'oreo': oreoImg,
  'chilli guava': guavaImg,
  'dragon fruit': dragonfruitImg,
  'dragonfruit': dragonfruitImg,
  'grapes': grapesImg,
  'chocolate': chocolateImg,
  'cithapal': cithapalImg,
  'sithapal': cithapalImg,
  'sitaphal': cithapalImg,
};

const EXACT_SIP_UPS_IMAGES: Record<string, string> = {
  'strawberry': sipUpsStrawberryImg,
  'mango': sipUpsMangoImg,
  'chocolate': sipUpsChocolateImg,
  'jack fruit': sipUpsJackfruitImg,
  'pineapple': sipUpsPineappleImg,
  'pine apple': sipUpsPineappleImg,
  'orange': sipUpsOrangeImg,
  'grapes': sipUpsGrapesImg,
  'grape': sipUpsGrapesImg,
  'watermelon': sipUpsWatermelonImg,
  'water melon': sipUpsWatermelonImg,
  'lime': sipUpsLimeImg,
};

function normalizeFlavorName(name: string) {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isPopsicleProduct(name: string, category?: string) {
  const normalizedCategory = category?.trim().toLowerCase() ?? '';
  const normalizedName = name.toLowerCase();
  return (
    normalizedCategory.includes('popsicle') ||
    normalizedName.includes('popsicle')
  );
}

function isSipUpsProduct(name: string, category?: string) {
  const normalizedCategory = category?.trim().toLowerCase() ?? '';
  const normalizedName = name.toLowerCase();
  return (
    normalizedCategory.includes('sip ups') ||
    normalizedCategory.includes('sipups') ||
    normalizedName.includes('sip ups') ||
    normalizedName.includes('sipups')
  );
}

function isRemotePlaceholder(url?: string) {
  if (!url?.trim()) return true;
  return (
    url.includes('unsplash.com') ||
    url.includes('placeholder') ||
    url.includes('via.placeholder')
  );
}

export function matchPopsicleImage(name: string): string | undefined {
  const normalized = normalizeFlavorName(name);
  return EXACT_POPSICLE_IMAGES[normalized];
}

export function matchSipUpsImage(name: string): string | undefined {
  const normalized = normalizeFlavorName(name);
  return EXACT_SIP_UPS_IMAGES[normalized];
}

export function resolveStaffProductImage(
  name: string,
  category?: string,
  remoteImage?: string,
) {
  const normalized = normalizeFlavorName(name);

  if (isPopsicleProduct(name, category)) {
    return EXACT_POPSICLE_IMAGES[normalized] ?? '';
  }

  if (isSipUpsProduct(name, category)) {
    return EXACT_SIP_UPS_IMAGES[normalized] ?? '';
  }

  const trimmedRemote = remoteImage?.trim();
  if (trimmedRemote && !isRemotePlaceholder(trimmedRemote)) {
    return trimmedRemote;
  }

  return '';
}
