import type { Metadata } from "next";
import CheckIn from "./CheckIn";

// private page
export const metadata: Metadata = {
  title: "Location check-in",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CheckIn />;
}
