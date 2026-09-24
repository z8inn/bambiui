import {
  socialImageAlt,
  socialImageResponse,
  socialImageSize,
} from "./studio/brand-images";

export const dynamic = "force-static";
export const alt = socialImageAlt;
export const size = socialImageSize;
export const contentType = "image/png";

export default function TwitterImage() {
  return socialImageResponse();
}
