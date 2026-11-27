import type { BuiltInElementId, CardElementId, ElementId, ImageElementId, TextElementId } from "./types";

export const BUILT_IN_ELEMENT_IDS: BuiltInElementId[] = [
  "caption",
  "device",
  "deviceSecondary",
  "callout",
];

export const TEXT_ELEMENT_PREFIX = "text:";
export const IMAGE_ELEMENT_PREFIX = "image:";
export const CARD_ELEMENT_PREFIX = "card:";

export function isBuiltInElementId(id: ElementId | string): id is BuiltInElementId {
  return (BUILT_IN_ELEMENT_IDS as string[]).includes(id);
}

export function isTextElementId(id: ElementId | string | null | undefined): id is TextElementId {
  return typeof id === "string" && id.startsWith(TEXT_ELEMENT_PREFIX);
}

export function isImageElementId(id: ElementId | string | null | undefined): id is ImageElementId {
  return typeof id === "string" && id.startsWith(IMAGE_ELEMENT_PREFIX);
}

export function isCardElementId(id: ElementId | string | null | undefined): id is CardElementId {
  return typeof id === "string" && id.startsWith(CARD_ELEMENT_PREFIX);
}

export function toTextElementId(id: string): TextElementId {
  return `${TEXT_ELEMENT_PREFIX}${id}` as TextElementId;
}

export function toImageElementId(id: string): ImageElementId {
  return `${IMAGE_ELEMENT_PREFIX}${id}` as ImageElementId;
}

export function toCardElementId(id: string): CardElementId {
  return `${CARD_ELEMENT_PREFIX}${id}` as CardElementId;
}

export function textElementKey(id: TextElementId | ElementId): string {
  return isTextElementId(id) ? id.slice(TEXT_ELEMENT_PREFIX.length) : id;
}

export function imageElementKey(id: ImageElementId | ElementId): string {
  return isImageElementId(id) ? id.slice(IMAGE_ELEMENT_PREFIX.length) : id;
}

export function cardElementKey(id: CardElementId | ElementId): string {
  return isCardElementId(id) ? id.slice(CARD_ELEMENT_PREFIX.length) : id;
}
