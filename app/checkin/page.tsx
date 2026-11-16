import type { Metadata } from "next";
import CheckIn from "./CheckIn";

// private page: Ansh opens it once on his laptop to save the location key in that browser
export const metadata: Metadata = {
  title: "Location check-in",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CheckIn />;
}
