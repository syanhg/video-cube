import * as THREE from "three";

// Same order as BoxGeometry's material groups: +x, -x, +y, -y, +z, -z.
export const FACE_NAMES = ["Right", "Left", "Top", "Bottom", "Front", "Back"] as const;

export type Face = {
  id: string;
  name: string;
  url: string;
  video: HTMLVideoElement;
  texture: THREE.VideoTexture;
};

export function makeFace(file: File): Face {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  void video.play().catch(() => {});
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { id: crypto.randomUUID(), name: file.name, url, video, texture };
}

export function disposeFace(face: Face) {
  face.video.pause();
  face.video.removeAttribute("src");
  face.video.load();
  face.texture.dispose();
  URL.revokeObjectURL(face.url);
}
