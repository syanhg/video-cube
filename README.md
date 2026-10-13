# Video Cube

Internal tool: put a video on each face of a 3D cube, spin it, and export the result as a video or PNG.

Built with Next.js, React, three.js and @react-three/fiber. Everything runs in the browser; no files are uploaded.

```sh
npm install
npm run dev
```

Export records the canvas in real time with MediaRecorder, so a 6-second clip takes 6 seconds. Chrome and Safari save MP4; browsers without MP4 recording save WebM.
