// 全局类型补充：astro check（tsc）需要；运行时无影响
interface Window {
  __pyaiBH?: { x: number; y: number };
  __pyaiBhBound?: boolean;
  __pyaiBhStart?: () => void;
  __pyaiTiltBound?: boolean;
}
interface Element {
  __tiltBound?: boolean;
}
