import type { Metadata } from "next";
import { ShapeSlots } from "./shape-slots";

export const metadata: Metadata = {
  title: "Shape Slots — Aarin Jain",
  description: "A playful geometric slot machine that remixes the website palette.",
};

export default function PlayPage() {
  return <ShapeSlots />;
}
