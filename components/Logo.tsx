// my logo: the dragon crest from lib/dragonMark.ts
import { dragonMark } from "../lib/dragonMark";
import "./logo.css";

const svg = dragonMark("lg", true);
const MARK = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));

export default function Logo({ size = 42 }: { size?: number }) {
  return (
    <svg
      className="logo"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: MARK }}
    />
  );
}
